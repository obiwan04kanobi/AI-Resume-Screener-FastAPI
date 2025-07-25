# app/routers/candidates.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from typing import List
import time
from fastapi import File, Form, UploadFile
import os
import re
import json
from .. import crud, schemas, models
from ..database import get_db
from ..services import aws_service, email_service
from ..config import settings


router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
)

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

router = APIRouter(
    prefix="/candidates",
    tags=["Candidates"],
)


def _process_candidate_profile(candidate: models.Candidate) -> schemas.FullCandidateProfile:
    """Takes a raw candidate object and enriches it with calculated fields."""
    profile = schemas.FullCandidateProfile.model_validate(candidate, from_attributes=True)
    
    if candidate.job and (candidate.job.skills or candidate.job.requirements) and candidate.extracted_skills:
        
        # --- START: MODIFIED STOP WORDS LOGIC ---
        # 1. Start with the pre-loaded stop words from the JSON file.
        # Use .copy() to avoid modifying the global set for this request.
        stop_words = PRELOADED_STOP_WORDS.copy()
        
        # 2. Add custom, domain-specific words for better filtering.
        custom_stop_words = {
            'basic', 'understanding', 'knowledge', 'familiarity', 'platforms', 'systems',
            'tools', 'principles', 'practices', 'skills', 'languages', 'and/or',
            'e.g', 'etc', 'such', 'as', 'experience', 'using', 'services',
            'containerization', 'orchestration', 'version', 'control', 'ability', 'strong'
        }
        stop_words.update(custom_stop_words)
        # --- END: MODIFIED STOP WORDS LOGIC ---

        # 3. Combine phrases from both 'skills' and 'requirements' fields of the job.
        all_job_skill_phrases = (candidate.job.skills or []) + (candidate.job.requirements or [])

        # 4. Create a clean set of required skills by tokenizing and filtering stop words.
        job_skills_set = set()
        for skill_phrase in all_job_skill_phrases:
            if isinstance(skill_phrase, str):
                words = re.split(r'\W+', skill_phrase)
                for word in words:
                    cleaned_word = word.lower().strip()
                    if cleaned_word and cleaned_word not in stop_words:
                        job_skills_set.add(cleaned_word)
        
        # 5. Process candidate's skills into individual words.
        resume_skill_words = set()
        for skill_phrase in candidate.extracted_skills:
            if isinstance(skill_phrase, str):
                words = re.split(r'\W+', skill_phrase)
                for word in words:
                    cleaned_word = word.lower().strip()
                    if cleaned_word:
                        resume_skill_words.add(cleaned_word)
        
        # 6. Find the intersection between the two sets.
        matched = sorted(list(job_skills_set & resume_skill_words))
        
        profile.matched_skills = matched
        profile.match_percentage = round((len(matched) / len(job_skills_set)) * 100) if job_skills_set else 0

    # ... (rest of the function is unchanged) ...
    
    # Safely group entities
    if candidate.extracted_entities:
        grouped = {"PERSON": [], "LOCATION": [], "ORGANIZATION": [], "DATE": []}
        for ent in candidate.extracted_entities:
            if isinstance(ent, dict) and ent.get("Type") in grouped and ent.get("Text") not in grouped[ent["Type"]]:
                grouped[ent["Type"]].append(ent["Text"])
        profile.entities = grouped

    # Add top-level department for consistency
    if candidate.job:
        profile.department = candidate.job.department
        
    return profile

def process_resume_in_background(resume_id: str, file_path: str):
    db: Session = next(get_db())
    try:
        print(f"BACKGROUND: Analyzing resume from local file: {file_path}")
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

@router.post("/apply")
def apply_for_job(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    # --- Form fields ---
    name: str = Form(...),
    email: str = Form(...),
    contact: str = Form(...),
    gender: str = Form(...),
    workPref: str = Form(...),
    address: str = Form(...),
    experience: str = Form(...),
    age: int = Form(...),
    jobId: str = Form(...),
    jobTitle: str = Form(...),
    # --- Optional fields ---
    marks12: str = Form(None),
    pass12: int = Form(None),
    gradYear: int = Form(None),
    gradMarks: str = Form(None),
    linkedIn: str = Form(None),
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
        "name": name, "email": email, "contact": contact, "gender": gender,
        "workPref": workPref, "address": address, "experience": experience,
        "age": age, "jobId": jobId, "jobTitle": jobTitle,
        "marks12": marks12, "pass12": pass12, "gradYear": gradYear,
        "gradMarks": gradMarks, "linkedIn": linkedIn,
        "resume": unique_filename,
        "submittedAt": datetime.now(timezone.utc)
    }
    payload = schemas.ResumeUploadRequest(**payload_data)

    # 3. Create the candidate record in the database
    # We store the unique filename in `s3_key` and the full local path in `resume_url`
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
        updated_candidate.experience
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
    if not db_token or db_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="This review link is invalid or has been revoked.")

    candidate = crud.get_candidate(db, resume_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Could not find the specified candidate data.")
        
    # Use the helper function to process the candidate before returning
    return _process_candidate_profile(candidate)