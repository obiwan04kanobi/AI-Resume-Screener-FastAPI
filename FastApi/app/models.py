# app/models.py
from sqlalchemy import (Column, String, Integer, TEXT, JSON, DATETIME, ForeignKey,
                        BIGINT, DATE)
from sqlalchemy.dialects.mssql import BIT  # <--- Import BIT
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Job(Base):
    __tablename__ = "resume_jobs"
    job_id = Column(String(255), primary_key=True, index=True)
    jobTitle = Column(String(255), nullable=False)
    department = Column(String(255))
    location = Column(String(255))
    workType = Column(String(50))
    workMode = Column(String(50))
    experienceLevel = Column(String(100))
    minExperience = Column(Integer)
    maxExperience = Column(Integer)
    band = Column(String(255), nullable=True)
    preferredIndustry = Column(String(255), nullable=True)
    minSalary = Column(BIGINT)
    maxSalary = Column(BIGINT)
    currency = Column(String(10))
    jobDescription = Column(TEXT)
    responsibilities = Column(JSON)
    requirements = Column(JSON)
    qualifications = Column(JSON)
    skills = Column(JSON)
    benefits = Column(JSON)
    applicationDeadline = Column(DATE)
    positionsAvailable = Column(Integer, default=1)
    reportingTo = Column(String(255))
    contactEmail = Column(String(255))
    isUrgent = Column(BIT, default=False)
    allowRemote = Column(BIT, default=False)
    travelRequired = Column(BIT, default=False)
    backgroundCheckRequired = Column(BIT, default=False)
    postedDate = Column(DATETIME)
    status = Column(String(50), default='Active')
    
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "resume_candidates"
    resume_id = Column(String(36), primary_key=True, index=True)
    job_id = Column(String(255), ForeignKey("resume_jobs.job_id", ondelete="SET NULL"))
    first_name = Column(String(255))
    last_name = Column(String(255))
    gender = Column(String(20))
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    current_ctc = Column(String(100))      # <--- ADDED
    current_company = Column(String(255)) # <--- ADDED
    s3_key = Column(String(255))
    resume_url = Column(TEXT)
    status = Column(String(50), default='Uploaded', index=True)
    submission_timestamp = Column(DATETIME)
    extracted_text = Column(TEXT)
    extracted_entities = Column(JSON)
    extracted_skills = Column(JSON)
    
    job = relationship("Job", back_populates="candidates")
    review_tokens = relationship("ReviewToken", back_populates="candidate", cascade="all, delete-orphan")

class ReviewToken(Base):
    __tablename__ = "resume_review_tokens"
    token = Column(String(512), primary_key=True, index=True)
    resume_id = Column(String(36), ForeignKey("resume_candidates.resume_id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default='pending')
    expires_at = Column(DATETIME, nullable=False)

    candidate = relationship("Candidate", back_populates="review_tokens")

class HRUser(Base):
    __tablename__ = "resume_hr_users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))

class VerificationCode(Base):
    __tablename__ = "resume_verification_codes"
    email = Column(String(255), primary_key=True, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DATETIME, nullable=False)

class Employee(Base):
    __tablename__ = "resume_employees"
    employee_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    department = Column(String(100), nullable=False)