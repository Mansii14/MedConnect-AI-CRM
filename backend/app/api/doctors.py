from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.schemas.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
import app.services.crud as crud
from app.services.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.get("", response_model=List[DoctorResponse])
def read_doctors(
    search: Optional[str] = Query(None, description="Search by doctor name or hospital"),
    city: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.get_doctors(db, search=search, city=city, specialization=specialization, skip=skip, limit=limit)

@router.get("/{id}", response_model=DoctorResponse)
def read_doctor(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_doctor = crud.get_doctor_by_id(db, id)
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return db_doctor

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_new_doctor(
    doctor_in: DoctorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check duplicate
    existing = crud.get_doctor_by_name_and_hospital(db, doctor_in.name, doctor_in.hospital)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Doctor '{doctor_in.name}' at '{doctor_in.hospital}' already exists."
        )
    return crud.create_doctor(db, doctor_in)

@router.put("/{id}", response_model=DoctorResponse)
def update_doctor_details(
    id: int,
    doctor_in: DoctorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_doctor = crud.update_doctor(db, id, doctor_in)
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return db_doctor

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = crud.delete_doctor(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return None
