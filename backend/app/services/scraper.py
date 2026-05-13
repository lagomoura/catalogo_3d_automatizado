from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urljoin

from playwright.async_api import async_playwright

log = logging.getLogger(__name__)


@dataclass
class ScrapedModel:
    name: str
    image_urls: list[str]
    category_makerworld_id: int | None = None


GALLERY_SELECTOR_CANDIDATES = [
    '[class*="gallery"] img',
    '[class*="Gallery"] img',
    '[class*="carousel"] img',
    '[class*="Carousel"] img',
    '[class*="swiper"] img',
    '[data-testid*="image"] img',
    '[data-testid*="gallery"] img',
    'main img',
]


def _upgrade_image_url(url: str) -> str:
    """MakerWorld serves resized variants like /resize:300x300/. Strip resize ops to get full-res."""
    upgraded = re.sub(r"/resize:\d+x\d+/", "/", url)
    upgraded = re.sub(r"/resize:\d+/", "/", upgraded)
    upgraded = re.sub(r"_thumb(\.\w+)", r"\1", upgraded)
    return upgraded


def _is_product_image(url: str) -> bool:
    if not url:
        return False
    lower = url.lower()
    if lower.endswith((".svg", ".gif")):
        return False
    if "avatar" in lower or "logo" in lower or "icon" in lower:
        return False
    if "data:image" in lower:
        return False
    return any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp"))


async def scrape_makerworld(
    url: str,
    n: int,
    on_stage: Callable[[str], None] | None = None,
) -> ScrapedModel:
    """Open the model page with Chromium, extract title and up to N gallery images."""
    def stage(msg: str) -> None:
        if on_stage is not None:
            try:
                on_stage(msg)
            except Exception:
                log.exception("on_stage callback raised; ignoring")

    async with async_playwright() as pw:
        stage("Iniciando navegador…")
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
        )
        page = await context.new_page()

        try:
            stage("Cargando la página…")
            await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
            stage("Esperando que la galería renderice…")
            try:
                await page.wait_for_load_state("networkidle", timeout=15_000)
            except Exception:
                log.warning("networkidle wait timed out; continuing with current DOM")

            stage("Leyendo el título del modelo…")
            name = await page.evaluate(
                """() => {
                    const og = document.querySelector('meta[property="og:title"]');
                    if (og && og.content) return og.content.trim();
                    const h1 = document.querySelector('h1');
                    if (h1 && h1.textContent) return h1.textContent.trim();
                    return document.title.replace(/ \\| MakerWorld.*$/i, '').trim();
                }"""
            )

            stage("Leyendo la categoría…")
            category_id: int | None = None
            try:
                category_id = await page.evaluate(
                    """() => {
                        const el = document.querySelector('#__NEXT_DATA__');
                        if (!el) return null;
                        let data;
                        try { data = JSON.parse(el.textContent); } catch { return null; }
                        const cats = data?.props?.pageProps?.design?.categories;
                        if (!Array.isArray(cats) || cats.length === 0) return null;
                        const id = cats[0]?.id;
                        return typeof id === 'number' ? id : null;
                    }"""
                )
            except Exception as exc:
                log.warning("Failed to read category from __NEXT_DATA__: %s", exc)

            stage("Buscando imágenes en la galería…")
            collected: list[str] = []
            seen: set[str] = set()

            for selector in GALLERY_SELECTOR_CANDIDATES:
                try:
                    handles = await page.query_selector_all(selector)
                except Exception:
                    continue
                for handle in handles:
                    src = await handle.get_attribute("src")
                    srcset = await handle.get_attribute("srcset")
                    candidates: list[str] = []
                    if srcset:
                        parts = [s.strip().split(" ")[0] for s in srcset.split(",") if s.strip()]
                        candidates.extend(parts)
                    if src:
                        candidates.append(src)
                    for raw in candidates:
                        absolute = urljoin(url, raw)
                        upgraded = _upgrade_image_url(absolute)
                        if not _is_product_image(upgraded):
                            continue
                        if upgraded in seen:
                            continue
                        seen.add(upgraded)
                        collected.append(upgraded)
                if len(collected) >= n:
                    break

            if not collected:
                raise RuntimeError(
                    "No product images found on page. The gallery selectors may need updating."
                )

            return ScrapedModel(
                name=name or "Untitled model",
                image_urls=collected[:n],
                category_makerworld_id=category_id,
            )
        finally:
            await context.close()
            await browser.close()
