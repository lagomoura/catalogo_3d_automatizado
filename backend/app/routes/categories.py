from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Category
from ..schemas import CategoryNode
from .catalog import get_db

router = APIRouter()


def _to_node(cat: Category, children_by_parent: dict[int | None, list[Category]]) -> CategoryNode:
    return CategoryNode(
        id=cat.id,
        makerworld_id=cat.makerworld_id,
        slug=cat.slug,
        name_en=cat.name_en,
        name_es=cat.name_es,
        parent_id=cat.parent_id,
        sort_order=cat.sort_order,
        children=[
            _to_node(child, children_by_parent)
            for child in children_by_parent.get(cat.id, [])
        ],
    )


@router.get("", response_model=list[CategoryNode])
async def list_categories(db: Session = Depends(get_db)) -> list[CategoryNode]:
    rows = db.execute(
        select(Category).order_by(Category.sort_order, Category.id)
    ).scalars().all()

    by_parent: dict[int | None, list[Category]] = {}
    for row in rows:
        by_parent.setdefault(row.parent_id, []).append(row)

    roots = by_parent.get(None, [])
    return [_to_node(cat, by_parent) for cat in roots]
