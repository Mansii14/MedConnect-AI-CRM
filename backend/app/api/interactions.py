from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.schemas.schemas import InteractionCreate, InteractionUpdate, InteractionResponse
import app.services.crud as crud
from app.services.auth import get_current_user
from app.models.models import User
from app.agents.tools.interaction_tools import generate_visit_summary_tool

router = APIRouter(prefix="/interactions", tags=["Interactions"])

@router.get("", response_model=List[InteractionResponse])
def read_interactions(
    doctor_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search term in discussion or medicines"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Support viewing only this user's interactions or general list
    return crud.get_interactions(db, user_id=current_user.id, doctor_id=doctor_id, search=search, skip=skip, limit=limit)

@router.get("/{id}", response_model=InteractionResponse)
def read_interaction(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_interaction = crud.get_interaction_by_id(db, id)
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if db_interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this interaction")
    return db_interaction

@router.post("", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
def create_new_interaction(
    interaction_in: InteractionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify doctor exists
    db_doctor = crud.get_doctor_by_id(db, interaction_in.doctor_id)
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    db_interaction = crud.create_interaction(db, user_id=current_user.id, interaction_in=interaction_in)
    
    # Auto-generate summary
    summary_data = generate_visit_summary_tool(
        discussion=db_interaction.discussion,
        medicines=db_interaction.medicines or "",
        feedback=db_interaction.feedback or ""
    )
    db_interaction.summary = summary_data.get("summary")
    db.commit()
    db.refresh(db_interaction)
    
    return db_interaction

@router.put("/{id}", response_model=InteractionResponse)
def update_interaction_details(
    id: int,
    interaction_in: InteractionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify ownership
    db_interaction = crud.get_interaction_by_id(db, id)
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if db_interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this interaction")

    # If doctor_id is updated, check if doctor exists
    if interaction_in.doctor_id is not None:
        db_doctor = crud.get_doctor_by_id(db, interaction_in.doctor_id)
        if not db_doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

    updated = crud.update_interaction(db, id, interaction_in)
    
    # Regenerate summary if text fields changed
    if any(getattr(interaction_in, k) is not None for k in ["discussion", "medicines", "feedback"]):
        summary_data = generate_visit_summary_tool(
            discussion=updated.discussion,
            medicines=updated.medicines or "",
            feedback=updated.feedback or ""
        )
        updated.summary = summary_data.get("summary")
        db.commit()
        db.refresh(updated)
        
    return updated

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interaction_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_interaction = crud.get_interaction_by_id(db, id)
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if db_interaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this interaction")

    crud.delete_interaction(db, id)
    return None
