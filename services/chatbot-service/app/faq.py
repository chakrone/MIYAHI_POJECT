"""
MIYAHI Chatbot Service — FAQ Fallback

Built-in answers for common questions, used when the LLM is
unavailable or for fast responses to known questions.
"""

import re

FAQ_ENTRIES = [
    {
        "keywords": ["billing", "tier", "tiers", "pricing", "rate", "cost", "price", "onee", "mad"],
        "answer": (
            "**MIYAHI uses Morocco's ONEE progressive water pricing tiers:**\n\n"
            "| Tier | Range | Price |\n"
            "|------|-------|-------|\n"
            "| Tier 1 | 0–6 m³ | 2.54 MAD/m³ |\n"
            "| Tier 2 | 6–12 m³ | 5.95 MAD/m³ |\n"
            "| Tier 3 | 12–20 m³ | 8.75 MAD/m³ |\n"
            "| Tier 4 | 20–35 m³ | 10.98 MAD/m³ |\n"
            "| Tier 5 | 35+ m³ | 14.00 MAD/m³ |\n\n"
            "Your bill is calculated progressively — you pay a lower rate for initial usage "
            "and higher rates as consumption increases. Check the **Estimated Daily Bill** card "
            "on the dashboard for your current estimate."
        ),
    },
    {
        "keywords": ["leak", "leak_suspected", "high flow", "spike", "unusual flow"],
        "answer": (
            "**Leak Detection in MIYAHI:**\n\n"
            "A `leak_suspected` anomaly is triggered when the system detects an unusually high "
            "flow rate that deviates significantly from normal patterns. This can indicate:\n\n"
            "- A pipe burst or leak in the plumbing\n"
            "- A tap left running\n"
            "- Irrigation system malfunction\n\n"
            "**What to do:**\n"
            "1. Check the **Alert Feed** for the affected meter and time\n"
            "2. Inspect the physical meter and surrounding pipes\n"
            "3. If it's a false alarm, acknowledge the alert on the dashboard\n"
            "4. Consider adjusting the flow_rate alert rule threshold if false alarms are frequent"
        ),
    },
    {
        "keywords": ["low pressure", "low_pressure", "pressure drop"],
        "answer": (
            "**Low Pressure Anomalies:**\n\n"
            "A `low_pressure` anomaly means the water pressure dropped significantly below "
            "the expected range. Possible causes:\n\n"
            "- Municipal supply issue\n"
            "- Partially closed valve\n"
            "- Pipe obstruction or buildup\n"
            "- Multiple outlets open simultaneously\n\n"
            "**What to do:**\n"
            "1. Check if the issue affects one meter or all meters\n"
            "2. If system-wide, it may be a municipal supply issue — wait and monitor\n"
            "3. If localized, inspect the affected zone's plumbing\n"
            "4. Check the **Weather Panel** — extreme cold can affect pressure"
        ),
    },
    {
        "keywords": ["anomaly", "detection", "z-score", "isolation forest", "how detect"],
        "answer": (
            "**MIYAHI's Anomaly Detection uses two methods:**\n\n"
            "1. **Rolling Z-Score** — Tracks the last 30 readings per metric per meter. "
            "If a value is more than 3 standard deviations from the mean, it's flagged. "
            "Z > 5 = critical, Z > 3 = warning.\n\n"
            "2. **Isolation Forest (ML)** — After collecting 50+ readings, trains a machine "
            "learning model on [flow_rate, pressure, temperature] vectors. Points that are "
            "'easy to isolate' are flagged as anomalies.\n\n"
            "Results are shown in the **Anomaly Detection** panel on the dashboard."
        ),
    },
    {
        "keywords": ["alert", "rule", "configure", "threshold", "setup"],
        "answer": (
            "**Configuring Alert Rules:**\n\n"
            "You can create custom alert rules via the API:\n\n"
            "```\n"
            "POST /api/alert-rules\n"
            "{\n"
            '  "meterId": "meter_001",\n'
            '  "metric": "flow_rate",\n'
            '  "operator": ">",\n'
            '  "threshold": 25.0,\n'
            '  "enabled": true\n'
            "}\n"
            "```\n\n"
            "**Supported metrics:** flow_rate, pressure, temperature, volume\n"
            "**Supported operators:** >, <, >=, <=, ==\n\n"
            "When a reading matches a rule, an alert appears in the **Alert Feed**."
        ),
    },
    {
        "keywords": ["add meter", "new meter", "register meter", "create meter"],
        "answer": (
            "**Adding a New Meter:**\n\n"
            "1. Register the meter via the API:\n"
            "```\n"
            "POST /api/meters\n"
            '{ "id": "meter_006", "label": "New Meter", "zoneId": "<zone-uuid>" }\n'
            "```\n\n"
            "2. Add the meter profile to `services/simulator/app/config.py` in `METER_PROFILES`\n\n"
            "3. Add the meter to `infrastructure/postgres/init.sql` for persistence\n\n"
            "4. Restart the simulator: `docker compose restart miyahi-simulator`\n\n"
            "The new meter will appear in the dashboard dropdown."
        ),
    },
    {
        "keywords": ["forecast", "prediction", "predict", "future", "consumption forecast"],
        "answer": (
            "**Consumption Forecasting:**\n\n"
            "MIYAHI generates hourly consumption predictions up to 30 days ahead using "
            "exponential smoothing (α = 0.3) on the last 14 days of hourly data.\n\n"
            "Forecasts are regenerated:\n"
            "- Automatically every night at 02:00\n"
            "- On service startup\n"
            "- Manually via: `POST /api/forecast/generate`\n\n"
            "View forecasts in the **Forecast Chart** on the dashboard, or query:\n"
            "`GET /api/forecast/{meterId}?days=7`"
        ),
    },
    {
        "keywords": ["weather", "correlation", "rain", "temperature", "humidity"],
        "answer": (
            "**Weather & Consumption Correlation:**\n\n"
            "The Weather Service tracks temperature, humidity, and rainfall, then computes "
            "Pearson correlation coefficients against flow rate for each meter.\n\n"
            "Typical patterns:\n"
            "- **Temperature ↔ Usage:** Usually positive — hotter weather = more water use\n"
            "- **Rainfall ↔ Usage:** Usually negative — rain reduces irrigation needs\n"
            "- **Humidity ↔ Usage:** Weak to negative correlation\n\n"
            "Check the **Weather & Correlation** panel for current readings and correlations."
        ),
    },
]


def find_faq_answer(question: str) -> str | None:
    """
    Search FAQ entries for a matching answer.
    Returns the best match or None.
    """
    question_lower = question.lower()

    best_match = None
    best_score = 0

    for entry in FAQ_ENTRIES:
        score = sum(1 for kw in entry["keywords"] if kw in question_lower)
        if score > best_score:
            best_score = score
            best_match = entry["answer"]

    # Require at least 1 keyword match
    return best_match if best_score >= 1 else None
