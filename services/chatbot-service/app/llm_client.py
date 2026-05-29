"""
MIYAHI Chatbot Service — LLM Client

Wrapper around the Google Gemini API. Falls back to FAQ responses
when the API key is not configured or the call fails.
"""

import logging
from google import genai
from .config import GEMINI_API_KEY, GEMINI_MODEL
from .faq import find_faq_answer

logger = logging.getLogger(__name__)


def _get_client() -> genai.Client | None:
    """Create a Gemini client if API key is available."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    return genai.Client(api_key=GEMINI_API_KEY)


async def generate_response(messages: list[dict], user_message: str) -> dict:
    """
    Send messages to Gemini and return the response.
    Falls back to FAQ if Gemini is unavailable.

    Returns: { reply: str, source: str }
    """
    client = _get_client()

    if client is None:
        # No API key — try FAQ fallback
        faq_answer = find_faq_answer(user_message)
        if faq_answer:
            return {"reply": faq_answer, "source": "faq"}
        return {
            "reply": (
                "I'm currently running in offline mode (no AI API key configured). "
                "I can answer common questions about the MIYAHI platform — try asking about "
                "billing tiers, anomaly types, or how to configure alerts.\n\n"
                "To enable full AI capabilities, set the `GEMINI_API_KEY` in your `.env` file."
            ),
            "source": "fallback",
        }

    try:
        # Build Gemini content format
        contents = []
        for msg in messages:
            contents.append(
                genai.types.Content(
                    role=msg["role"],
                    parts=[genai.types.Part(text=msg["content"])],
                )
            )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=genai.types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )

        reply_text = response.text if response.text else "I wasn't able to generate a response. Please try again."
        return {"reply": reply_text, "source": "gemini"}

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        # Fallback to FAQ on API error
        faq_answer = find_faq_answer(user_message)
        if faq_answer:
            return {"reply": faq_answer, "source": "faq"}
        return {
            "reply": (
                "I encountered an issue connecting to the AI service. "
                "Please try again in a moment, or ask a common question about the platform."
            ),
            "source": "error",
        }
