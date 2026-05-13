from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from ..config import load_visual_identity_prompt
from ..db import SessionLocal
from ..models import CatalogImage, CatalogItem, Category, Job
from . import image_service
from .scraper import scrape_makerworld

log = logging.getLogger(__name__)


def _update(session: Session, job: Job, **fields) -> None:
    for key, value in fields.items():
        setattr(job, key, value)
    job.updated_at = datetime.utcnow()
    session.commit()


async def run_job(job_id: int) -> None:
    """Background pipeline: scrape → download → restyle → persist."""
    session: Session = SessionLocal()
    try:
        job = session.get(Job, job_id)
        if job is None:
            log.error("Job %s not found", job_id)
            return

        try:
            _update(
                session,
                job,
                status="scraping",
                progress_done=0,
                progress_total=job.n_images,
                stage_detail="Abriendo la página…",
            )

            def on_scrape_stage(msg: str) -> None:
                _update(session, job, stage_detail=msg)

            scraped = await scrape_makerworld(job.url, job.n_images, on_stage=on_scrape_stage)
            total = len(scraped.image_urls)
            _update(
                session,
                job,
                progress_total=total,
                stage_detail=f"Encontré {total} imagen{'es' if total != 1 else ''}",
            )

            if total == 0:
                raise RuntimeError("No images extracted from page")

            _update(session, job, stage_detail="Traduciendo el nombre al español…")
            translated_name = await image_service.translate_name(scraped.name)

            category_id: int | None = None
            if scraped.category_makerworld_id is not None:
                cat = (
                    session.query(Category)
                    .filter(Category.makerworld_id == scraped.category_makerworld_id)
                    .one_or_none()
                )
                if cat is not None:
                    category_id = cat.id
                    log.info(
                        "Auto-assigned category '%s' (makerworld_id=%s) to job %s",
                        cat.name_es,
                        cat.makerworld_id,
                        job.id,
                    )
                else:
                    log.warning(
                        "MakerWorld category id %s has no local match for job %s",
                        scraped.category_makerworld_id,
                        job.id,
                    )

            item = CatalogItem(
                job_id=job.id,
                name=translated_name,
                source_url=job.url,
                category_id=category_id,
            )
            session.add(item)
            session.commit()
            session.refresh(item)

            _update(session, job, status="styling", item_id=item.id)

            prompt = load_visual_identity_prompt()

            for idx, img_url in enumerate(scraped.image_urls):
                try:
                    _update(
                        session,
                        job,
                        stage_detail=f"Descargando imagen {idx + 1} de {total}",
                    )
                    original_bytes, mime = await image_service.download_image(img_url, referer=job.url)
                    original_path = image_service.save_original(item.id, idx, original_bytes, mime)

                    _update(
                        session,
                        job,
                        stage_detail=f"Estilizando imagen {idx + 1} de {total} con FLUX Kontext",
                    )
                    styled_bytes, styled_mime = await image_service.restyle(
                        original_bytes, mime, prompt
                    )
                    styled_path = image_service.save_styled(item.id, idx, styled_bytes, styled_mime)

                    rel_original = original_path.relative_to(original_path.parents[2]).as_posix()
                    rel_styled = styled_path.relative_to(styled_path.parents[2]).as_posix()

                    session.add(
                        CatalogImage(
                            item_id=item.id,
                            original_path=rel_original,
                            styled_path=rel_styled,
                            index=idx,
                        )
                    )
                    session.commit()
                except Exception as exc:
                    log.exception("Failed to process image %s for job %s", idx, job.id)
                    raise RuntimeError(f"Image {idx} failed: {exc}") from exc

                _update(session, job, progress_done=idx + 1)

            _update(session, job, status="done", stage_detail=None)
        except Exception as exc:
            log.exception("Job %s failed", job_id)
            _update(session, job, status="failed", error=str(exc))
    finally:
        session.close()
