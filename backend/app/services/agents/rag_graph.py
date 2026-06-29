import logging
from typing import TypedDict, List, Optional
from llama_index.core.schema import NodeWithScore
from langgraph.graph import StateGraph, END

from app.config import settings
from app.services.vectorstore import get_retriever
from app.services.agents.gemini_client import client
from app.services.agents.critic import critic_node

logger = logging.getLogger(__name__)

# State structure for the LangGraph executor
class RagState(TypedDict):
    board_id: str
    query: str
    prompt_template: str
    retrieved_chunks: List[NodeWithScore]
    candidate_answer: Optional[str]
    critic_verdict: Optional[str]
    critic_reason: Optional[str]
    correction_count: int
    final_answer: Optional[str]

# Graph Node 1: Retrieval
def retrieve_node(state: RagState) -> dict:
    logger.info("[agent:rag] Retrieving relevant context for query")
    retriever = get_retriever(state["board_id"])
    chunks = retriever.retrieve(state["query"])
    return {"retrieved_chunks": chunks}

# Graph Node 2: Generation
def generate_node(state: RagState) -> dict:
    logger.info("[agent:rag] Generating candidate response")
    chunks = state["retrieved_chunks"]
    context_text = "\n\n".join([
        f"--- Source Chunk {i} ---\n{chunk.node.get_content()}" 
        for i, chunk in enumerate(chunks)
    ])
    
    # If the critic previously returned a fail, inject correction instructions
    correction_feedback = ""
    if state.get("correction_count", 0) > 0 and state.get("critic_reason"):
        correction_feedback = (
            f"\n\n[CRITIC EVALUATION] Your previous answer was flagged by the verification critic for "
            f"the following reason: '{state['critic_reason']}'.\n"
            f"Please revise your answer to fix this factual issue. Ensure all claims are strictly "
            f"grounded in the context."
        )
        
    try:
        # Build prompt using the provided template
        prompt = state["prompt_template"].format(
            context=context_text,
            query=state["query"]
        ) + correction_feedback
    except KeyError as e:
        logger.warning("[agent:rag] Formatting prompt template failed due to missing key %s, falling back to simple format", e)
        prompt = f"Context:\n{context_text}\n\nQuery: {state['query']}\n{correction_feedback}"
        
    # Generate content using the Gemini client
    response = client.models.generate_content(
        model='gemini-flash-lite-latest',
        contents=prompt,
    )
    
    return {"candidate_answer": response.text.strip()}

# Graph Node 3: Correct node (increment iterations counter)
def correct_node(state: RagState) -> dict:
    count = state.get("correction_count", 0) + 1
    logger.info("[agent:rag] Returning to generation loop. Correction iteration: %d", count)
    return {"correction_count": count}

# Graph Node 4: Finalize
def finalize_node(state: RagState) -> dict:
    logger.info("[agent:rag] Finalizing and outputting RAG response")
    return {"final_answer": state["candidate_answer"]}

# Conditional router edge logic
def should_continue(state: RagState) -> str:
    verdict = state.get("critic_verdict")
    count = state.get("correction_count", 0)
    
    if verdict == "PASS":
        logger.info("[agent:rag] Critic check PASSED. Proceeding to finalize.")
        return "finalize"
        
    if count >= settings.CRITIC_MAX_CORRECTIONS:
        logger.warning("[agent:rag] Max correction threshold (%d) reached. Forcing finalization.", settings.CRITIC_MAX_CORRECTIONS)
        return "finalize"
        
    logger.warning("[agent:rag] Critic check FAILED. Routing to correction loop.")
    return "correct"


# Compile the LangGraph state machine
workflow = StateGraph(RagState)

# Register nodes
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)
workflow.add_node("critic", critic_node)
workflow.add_node("correct", correct_node)
workflow.add_node("finalize", finalize_node)

# Set entry point
workflow.set_entry_point("retrieve")

# Add edges
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", "critic")

# Add conditional edges from the critic node
workflow.add_conditional_edges(
    "critic",
    should_continue,
    {
        "finalize": "finalize",
        "correct": "correct"
    }
)

# Correction loops back to generation
workflow.add_edge("correct", "generate")
workflow.add_edge("finalize", END)

# Compile
rag_graph = workflow.compile()


async def run_rag(board_id: str, query: str, prompt_template: Optional[str] = None) -> str:
    """
    Asynchronously executes the agentic RAG pipeline.
    Accepts dynamic queries and prompt templates from downstream pillar workflows (Quiz, Tutor, Cards).
    """
    if prompt_template is None:
        prompt_template = (
            "Context information is below.\n"
            "---------------------\n"
            "{context}\n"
            "---------------------\n"
            "Given the context information and not prior knowledge, answer the query.\n"
            "Query: {query}\n"
            "Answer: "
        )

    initial_state = {
        "board_id": board_id,
        "query": query,
        "prompt_template": prompt_template,
        "retrieved_chunks": [],
        "candidate_answer": None,
        "critic_verdict": None,
        "critic_reason": None,
        "correction_count": 0,
        "final_answer": None
    }
    
    # Run the compiled graph synchronously in Python (invoke is a blocking operation)
    # Wrap in run_in_executor if thread-safe async delegation is desired, or call directly
    import asyncio
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: rag_graph.invoke(initial_state))
    
    return result["final_answer"]
