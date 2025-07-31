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
    band: Optional[str] = None
    preferredIndustry: Optional[str] = None
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
    current_ctc: Optional[str] = None     # <--- ADDED
    current_company: Optional[str] = None # <--- ADDED
    s3_key: Optional[str] = None
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
    currentCtc: str
    currentCompany: str
    gender: Optional[str] = None
    resume: str # Filename
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

# In app/schemas.py

class GroupedJobResponse(BaseModel):
    status: str
    data: Dict[str, List[JobResponse]]

# In app/schemas.py, add this class
class JobUpdateDetails(JobBase):
    pass

# Signup/Signin logic

class HRUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class HRUserLogin(BaseModel):
    username: EmailStr # The login form will use 'username' for the email field
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class HRUserCreateWithCode(HRUserCreate):
    code: str

class Employee(BaseModel):
    employee_id: int
    name: str
    email: EmailStr
    department: str

    class Config:
        from_attributes = True