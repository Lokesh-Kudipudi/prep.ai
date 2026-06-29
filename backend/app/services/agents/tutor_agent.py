import logging
from typing import TypedDict, List, Optional
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from google.genai import types

from app.services.vectorstore import get_retriever
from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

# Pydantic schemas for structured Tutor replies
class CodingTaskSchema(BaseModel):
    title: str = Field(description="Brief title of the programming challenge.")
    description: str = Field(description="Detailed requirements, input/output constraints, and scoring thresholds.")
    language: str = Field(description="Target programming language: 'python' or 'javascript'.")
    starter_code: str = Field(description="Boilerplate starter code/function definition.")

class TutorResponseSchema(BaseModel):
    message: str = Field(description="The tutor's conversational text response, conceptual question, or feedback.")
    code_assignment: Optional[CodingTaskSchema] = Field(default=None, description="Optional coding assignment parameters if issuing a task, otherwise null.")


class TutorAgentState(TypedDict):
    board_id: str
    topic: str
    messages: List[dict]  # [{"role": "system"|"user"|"reviewer", "content": "..."}]
    context_text: str
    response_message: Optional[str]
    response_code_task: Optional[dict]  # Structured JSON dictionary or None


def get_installed_languages() -> list[str]:
    """Queries the Piston container for currently installed runtimes, falling back safely."""
    import httpx
    from app.config import settings
    try:
        resp = httpx.get(f"{settings.PISTON_URL}/api/v2/runtimes", timeout=1.5)
        if resp.status_code == 200:
            return [item["language"] for item in resp.json() if "language" in item]
    except Exception as e:
        logger.warning("[agent:tutor] Could not retrieve runtimes from Piston container: %s", e)
    return ["python", "javascript"]


# Graph Node 1: Context Retrieval
def retrieve_node(state: TutorAgentState) -> dict:
    logger.info("[agent:tutor] Fetching board context chunks for topic: %s", state["topic"])
    retriever = get_retriever(state["board_id"], top_k=8)
    chunks = retriever.retrieve(f"Fetch materials explaining key details about {state['topic']}.")
    
    context_text = ""
    if chunks:
        context_text = "\n\n".join([
            f"Chunk {i}:\n{chunk.node.get_content()}"
            for i, chunk in enumerate(chunks)
        ])
    return {"context_text": context_text}


# Graph Node 2: Tutor Dialogue Generation
def tutor_node(state: TutorAgentState) -> dict:
    logger.info("[agent:tutor] Generating tutor dialogue turn")
    
    # Construct conversational logs for Gemini context
    chat_history = ""
    for msg in state["messages"]:
        role = "Student" if msg["role"] == "user" else "Tutor"
        if msg["role"] == "reviewer":
            role = "Code Reviewer Agent"
        chat_history += f"{role}: {msg['content']}\n"

    installed_langs = get_installed_languages()
    langs_str = ", ".join(installed_langs)

    prompt = f"""
You are a supportive, expert software engineering tutor conducting a 1-on-1 interview session on the topic: '{state['topic']}'.
Your goal is to teach the student, test their conceptual understanding using information in the workspace, and evaluate their responses.

[Workspace Context Material]
{state['context_text']}

[Current Chat Transcript History]
{chat_history}

Instructions:
1. Conduct the lesson in a dialogue: ask one targeted conceptual question at a time.
2. Evaluate the student's previous answers. Provide constructive, positive feedback.
3. If the user explicitly asks for a coding exercise/assignment, OR if they have correctly answered conceptual questions and it's time to evaluate hands-on code: you MUST issue a programming task.
4. When issuing a programming task, fill the 'code_assignment' field with structured JSON guidelines (title, description, language, and boilerplate starter code).
5. The language MUST be selected from the following list of active Piston sandboxed runtimes: [{langs_str}]. Do NOT issue tasks in any other language.
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TutorResponseSchema
            )
        )
        
        parsed = TutorResponseSchema.model_validate_json(response.text)
        
        # Format code_assignment to dictionary if present
        code_task_dict = None
        if parsed.code_assignment:
            code_task_dict = parsed.code_assignment.model_dump()

        logger.info("[agent:tutor] Dialog turn generated. Assignment issued: %s", code_task_dict is not None)
        return {
            "response_message": parsed.message,
            "response_code_task": code_task_dict
        }
        
    except Exception as e:
        logger.error("[agent:tutor] Failed to generate dialogue from Gemini: %s", e)
        return {
            "response_message": "I'm having trouble connecting to my reasoning engine. Let's try restarting our topic review.",
            "response_code_task": None
        }


# Setup StateGraph
workflow = StateGraph(TutorAgentState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("tutor", tutor_node)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "tutor")
workflow.add_edge("tutor", END)

tutor_agent = workflow.compile()


async def run_tutor_turn(
    board_id: str,
    topic: str,
    messages: List[dict]
) -> dict:
    """
    Invokes the Tutor Agent LangGraph to generate the next conversation step.
    Returns: { "message": str, "code_task": dict | None }
    """
    initial_state = {
        "board_id": board_id,
        "topic": topic,
        "messages": messages,
        "context_text": "",
        "response_message": None,
        "response_code_task": None
    }
    
    import asyncio
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: tutor_agent.invoke(initial_state))
    
    return {
        "message": result["response_message"],
        "code_task": result["response_code_task"]
    }
