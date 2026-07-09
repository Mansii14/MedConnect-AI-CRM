import json
from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from app.config.settings import settings
from app.agents.prompts.prompts import (
    INTENT_CLASSIFICATION_PROMPT,
    ENTITY_EXTRACTION_PROMPT,
    RESPONSE_GENERATOR_PROMPT
)
from app.agents.tools.interaction_tools import (
    get_llm,
    parse_json_safely,
    log_interaction_tool,
    edit_interaction_tool,
    search_doctor_tool,
    schedule_followup_tool,
    generate_visit_summary_tool
)

class AgentState(TypedDict):
    messages: List[BaseMessage]
    intent: Optional[str]
    entities: Optional[Dict[str, Any]]
    selected_tool: Optional[str]
    tool_parameters: Optional[Dict[str, Any]]
    tool_output: Optional[Dict[str, Any]]
    session_id: Optional[str]
    current_user_id: int
    final_response: Optional[str]
    extracted_json: Optional[Dict[str, Any]]

# --- Nodes ---

def input_node(state: AgentState) -> Dict[str, Any]:
    # Pass-through or pre-processing
    return {}

def intent_classifier(state: AgentState) -> Dict[str, Any]:
    llm = get_llm()
    last_message = state["messages"][-1].content
    
    prompt = INTENT_CLASSIFICATION_PROMPT.format(user_message=last_message)
    try:
        response = llm.invoke(prompt)
        res_json = parse_json_safely(response.content)
        intent = res_json.get("intent", "general_chat")
    except Exception:
        intent = "general_chat"
        
    return {"intent": intent}

def entity_extractor(state: AgentState) -> Dict[str, Any]:
    intent = state["intent"]
    if intent not in ["log_interaction", "edit_interaction", "schedule_followup"]:
        return {"entities": {}}
        
    llm = get_llm()
    last_message = state["messages"][-1].content
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    
    prompt = ENTITY_EXTRACTION_PROMPT.format(user_message=last_message, current_date=current_date_str)
    try:
        response = llm.invoke(prompt)
        entities = parse_json_safely(response.content)
    except Exception:
        entities = {}
        
    return {"entities": entities}

def execute_tool(state: AgentState, db: Session) -> Dict[str, Any]:
    intent = state["intent"]
    user_id = state["current_user_id"]
    last_message = state["messages"][-1].content
    entities = state.get("entities") or {}
    
    tool_output = None
    extracted_json = None
    
    try:
        if intent == "log_interaction":
            # The log tool creates the DB entry and extracts everything
            tool_output = log_interaction_tool(db, user_id, last_message)
            if tool_output.get("success"):
                extracted_json = tool_output.get("entities")
                
        elif intent == "edit_interaction":
            # We need to identify interaction_id. Let's look for numbers in the string
            # or ask LLM to extract the ID and changed fields.
            llm = get_llm()
            edit_prompt = f"""
            Identify the interaction ID and the fields to edit from the user message.
            User message: "{last_message}"
            Format response as JSON with keys:
            - "interaction_id": integer ID
            - "updated_fields": JSON object containing fields to change (e.g. priority, discussion, follow_up_date)
            """
            try:
                edit_res = llm.invoke(edit_prompt)
                edit_data = parse_json_safely(edit_res.content)
                inter_id = edit_data.get("interaction_id")
                fields = edit_data.get("updated_fields") or {}
                if inter_id:
                    tool_output = edit_interaction_tool(db, inter_id, fields)
                else:
                    tool_output = {"success": False, "error": "Could not identify the interaction ID to edit."}
            except Exception as e:
                tool_output = {"success": False, "error": f"Failed to parse edit parameters: {str(e)}"}
                
        elif intent == "search_doctor":
            # We search for doctors
            query = entities.get("doctor_name") or last_message
            tool_output = search_doctor_tool(db, query)
            
        elif intent == "schedule_followup":
            # Find follow up params
            # We need doctor_id or interaction_id, and follow_up_date
            # Let's extract them using LLM
            llm = get_llm()
            fup_prompt = f"""
            Identify interaction_id and follow_up_date (YYYY-MM-DD) from the message.
            Today's date: {datetime.now().strftime("%Y-%m-%d")}
            User message: "{last_message}"
            Format as JSON with keys:
            - "interaction_id": integer ID (or null)
            - "follow_up_date": date string (YYYY-MM-DD)
            - "notes": string notes (or null)
            """
            try:
                fup_res = llm.invoke(fup_prompt)
                fup_data = parse_json_safely(fup_res.content)
                inter_id = fup_data.get("interaction_id")
                f_date = fup_data.get("follow_up_date")
                notes = fup_data.get("notes")
                
                if not inter_id:
                    # Try to find the last interaction for this user/doctor
                    # For simplicity, we can fetch the user's most recent interaction
                    from app.models.models import Interaction
                    last_inter = db.query(Interaction).filter(Interaction.user_id == user_id).order_by(Interaction.visit_date.desc()).first()
                    if last_inter:
                        inter_id = last_inter.id

                if inter_id and f_date:
                    tool_output = schedule_followup_tool(db, inter_id, f_date, notes)
                else:
                    tool_output = {"success": False, "error": "Could not identify interaction ID or follow up date."}
            except Exception as e:
                tool_output = {"success": False, "error": f"Failed to parse follow-up parameters: {str(e)}"}
                
        elif intent == "generate_summary":
            tool_output = generate_visit_summary_tool(
                discussion=last_message,
                medicines="",
                feedback=""
            )
            
        else: # general_chat
            tool_output = {"message": "Direct chat."}
            
    except Exception as e:
        tool_output = {"success": False, "error": f"Tool execution failed: {str(e)}"}

    return {"tool_output": tool_output, "extracted_json": extracted_json}

def response_generator(state: AgentState) -> Dict[str, Any]:
    llm = get_llm()
    intent = state.get("intent") or "general_chat"
    tool_output = state.get("tool_output") or {}
    entities = state.get("entities") or {}
    last_message = state["messages"][-1].content
    
    if intent == "general_chat":
        # Let LLM chat naturally
        prompt = f"""
        You are a helpful AI assistant for a pharmaceutical Medical Representative CRM.
        Respond to the user's message in a professional, helpful manner.
        User message: {last_message}
        """
        response = llm.invoke(prompt)
        final_reply = response.content
    else:
        # Structured response generation
        prompt = RESPONSE_GENERATOR_PROMPT.format(
            intent=intent,
            tool_output=json.dumps(tool_output),
            entities=json.dumps(entities),
            user_message=last_message
        )
        try:
            response = llm.invoke(prompt)
            final_reply = response.content
        except Exception:
            final_reply = tool_output.get("message") or f"Successfully processed intent: {intent}."

    return {"final_response": final_reply}

def end_node(state: AgentState) -> Dict[str, Any]:
    return {}

# --- Define Router ---

def route_after_intent(state: AgentState) -> str:
    # Router logic
    intent = state.get("intent")
    if intent in ["log_interaction", "edit_interaction", "search_doctor", "schedule_followup", "generate_summary"]:
        return "entity_extractor"
    return "response_generator"

def route_after_extractor(state: AgentState) -> str:
    return "execute_tool"

def route_after_tool(state: AgentState) -> str:
    return "response_generator"

# --- Build StateGraph ---

def get_agent_graph(db: Session) -> StateGraph:
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("input_node", input_node)
    workflow.add_node("intent_classifier", intent_classifier)
    workflow.add_node("entity_extractor", entity_extractor)
    # Inject db dependency into execute_tool via lambda
    workflow.add_node("execute_tool", lambda state: execute_tool(state, db))
    workflow.add_node("response_generator", response_generator)
    workflow.add_node("end_node", end_node)
    
    # Connect nodes
    workflow.set_entry_point("input_node")
    workflow.add_edge("input_node", "intent_classifier")
    
    workflow.add_conditional_edges(
        "intent_classifier",
        route_after_intent,
        {
            "entity_extractor": "entity_extractor",
            "response_generator": "response_generator"
        }
    )
    
    workflow.add_edge("entity_extractor", "execute_tool")
    workflow.add_edge("execute_tool", "response_generator")
    workflow.add_edge("response_generator", "end_node")
    workflow.add_edge("end_node", END)
    
    return workflow.compile()

# --- Helper Runner ---

def run_agent(db: Session, user_id: int, message: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    # Initialize state
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "intent": None,
        "entities": None,
        "selected_tool": None,
        "tool_parameters": None,
        "tool_output": None,
        "session_id": session_id,
        "current_user_id": user_id,
        "final_response": None,
        "extracted_json": None
    }
    
    graph = get_agent_graph(db)
    final_state = graph.invoke(initial_state)
    
    return {
        "reply": final_state["final_response"],
        "extracted_json": final_state["extracted_json"],
        "intent": final_state["intent"]
    }
