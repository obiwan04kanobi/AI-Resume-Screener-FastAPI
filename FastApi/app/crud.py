# app/crud.py
from sqlalchemy.orm import Session
from . import models, schemas
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List

# --- Job CRUD ---
def get_job(db: Session, job_id: str):
    return db.query(models.Job).filter(models.Job.job_id == job_id).first()

def get_jobs_grouped_by_department(db: Session):
    jobs = db.query(models.Job).filter(models.Job.status == 'Active').all()
    grouped = {}
    for job in jobs:
        if job.department not in grouped:
            grouped[job.department] = []
        grouped[job.department].append(job)
    return grouped

def create_job(db: Session, job: schemas.JobCreate):
    department_prefix = job.department.upper().replace(" ", "")
    unique_suffix = str(uuid.uuid4())[:8]
    job_id = f"{department_prefix}-{unique_suffix}"
    
    db_job = models.Job(**job.model_dump(), job_id=job_id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def update_job_status(db: Session, job_id: str, status: str):
    db_job = get_job(db, job_id)
    if db_job:
        db_job.status = status
        db.commit()
        db.refresh(db_job)
    return db_job

def delete_job(db: Session, job_id: str):
    db_job = get_job(db, job_id)
    if db_job:
        db.delete(db_job)
        db.commit()
    return db_job

# --- Candidate CRUD ---
def get_candidate(db: Session, resume_id: str):
    return db.query(models.Candidate).filter(models.Candidate.resume_id == resume_id).first()

def get_all_candidates(db: Session):
    return db.query(models.Candidate).options(db.joinedload(models.Candidate.job)).all()

def create_candidate(db: Session, data: schemas.ResumeUploadRequest, s3_key: str, resume_url: str):
    resume_id = str(uuid.uuid4())
    first_name, *last_name_parts = data.name.strip().split()
    last_name = " ".join(last_name_parts) if last_name_parts else ""

    db_candidate = models.Candidate(
        resume_id=resume_id,
        first_name=first_name,
        last_name=last_name,
        email=data.email,
        phone=data.contact,
        gender=data.gender,
        work_pref=data.workPref,
        address=data.address,
        experience=data.experience,
        age=data.age,
        marks12=data.marks12,
        linkedin=data.linkedIn,
        pass12=data.pass12,
        grad_year=data.gradYear,
        grad_marks=data.gradMarks,
        job_id=data.jobId,
        submission_timestamp=data.submittedAt,
        s3_key=s3_key,
        resume_url=resume_url,
        status="Uploaded"
    )
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

def update_candidate_analysis(db: Session, resume_id: str, text: str, entities: List, skills: List, status: str):
    db_candidate = get_candidate(db, resume_id)
    if db_candidate:
        db_candidate.extracted_text = text
        db_candidate.extracted_entities = entities
        db_candidate.extracted_skills = skills
        db_candidate.status = status
        db.commit()
        db.refresh(db_candidate)
    return db_candidate

def update_candidate_status(db: Session, resume_id: str, status: str):
    db_candidate = get_candidate(db, resume_id)
    if db_candidate:
        db_candidate.status = status
        db.commit()
        db.refresh(db_candidate)
    return db_candidate

# --- Token CRUD ---
def create_review_token(db: Session, resume_id: str, token_str: str):
    expires_at = datetime.utcnow() + timedelta(days=10)
    db_token = models.ReviewToken(
        token=token_str,
        resume_id=resume_id,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_review_token(db: Session, token_str: str):
    return db.query(models.ReviewToken).filter(models.ReviewToken.token == token_str).first()