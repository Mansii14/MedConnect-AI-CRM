from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.schemas.schemas import FollowUpCreate, FollowUpUpdate, FollowUpResponse
import app.services.crud as crud
from app.services.auth import get_current_user
from app.models.models import User, FollowUp, Interaction

router = APIRouter(prefix="/followup", tags=["Follow Ups"])

@router.get("", response_model=List[FollowUpResponse])
def read_followups(
    status: Optional[str] = Query(None, description="Filter by status, e.g. PENDING, COMPLETED"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch followups for the current user
    return crud.get_followups(db, user_id=current_user.id, status=status)

@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_new_followup(
    followup_in: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify interaction exists and belongs to user
    inter = crud.get_interaction_by_id(db, followup_in.interaction_id)
    if not inter:
        raise HTTPException(status_code=404, detail="Interaction not found")
    if inter.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return crud.create_followup(db, followup_in)

@router.put("/{id}", response_model=FollowUpResponse)
def update_followup_status(
    id: int,
    followup_in: FollowUpUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_followup = db.query(FollowUp).join(Interaction).filter(
        FollowUp.id == id,
        Interaction.user_id == current_user.id
    ).first()
    
    if not db_followup:
        raise HTTPException(status_code=404, detail="Follow up not found")
        
    return crud.update_followup(db, id, followup_in)
