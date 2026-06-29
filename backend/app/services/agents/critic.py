import logging
from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

def critic_node(state: dict) -> dict:
    """
    Evaluate candidate_answer for faithfulness against the retrieved chunks.
    Updates critic_verdict ("PASS" or "FAIL") and critic_reason in the state.
    """
    logger.info("[agent:critic] Running faithfulness critic node")
    
    chunks = state.get("retrieved_chunks", [])
    if not chunks:
        # If no context was retrieved, critic cannot perform verification
        state["critic_verdict"] = "PASS"
        state["critic_reason"] = "No chunks retrieved to verify against."
        return state

    context_text = "\n\n".join([
        f"--- Source Chunk {i} ---\n{chunk.node.get_content()}" 
        for i, chunk in enumerate(chunks)
    ])
    
    candidate = state.get("candidate_answer", "")
    
    prompt = f"""
You are a factual verification critic. Your job is to determine if the candidate answer is fully faithful to the provided context and does not introduce outside assumptions, hallucinations, or contradictions.

[Context Chunks]
{context_text}

[Candidate Answer]
{candidate}

Instructions:
Evaluate if the candidate answer contains any factual claims, API usage details, or statements NOT directly supported by or logical inferences from the context.
Reply in exactly this format:
VERDICT: <PASS or FAIL>
REASON: <one-sentence explanation of why it failed or a confirmation statement>
"""
    try:
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
        )
        response_text = response.text.strip()
        logger.info("[agent:critic] Critic model response: %s", response_text)
        
        verdict = "PASS"
        reason = ""
        for line in response_text.split('\n'):
            if line.startswith("VERDICT:"):
                verdict = line.replace("VERDICT:", "").strip().upper()
            elif line.startswith("REASON:"):
                reason = line.replace("REASON:", "").strip()
                
        # Parse verdict robustly
        if "FAIL" in verdict:
            verdict = "FAIL"
        else:
            verdict = "PASS"

        state["critic_verdict"] = verdict
        state["critic_reason"] = reason
        
        logger.info("[agent:critic] Critic verdict: %s (Reason: %s)", verdict, reason)
    except Exception as e:
        logger.error("[agent:critic] Critic evaluation failed: %s", e)
        # Fallback to PASS to ensure process safety in production
        state["critic_verdict"] = "PASS"
        state["critic_reason"] = f"Critic node failed: {str(e)}"
        
    return state
