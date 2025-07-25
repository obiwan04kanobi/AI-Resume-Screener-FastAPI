from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(
    prefix="/employees",
    tags=["Employees"],
)

@router.get("/", response_model=List[schemas.Employee])
def read_all_employees(db: Session = Depends(get_db)):
    """
    Retrieve all employees from the database.
    """
    employees = crud.get_employees(db)
    return employees