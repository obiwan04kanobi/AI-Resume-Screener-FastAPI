# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import random
import string

from .. import crud, schemas, security, models
from ..database import get_db
from ..services import email_service
from datetime import datetime

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.post("/send-verification-code")
def send_verification_code(payload: schemas.HRUserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_hr_user_by_email(db, email=payload.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    
    code = ''.join(random.choices(string.digits, k=6))
    crud.create_or_update_verification_code(db, email=payload.email, code=code)
    email_service.send_verification_code_email(to_email=payload.email, code=code)
    
    return {"message": f"Verification code sent to {payload.email}"}


@router.post("/signup", response_model=schemas.Token)
def signup_new_hr_user(user_with_code: schemas.HRUserCreateWithCode, db: Session = Depends(get_db)):
    verification_entry = crud.get_verification_code(db, email=user_with_code.email)
    
    if not verification_entry or verification_entry.code != user_with_code.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )
        
    if verification_entry.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired.",
        )

    # If code is valid, proceed with user creation
    db_user = crud.create_hr_user(db=db, user=user_with_code)
    
    # Clean up the verification code
    db.delete(verification_entry)
    db.commit()
    
    access_token = security.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_hr_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}