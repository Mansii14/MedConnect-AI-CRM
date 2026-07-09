from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, time
from typing import Optional, List, Any

# Auth Schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None


# Doctor Schemas
class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    hospital: str = Field(..., min_length=2, max_length=150)
    specialization: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    hospital: Optional[str] = None
    specialization: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class DoctorResponse(BaseModel):
    id: int
    name: str
    hospital: str
    specialization: str
    city: str
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Interaction Schemas
class InteractionCreate(BaseModel):
    doctor_id: int
    visit_date: date
    visit_time: time
    interaction_type: str  # In-Person, Video Call, Phone Call, Email
    discussion: str
    medicines: Optional[str] = None
    feedback: Optional[str] = None
    samples_requested: Optional[str] = None
    follow_up_date: Optional[date] = None
    priority: str = "Medium"  # Low, Medium, High

class InteractionUpdate(BaseModel):
    doctor_id: Optional[int] = None
    visit_date: Optional[date] = None
    visit_time: Optional[time] = None
    interaction_type: Optional[str] = None
    discussion: Optional[str] = None
    medicines: Optional[str] = None
    feedback: Optional[str] = None
    samples_requested: Optional[str] = None
    summary: Optional[str] = None
    follow_up_date: Optional[date] = None
    priority: Optional[str] = None

class InteractionResponse(BaseModel):
    id: int
    doctor_id: int
    user_id: int
    visit_date: date
    visit_time: time
    interaction_type: str
    discussion: str
    medicines: Optional[str] = None
    feedback: Optional[str] = None
    samples_requested: Optional[str] = None
    summary: Optional[str] = None
    follow_up_date: Optional[date] = None
    priority: str
    created_at: datetime
    updated_at: datetime
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True


# FollowUp Schemas
class FollowUpCreate(BaseModel):
    interaction_id: int
    follow_up_date: date
    notes: Optional[str] = None

class FollowUpUpdate(BaseModel):
    follow_up_date: Optional[date] = None
    status: Optional[str] = None  # PENDING, COMPLETED, CANCELLED
    notes: Optional[str] = None

class FollowUpResponse(BaseModel):
    id: int
    interaction_id: int
    follow_up_date: date
    status: str
    notes: Optional[str] = None
    interaction: Optional[Any] = None

    class Config:
        from_attributes = True


# Chat Schemas
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    extracted_entities: Optional[dict] = None
    intent: Optional[str] = None


# Summary Schema
class SummaryRequest(BaseModel):
    discussion: str
    medicines: Optional[str] = None
    feedback: Optional[str] = None

class SummaryResponse(BaseModel):
    summary: str
    key_discussion_points: List[str]
    medicines_discussed: List[str]
    action_items: List[str]
    next_follow_up: Optional[str] = None
