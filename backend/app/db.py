from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def _ensure_legacy_columns() -> None:
    """Best-effort ALTER TABLE for columns added after the initial schema.

    SQLite lacks a proper migration story here, so we additively patch the
    existing DB. Any error (column already present, table missing) is swallowed.
    """
    statements = [
        "ALTER TABLE jobs ADD COLUMN stage_detail TEXT",
        "ALTER TABLE catalog_items ADD COLUMN category_id INTEGER REFERENCES categories(id)",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass


def _seed_reference_data() -> None:
    from .seed_categories import seed as seed_categories

    session = SessionLocal()
    try:
        seed_categories(session)
    finally:
        session.close()


def init_db() -> None:
    from . import models  # noqa: F401  ensure models registered

    Base.metadata.create_all(bind=engine)
    _ensure_legacy_columns()
    _seed_reference_data()
