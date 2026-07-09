from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import SummaryRequest, SummaryResponse
from app.services.auth import get_current_user
from app.models.models import User
from app.agents.tools.interaction_tools import generate_visit_summary_tool

router = APIRouter(prefix="/summary", tags=["AI Summary"])

@router.post("", response_model=SummaryResponse)
def post_summary(
    payload: SummaryRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        data = generate_visit_summary_tool(
            discussion=payload.discussion,
            medicines=payload.medicines or "",
            feedback=payload.feedback or ""
        )
        return SummaryResponse(
            summary=data.get("summary", ""),
            key_discussion_points=data.get("key_discussion_points", []),
            medicines_discussed=data.get("medicines_discussed", []),
            action_items=data.get("action_items", []),
            next_follow_up=data.get("next_follow_up")
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )
