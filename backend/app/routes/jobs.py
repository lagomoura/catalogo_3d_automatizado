from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Job
from ..schemas import JobCreate, JobProgress, JobRead
from ..services.pipeline import run_job

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _to_read(job: Job) -> JobRead:
    return JobRead(
        job_id=job.id,
        status=job.status,
        url=job.url,
        n_images=job.n_images,
        progress=JobProgress(done=job.progress_done, total=job.progress_total),
        stage_detail=job.stage_detail,
        error=job.error,
        item_id=job.item_id,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
async def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> JobRead:
    job = Job(
        url=str(payload.url),
        n_images=payload.n_images,
        status="pending",
        progress_done=0,
        progress_total=payload.n_images,
        stage_detail="En cola, comenzando en breve…",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    asyncio.create_task(run_job(job.id))

    return _to_read(job)


@router.get("/{job_id}", response_model=JobRead)
async def get_job(job_id: int, db: Session = Depends(get_db)) -> JobRead:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_read(job)
