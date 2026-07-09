from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import date
from app.models.models import User, Doctor, Interaction, FollowUp
from app.schemas.schemas import UserRegister, DoctorCreate, DoctorUpdate, InteractionCreate, InteractionUpdate, FollowUpCreate, FollowUpUpdate
from app.services.auth import get_password_hash

# User CRUD
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_in: UserRegister):
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_pwd
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Doctor CRUD
def get_doctors(db: Session, search: str = None, city: str = None, specialization: str = None, skip: int = 0, limit: int = 100):
    query = db.query(Doctor)
    filters = []
    if search:
        filters.append(or_(Doctor.name.ilike(f"%{search}%"), Doctor.hospital.ilike(f"%{search}%")))
    if city:
        filters.append(Doctor.city.ilike(f"%{city}%"))
    if specialization:
        filters.append(Doctor.specialization.ilike(f"%{specialization}%"))
    if filters:
        query = query.filter(and_(*filters))
    return query.offset(skip).limit(limit).all()

def get_doctor_by_id(db: Session, doctor_id: int):
    return db.query(Doctor).filter(Doctor.id == doctor_id).first()

def get_doctor_by_name_and_hospital(db: Session, name: str, hospital: str):
    return db.query(Doctor).filter(
        and_(Doctor.name.ilike(name), Doctor.hospital.ilike(hospital))
    ).first()

def create_doctor(db: Session, doctor_in: DoctorCreate):
    # Check if duplicate doctor exists (same name and hospital)
    existing = get_doctor_by_name_and_hospital(db, doctor_in.name, doctor_in.hospital)
    if existing:
        return existing
    db_doctor = Doctor(
        name=doctor_in.name,
        hospital=doctor_in.hospital,
        specialization=doctor_in.specialization,
        city=doctor_in.city,
        phone=doctor_in.phone,
        email=doctor_in.email
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

def update_doctor(db: Session, doctor_id: int, doctor_in: DoctorUpdate):
    db_doctor = get_doctor_by_id(db, doctor_id)
    if not db_doctor:
        return None
    for field, val in doctor_in.model_dump(exclude_unset=True).items():
        setattr(db_doctor, field, val)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

def delete_doctor(db: Session, doctor_id: int):
    db_doctor = get_doctor_by_id(db, doctor_id)
    if not db_doctor:
        return False
    db.delete(db_doctor)
    db.commit()
    return True

# Interaction CRUD
def get_interactions(db: Session, user_id: int = None, doctor_id: int = None, search: str = None, skip: int = 0, limit: int = 100):
    query = db.query(Interaction)
    filters = []
    if user_id:
        filters.append(Interaction.user_id == user_id)
    if doctor_id:
        filters.append(Interaction.doctor_id == doctor_id)
    if search:
        filters.append(or_(
            Interaction.discussion.ilike(f"%{search}%"),
            Interaction.summary.ilike(f"%{search}%"),
            Interaction.medicines.ilike(f"%{search}%")
        ))
    if filters:
        query = query.filter(and_(*filters))
    return query.order_by(Interaction.visit_date.desc(), Interaction.visit_time.desc()).offset(skip).limit(limit).all()

def get_interaction_by_id(db: Session, interaction_id: int):
    return db.query(Interaction).filter(Interaction.id == interaction_id).first()

def create_interaction(db: Session, user_id: int, interaction_in: InteractionCreate):
    db_interaction = Interaction(
        doctor_id=interaction_in.doctor_id,
        user_id=user_id,
        visit_date=interaction_in.visit_date,
        visit_time=interaction_in.visit_time,
        interaction_type=interaction_in.interaction_type,
        discussion=interaction_in.discussion,
        medicines=interaction_in.medicines,
        feedback=interaction_in.feedback,
        samples_requested=interaction_in.samples_requested,
        follow_up_date=interaction_in.follow_up_date,
        priority=interaction_in.priority
    )
    # Note: Summary generation is handled by the API or agent, we will save it there
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)

    # If follow_up_date is specified, automatically create a FollowUp
    if interaction_in.follow_up_date:
        db_followup = FollowUp(
            interaction_id=db_interaction.id,
            follow_up_date=interaction_in.follow_up_date,
            status="PENDING",
            notes=f"Follow-up for visit on {interaction_in.visit_date}"
        )
        db.add(db_followup)
        db.commit()

    return db_interaction

def update_interaction(db: Session, interaction_id: int, interaction_in: InteractionUpdate):
    db_interaction = get_interaction_by_id(db, interaction_id)
    if not db_interaction:
        return None
    
    old_followup_date = db_interaction.follow_up_date

    for field, val in interaction_in.model_dump(exclude_unset=True).items():
        setattr(db_interaction, field, val)
    db.commit()
    db.refresh(db_interaction)

    # Handle follow-up update if follow_up_date changed
    new_followup_date = db_interaction.follow_up_date
    if new_followup_date != old_followup_date:
        if new_followup_date:
            # Check if there is an existing follow-up
            existing_followup = db.query(FollowUp).filter(FollowUp.interaction_id == interaction_id).first()
            if existing_followup:
                existing_followup.follow_up_date = new_followup_date
            else:
                db_followup = FollowUp(
                    interaction_id=interaction_id,
                    follow_up_date=new_followup_date,
                    status="PENDING",
                    notes=f"Follow-up rescheduled"
                )
                db.add(db_followup)
            db.commit()
        else:
            # If follow_up_date was removed, delete the follow_up
            db.query(FollowUp).filter(FollowUp.interaction_id == interaction_id).delete()
            db.commit()

    return db_interaction

def delete_interaction(db: Session, interaction_id: int):
    db_interaction = get_interaction_by_id(db, interaction_id)
    if not db_interaction:
        return False
    db.delete(db_interaction)
    db.commit()
    return True

# Follow-up CRUD
def get_followups(db: Session, user_id: int = None, status: str = None):
    query = db.query(FollowUp).join(Interaction)
    filters = []
    if user_id:
        filters.append(Interaction.user_id == user_id)
    if status:
        filters.append(FollowUp.status == status)
    if filters:
        query = query.filter(and_(*filters))
    return query.order_by(FollowUp.follow_up_date.asc()).all()

def create_followup(db: Session, followup_in: FollowUpCreate):
    db_followup = FollowUp(
        interaction_id=followup_in.interaction_id,
        follow_up_date=followup_in.follow_up_date,
        status="PENDING",
        notes=followup_in.notes
    )
    db.add(db_followup)
    db.commit()
    db.refresh(db_followup)
    return db_followup

def update_followup(db: Session, followup_id: int, followup_in: FollowUpUpdate):
    db_followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not db_followup:
        return None
    for field, val in followup_in.model_dump(exclude_unset=True).items():
        setattr(db_followup, field, val)
    db.commit()
    db.refresh(db_followup)
    return db_followup
