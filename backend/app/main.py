from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.database.connection import engine, Base
from app.api.auth import router as auth_router
from app.api.doctors import router as doctors_router
from app.api.interactions import router as interactions_router
from app.api.followups import router as followups_router
from app.api.chat import router as chat_router
from app.api.summary import router as summary_router

# Auto-create tables on startup (especially helpful for SQLite)
Base.metadata.create_all(bind=engine)

# Auto-seed if database is empty
from app.database.connection import SessionLocal
from app.models.models import User, Doctor, Interaction
from app.services.auth import get_password_hash
from datetime import date, time

db = SessionLocal()
try:
    if db.query(User).count() == 0:
        print("Database is empty. Auto-seeding...")
        
        # 1. Create demo user
        demo_user = User(
            name="Demo User",
            email="demo@company.com",
            password_hash=get_password_hash("HcpCrmSecurePass99!")
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        
        # 2. Create sample doctors
        doc1 = Doctor(name="Dr. Rajesh Sharma", hospital="Max Super Speciality Hospital", specialization="Cardiologist", city="New Delhi", phone="+91 98110 12345", email="rajesh.sharma@max.com")
        doc2 = Doctor(name="Dr. Priya Patel", hospital="Reliance Foundation Hospital", specialization="Pediatrician", city="Mumbai", phone="+91 98220 23456", email="priya.patel@reliance.com")
        doc3 = Doctor(name="Dr. Anirudh Kulkarni", hospital="Manipal Hospital", specialization="Orthopedics", city="Bangalore", phone="+91 98450 34567", email="anirudh.k@manipal.com")
        db.add_all([doc1, doc2, doc3])
        db.commit()
        db.refresh(doc1)
        db.refresh(doc2)
        db.refresh(doc3)
        
        # 3. Create sample interactions
        inter1 = Interaction(
            doctor_id=doc1.id,
            user_id=demo_user.id,
            visit_date=date.today(),
            visit_time=time(10, 0),
            interaction_type="In-Person",
            discussion="Discussed new clinical trial data for Cardioguard-5.",
            medicines="Cardioguard-5 (5mg Amlodipine)",
            feedback="Very positive response, requested samples.",
            samples_requested="2 boxes of 10 tablets",
            summary="Met with Dr. Rajesh Sharma. Discussed Cardioguard-5. Doctor requested samples.",
            priority="High"
        )
        inter2 = Interaction(
            doctor_id=doc2.id,
            user_id=demo_user.id,
            visit_date=date.today(),
            visit_time=time(14, 30),
            interaction_type="Video Call",
            discussion="Virtual briefing on pediatric vaccine safety guidelines.",
            medicines="PediaShield Vaccine",
            feedback="Appreciated the info, requested email follow-up.",
            samples_requested="None",
            summary="Virtual meeting with Dr. Priya Patel regarding PediaShield.",
            priority="Medium"
        )
        db.add_all([inter1, inter2])
        db.commit()
        print("Auto-seeding complete!")
except Exception as e:
    print("Error during auto-seed:", e)
finally:
    db.close()

app = FastAPI(
    title="AI-First CRM - HCP Interaction Module",
    description="Backend API supporting conversational AI interaction logging, doctor searches, and summaries.",
    version="1.0.0"
)

# CORS configuration
import os
is_production = os.environ.get("VERCEL_ENV") == "production" or os.environ.get("RENDER") is not None

if is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

# Include Routers with a prefix for API versioning
app.include_router(auth_router, prefix="/api")
app.include_router(doctors_router, prefix="/api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)}
    )
app.include_router(interactions_router, prefix="/api")
app.include_router(followups_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(summary_router, prefix="/api")

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-First CRM - HCP Interaction Module Backend",
        "database": str(engine.url.drivername)
    }
