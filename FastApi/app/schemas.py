# app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, date

class JobBase(BaseModel):
    jobTitle: str
    department: str
    location: Optional[str] = None
    workType: Optional[str] = None
    workMode: Optional[str] = None
    experienceLevel: Optional[str] = None
    minExperience: Optional[int] = None
    maxExperience: Optional[int] = None
    minSalary: Optional[int] = None
    maxSalary: Optional[int] = None
    currency: Optional[str] = None
    jobDescription: Optional[str] = None
    responsibilities: Optional[List[str]] = []
    requirements: Optional[List[str]] = []
    qualifications: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    benefits: Optional[List[str]] = []
    applicationDeadline: Optional[date] = None
    positionsAvailable: Optional[int] = 1
    reportingTo: Optional[str] = None
    contactEmail: Optional[EmailStr] = None
    isUrgent: Optional[bool] = False
    allowRemote: Optional[bool] = False
    travelRequired: Optional[bool] = False
    backgroundCheckRequired: Optional[bool] = False
    status: Optional[str] = 'Active'

class JobCreate(JobBase):
    postedDate: datetime = Field(default_factory=datetime.utcnow)

class JobUpdate(BaseModel):
    jobTitle: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    # Add any other field that can be updated
    
class JobResponse(JobBase):
    job_id: str
    postedDate: datetime
    class Config:
        from_attributes = True

class CandidateBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    work_pref: Optional[str] = None
    address: Optional[str] = None
    experience: Optional[str] = None
    marks12: Optional[str] = None
    pass12: Optional[int] = None
    grad_year: Optional[int] = None
    grad_marks: Optional[str] = None
    linkedin: Optional[str] = None
    job_id: str
    
class CandidateCreate(CandidateBase):
    filename: str

class CandidateResponse(CandidateBase):
    resume_id: str
    status: str
    resume_url: Optional[str] = None
    submission_timestamp: datetime
    job: Optional[JobResponse] = None
    class Config:
        from_attributes = True

class FullCandidateProfile(CandidateResponse):
    extracted_skills: Optional[List[str]] = []
    matched_skills: Optional[List[str]] = []
    match_percentage: Optional[float] = 0.0
    department: Optional[str] = None
    entities: Optional[Dict[str, List[str]]] = {}

class ResumeUploadRequest(BaseModel):
    name: str
    email: EmailStr
    contact: str
    gender: str
    workPref: str
    address: str
    resume: str # Filename
    experience: str
    age: int
    marks12: Optional[str] = None
    linkedIn: Optional[str] = None
    pass12: Optional[int] = None
    gradYear: Optional[int] = None
    gradMarks: Optional[str] = None
    jobId: str
    jobTitle: str
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    
class ResumeUploadResponse(BaseModel):
    upload_url: str
    s3_key: str
    resume_url: str

class ApplicantStatusUpdate(BaseModel):
    resume_id: str
    status: str

class SendReviewRequest(BaseModel):
    resume_id: str
    reviewer_email: EmailStr
    cc_emails: Optional[List[EmailStr]] = []
    candidate_name: str
    department: str

class TokenValidateResponse(CandidateResponse):
    # Inherits all fields from CandidateResponse
    pass