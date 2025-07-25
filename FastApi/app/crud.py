from sqlalchemy.orm import Session, joinedload # <<--- 1. ADD 'joinedload' TO THIS IMPORT
from . import models, schemas
import uuid
from datetime import datetime, timedelta, timezone
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

def update_job_details(db: Session, job_id: str, job_data: schemas.JobUpdateDetails):
    db_job = get_job(db, job_id)
    if not db_job:
        return None
    
    update_data = job_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_job, key, value)
    
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
    # 2. CORRECT THE LINE BELOW (remove 'db.' before 'joinedload')
    return db.query(models.Candidate).options(joinedload(models.Candidate.job)).all()

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
    expires_at = datetime.now(timezone.utc) + timedelta(days=10)
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

# HR Login/Signup

def get_hr_user_by_email(db: Session, email: str):
    return db.query(models.HRUser).filter(models.HRUser.email == email).first()

def create_hr_user(db: Session, user: schemas.HRUserCreate):
    from .security import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.HRUser(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_or_update_verification_code(db: Session, email: str, code: str):
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    db_code = db.query(models.VerificationCode).filter(models.VerificationCode.email == email).first()
    if db_code:
        db_code.code = code
        db_code.expires_at = expires_at
    else:
        db_code = models.VerificationCode(email=email, code=code, expires_at=expires_at)
        db.add(db_code)
    
    db.commit()
    return db_code

def get_verification_code(db: Session, email: str):
    return db.query(models.VerificationCode).filter(models.VerificationCode.email == email).first()

def get_employees(db: Session):
    """Retrieves all employees from the database."""
    return db.query(models.Employee).all()