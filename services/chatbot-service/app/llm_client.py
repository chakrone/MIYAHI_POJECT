"""
MIYAHI Chatbot Service — LLM Client

Wrapper around the Google Gemini API. Includes:
- Retry with exponential backoff for rate-limit (429) errors
- Model fallback chain (tries alternative models if primary is quota-exhausted)
- Graceful fallback to FAQ when all LLM attempts fail
"""

import asyncio
import logging
from google import genai
from .config import GEMINI_API_KEY, GEMINI_MODEL, FALLBACK_MODELS, MAX_RETRIES, RETRY_BASE_DELAY
from .faq import find_faq_answer

# Cache to track models with exhausted daily quotas (reset on service restart)
_exhausted_models: set[str] = set()

logger = logging.getLogger(__name__)


def _get_client() -> genai.Client | None:
    """Create a Gemini client if API key is available."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    return genai.Client(api_key=GEMINI_API_KEY)


def _is_daily_quota_exhausted(error_str: str) -> bool:
    """Check if the error indicates daily quota is fully exhausted (limit: 0)."""
    return "limit: 0" in error_str or "PerDay" in error_str


async def _call_gemini(client: genai.Client, model: str, messages: list[dict]) -> str | None:
    """
    Attempt a single Gemini API call with smart retry on 429 errors.
    - Skips retries if daily quota is exhausted (limit: 0)
    - Uses short retry delays for per-minute limits
    Returns the response text or None on failure.
    """
    # Skip models we already know are daily-exhausted
    if model in _exhausted_models:
        logger.info(f"Skipping model={model} (daily quota previously exhausted)")
        return None

    for attempt in range(MAX_RETRIES):
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
                model=model,
                contents=contents,
                config=genai.types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                ),
            )

            reply_text = response.text if response.text else None
            if reply_text:
                logger.info(f"Gemini response received from model={model} on attempt {attempt + 1}")
                # Clear from exhausted cache if it was there
                _exhausted_models.discard(model)
                return reply_text
            return None

        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str

            if is_rate_limit:
                # Check if daily quota is fully gone — no point retrying
                if _is_daily_quota_exhausted(error_str):
                    logger.warning(f"Daily quota exhausted for model={model}. Skipping retries.")
                    _exhausted_models.add(model)
                    return None  # Move to next model immediately

                # Per-minute limit — retry with short delay
                if attempt < MAX_RETRIES - 1:
                    delay = min(RETRY_BASE_DELAY * (2 ** attempt), 5)  # Cap at 5 seconds
                    logger.warning(
                        f"Per-minute rate limit on model={model}, attempt {attempt + 1}/{MAX_RETRIES}. "
                        f"Retrying in {delay:.1f}s..."
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.warning(f"Rate limit persists for model={model} after {MAX_RETRIES} attempts")
                    return None
            else:
                logger.error(f"Gemini API error (non-rate-limit) on model={model}: {e}")
                raise  # Re-raise non-rate-limit errors


async def generate_response(messages: list[dict], user_message: str) -> dict:
    """
    Send messages to Gemini and return the response.
    Falls back through model chain, then to FAQ if all fail.

    Returns: { reply: str, source: str }
    """
    # Try FAQ first — instant response, saves API quota
    faq_answer = find_faq_answer(user_message)
    if faq_answer:
        return {"reply": faq_answer, "source": "faq"}

    client = _get_client()

    if client is None:
        return {
            "reply": (
                "I'm currently running in offline mode (no AI API key configured). "
                "I can answer common questions about the MIYAHI platform — try asking about "
                "billing tiers, anomaly types, or how to configure alerts.\n\n"
                "To enable full AI capabilities, set the `GEMINI_API_KEY` in your `.env` file."
            ),
            "source": "fallback",
        }

    # Try primary model, then fallback models
    models_to_try = [GEMINI_MODEL] + [m for m in FALLBACK_MODELS if m != GEMINI_MODEL]

    for model in models_to_try:
        try:
            result = await _call_gemini(client, model, messages)
            if result:
                return {"reply": result, "source": f"gemini:{model}"}
            # result is None means rate-limited — try next model
            logger.info(f"Model {model} rate-limited, trying next fallback...")
        except Exception as e:
            logger.error(f"Non-rate-limit error on model={model}: {e}")
            # For non-rate-limit errors, still try next model
            continue

    # All models failed — FAQ was already tried above
    logger.warning("All Gemini models exhausted and no FAQ match.")

    return {
        "reply": (
            "⚠️ The AI service is temporarily unavailable due to API rate limits. "
            "Your Gemini free-tier quota has been exceeded for all available models.\n\n"
            "**What you can do:**\n"
            "- Wait a few minutes and try again (quotas reset per minute and per day)\n"
            "- Ask a common question I can answer offline, like:\n"
            "  • \"What are the billing tiers?\"\n"
            "  • \"What does leak_suspected mean?\"\n"
            "  • \"How does anomaly detection work?\"\n"
            "  • \"How do I add a meter?\"\n\n"
            "To avoid this in the future, consider upgrading to a paid Gemini API plan."
        ),
        "source": "error:rate_limited",
    }
