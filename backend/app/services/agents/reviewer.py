import logging
from pydantic import BaseModel, Field
from google.genai import types

from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

# Pydantic schema for code reviewer response
class ReviewResultSchema(BaseModel):
    passed: bool = Field(description="True if the code correctly solves the task constraints.")
    score: int = Field(description="An integer score from 0 to 100.")
    feedback: str = Field(description="Detailed markdown comments reviewing code syntax, logic, and suggesting style improvements.")


def review_code_submission(
    code: str,
    language: str,
    assignment_desc: str,
    stdout: str | None,
    stderr: str | None,
    exit_code: int
) -> ReviewResultSchema:
    """
    Submits user code + sandbox execution outputs to Gemini for evaluation.
    Returns structured feedback schema.
    """
    logger.info("[agent:reviewer] Initiating code review evaluation")

    prompt = f"""
You are an expert senior software engineer and technical reviewer.
Grade and review the following code submission against the requested task.

[Task Assignment]
{assignment_desc}

[Code Submission (Language: {language})]
{code}

[Sandbox Run Outcomes]
Exit Code: {exit_code}
Stdout: {stdout or "(no stdout output)"}
Stderr: {stderr or "(no stderr output)"}

Instructions:
1. Evaluate if the code behaves correctly, covers edge cases, and satisfies the assignment constraints.
2. If the compilation/run failed (non-zero exit code or stderr present), take that heavily into account.
3. Return the review in a structured format:
   - passed: boolean (true/false)
   - score: integer from 0 to 100
   - feedback: detailed code comments, optimization tips, and debugging details in markdown.
"""

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReviewResultSchema
            )
        )
        result = ReviewResultSchema.model_validate_json(response.text)
        logger.info("[agent:reviewer] Structured review grading completed: Passed=%s, Score=%d", result.passed, result.score)
        return result
    except Exception as e:
        logger.error("[agent:reviewer] Failed to obtain structured review from Gemini: %s", e)
        # Safe fallback in case of errors
        return ReviewResultSchema(
            passed=False,
            score=0,
            feedback=f"Reviewer Error: Failed to evaluate submission. Internal API error: {str(e)}"
        )
