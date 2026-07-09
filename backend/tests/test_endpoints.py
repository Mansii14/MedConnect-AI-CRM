import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, MagicMock

from app.main import app
from app.database.connection import Base, get_db

# Use in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_register_and_login(client):
    # Test register
    reg_response = client.post(
        "/api/auth/register",
        json={"name": "Test Representative", "email": "test@company.com", "password": "securepassword"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["email"] == "test@company.com"

    # Test login
    login_response = client.post(
        "/api/auth/login",
        json={"email": "test@company.com", "password": "securepassword"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    assert login_response.json()["user"]["name"] == "Test Representative"

def test_doctors_crud(client):
    # Register & login to get token
    client.post(
        "/api/auth/register",
        json={"name": "Rep Two", "email": "rep2@company.com", "password": "securepassword"}
    )
    login_response = client.post(
        "/api/auth/login",
        json={"email": "rep2@company.com", "password": "securepassword"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create doctor
    doc_response = client.post(
        "/api/doctors",
        headers=headers,
        json={
            "name": "Sharma",
            "hospital": "Apollo Hospital",
            "specialization": "Cardiologist",
            "city": "New Delhi",
            "phone": "9988776655",
            "email": "sharma@apollo.com"
        }
    )
    assert doc_response.status_code == 201
    assert doc_response.json()["name"] == "Sharma"
    doc_id = doc_response.json()["id"]

    # Get doctors list
    get_response = client.get("/api/doctors", headers=headers)
    assert get_response.status_code == 200
    assert len(get_response.json()) >= 1

def test_interactions_crud(client):
    # Auth setup
    client.post(
        "/api/auth/register",
        json={"name": "Rep Three", "email": "rep3@company.com", "password": "securepassword"}
    )
    login_response = client.post(
        "/api/auth/login",
        json={"email": "rep3@company.com", "password": "securepassword"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create doctor first
    doc_response = client.post(
        "/api/doctors",
        headers=headers,
        json={
            "name": "Verma",
            "hospital": "Care Clinic",
            "specialization": "Pediatrician",
            "city": "Mumbai"
        }
    )
    doc_id = doc_response.json()["id"]

    # Mock LLM summary call inside create_interaction
    with patch("app.api.interactions.generate_visit_summary_tool") as mock_summary:
        mock_summary.return_value = {
            "summary": "Met Dr. Verma. Shared new pediatric medicine details.",
            "key_discussion_points": ["Discussed Metformin pediatric dosage", "Exchanged materials"],
            "medicines_discussed": ["Metformin Pediatric"],
            "action_items": ["Deliver brochures"],
            "next_follow_up": "Check back in 2 weeks"
        }

        # Create interaction
        inter_response = client.post(
            "/api/interactions",
            headers=headers,
            json={
                "doctor_id": doc_id,
                "visit_date": "2026-07-09",
                "visit_time": "10:30:00",
                "interaction_type": "In-Person",
                "discussion": "Shared details about metformin pediatric trials and dosage guidelines.",
                "medicines": "Metformin Pediatric",
                "feedback": "Doctor requested clinical trial brochure.",
                "samples_requested": "Brochures",
                "follow_up_date": "2026-07-23",
                "priority": "High"
            }
        )
        assert inter_response.status_code == 201
        assert inter_response.json()["summary"] == "Met Dr. Verma. Shared new pediatric medicine details."
        inter_id = inter_response.json()["id"]

        # Read interaction
        read_response = client.get(f"/api/interactions/{inter_id}", headers=headers)
        assert read_response.status_code == 200
        assert read_response.json()["doctor"]["name"] == "Verma"

# Mock the entire LangGraph runner for the Chat endpoint testing
@patch("app.api.chat.run_agent")
def test_chat_ai_endpoint(mock_run, client):
    client.post(
        "/api/auth/register",
        json={"name": "Rep Four", "email": "rep4@company.com", "password": "securepassword"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "rep4@company.com", "password": "securepassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Configure Mock
    mock_run.return_value = {
        "reply": "I have extracted the details of your visit with Dr. Sharma.",
        "extracted_json": {
            "doctor_name": "Sharma",
            "hospital": "Apollo Hospital",
            "specialization": "Cardiologist",
            "city": "Mumbai",
            "visit_date": "2026-07-09",
            "visit_time": "10:00",
            "interaction_type": "In-Person",
            "discussion": "Discussed diabetes medicine.",
            "medicines": "Metformin",
            "feedback": "Positive feedback",
            "samples_requested": "Brochures and samples",
            "follow_up_date": "2026-07-16",
            "priority": "High"
        },
        "intent": "log_interaction"
    }

    chat_res = client.post(
        "/api/chat",
        headers=headers,
        json={"message": "I met Dr Sharma today at Apollo Hospital. Discussed diabetes medicine. Requested samples. Follow up next Monday."}
    )
    assert chat_res.status_code == 200
    assert "reply" in chat_res.json()
    assert chat_res.json()["extracted_entities"]["doctor_name"] == "Sharma"
    assert chat_res.json()["intent"] == "log_interaction"
