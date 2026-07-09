from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import engine, Base
from app.api.auth import router as auth_router
from app.api.doctors import router as doctors_router
from app.api.interactions import router as interactions_router
from app.api.followups import router as followups_router
from app.api.chat import router as chat_router
from app.api.summary import router as summary_router

# Auto-create tables on startup (especially helpful for SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-First CRM - HCP Interaction Module",
    description="Backend API supporting conversational AI interaction logging, doctor searches, and summaries.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with a prefix for API versioning
app.include_router(auth_router, prefix="/api")
app.include_router(doctors_router, prefix="/api")
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
