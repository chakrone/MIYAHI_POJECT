"""
MIYAHI Chatbot Service — FastAPI Application

Provides a conversational AI endpoint that answers questions about
water consumption, billing, anomalies, and platform usage.
Queries real MIYAHI APIs for context-aware responses.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator

from .data_fetcher import gather_context
from .prompts import build_messages
from .llm_client import generate_response
from .faq import find_faq_answer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    meter_id: str | None = None
    history: list[ChatMessage] | None = None


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] | None = None
    suggestions: list[str] | None = None


# ──────────────────────────────────────────────
# Suggestion generator
# ──────────────────────────────────────────────
def generate_suggestions(context: dict, meter_id: str | None) -> list[str]:
    """Generate contextual follow-up question suggestions."""
    suggestions = []

    if meter_id:
        if context.get("anomalies_24h", 0) > 0:
            suggestions.append("What do the anomalies mean?")
        if context.get("daily_usage_m3", 0) > 0:
            suggestions.append("How much will my bill be this month?")
        if context.get("forecast_next_24h"):
            suggestions.append("What's the consumption forecast?")
        suggestions.append(f"Is {meter_id} performing normally?")
    else:
        suggestions.append("How much water did I use today?")
        suggestions.append("Are there any active alerts?")

    if not suggestions:
        suggestions = [
            "How much water did I use today?",
            "What's my estimated bill?",
            "Any anomalies detected?",
        ]

    return suggestions[:4]


# ──────────────────────────────────────────────
# App
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MIYAHI Chatbot Service starting...")
    yield
    logger.info("MIYAHI Chatbot Service shutting down.")


app = FastAPI(
    title="MIYAHI Chatbot Service",
    description="Conversational AI for water consumption Q&A and troubleshooting",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow dashboard origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────
@app.get("/api/chat/health")
async def health():
    return {"status": "ok", "service": "chatbot"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint. Receives a user message, gathers platform context,
    and returns an AI-generated response.
    """
    logger.info(f"Chat request: meter={request.meter_id}, msg='{request.message[:80]}...'")

    # 1. Gather real-time context from platform APIs
    context = await gather_context(request.meter_id)

    # Track which data sources were consulted
    sources = [key for key in context.keys() if context[key] is not None]

    # 2. Build the LLM message list
    history_dicts = (
        [{"role": m.role, "content": m.content} for m in request.history]
        if request.history
        else None
    )
    messages = build_messages(
        user_message=request.message,
        context=context,
        meter_id=request.meter_id,
        history=history_dicts,
    )

    # 3. Generate response via LLM (or FAQ fallback)
    result = await generate_response(messages, request.message)

    # 4. Generate contextual suggestions
    suggestions = generate_suggestions(context, request.meter_id)

    logger.info(f"Chat response source: {result.get('source', 'unknown')}")

    return ChatResponse(
        reply=result["reply"],
        sources=sources if sources else None,
        suggestions=suggestions,
    )
