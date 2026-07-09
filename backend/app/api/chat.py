from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.schemas import ChatRequest, ChatResponse
from app.services.auth import get_current_user
from app.models.models import User
from app.agents.langgraph.graph import run_agent

router = APIRouter(prefix="/chat", tags=["AI Chat"])

@router.post("", response_model=ChatResponse)
def post_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = run_agent(
            db=db,
            user_id=current_user.id,
            message=payload.message,
            session_id=payload.session_id
        )
        return ChatResponse(
            reply=result["reply"],
            extracted_entities=result["extracted_json"],
            intent=result["intent"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LangGraph Agent Error: {str(e)}"
        )
