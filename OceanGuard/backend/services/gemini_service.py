"""
Gemini AI Service — CREDIT-SAVING MODE
=======================================
- Uses google-genai (new SDK, not deprecated google-generativeai)
- In-memory cache: each unique (zone/location + score_bucket) is called ONCE per day
- Max tokens kept very small (120-200 tokens per call)
- Rule-based fallback always available — zero credits used if cache hit
- Gemini is NEVER called automatically by the scheduler — only when user explicitly
  clicks "Get Improvement Plan" on the frontend

Credit usage estimate:
  - Flash model: ~0.075 USD per 1M input tokens
  - Our prompts: ~150 tokens each → ~$0.000011 per call
  - At 50 user searches/day → ~$0.0006/day → essentially free
"""
import os
import json
import logging
import hashlib
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── In-memory cache: {cache_key: {"date": date, "result": dict}} ──────────────
_cache: dict = {}
_call_count_today: dict = {}  # Track daily usage


def _get_cache_key(context_type: str, score_bucket: str, location_key: str) -> str:
    """Generate a stable cache key. Same zone + similar score = same key."""
    raw = f"{context_type}:{score_bucket}:{location_key}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _score_bucket(value: float) -> str:
    """Round score to nearest 10% to maximize cache hits."""
    return str(round(value * 10) / 10)


def _check_cache(key: str):
    """Return cached result if from today, else None."""
    if key in _cache:
        entry = _cache[key]
        if entry["date"] == date.today():
            logger.info(f"[Gemini] Cache HIT for {key} — 0 credits used")
            return entry["result"]
    return None


def _set_cache(key: str, result: dict):
    _cache[key] = {"date": date.today(), "result": result}


def _call_gemini(prompt: str, max_tokens: int = 150) -> str | None:
    """
    Call Gemini 2.0 Flash (new SDK). Returns text or None on failure.
    Tracks daily call count for monitoring.
    """
    if not GEMINI_API_KEY:
        return None

    today = str(date.today())
    _call_count_today[today] = _call_count_today.get(today, 0) + 1
    logger.info(f"[Gemini] API call #{_call_count_today[today]} today")

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=0.3,
            ),
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"[Gemini] Call failed: {e}")
        return None


def get_daily_call_count() -> int:
    today = str(date.today())
    return _call_count_today.get(today, 0)


# ── Public API ─────────────────────────────────────────────────────────────────

def explain_plastic_risk(risk_score: float, risk_label: str, features: dict, location_key: str = "unknown") -> dict:
    """
    Get a short AI explanation for a plastic risk score.
    Cached per location + risk bucket — Gemini called at most ONCE per day per unique score level.
    """
    cache_key = _get_cache_key("plastic", _score_bucket(risk_score), location_key)
    cached = _check_cache(cache_key)
    if cached:
        return cached

    result = _rule_based_plastic_explanation(risk_score, risk_label, features)

    if GEMINI_API_KEY:
        ship = features.get("ship_density_count", 60)
        river = features.get("river_discharge_m3s", 50)
        rainfall = features.get("rainfall_mm_month", 80)

        prompt = (
            f"Marine scientist. Plastic risk: {risk_score:.0%} ({risk_label}). "
            f"Ships: {ship:.0f}, River: {river:.0f}m³/s, Rain: {rainfall:.0f}mm/mo. "
            f"Give 2-sentence scientific explanation. Under 50 words. No preamble."
        )
        text = _call_gemini(prompt, max_tokens=80)
        if text:
            result = {"explanation": text, "source": "gemini-2.0-flash", "fallback": False}
            _set_cache(cache_key, result)
            return result

    return result


def explain_carbon_health(absorption_pct: float, lost_tonnes: int, features: dict, location_key: str = "unknown") -> dict:
    """Carbon absorption explanation — cached, max 80 tokens."""
    cache_key = _get_cache_key("carbon", _score_bucket(absorption_pct), location_key)
    cached = _check_cache(cache_key)
    if cached:
        return cached

    result = _rule_based_carbon_explanation(absorption_pct, lost_tonnes, features)

    if GEMINI_API_KEY:
        ndvi = features.get("ndvi_score", 0.5)
        turbidity = features.get("water_turbidity_ntu", 4)
        ph = features.get("ph_level", 8.1)

        prompt = (
            f"Blue carbon scientist. Absorption: {absorption_pct:.0%}, Lost: {lost_tonnes:,}t CO₂/yr. "
            f"NDVI: {ndvi:.2f}, Turbidity: {turbidity:.1f} NTU, pH: {ph:.2f}. "
            f"1-sentence cause + 1 key concern. Under 45 words."
        )
        text = _call_gemini(prompt, max_tokens=70)
        if text:
            result = {"explanation": text, "source": "gemini-2.0-flash", "fallback": False}
            _set_cache(cache_key, result)
            return result

    return result


def generate_improvement_suggestions(
    zone_name: str,
    plastic_risk: float,
    carbon_pct: float,
    lost_tonnes: int,
    monthly_damage_usd: float,
    features: dict,
) -> dict:
    """
    Generate improvement plan. Cached per (zone + risk bucket + carbon bucket).
    Gemini called ONLY when the user explicitly requests improvements.
    Max 300 tokens to save credits.
    """
    cache_key = _get_cache_key(
        "improve",
        f"{_score_bucket(plastic_risk)}_{_score_bucket(carbon_pct)}",
        zone_name[:20]
    )
    cached = _check_cache(cache_key)
    if cached:
        return cached

    result = _rule_based_improvements(plastic_risk, carbon_pct, features)

    if GEMINI_API_KEY:
        ndvi = features.get("ndvi_score", 0.5)
        urban = features.get("coastal_urbanization_score", 0.4)
        turbidity = features.get("water_turbidity_ntu", 4)

        prompt = (
            f"Coastal restoration expert. Zone: {zone_name}. "
            f"Plastic risk: {plastic_risk:.0%}, Carbon absorption: {carbon_pct:.0%}, "
            f"Lost: {lost_tonnes:,}t CO₂/yr, Damage: ${monthly_damage_usd:,.0f}/mo. "
            f"NDVI: {ndvi:.2f}, Turbidity: {turbidity:.1f}, Urban: {urban:.0%}. "
            f"Return JSON only: {{\"suggestions\":[{{\"title\":str,\"action\":str,\"impact\":str,"
            f"\"timeline\":str,\"carbon_credit_gain_tonnes_year\":int,\"priority\":\"HIGH|MEDIUM|LOW\"}}],"
            f"\"projected_recovery_pct\":int,\"estimated_annual_credit_value_usd\":int}}"
            f" Max 3 suggestions. No extra text."
        )
        text = _call_gemini(prompt, max_tokens=350)
        if text:
            try:
                clean = text.strip().replace("```json", "").replace("```", "").strip()
                parsed = json.loads(clean)
                parsed["source"] = "gemini-2.0-flash"
                parsed["fallback"] = False
                _set_cache(cache_key, parsed)
                return parsed
            except json.JSONDecodeError:
                logger.warning("[Gemini] JSON parse failed for improvement suggestions — using fallback")

    return result


# ── Rule-based fallbacks (zero credits, always reliable) ─────────────────────

def _rule_based_plastic_explanation(risk_score: float, risk_label: str, features: dict) -> dict:
    ship = features.get("ship_density_count", 60)
    river = features.get("river_discharge_m3s", 50)
    rainfall = features.get("rainfall_mm_month", 80)

    if risk_label == "HIGH":
        text = (
            f"HIGH plastic risk ({risk_score:.0%}) — driven by {ship:.0f} vessels and "
            f"{river:.0f} m³/s river discharge. Monsoon rainfall ({rainfall:.0f} mm/mo) "
            f"amplifies land-based plastic transport."
        )
    elif risk_label == "MEDIUM":
        text = (
            f"Moderate plastic risk ({risk_score:.0%}) — coastal urbanisation and seasonal "
            f"river runoff are primary contributors. Pollution spikes expected during monsoon."
        )
    else:
        text = (
            f"Low plastic risk ({risk_score:.0%}) — low ship density and moderate discharge "
            f"maintain relatively clean coastal waters."
        )
    return {"explanation": text, "source": "rule-based", "fallback": True}


def _rule_based_carbon_explanation(absorption_pct: float, lost_tonnes: int, features: dict) -> dict:
    ndvi = features.get("ndvi_score", 0.5)
    turbidity = features.get("water_turbidity_ntu", 4)
    ph = features.get("ph_level", 8.1)

    if absorption_pct < 0.4:
        text = (
            f"Severely degraded carbon sink at {absorption_pct:.0%} of baseline. "
            f"Low NDVI ({ndvi:.2f}) and high turbidity ({turbidity:.1f} NTU) prevent "
            f"seagrass recovery. {lost_tonnes:,} t CO₂/yr unsequestered."
        )
    elif absorption_pct < 0.7:
        text = (
            f"Partially functional carbon ecosystem at {absorption_pct:.0%}. "
            f"Ocean pH ({ph:.2f}) and turbidity are limiting recovery. "
            f"Targeted seagrass restoration could recover {int(lost_tonnes * 0.4):,} t/yr."
        )
    else:
        text = (
            f"Relatively healthy ecosystem at {absorption_pct:.0%} of baseline. "
            f"NDVI ({ndvi:.2f}) indicates good vegetation. "
            f"Maintain current protection to preserve this carbon sink."
        )
    return {"explanation": text, "source": "rule-based", "fallback": True}


def _rule_based_improvements(plastic_risk: float, carbon_pct: float, features: dict) -> dict:
    ndvi = features.get("ndvi_score", 0.5)
    turbidity = features.get("water_turbidity_ntu", 4)
    ship = features.get("ship_density_count", 60)
    urban = features.get("coastal_urbanization_score", 0.4)
    suggestions = []

    if ndvi < 0.6:
        suggestions.append({
            "title": "Seagrass Bed Restoration",
            "action": "Plant native Halophila ovalis and Cymodocea serrulata across degraded beds",
            "impact": f"Recover ~40% of lost carbon absorption ({int((1-carbon_pct)*2000):,} t CO₂/yr)",
            "timeline": "2 years",
            "carbon_credit_gain_tonnes_year": int((1 - carbon_pct) * 1500),
            "priority": "HIGH",
        })
    if turbidity > 5:
        suggestions.append({
            "title": "Sediment Runoff Control",
            "action": "Install silt traps and vegetated buffer strips along upstream river banks",
            "impact": "Reduce turbidity by 30–50%, enabling seagrass photosynthesis",
            "timeline": "6 months",
            "carbon_credit_gain_tonnes_year": int((1 - carbon_pct) * 500),
            "priority": "HIGH",
        })
    if ship > 100:
        suggestions.append({
            "title": "Shipping No-Discharge Zones",
            "action": "Establish 20km coastal no-discharge corridors with waste manifest requirements",
            "impact": f"Reduce ship-source plastic by 35% ({ship:.0f} vessels affected)",
            "timeline": "3 months",
            "carbon_credit_gain_tonnes_year": int(plastic_risk * 800),
            "priority": "MEDIUM",
        })
    if urban > 0.4:
        suggestions.append({
            "title": "River-Mouth Plastic Interception",
            "action": "Deploy floating booms and expand waste collection in 5km coastal belt",
            "impact": "Intercept 60–70% of land-based plastic before ocean entry",
            "timeline": "6 months",
            "carbon_credit_gain_tonnes_year": int(plastic_risk * 600),
            "priority": "MEDIUM",
        })
    if not suggestions:
        suggestions.append({
            "title": "Mangrove Expansion",
            "action": "Plant Avicennia marina + Rhizophora apiculata extending belt by 500m",
            "impact": "Add 3.75 tCO₂/ha/yr sequestration over expanded area",
            "timeline": "5 years",
            "carbon_credit_gain_tonnes_year": 1200,
            "priority": "LOW",
        })

    total = sum(s["carbon_credit_gain_tonnes_year"] for s in suggestions)
    return {
        "suggestions": suggestions[:4],
        "projected_recovery_pct": min(95, int(carbon_pct * 100) + 25),
        "estimated_annual_credit_value_usd": total * 15,
        "source": "rule-based",
        "fallback": True,
    }
