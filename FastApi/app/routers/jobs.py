# app/routers/jobs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)

@router.post("/", response_model=schemas.JobResponse, status_code=201)
def create_new_job(job: schemas.JobCreate, db: Session = Depends(get_db)):
    # Adapts JobPostingFunction.py
    return crud.create_job(db=db, job=job)

# NEW CODE:
@router.get("/", response_model=schemas.GroupedJobResponse)
def get_active_jobs(db: Session = Depends(get_db)):
    grouped_jobs = crud.get_jobs_grouped_by_department(db)
    return {
        "status": "success",
        "data": grouped_jobs
    }

@router.patch("/{job_id}/status", response_model=schemas.JobResponse)
def update_job_status_endpoint(job_id: str, status_update: schemas.JobUpdate, db: Session = Depends(get_db)):
    # Adapts part of UpdateJobPostingStatus.py
    db_job = crud.update_job_status(db, job_id=job_id, status=status_update.status)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return db_job

@router.delete("/{job_id}", status_code=204)
def delete_job_endpoint(job_id: str, db: Session = Depends(get_db)):
    # Adapts part of UpdateJobPostingStatus.py
    db_job = crud.delete_job(db, job_id=job_id)
    if db_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return

# In app/routers/jobs.py, add this new endpoint function

@router.put("/{job_id}", response_model=schemas.JobResponse)
def update_full_job(job_id: str, job_data: schemas.JobUpdateDetails, db: Session = Depends(get_db)):
    updated_job = crud.update_job_details(db, job_id=job_id, job_data=job_data)
    if updated_job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated_job