from __future__ import annotations

import logging
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import BACKEND_DIR, load_visual_identity_prompt
from ..db import SessionLocal
from ..models import CatalogImage, CatalogItem, Category
from ..schemas import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkUpdateRequest,
    CatalogImageRead,
    CatalogItemRead,
    CatalogItemUpdate,
    CategoryRef,
)
from ..services import image_service

log = logging.getLogger(__name__)

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _path_to_url(path: str) -> str:
    normalized = path.replace("\\", "/")
    if normalized.startswith("storage/"):
        return "/" + normalized
    return normalized


def _serialize_item(item: CatalogItem) -> CatalogItemRead:
    images = [
        CatalogImageRead(
            id=img.id,
            index=img.index,
            original_url=_path_to_url(img.original_path),
            styled_url=_path_to_url(img.styled_path),
        )
        for img in item.images
    ]
    cat = item.category
    return CatalogItemRead(
        id=item.id,
        name=item.name,
        source_url=item.source_url,
        created_at=item.created_at,
        images=images,
        category=(
            CategoryRef(
                id=cat.id,
                slug=cat.slug,
                name_es=cat.name_es,
                parent_id=cat.parent_id,
            )
            if cat is not None
            else None
        ),
    )


def _category_ids_with_descendants(db: Session, root_id: int) -> set[int]:
    """Return the set containing root_id plus every descendant category id.
    Used so a parent-category filter also matches items tagged with subcategories.
    """
    rows = db.execute(select(Category.id, Category.parent_id)).all()
    children: dict[int, list[int]] = {}
    for cid, pid in rows:
        if pid is not None:
            children.setdefault(pid, []).append(cid)
    out: set[int] = set()
    stack = [root_id]
    while stack:
        cur = stack.pop()
        if cur in out:
            continue
        out.add(cur)
        stack.extend(children.get(cur, []))
    return out


def _abs_path(rel: str) -> Path:
    return BACKEND_DIR / rel.replace("\\", "/")


def _delete_image_files(image: CatalogImage) -> None:
    for rel in (image.original_path, image.styled_path):
        try:
            _abs_path(rel).unlink(missing_ok=True)
        except OSError as exc:
            log.warning("Could not delete %s: %s", rel, exc)


def _get_item_or_404(db: Session, item_id: int) -> CatalogItem:
    stmt = (
        select(CatalogItem)
        .options(selectinload(CatalogItem.images), selectinload(CatalogItem.category))
        .where(CatalogItem.id == item_id)
    )
    item = db.execute(stmt).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return item


@router.get("", response_model=list[CatalogItemRead])
async def list_catalog(
    db: Session = Depends(get_db),
    category_id: int | None = Query(default=None, description="Filter by category id (includes descendants)."),
) -> list[CatalogItemRead]:
    stmt = (
        select(CatalogItem)
        .options(selectinload(CatalogItem.images), selectinload(CatalogItem.category))
        .order_by(CatalogItem.created_at.desc())
    )
    if category_id is not None:
        ids = _category_ids_with_descendants(db, category_id)
        stmt = stmt.where(CatalogItem.category_id.in_(ids))
    items = db.execute(stmt).scalars().all()
    return [_serialize_item(item) for item in items]


@router.patch("/{item_id}", response_model=CatalogItemRead)
async def update_catalog_item(
    item_id: int,
    payload: CatalogItemUpdate,
    db: Session = Depends(get_db),
) -> CatalogItemRead:
    item = _get_item_or_404(db, item_id)

    if payload.name is not None:
        item.name = payload.name.strip()

    if payload.clear_category:
        item.category_id = None
    elif payload.category_id is not None:
        cat = db.get(Category, payload.category_id)
        if cat is None:
            raise HTTPException(status_code=400, detail="Unknown category_id")
        item.category_id = cat.id

    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_catalog_item(item_id: int, db: Session = Depends(get_db)) -> Response:
    item = _get_item_or_404(db, item_id)
    for image in list(item.images):
        _delete_image_files(image)
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_catalog_items(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
) -> BulkDeleteResponse:
    stmt = (
        select(CatalogItem)
        .options(selectinload(CatalogItem.images))
        .where(CatalogItem.id.in_(payload.ids))
    )
    items = db.execute(stmt).scalars().all()
    for item in items:
        for image in list(item.images):
            _delete_image_files(image)
        db.delete(item)
    db.commit()
    return BulkDeleteResponse(deleted=len(items))


@router.post("/bulk-update", response_model=list[CatalogItemRead])
async def bulk_update_catalog_items(
    payload: BulkUpdateRequest,
    db: Session = Depends(get_db),
) -> list[CatalogItemRead]:
    target_category_id: int | None = None
    if payload.clear_category:
        target_category_id = None
    elif payload.category_id is not None:
        cat = db.get(Category, payload.category_id)
        if cat is None:
            raise HTTPException(status_code=400, detail="Unknown category_id")
        target_category_id = cat.id
    else:
        # Nothing to do.
        return []

    stmt = (
        select(CatalogItem)
        .options(selectinload(CatalogItem.images), selectinload(CatalogItem.category))
        .where(CatalogItem.id.in_(payload.ids))
    )
    items = db.execute(stmt).scalars().all()
    for item in items:
        item.category_id = target_category_id
    db.commit()
    for item in items:
        db.refresh(item)
    return [_serialize_item(item) for item in items]


@router.delete("/{item_id}/images/{image_id}", response_model=CatalogItemRead)
async def delete_catalog_image(
    item_id: int,
    image_id: int,
    db: Session = Depends(get_db),
) -> CatalogItemRead:
    item = _get_item_or_404(db, item_id)
    image = next((img for img in item.images if img.id == image_id), None)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found in this item")
    _delete_image_files(image)
    db.delete(image)
    db.commit()
    db.refresh(item)
    return _serialize_item(item)


@router.post("/{item_id}/images/{image_id}/restyle", response_model=CatalogItemRead)
async def restyle_catalog_image(
    item_id: int,
    image_id: int,
    db: Session = Depends(get_db),
) -> CatalogItemRead:
    item = _get_item_or_404(db, item_id)
    image = next((img for img in item.images if img.id == image_id), None)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found in this item")

    original_abs = _abs_path(image.original_path)
    if not original_abs.exists():
        raise HTTPException(
            status_code=409,
            detail="Original image file is missing on disk; cannot re-style",
        )

    original_bytes = original_abs.read_bytes()
    mime, _ = mimetypes.guess_type(str(original_abs))
    mime = mime or "image/jpeg"

    prompt = load_visual_identity_prompt()
    try:
        styled_bytes, styled_mime = await image_service.restyle(
            original_bytes, mime, prompt
        )
    except Exception as exc:
        log.exception("Restyle failed for item=%s image=%s", item_id, image_id)
        raise HTTPException(status_code=502, detail=f"Restyle failed: {exc}") from exc

    # Remove the previous styled file (extension may change with new mime)
    try:
        _abs_path(image.styled_path).unlink(missing_ok=True)
    except OSError as exc:
        log.warning("Could not delete previous styled file: %s", exc)

    new_path = image_service.save_styled(item.id, image.index, styled_bytes, styled_mime)
    rel_styled = new_path.relative_to(BACKEND_DIR).as_posix()
    image.styled_path = rel_styled
    db.commit()
    db.refresh(item)
    return _serialize_item(item)
