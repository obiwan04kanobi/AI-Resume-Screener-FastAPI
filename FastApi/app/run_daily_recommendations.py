# run_daily_recommendations.py
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict
from sqlalchemy.orm import Session

# Add the project root to the Python path to allow imports from the 'app' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.email_service import send_email # A more generic sender
from app.models import Job, Candidate

def get_new_jobs(db: Session, since_date: datetime):
    return db.query(Job).filter(Job.postedDate >= since_date, Job.status == 'Active').all()

def get_recent_active_candidates(db: Session, since_date: datetime):
    """Fetches candidates who applied in the last year and groups their interested departments."""
    candidates = db.query(Candidate).join(Job).filter(
        Candidate.submission_timestamp >= since_date
    ).all()
    
    interests = defaultdict(lambda: {'departments': set(), 'name': ''})
    for c in candidates:
        if c.job:
            interests[c.email]['departments'].add(c.job.department)
            interests[c.email]['name'] = c.first_name
    return interests

def format_salary(min_s, max_s, currency):
    if not min_s or not max_s: return "Not Disclosed"
    return f"{currency} {min_s/100000:.1f}L - {max_s/100000:.1f}L" # Simplified formatting

def run_recommendations():
    print(f"[{datetime.now()}] Starting daily job recommendation process...")
    db = SessionLocal()
    try:
        new_jobs = get_new_jobs(db, datetime.utcnow() - timedelta(days=1))
        if not new_jobs:
            print("No new jobs posted in the last 24 hours. Exiting.")
            return
        
        jobs_by_department = defaultdict(list)
        for job in new_jobs:
            jobs_by_department[job.department].append(job)

        active_candidates = get_recent_active_candidates(db, datetime.utcnow() - timedelta(days=365))
        if not active_candidates:
            print("No active candidates found. Exiting.")
            return

        for email, info in active_candidates.items():
            jobs_to_recommend = []
            for department in info['departments']:
                if department in jobs_by_department:
                    jobs_to_recommend.extend(jobs_by_department[department])

            if jobs_to_recommend:
                # Build and send the recommendation email
                candidate_name = info['name']
                subject = "New Job Opportunities You Might Be Interested In"
                plain_body = f"Hi {candidate_name},\n\nHere are some new job openings:\n"
                
                html_list = ""
                for job in jobs_to_recommend:
                    plain_body += f"- {job.jobTitle} at {job.department}\n"
                    html_list += f"<li><strong>{job.jobTitle}</strong> in {job.department}</li>"
                
                html_body = f"<html><body><h2>Hi {candidate_name},</h2><p>Based on your profile, here are some new openings:</p><ul>{html_list}</ul></body></html>"

                print(f"Sending {len(jobs_to_recommend)} recommendations to {email}")
                send_email(email, subject, plain_body, html_body)

    finally:
        db.close()
    print(f"[{datetime.now()}] Daily job recommendation process finished.")

if __name__ == "__main__":
    run_recommendations()