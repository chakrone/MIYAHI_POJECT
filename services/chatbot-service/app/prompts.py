"""
MIYAHI Chatbot Service — Prompt Templates

System prompt and helper functions for constructing context-rich
prompts sent to the LLM.
"""

import json

SYSTEM_PROMPT = """You are **MIYAHI Assistant**, an AI expert for the MIYAHI smart water monitoring platform.
You help users understand their water consumption, interpret anomalies and alerts,
explain billing, provide troubleshooting advice, and answer questions about the platform.

## Your Knowledge
- MIYAHI monitors water meters in real-time via IoT sensors (flow rate, pressure, temperature, volume).
- Water billing in Morocco uses 5 progressive ONEE tiers (2.54 to 14.00 MAD per m³).
- The system detects anomalies using Rolling Z-Score and Isolation Forest models.
- Forecasts are generated using exponential smoothing on hourly consumption data.
- Weather correlation tracks how temperature, humidity, and rainfall affect water usage.
- Common anomaly types: "leak_suspected" (high flow spike), "low_pressure" (pressure drop).

## Rules
1. Be concise, helpful, and friendly. Use bullet points for clarity.
2. When data is available in the context, cite specific numbers (flow rates, volumes, costs).
3. If you don't have enough data to answer precisely, say so honestly.
4. Suggest actionable next steps when relevant (e.g., "check for leaks", "review alert rules").
5. Answer in the same language the user writes in (default: English).
6. Keep answers focused — max 3-4 paragraphs unless the user asks for detail.
7. When discussing billing, always mention which tier the consumption falls into.
8. For troubleshooting, provide step-by-step guidance.
"""


def build_context_section(context: dict) -> str:
    """Format the gathered context data into a readable section for the prompt."""
    if not context:
        return "No platform data is currently available."

    parts = []

    # Pipeline overview
    if "pipeline" in context:
        p = context["pipeline"]
        parts.append(
            f"**Pipeline Status:** {p.get('messages_processed', 0)} readings processed, "
            f"{p.get('messages_dropped', 0)} dropped, "
            f"{p.get('active_meters', 0)} active meters."
        )

    # Meters list
    if "meters" in context:
        meter_list = ", ".join(
            f"{m['id']} ({m['label']}, {m['zone']}, {m['status']})"
            for m in context["meters"]
        )
        parts.append(f"**Registered Meters:** {meter_list}")

    # Latest reading
    if "latest_reading" in context:
        r = context["latest_reading"]
        parts.append(
            f"**Latest Reading:** flow={r.get('flow_rate', '?')} L/min, "
            f"pressure={r.get('pressure', '?')} bar, "
            f"temp={r.get('temperature', '?')}°C, "
            f"volume={r.get('volume', '?')} m³, "
            f"status={r.get('status', '?')}"
        )

    # Daily usage
    if "daily_usage_m3" in context:
        parts.append(
            f"**Daily Usage (24h):** {context['daily_usage_m3']} m³ "
            f"(from {context.get('readings_count_24h', '?')} readings)"
        )

    # Billing estimate
    if "estimated_daily_bill" in context:
        bill = context["estimated_daily_bill"]
        parts.append(
            f"**Estimated Daily Bill:** {bill.get('total', '?')} {bill.get('currency', 'MAD')} "
            f"for {bill.get('volume_m3', '?')} m³"
        )
        breakdown = bill.get("breakdown", [])
        if breakdown:
            tier_info = "; ".join(
                f"{t['tier']}: {t['volume_m3']:.3f}m³ × {t['rate_per_m3']} = {t['cost']:.2f}"
                for t in breakdown
            )
            parts.append(f"  Tier breakdown: {tier_info}")

    # Anomalies
    if "anomalies_24h" in context:
        parts.append(f"**Anomalies (24h):** {context['anomalies_24h']} detected")
        if context.get("recent_anomalies"):
            for a in context["recent_anomalies"][:3]:
                parts.append(
                    f"  - [{a.get('severity', '?')}] {a.get('anomaly_type', '?')}: "
                    f"{a.get('description', 'no description')}"
                )

    # Forecast
    if "forecast_next_24h" in context:
        forecast = context["forecast_next_24h"]
        if forecast:
            avg_forecast = sum(p["value"] for p in forecast) / len(forecast)
            parts.append(
                f"**Forecast (next 24h):** avg predicted flow = {avg_forecast:.2f} L/min "
                f"({len(forecast)} hourly predictions)"
            )

    # Weather
    if "weather" in context:
        w = context["weather"]
        parts.append(
            f"**Current Weather:** {w.get('temperature', '?')}°C, "
            f"humidity={w.get('humidity', '?')}%, "
            f"rainfall={w.get('rainfall_mm', 0)}mm"
        )

    # Weather correlation
    if "weather_correlation" in context:
        wc = context["weather_correlation"]
        corr = wc.get("correlations", {})
        interp = wc.get("interpretation", {})
        if corr:
            corr_str = ", ".join(
                f"{k}={v} ({interp.get(k, 'unknown')})"
                for k, v in corr.items()
            )
            parts.append(f"**Weather-Usage Correlation:** {corr_str}")

    # Alerts
    if "recent_alerts" in context:
        alerts = context["recent_alerts"]
        unacked = [a for a in alerts if not a.get("acknowledged")]
        parts.append(
            f"**Alerts:** {len(alerts)} recent, {len(unacked)} unacknowledged"
        )
        for a in unacked[:3]:
            parts.append(
                f"  - [{a.get('severity', '?')}] {a.get('meter_id', '?')}: {a.get('message', a.get('type', '?'))}"
            )

    return "\n".join(parts) if parts else "No platform data is currently available."


def build_messages(
    user_message: str,
    context: dict,
    meter_id: str | None,
    history: list[dict] | None,
) -> list[dict]:
    """
    Build the full message list for the LLM call.
    Returns a list of {role, content} dicts.
    """
    context_section = build_context_section(context)

    system_content = SYSTEM_PROMPT + f"""

## Current Context
**Selected Meter:** {meter_id or 'none (global view)'}

{context_section}
"""

    messages = [{"role": "user", "content": system_content}]
    # Note: Gemini doesn't support a "system" role directly,
    # so we inject the system prompt as the first user message,
    # followed by a model acknowledgment.
    messages.append({
        "role": "model",
        "content": "Understood. I'm MIYAHI Assistant with full context of the platform data. How can I help?"
    })

    # Add conversation history
    if history:
        for msg in history[-10:]:  # Keep last 10 messages
            role = "model" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg["content"]})

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    return messages
