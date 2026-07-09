import os
import sys
from datetime import datetime, date, time, timedelta
import random

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal, Base, engine
from app.models.models import User, Doctor, Interaction, FollowUp

def seed_db():
    print("Connecting to database...")
    db = SessionLocal()
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Check if demo user exists, if not create one
    demo_user = db.query(User).filter(User.email == "demo@company.com").first()
    if not demo_user:
        print("Creating demo user...")
        from app.services.auth import get_password_hash
        demo_user = User(
            name="Demo User",
            email="demo@company.com",
            password_hash=get_password_hash("HcpCrmSecurePass99!")
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    
    # Check if mansi user exists, if not create one
    mansi_user = db.query(User).filter(User.email == "mansi@gmail.com").first()
    if not mansi_user:
        print("Creating Mansi Saraf...")
        from app.services.auth import get_password_hash
        mansi_user = User(
            name="Mansi Saraf",
            email="mansi@gmail.com",
            password_hash=get_password_hash("MansiSecurePass99!")
        )
        db.add(mansi_user)
        db.commit()
        db.refresh(mansi_user)

    user_ids = [demo_user.id, mansi_user.id]
    
    # Seed Doctors if they don't exist
    existing_docs_count = db.query(Doctor).count()
    if existing_docs_count > 0:
        print(f"Database already has {existing_docs_count} doctors. Cleaning old doctor/interaction/followup data for clean seed...")
        db.query(FollowUp).delete()
        db.query(Interaction).delete()
        db.query(Doctor).delete()
        db.commit()
        
    doctors_data = [
        {
            "name": "Dr. Rajesh Sharma",
            "hospital": "Max Super Speciality Hospital",
            "specialization": "Cardiologist",
            "city": "New Delhi",
            "phone": "+91 98110 12345",
            "email": "rajesh.sharma@maxhealthcare.com"
        },
        {
            "name": "Dr. Priya Patel",
            "hospital": "H.N. Reliance Foundation Hospital",
            "specialization": "Pediatrician",
            "city": "Mumbai",
            "phone": "+91 98220 23456",
            "email": "priya.patel@rfh.org.in"
        },
        {
            "name": "Dr. Anirudh Kulkarni",
            "hospital": "Manipal Hospital",
            "specialization": "Orthopedics",
            "city": "Bangalore",
            "phone": "+91 98450 34567",
            "email": "anirudh.k@manipalhospitals.com"
        },
        {
            "name": "Dr. Sunita Rao",
            "hospital": "Apollo Hospitals",
            "specialization": "Gynecologist",
            "city": "Hyderabad",
            "phone": "+91 98660 45678",
            "email": "dr.sunita_rao@apollo.com"
        },
        {
            "name": "Dr. Vikram Aditya",
            "hospital": "Fortis Memorial Research Institute",
            "specialization": "Neurologist",
            "city": "Gurugram",
            "phone": "+91 98120 56789",
            "email": "vikram.aditya@fortishealthcare.com"
        },
        {
            "name": "Dr. Meera Nair",
            "hospital": "Aster CMI Hospital",
            "specialization": "Oncologist",
            "city": "Bangalore",
            "phone": "+91 98860 67890",
            "email": "meera.nair@asterhospital.com"
        },
        {
            "name": "Dr. Amit Verma",
            "hospital": "Medanta - The Medicity",
            "specialization": "Dermatologist",
            "city": "Gurugram",
            "phone": "+91 98130 78901",
            "email": "amit.verma@medanta.org"
        },
        {
            "name": "Dr. Shalini Sen",
            "hospital": "Kokilaben Dhirubhai Ambani Hospital",
            "specialization": "Endocrinologist",
            "city": "Mumbai",
            "phone": "+91 98330 89012",
            "email": "shalini.sen@kdah.com"
        },
        {
            "name": "Dr. Rakesh Gupta",
            "hospital": "Sir Ganga Ram Hospital",
            "specialization": "Gastroenterologist",
            "city": "New Delhi",
            "phone": "+91 98100 90123",
            "email": "rakesh.gupta@sgrh.com"
        },
        {
            "name": "Dr. Neha Deshmukh",
            "hospital": "Ruby Hall Clinic",
            "specialization": "General Physician",
            "city": "Pune",
            "phone": "+91 98900 01234",
            "email": "neha.deshmukh@rubyhall.com"
        }
    ]

    print("Inserting doctors...")
    doctors = []
    for doc_data in doctors_data:
        doc = Doctor(**doc_data)
        db.add(doc)
        doctors.append(doc)
    
    db.commit()
    for doc in doctors:
        db.refresh(doc)
        
    print(f"Successfully seeded {len(doctors)} doctors.")

    # Discussions, medicines, feedback, and sample requests for realistic logs
    discussions = [
        "Discussed the launch of the new anti-hypertensive drug (Cardioguard-5) and shared clinical trials data.",
        "Followed up on the usage of GlucoStop-M for diabetic patients. Doctor reported good patient response.",
        "Demonstrated the advantages of OsteoJoint capsule over traditional calcium supplements. Doctor was interested.",
        "Shared the patient assistance program brochures for oncology care. Discussed prescription frequency.",
        "Introduced DermaClear cream for eczema treatment. Shared clinical trial findings on skin barrier recovery.",
        "Conducted a virtual call to update on pediatric immunization schedules and our vaccine storage guidelines.",
        "Discussed gastro-protective agents and feedback on reflux symptoms when using RefluxShield-20.",
        "Spoke about the efficacy of NeuroBoost-OD in peripheral neuropathy cases. Addressed concerns about pricing.",
        "Shared the latest research updates on lipid control. Doctor agreed to trial LipiMed-10 on 10 patients.",
        "Brief meeting regarding general multi-vitamin prescriptions for post-operative recovery."
    ]

    medicines_list = [
        "Cardioguard-5 (5mg Amlodipine + 50mg Metoprolol)",
        "GlucoStop-M (Metformin 500mg + Gliptin 50mg)",
        "OsteoJoint (Calcium Citrate + Vitamin D3 + Zinc)",
        "OncoCare-100 (Chemotherapy supportive medication)",
        "DermaClear Eczema Recovery Cream",
        "PediaShield Combo Vaccine",
        "RefluxShield-20 (Rabeprazole 20mg)",
        "NeuroBoost-OD (Methylcobalamin + Alpha Lipoic Acid)",
        "LipiMed-10 (Atorvastatin 10mg)",
        "VitaBoost Active Multi-vitamin"
    ]

    feedbacks = [
        "Highly satisfied with clinical trials data. Requested samples.",
        "Positive feedback from 5 patients. Will continue prescribing.",
        "Expressed concern about tablet size but finds formulation superior.",
        "Appreciates the patient assistance plan. Wants a detailed follow-up session.",
        "Found the skin barrier recovery statistics impressive.",
        "Neutral feedback. Appreciates the digital webinar invite.",
        "Requested more clinical studies regarding long-term use.",
        "Mentioned cost is slightly high for middle-class patients. Requested discount options.",
        "Very positive. Will start recommending to new hyperlipidemia patients.",
        "Standard response. Will prescribe if patients request cost-effective multi-vitamins."
    ]

    samples = [
        "Cardioguard-5 (2 packs of 10 tablets)",
        "GlucoStop-M (5 trial strips)",
        "OsteoJoint (10 sample bottles)",
        "OncoCare Patient Guidebook (5 copies)",
        "DermaClear Cream samples (15 small tubes)",
        "Pediatric chart poster (1 piece)",
        "RefluxShield-20 (10 strips of 15 tablets)",
        "NeuroBoost-OD (20 patient sample strips)",
        "LipiMed-10 (5 strips)",
        "VitaBoost (10 starter boxes)"
    ]

    interaction_types = ["In-Person", "Video Call", "Phone", "Email"]
    priorities = ["High", "Medium", "Low"]

    print("Generating interactions...")
    today = date.today()
    
    # Generate 15 interactions distributed over the last 30 days
    interactions = []
    for i in range(18):
        doc = random.choice(doctors)
        user_id = random.choice(user_ids)
        # Distribute dates from last 30 days
        days_ago = random.randint(1, 30)
        visit_date = today - timedelta(days=days_ago)
        
        # Pick random indices for coherent text content
        idx = random.randint(0, len(discussions)-1)
        
        visit_hour = random.randint(9, 17)
        visit_min = random.choice([0, 15, 30, 45])
        
        interaction = Interaction(
            doctor_id=doc.id,
            user_id=user_id,
            visit_date=visit_date,
            visit_time=time(visit_hour, visit_min),
            interaction_type=random.choice(interaction_types),
            discussion=discussions[idx],
            medicines=medicines_list[idx],
            feedback=feedbacks[idx],
            samples_requested=samples[idx],
            summary=f"Met with {doc.name} at {doc.hospital}. {discussions[idx]} Doctor feedback: {feedbacks[idx]}.",
            follow_up_date=visit_date + timedelta(days=random.randint(7, 21)),
            priority=random.choice(priorities)
        )
        db.add(interaction)
        interactions.append(interaction)
        
    db.commit()
    
    print("Generating followups...")
    for inter in interactions:
        # Refresh to get ID
        db.refresh(inter)
        
        # Create follow-up for 60% of interactions
        if random.random() < 0.6:
            # If follow up date is in the past, status is COMPLETED or CANCELLED, else PENDING
            status = "PENDING"
            if inter.follow_up_date < today:
                status = random.choice(["COMPLETED", "CANCELLED"])
                
            followup = FollowUp(
                interaction_id=inter.id,
                follow_up_date=inter.follow_up_date,
                status=status,
                notes=f"Follow up regarding discussion on {inter.medicines} with {inter.doctor.name}."
            )
            db.add(followup)

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_db()
