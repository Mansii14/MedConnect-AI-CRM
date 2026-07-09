from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    interactions = relationship("Interaction", back_populates="user", cascade="all, delete-orphan")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    hospital = Column(String(150), nullable=False)
    specialization = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    interactions = relationship("Interaction", back_populates="doctor", cascade="all, delete-orphan")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    visit_date = Column(Date, nullable=False)
    visit_time = Column(Time, nullable=False)
    interaction_type = Column(String(50), nullable=False)  # In-Person, Video Call, Phone, Email, etc.
    discussion = Column(Text, nullable=False)
    medicines = Column(Text, nullable=True)  # List or notes on medicines discussed
    feedback = Column(Text, nullable=True)
    samples_requested = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    priority = Column(String(20), nullable=False, default="Medium")  # Low, Medium, High
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="interactions")
    doctor = relationship("Doctor", back_populates="interactions")
    follow_ups = relationship("FollowUp", back_populates="interaction", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"), nullable=False)
    follow_up_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)

    interaction = relationship("Interaction", back_populates="follow_ups")
