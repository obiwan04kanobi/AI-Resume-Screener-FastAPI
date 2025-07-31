# app/routers/candidates.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, Form, Header, Query, UploadFile
from sqlalchemy.orm import Session
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import os
import re
import json
import mimetypes
from .. import crud, schemas, models, security # <-- This line was added in a previous step
from ..database import get_db
from ..services import aws_service, email_service
from ..config import settings
from fastapi.responses import FileResponse

router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
)

@router.post("/resume-token/{resume_id}", response_model=schemas.Token, tags=["Candidates"])
def create_resume_access_token(
    resume_id: str,
    db: Session = Depends(get_db),
    current_user: models.HRUser = Depends(security.get_current_user) # Protect this endpoint
):
    """
    Generates a short-lived (60s) token for securely viewing a specific resume.
    Only accessible by authenticated HR users.
    """
    if not crud.get_candidate(db, resume_id):
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Create a token that expires in 60 seconds
    expires_delta = timedelta(seconds=60)
    token_data = {"resume_id": resume_id} # The payload identifies the resume
    
    access_token = security.create_access_token(data=token_data, expires_delta=expires_delta)
    
    return {"access_token": access_token, "token_type": "bearer"}

def _load_stopwords_from_json(file_path: str = 'nltk_stopwords.json') -> set:
    """Loads the stopwords from the specified JSON file."""
    try:
        with open(file_path, 'r') as f:
            stopwords_list = json.load(f)
        # print(f"✅ Successfully loaded {len(stopwords_list)} stopwords from {file_path}")
        return set(stopwords_list)
    except FileNotFoundError:
        # print(f"⚠️ WARNING: Stopwords file not found at '{file_path}'. Skill matching may be less accurate.")
        return set()
    except json.JSONDecodeError:
        # print(f"⚠️ WARNING: Could not decode JSON from '{file_path}'.")
        return set()

# Load stopwords once when the application starts
PRELOADED_STOP_WORDS = _load_stopwords_from_json()


def process_resume_in_background(resume_id: str, file_path: str):
    db: Session = next(get_db())
    try:
        print(f"BACKGROUND: Analyzing resume from local file: {file_path}")
        # NOTE: This now returns empty lists for entities and skills
        text, entities, skills = aws_service.analyze_resume_from_local_file(file_path)
        crud.update_candidate_analysis(
            db=db, resume_id=resume_id, text=text, entities=entities, skills=skills, status="Under Review"
        )
        print(f"BACKGROUND: Analysis complete for {resume_id}")
    except Exception as e:
        print(f"BACKGROUND: Error processing {resume_id}: {e}")
        crud.update_candidate_status(db, resume_id, "Processing Failed")
    finally:
        db.close()


@router.post("/parse-autofill")
async def parse_resume_for_autofill(resume: UploadFile = File(...)):
    """
    Accepts a resume file, analyzes it with Textract,
    and returns key extracted data (name, email, contact) for form autofilling.
    """
    allowed_types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if resume.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or DOC/DOCX file.")

    try:
        file_bytes = await resume.read()
        parsed_data = aws_service.analyze_resume_for_autofill(file_bytes)
        return parsed_data
    except Exception as e:
        print(f"Error in /parse-autofill endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process resume file.")


@router.post("/apply")
def apply_for_job(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    # --- Form fields ---
    name: str = Form(...),
    email: str = Form(...),
    contact: str = Form(...),
    gender: str = Form(...), 
    currentCtc: str = Form(...),
    currentCompany: str = Form(...),
    jobId: str = Form(...),
    jobTitle: str = Form(...),
    # --- File upload ---
    resume: UploadFile = File(...)
):
    # 1. Save the uploaded file locally
    upload_dir = settings.LOCAL_UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True) # Ensure the directory exists
    
    # Create a unique filename to prevent overwrites
    file_extension = os.path.splitext(resume.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(resume.file.read())

    # 2. Create a payload object to pass to the CRUD function
    payload_data = {
        "name": name, "email": email, "contact": contact,
        "gender": gender,
        "currentCtc": currentCtc, "currentCompany": currentCompany,
        "jobId": jobId, "jobTitle": jobTitle,
        "resume": unique_filename,
        "submittedAt": datetime.now(timezone.utc)
    }
    payload = schemas.ResumeUploadRequest(**payload_data)

    # 3. Create the candidate record in the database
    candidate = crud.create_candidate(db, payload, unique_filename, file_path)
    
    # 4. Schedule the background task with the local file path
    background_tasks.add_task(process_resume_in_background, candidate.resume_id, file_path)
    
    # 5. Send confirmation email
    email_service.send_application_confirmation(payload.email, payload.name, payload.jobTitle)
    
    return {"message": "Application submitted successfully", "resume_id": candidate.resume_id}

@router.get("/", response_model=List[schemas.FullCandidateProfile])
def get_all_candidate_profiles(db: Session = Depends(get_db)):
    candidates = crud.get_all_candidates(db)
    # Use the helper function to process each candidate
    return [_process_candidate_profile(c) for c in candidates]

# REPLACE the existing get_secure_resume function with this new, more secure version
@router.get("/resume/{resume_id}")
def get_secure_resume(
    resume_id: str,
    db: Session = Depends(get_db),
    token: str = Query(...)  # Token is now a required query parameter
):
    """
    Serves a resume file. Access is granted only via a valid JWT token
    in the query parameter, which proves authorization.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        
        # Verify that the token was created for the specific resume being requested
        if payload.get('resume_id') != resume_id:
            raise HTTPException(status_code=403, detail="Token is not valid for this resume.")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="The preview link has expired. Please generate a new one.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Invalid authentication token.")

    candidate = crud.get_candidate(db, resume_id)
    if not candidate or not candidate.resume_url or not os.path.exists(candidate.resume_url):
        raise HTTPException(status_code=404, detail="Resume file not found.")

    file_path = candidate.resume_url
    media_type, _ = mimetypes.guess_type(file_path)
    if media_type is None:
        media_type = 'application/octet-stream'

    return FileResponse(path=file_path, media_type=media_type)

@router.patch("/status", response_model=schemas.CandidateResponse)
def update_applicant_status(
    update_data: schemas.ApplicantStatusUpdate,
    db: Session = Depends(get_db)
):
    candidate = crud.get_candidate(db, update_data.resume_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    updated_candidate = crud.update_candidate_status(db, update_data.resume_id, update_data.status)
    
    email_service.send_status_update_email(
        updated_candidate.email, 
        updated_candidate.first_name, 
        updated_candidate.status, 
        None
    )
    return updated_candidate

# In app/routers/candidates.py

@router.post("/send-review")
def send_candidate_for_review(req: schemas.SendReviewRequest, db: Session = Depends(get_db)):

    # print(f"DEBUG: Received request payload: reviewer_email='{req.reviewer_email}', cc_emails={req.cc_emails}")

    payload = {
        'resume_id': req.resume_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=10)
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')
    crud.create_review_token(db, req.resume_id, token)
    
    review_link = f"{settings.FRONTEND_REVIEW_URL}?token={token}"
    
    email_service.send_review_link_email(
        req.reviewer_email, req.cc_emails, req.candidate_name, req.department, review_link
    )
    return {"message": "Review link sent successfully."}

@router.get("/review", response_model=schemas.FullCandidateProfile)
def validate_review_token(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        resume_id = payload['resume_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="This review link has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="This review link is invalid or has been tampered with.")

    db_token = crud.get_review_token(db, token)
    if not db_token or db_token.expires_at < datetime.now(timezone.utc).replace(tzinfo=None): # Make timezone naive for comparison
        raise HTTPException(status_code=404, detail="This review link is invalid or has been revoked.")

    candidate = crud.get_candidate(db, resume_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Could not find the specified candidate data.")
        
    # Use the helper function to process the candidate before returning
    return _process_candidate_profile(candidate)


def _process_candidate_profile(candidate: models.Candidate) -> schemas.FullCandidateProfile:
    """
    Takes a raw candidate object and enriches it for the API response.
    NOTE: Skill matching and entity grouping have been removed as per new requirements.
    """
    profile = schemas.FullCandidateProfile.model_validate(candidate, from_attributes=True)
    
    # --- REMOVED skill matching and entity grouping logic ---
    profile.matched_skills = []
    profile.match_percentage = 0.0
    profile.entities = {}

    # Add top-level department for consistency
    if candidate.job:
        profile.department = candidate.job.department

    # FIX: Overwrite resume_url to point to the secure download endpoint
    # instead of exposing the local file system path.
    profile.resume_url = f"/candidates/resume/{candidate.resume_id}"
        
    return profile