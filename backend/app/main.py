from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db
from .routes import catalog, categories, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    settings.STYLED_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    yield


app = FastAPI(title="Catalog 3D Automated", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(catalog.router, prefix="/api/catalog", tags=["catalog"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])

app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
