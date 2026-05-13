from __future__ import annotations

import asyncio
import logging
import mimetypes
import os
from pathlib import Path

import fal_client
import httpx
from google import genai

from ..config import settings

log = logging.getLogger(__name__)


_client: genai.Client | None = None
_fal_env_ready = False


def get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _ensure_fal_env() -> None:
    """fal_client reads FAL_KEY from env. Mirror our setting there once."""
    global _fal_env_ready
    if _fal_env_ready:
        return
    if not settings.FAL_API_KEY:
        raise RuntimeError("FAL_API_KEY is not configured in backend/.env")
    os.environ["FAL_KEY"] = settings.FAL_API_KEY
    _fal_env_ready = True


async def download_image(url: str, referer: str) -> tuple[bytes, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0 Safari/537.36"
        ),
        "Referer": referer,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        return resp.content, content_type


def _save(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _ext_from_mime(mime: str) -> str:
    return mimetypes.guess_extension(mime) or ".bin"


def save_original(item_id: int, index: int, data: bytes, mime: str) -> Path:
    ext = _ext_from_mime(mime).lstrip(".") or "jpg"
    if ext == "jpe":
        ext = "jpg"
    path = settings.ORIGINAL_DIR / f"{item_id}_{index}.{ext}"
    _save(path, data)
    return path


def save_styled(item_id: int, index: int, data: bytes, mime: str = "image/png") -> Path:
    ext = _ext_from_mime(mime).lstrip(".") or "png"
    path = settings.STYLED_DIR / f"{item_id}_{index}.{ext}"
    _save(path, data)
    return path


async def restyle(image_bytes: bytes, mime: str, prompt: str) -> tuple[bytes, str]:
    """Edit a product image via FAL (FLUX Kontext Pro by default).

    FLUX Kontext is purpose-built for targeted edits that preserve the rest
    of the source image — much better at keeping product geometry than
    Gemini's image models.
    """
    _ensure_fal_env()

    ext = (_ext_from_mime(mime).lstrip(".") or "jpg")
    file_name = f"source.{ext}"
    image_url = await fal_client.upload_async(image_bytes, mime, file_name=file_name)

    result = await fal_client.subscribe_async(
        settings.FAL_IMAGE_EDIT_MODEL,
        arguments={
            "prompt": prompt,
            "image_url": image_url,
            "num_images": 1,
            "output_format": "png",
            "guidance_scale": 4.5,
            "safety_tolerance": "5",
        },
    )

    images = (result or {}).get("images") or []
    if not images or not images[0].get("url"):
        raise RuntimeError(f"FAL response missing image URL: {result}")

    out_url = images[0]["url"]
    out_mime = images[0].get("content_type") or "image/png"

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(out_url)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", out_mime).split(";")[0].strip()
        return resp.content, ct or out_mime


_TRANSLATE_PROMPT = """You are normalizing a 3D-printed product title for a catalog.

TASK: Translate the title to Rioplatense Spanish (español de Argentina) AND aggressively clean it into a short, catalog-style title.

KEEP:
- The core product identity (what the object is).
- At most ONE essential functional descriptor (e.g. "Giro 360°", "Plegable", "18g", "Tamaño A4"). If the original has several, keep only the most distinctive one.
- Proper nouns, brand names, model numbers, units and measurements.

REMOVE (always strip these out, even if separated by dashes, pipes, slashes or commas):
- Marketing adjectives: "Suave", "Silencioso", "Premium", "Best", "Amazing", "High Quality", "Modern", etc.
- 3D-printing references: "Modelo 3D", "3D Model", "3D Print", "3D Printable", "STL", "Para Imprimir", "Printable", "Print".
- Pricing/availability words: "Gratis", "Free", "Free Download", "Download", "Descarga".
- Platform / site names: "MakerWorld", "Thingiverse", "Printables", "Cults", "MyMiniFactory".
- Hashtags, emojis, trailing punctuation, redundant separators.
- The segment that contains ONLY removable noise — including its leading dash/pipe.

STYLE:
- Use natural Argentinian phrasing — not neutral Spanish, not Castilian.
- Title case (cada palabra principal en mayúscula) — e.g. "Base Giratoria para Tortas".
- Use the en-dash "–" (not hyphen) to separate the product from its functional descriptor if both are kept.
- If the cleaned title would be empty, return the most descriptive single phrase from the input untranslated.

OUTPUT: only the final cleaned title. No quotes. No explanation. No prefix like "Output:".

---
Example 1
Input: Base Giratoria para Tortas – Giro 360° Suave y Silencioso – Modelo 3D Gratis para Imprimir – MakerWorld
Output: Base Giratoria para Tortas – Giro 360°

Example 2
Input: Brigadeiro Portioning Plate 18g - 3D Model - Free STL Download | MakerWorld
Output: Plato Porcionador de Brigadeiros 18g

Example 3
Input: Premium Adjustable Phone Stand for iPhone & Android - Easy Print - No Supports - Thingiverse
Output: Soporte Regulable para Celular

Example 4
Input: Organizador de Escritorio Modular Plegable
Output: Organizador de Escritorio Modular Plegable
---

Name: {name}"""


def _translate_name_sync(name: str) -> str:
    client = get_client()
    response = client.models.generate_content(
        model=settings.GEMINI_TEXT_MODEL,
        contents=[_TRANSLATE_PROMPT.format(name=name)],
    )
    text = (getattr(response, "text", None) or "").strip()
    if not text:
        for candidate in response.candidates or []:
            if not candidate.content or not candidate.content.parts:
                continue
            for part in candidate.content.parts:
                piece = getattr(part, "text", None)
                if piece:
                    text = piece.strip()
                    break
            if text:
                break
    # Strip surrounding quotes the model sometimes adds
    text = text.strip().strip('"').strip("'").strip()
    return text or name


async def translate_name(name: str) -> str:
    """Translate a product name to Argentinian Spanish, falling back to the
    original on any error."""
    cleaned = name.strip()
    if not cleaned:
        return name
    try:
        return await asyncio.to_thread(_translate_name_sync, cleaned)
    except Exception as exc:
        log.warning("translate_name failed for %r: %s", name, exc)
        return name
