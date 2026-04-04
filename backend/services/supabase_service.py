"""
Supabase Service — manages all database operations for OceanGuard.

Tables:
  zones             — Reference coastal zone metadata (pre-seeded)
  zone_predictions  — ML predictions per zone over time
  custom_analyses   — User-submitted location queries from dashboard
  model_logs        — ML model training audit trail
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_client = None  # Singleton Supabase client


def get_supabase_client():
    """
    Get or create the Supabase client singleton.
    Returns None if credentials are missing (app continues without DB).
    """
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key:
        logger.warning("[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — DB disabled")
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        logger.info(f"[Supabase] Connected → {url[:45]}...")
        return _client
    except Exception as e:
        logger.error(f"[Supabase] Connection failed: {e}")
        return None


# ── Zone Predictions ──────────────────────────────────────────────────────────

def save_zone_prediction(
    zone_id: str,
    features: dict,
    plastic_result: dict,
    carbon_result: dict,
    damage_result: dict,
    attribution: dict,
) -> Optional[dict]:
    """Save a full zone prediction snapshot to zone_predictions table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        ci = plastic_result.get("confidence_interval") or [None, None]
        carbon_prices = damage_result.get("carbon_prices") or {}

        row = {
            "zone_id":    zone_id,
            "predicted_at": datetime.now(timezone.utc).isoformat(),
            # Plastic
            "plastic_risk_score": plastic_result.get("plastic_risk_score"),
            "risk_label":         plastic_result.get("risk_label"),
            "confidence_low":     ci[0] if isinstance(ci, (list, tuple)) and len(ci) > 0 else None,
            "confidence_high":    ci[1] if isinstance(ci, (list, tuple)) and len(ci) > 1 else None,
            # Carbon
            "carbon_absorption_pct":              carbon_result.get("carbon_absorption_pct"),
            "baseline_absorption_tonnes_year":    carbon_result.get("baseline_absorption_tonnes_year"),
            "actual_absorption_tonnes_year":      carbon_result.get("actual_absorption_tonnes_year"),
            "lost_absorption_tonnes_year":        carbon_result.get("lost_absorption_tonnes_year"),
            # Damage
            "monthly_loss_voluntary_usd":   carbon_prices.get("voluntary_market_usd"),
            "monthly_loss_eu_ets_usd":      carbon_prices.get("eu_ets_usd"),
            "monthly_loss_social_cost_usd": carbon_prices.get("social_cost_carbon_usd"),
            # Features
            "ship_density_count":          features.get("ship_density_count"),
            "river_discharge_m3s":         features.get("river_discharge_m3s"),
            "wave_energy_index":           features.get("wave_energy_index"),
            "rainfall_mm_month":           features.get("rainfall_mm_month"),
            "sea_surface_temperature_c":   features.get("sea_surface_temperature_c"),
            "ndvi_score":                  features.get("ndvi_score"),
            "water_turbidity_ntu":         features.get("water_turbidity_ntu"),
            "ph_level":                    features.get("ph_level"),
            "salinity_ppt":                features.get("salinity_ppt"),
            "chlorophyll_a_mg_m3":         features.get("chlorophyll_a_mg_m3"),
            "dissolved_oxygen_mg_l":       features.get("dissolved_oxygen_mg_l"),
            "seasonal_monsoon_flag":       int(features.get("seasonal_monsoon_flag", 0)) if features.get("seasonal_monsoon_flag") is not None else None,
        }

        # Remove None values
        row = {k: v for k, v in row.items() if v is not None}

        result = client.table("zone_predictions").insert(row).execute()
        logger.info(f"[Supabase] ✓ Saved zone prediction for {zone_id}")
        return result.data

    except Exception as e:
        logger.error(f"[Supabase] zone_predictions insert failed: {e}")
        return None


# ── Custom Analyses (user searches) ──────────────────────────────────────────

def save_custom_analysis(
    location_name: str,
    lat: float,
    lon: float,
    radius_km: int,
    plastic_result: dict,
    carbon_result: dict,
    damage_result: dict,
) -> Optional[dict]:
    """Save a dashboard user's location query to custom_analyses table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        row = {
            "queried_at":            datetime.now(timezone.utc).isoformat(),
            "location_name":         location_name,
            "lat":                   lat,
            "lon":                   lon,
            "radius_km":             radius_km,
            "plastic_risk_score":    plastic_result.get("plastic_risk_score"),
            "risk_label":            plastic_result.get("risk_label"),
            "carbon_absorption_pct": carbon_result.get("carbon_absorption_pct"),
            "lost_tonnes_year":      carbon_result.get("lost_absorption_tonnes_year"),
            "monthly_loss_usd":      (damage_result.get("carbon_prices") or {}).get("voluntary_market_usd"),
            "full_result": {
                "plastic": plastic_result,
                "carbon":  carbon_result,
                "damage":  damage_result,
            },
        }
        row = {k: v for k, v in row.items() if v is not None}

        result = client.table("custom_analyses").insert(row).execute()
        logger.info(f"[Supabase] ✓ Saved custom analysis for '{location_name}'")
        return result.data
    except Exception as e:
        logger.error(f"[Supabase] custom_analyses insert failed: {e}")
        return None


# ── Model Training Logs ───────────────────────────────────────────────────────

def save_model_log(
    model_name: str,
    n_features: int,
    n_samples: int,
    mae: float,
    r2_score: float,
    hyperparams: dict,
) -> Optional[dict]:
    """Save ML model training metrics to model_logs table."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        row = {
            "trained_at":  datetime.now(timezone.utc).isoformat(),
            "model_name":  model_name,
            "n_features":  n_features,
            "n_samples":   n_samples,
            "mae":         mae,
            "r2_score":    r2_score,
            "hyperparams": hyperparams,
        }
        result = client.table("model_logs").insert(row).execute()
        logger.info(f"[Supabase] ✓ Saved model log — {model_name} R²={r2_score:.4f}")
        return result.data
    except Exception as e:
        logger.error(f"[Supabase] model_logs insert failed: {e}")
        return None


# ── Recent Predictions Query ──────────────────────────────────────────────────

def get_recent_predictions(zone_id: str, limit: int = 10) -> list:
    """Fetch latest predictions for a zone (for timeseries display)."""
    client = get_supabase_client()
    if not client:
        return []
    try:
        result = (
            client.table("zone_predictions")
            .select("*")
            .eq("zone_id", zone_id)
            .order("predicted_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"[Supabase] get_recent_predictions failed: {e}")
        return []


def get_recent_analyses(limit: int = 20) -> list:
    """Fetch latest user-submitted analyses."""
    client = get_supabase_client()
    if not client:
        return []
    try:
        result = (
            client.table("custom_analyses")
            .select("id,queried_at,location_name,lat,lon,plastic_risk_score,risk_label,carbon_absorption_pct,monthly_loss_usd")
            .order("queried_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"[Supabase] get_recent_analyses failed: {e}")
        return []
