# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine
from . import models
from .routers import jobs, candidates, auth, employees
from .config import settings

# Creates DB tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Resume Portal API",
    description="Backend API for the AI Resume Portal, migrated from AWS Lambda to FastAPI.",
    version="1.0.0",
)

# CORS configuration to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], # Update in production
)

app.mount("/uploads", StaticFiles(directory=settings.LOCAL_UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(employees.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the AI Resume Portal API"}