# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models
from .routers import jobs, candidates

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
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(candidates.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the AI Resume Portal API"}