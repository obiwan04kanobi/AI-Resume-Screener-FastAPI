# app/routers/candidates.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from typing import List

from .. import crud, schemas, models
from ..database import get_db
from ..services import aws_service, email_service
from ..config import settings
import time

router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
)

def process_resume_in_background(resume_id: str, s3_key: str):
    db: Session = next(get_db())
    try:
        # 2. ADD A DELAY TO PREVENT A RACE CONDITION
        print("BACKGROUND: Waiting 5 seconds for S3 upload to complete...")
        time.sleep(5) 
        
        print(f"BACKGROUND: Analyzing resume for {resume_id}")
        text, entities, skills = aws_service.analyze_resume_from_s3(s3_key)
        crud.update_candidate_analysis(
            db=db, resume_id=resume_id, text=text, entities=entities, skills=skills, status="Under Review"
        )
        print(f"BACKGROUND: Analysis complete for {resume_id}")
    except Exception as e:
        print(f"BACKGROUND: Error processing {resume_id}: {e}")
        crud.update_candidate_status(db, resume_id, "Processing Failed")
    finally:
        db.close()

@router.post("/apply", response_model=schemas.ResumeUploadResponse)
def apply_for_job(
    payload: schemas.ResumeUploadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    put_url, get_url, s3_key = aws_service.generate_presigned_urls(payload.resume)
    
    candidate = crud.create_candidate(db, payload, s3_key, get_url)
    
    background_tasks.add_task(process_resume_in_background, candidate.resume_id, s3_key)
    
    first_name, *_ = payload.name.split()
    email_service.send_application_confirmation(payload.email, first_name, payload.jobTitle)
    
    return {"upload_url": put_url, "s3_key": s3_key, "resume_url": get_url}

@router.get("/", response_model=List[schemas.FullCandidateProfile])
def get_all_candidate_profiles(db: Session = Depends(get_db)):
    # Adapts getResumeEntities.py
    candidates = crud.get_all_candidates(db)
    results = []
    for c in candidates:
        profile = schemas.FullCandidateProfile.from_orm(c)
        if c.job and c.job.skills and c.extracted_skills:
            job_skills = set([s.lower() for s in c.job.skills])
            resume_skills = set([s.lower() for s in c.extracted_skills])
            matched = list(job_skills & resume_skills)
            profile.matched_skills = matched
            profile.match_percentage = (len(matched) / len(job_skills)) * 100 if job_skills else 0
        
        if c.extracted_entities:
             grouped = {"PERSON": [], "LOCATION": [], "ORGANIZATION": [], "DATE": []}
             for ent in c.extracted_entities:
                 if ent.get("Type") in grouped and ent.get("Text") not in grouped[ent["Type"]]:
                     grouped[ent["Type"]].append(ent["Text"])
             profile.entities = grouped

        if c.job:
            profile.department = c.job.department
        results.append(profile)

    return results

@router.patch("/status", response_model=schemas.CandidateResponse)
def update_applicant_status(
    update_data: schemas.ApplicantStatusUpdate,
    db: Session = Depends(get_db)
):
    # Adapts UpdateApplicantStatus.py
    candidate = crud.get_candidate(db, update_data.resume_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    
    updated_candidate = crud.update_candidate_status(db, update_data.resume_id, update_data.status)
    
    email_service.send_status_update_email(
        updated_candidate.email, 
        updated_candidate.first_name, 
        updated_candidate.status, 
        updated_candidate.experience
    )
    return updated_candidate

@router.post("/send-review")
def send_candidate_for_review(req: schemas.SendReviewRequest, db: Session = Depends(get_db)):
    # Adapts SendForReviewFunction.py
    payload = {
        'resume_id': req.resume_id,
        'reviewer_email': req.reviewer_email,
        'exp': datetime.now(timezone.utc) + timedelta(days=10)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')
    crud.create_review_token(db, req.resume_id, token)
    
    review_link = f"{settings.FRONTEND_REVIEW_URL}?token={token}"
    email_service.send_review_link_email(
        req.reviewer_email, req.cc_emails, req.candidate_name, req.department, review_link
    )
    return {"message": "Review link sent successfully."}

@router.get("/review", response_model=schemas.TokenValidateResponse)
def validate_review_token(token: str, db: Session = Depends(get_db)):
    # Adapts ValidateReviewTokenFunction.py
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        resume_id = payload['resume_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Review link has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid review link.")

    db_token = crud.get_review_token(db, token)
    if not db_token or db_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="Link is invalid or has been revoked.")

    candidate = crud.get_candidate(db, resume_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate data not found.")
        
    return candidate