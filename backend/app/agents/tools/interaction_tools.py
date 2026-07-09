import json
import re
from datetime import datetime, date, time
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.models.models import Doctor, Interaction, FollowUp
from app.schemas.schemas import DoctorCreate, InteractionCreate, InteractionUpdate, FollowUpCreate, FollowUpUpdate
import app.services.crud as crud
from langchain_groq import ChatGroq
from app.agents.prompts.prompts import ENTITY_EXTRACTION_PROMPT, VISIT_SUMMARY_PROMPT

def get_llm():
    return ChatGroq(
        groq_api_key=settings.GROQ_API_KEY,
        model_name=settings.MODEL_NAME,
        temperature=0.0
    )

def parse_json_safely(text: str) -> Dict[str, Any]:
    # Strip markdown code blocks if present
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try finding json object in text
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Failed to parse JSON from LLM response: {text}")

# Tool 1: Log Interaction
def log_interaction_tool(
    db: Session,
    user_id: int,
    user_message: str
) -> Dict[str, Any]:
    """
    Extracts entities from the user message, finds/creates the doctor,
    generates a summary, and creates the interaction log.
    """
    llm = get_llm()
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Extract entities
    prompt = ENTITY_EXTRACTION_PROMPT.format(user_message=user_message, current_date=current_date_str)
    response = llm.invoke(prompt)
    entities = parse_json_safely(response.content)

    # 1. Resolve or Create Doctor
    doc_name = entities.get("doctor_name")
    hospital = entities.get("hospital") or "Unknown Hospital"
    specialization = entities.get("specialization") or "General"
    city = entities.get("city") or "Unknown City"

    if not doc_name:
        return {
            "success": False,
            "error": "Could not identify doctor name in the message. Please specify the doctor's name.",
            "entities": entities
        }

    # Clean doctor name (remove "Dr." prefix for searching/saving)
    cleaned_doc_name = re.sub(r"^(dr\.|dr\s+|doctor\s+)", "", doc_name, flags=re.IGNORECASE).strip()

    doctor = crud.get_doctor_by_name_and_hospital(db, name=cleaned_doc_name, hospital=hospital)
    if not doctor:
        # Create a new doctor record
        doctor_create = DoctorCreate(
            name=cleaned_doc_name,
            hospital=hospital,
            specialization=specialization,
            city=city
        )
        doctor = crud.create_doctor(db, doctor_create)

    # 2. Parse dates and times
    visit_date_val = date.today()
    if entities.get("visit_date"):
        try:
            visit_date_val = datetime.strptime(entities["visit_date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    visit_time_val = time(10, 0)
    if entities.get("visit_time"):
        try:
            visit_time_val = datetime.strptime(entities["visit_time"], "%H:%M").time()
        except ValueError:
            # check HH:MM:SS
            try:
                visit_time_val = datetime.strptime(entities["visit_time"], "%H:%M:%S").time()
            except ValueError:
                pass

    follow_up_date_val = None
    if entities.get("follow_up_date"):
        try:
            follow_up_date_val = datetime.strptime(entities["follow_up_date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    # 3. Generate summary using LLM
    summary_data = generate_visit_summary_tool(
        discussion=entities.get("discussion") or user_message,
        medicines=entities.get("medicines") or "",
        feedback=entities.get("feedback") or ""
    )
    
    # 4. Save to DB
    interaction_create = InteractionCreate(
        doctor_id=doctor.id,
        visit_date=visit_date_val,
        visit_time=visit_time_val,
        interaction_type=entities.get("interaction_type") or "In-Person",
        discussion=entities.get("discussion") or user_message,
        medicines=entities.get("medicines"),
        feedback=entities.get("feedback"),
        samples_requested=entities.get("samples_requested"),
        follow_up_date=follow_up_date_val,
        priority=entities.get("priority") or "Medium"
    )
    
    interaction = crud.create_interaction(db, user_id=user_id, interaction_in=interaction_create)
    
    # Add summary
    interaction.summary = summary_data.get("summary")
    db.commit()
    db.refresh(interaction)

    return {
        "success": True,
        "message": f"Interaction successfully logged for Dr. {doctor.name} at {doctor.hospital}.",
        "doctor": {
            "id": doctor.id,
            "name": doctor.name,
            "hospital": doctor.hospital,
            "specialization": doctor.specialization
        },
        "interaction_id": interaction.id,
        "entities": {
            "doctor_name": doctor.name,
            "hospital": doctor.hospital,
            "specialization": doctor.specialization,
            "visit_date": str(interaction.visit_date),
            "visit_time": str(interaction.visit_time),
            "interaction_type": interaction.interaction_type,
            "discussion": interaction.discussion,
            "medicines": interaction.medicines,
            "feedback": interaction.feedback,
            "samples_requested": interaction.samples_requested,
            "follow_up_date": str(interaction.follow_up_date) if interaction.follow_up_date else None,
            "priority": interaction.priority,
            "summary": interaction.summary
        }
    }

# Tool 2: Edit Interaction
def edit_interaction_tool(
    db: Session,
    interaction_id: int,
    updated_fields: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Locates an interaction, updates fields, regenerates summary if necessary, and saves changes.
    """
    interaction = crud.get_interaction_by_id(db, interaction_id)
    if not interaction:
        return {
            "success": False,
            "error": f"Interaction with ID {interaction_id} not found."
        }

    # Check if we need to regenerate the summary
    needs_new_summary = any(k in updated_fields for k in ["discussion", "medicines", "feedback"])

    # Map string fields back to dates/times if necessary
    for date_field in ["visit_date", "follow_up_date"]:
        if date_field in updated_fields and isinstance(updated_fields[date_field], str):
            try:
                updated_fields[date_field] = datetime.strptime(updated_fields[date_field], "%Y-%m-%d").date()
            except ValueError:
                pass
    if "visit_time" in updated_fields and isinstance(updated_fields["visit_time"], str):
        try:
            updated_fields["visit_time"] = datetime.strptime(updated_fields["visit_time"], "%H:%M").time()
        except ValueError:
            try:
                updated_fields["visit_time"] = datetime.strptime(updated_fields["visit_time"], "%H:%M:%S").time()
            except ValueError:
                pass

    interaction_update = InteractionUpdate(**updated_fields)
    updated_interaction = crud.update_interaction(db, interaction_id, interaction_update)

    if needs_new_summary:
        summary_data = generate_visit_summary_tool(
            discussion=updated_interaction.discussion,
            medicines=updated_interaction.medicines or "",
            feedback=updated_interaction.feedback or ""
        )
        updated_interaction.summary = summary_data.get("summary")
        db.commit()
        db.refresh(updated_interaction)

    return {
        "success": True,
        "message": f"Interaction {interaction_id} successfully updated.",
        "interaction_id": updated_interaction.id,
        "summary": updated_interaction.summary
    }

# Tool 3: Search Doctor
def search_doctor_tool(
    db: Session,
    search_query: str
) -> Dict[str, Any]:
    """
    Searches for a doctor, returns profile, previous visits, and interaction history.
    """
    doctors = crud.get_doctors(db, search=search_query, limit=10)
    if not doctors:
        return {
            "success": True,
            "message": f"No doctors found matching '{search_query}'.",
            "doctors": []
        }

    results = []
    for doc in doctors:
        # Get last 5 interactions
        interactions = db.query(Interaction).filter(Interaction.doctor_id == doc.id).order_by(Interaction.visit_date.desc()).limit(5).all()
        interactions_list = []
        for inter in interactions:
            interactions_list.append({
                "id": inter.id,
                "visit_date": str(inter.visit_date),
                "interaction_type": inter.interaction_type,
                "summary": inter.summary,
                "priority": inter.priority
            })
        
        results.append({
            "id": doc.id,
            "name": doc.name,
            "hospital": doc.hospital,
            "specialization": doc.specialization,
            "city": doc.city,
            "phone": doc.phone,
            "email": doc.email,
            "recent_interactions": interactions_list
        })

    return {
        "success": True,
        "message": f"Found {len(results)} doctors.",
        "doctors": results
    }

# Tool 4: Schedule Follow-up
def schedule_followup_tool(
    db: Session,
    interaction_id: int,
    follow_up_date_str: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates or updates a follow-up for a given interaction.
    """
    try:
        f_date = datetime.strptime(follow_up_date_str, "%Y-%m-%d").date()
    except ValueError:
        return {
            "success": False,
            "error": "Invalid date format. Please use YYYY-MM-DD."
        }

    interaction = crud.get_interaction_by_id(db, interaction_id)
    if not interaction:
        return {
            "success": False,
            "error": f"Interaction with ID {interaction_id} not found."
        }

    # Update follow_up_date in the Interaction table
    interaction.follow_up_date = f_date
    db.commit()

    # Check if a FollowUp record exists
    followup = db.query(FollowUp).filter(FollowUp.interaction_id == interaction_id).first()
    if followup:
        followup.follow_up_date = f_date
        if notes:
            followup.notes = notes
        db.commit()
        db.refresh(followup)
        action = "updated"
    else:
        followup = FollowUp(
            interaction_id=interaction_id,
            follow_up_date=f_date,
            status="PENDING",
            notes=notes or f"Follow-up scheduled from conversation"
        )
        db.add(followup)
        db.commit()
        db.refresh(followup)
        action = "created"

    return {
        "success": True,
        "message": f"Follow-up successfully {action} for {follow_up_date_str}.",
        "followup_id": followup.id,
        "follow_up_date": str(followup.follow_up_date),
        "status": followup.status
    }

# Tool 5: Generate Visit Summary
def generate_visit_summary_tool(
    discussion: str,
    medicines: str = "",
    feedback: str = ""
) -> Dict[str, Any]:
    """
    Generates a structured visit summary using Groq LLM.
    """
    llm = get_llm()
    prompt = VISIT_SUMMARY_PROMPT.format(
        discussion=discussion,
        medicines=medicines,
        feedback=feedback
    )
    try:
        response = llm.invoke(prompt)
        return parse_json_safely(response.content)
    except Exception as e:
        # Fallback summary
        return {
            "summary": f"Discussion about medicines: {medicines}. Feedback: {feedback}.",
            "key_discussion_points": [discussion[:100] + "..."] if discussion else [],
            "medicines_discussed": [m.strip() for m in medicines.split(",")] if medicines else [],
            "action_items": [],
            "next_follow_up": "Check back soon."
        }
