from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class JobCreate(BaseModel):
    url: HttpUrl
    n_images: int = Field(ge=1, le=10)


class JobProgress(BaseModel):
    done: int
    total: int


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    status: str
    url: str
    n_images: int
    progress: JobProgress
    stage_detail: str | None = None
    error: str | None = None
    item_id: int | None = None
    created_at: datetime
    updated_at: datetime


class CatalogImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    index: int
    original_url: str
    styled_url: str


class CategoryRef(BaseModel):
    """Lightweight category info embedded in CatalogItemRead."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name_es: str
    parent_id: int | None = None


class CategoryNode(BaseModel):
    """Full tree node returned by /api/categories."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    makerworld_id: int
    slug: str
    name_en: str
    name_es: str
    parent_id: int | None = None
    sort_order: int
    children: list["CategoryNode"] = []


class CatalogItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_url: str
    created_at: datetime
    images: list[CatalogImageRead]
    category: CategoryRef | None = None


class CatalogItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    category_id: int | None = Field(default=None)
    clear_category: bool = False


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(min_length=1)


class BulkDeleteResponse(BaseModel):
    deleted: int


class BulkUpdateRequest(BaseModel):
    ids: list[int] = Field(min_length=1)
    category_id: int | None = None
    clear_category: bool = False


CategoryNode.model_rebuild()
