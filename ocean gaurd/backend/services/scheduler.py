"""
Background Scheduler — refreshes zone data every 3h via APScheduler.
Data is stored to Supabase automatically: every 3 hours for all 5 zones.
"""
import json
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent / "data" / "zone_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class _NumpyEncoder(json.JSONEncoder):
    """Handle numpy float32/int64 types that json.dump can't serialize."""
    def default(self, obj):
        try:
            import numpy as np
            if isinstance(obj, (np.floating, np.integer)):
                return obj.item()
            if isinstance(obj, np.ndarray):
                return obj.tolist()
        except ImportError:
            pass
        return super().default(obj)

# All 12 monitored Indian coastal zones
ZONES = [
    {"id": "MUM-001", "name": "Mumbai Coast",         "lat": 18.92, "lon": 72.82},
    {"id": "CHN-001", "name": "Chennai Marina",       "lat": 13.05, "lon": 80.27},
    {"id": "KOC-001", "name": "Kochi Backwaters",     "lat":  9.93, "lon": 76.26},
    {"id": "SUN-001", "name": "Sundarbans Delta",     "lat": 21.94, "lon": 89.18},
    {"id": "GOA-001", "name": "Goa North Coast",      "lat": 15.49, "lon": 73.82},
    {"id": "VIZ-001", "name": "Visakhapatnam Coast",  "lat": 17.68, "lon": 83.22},
    {"id": "ORS-001", "name": "Odisha Coast",         "lat": 19.90, "lon": 86.10},
    {"id": "AND-001", "name": "Andaman Islands",      "lat": 11.74, "lon": 92.66},
    {"id": "MAN-001", "name": "Gulf of Mannar",       "lat":  9.10, "lon": 79.10},
    {"id": "KUT-001", "name": "Gulf of Kutch",        "lat": 22.60, "lon": 70.20},
    {"id": "MAN-002", "name": "Mangalore Coast",      "lat": 12.87, "lon": 74.84},
    {"id": "PAR-001", "name": "Paradip Port",         "lat": 20.32, "lon": 86.61},
]


def refresh_zone(zone: dict) -> None:
    """Fetch fresh features and run both models for one zone."""
    from services.data_fetcher import fetch_all_features

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        features = loop.run_until_complete(
            fetch_all_features(zone["lat"], zone["lon"])
        )
        loop.close()

        # Guard: ensure features is a dict
        if not isinstance(features, dict):
            logger.error(f"[Scheduler] fetch_all_features returned {type(features)} for {zone['id']} — skipping")
            return

        # Import models (already loaded at startup)
        from main import plastic_model, carbon_model
        from services.calculator import (
            calculate_damage_cost,
            calculate_source_attribution,
            generate_interventions,
        )

        plastic_result = plastic_model.predict(features)
        carbon_result = carbon_model.predict(features)
        damage_result = calculate_damage_cost(
            carbon_result["lost_absorption_tonnes_year"], "monthly"
        )
        attribution = calculate_source_attribution(features)
        interventions = generate_interventions(
            attribution, features,
            top_rivers=features.get("top_rivers", []),
            zone_name=zone["name"],
        )

        cache_entry = {
            "zone_id": zone["id"],
            "name": zone["name"],
            "lat": zone["lat"],
            "lon": zone["lon"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "features": features,
            "plastic_risk": {**plastic_result, "zone_id": zone["id"]},
            "carbon": carbon_result,
            "damage": damage_result,
            "source": {
                "attribution": attribution,
                "top_rivers": features.get("top_rivers", []),
                "interventions": interventions,
            },
        }

        cache_path = CACHE_DIR / f"{zone['id']}.json"
        with open(cache_path, "w") as f:
            json.dump(cache_entry, f, indent=2, cls=_NumpyEncoder)

        logger.info(f"[Scheduler] Refreshed zone {zone['id']} → {cache_path}")

        # ── Save to Supabase ──────────────────────────────────────────────────
        try:
            from services.supabase_service import save_zone_prediction, save_model_log
            save_zone_prediction(
                zone_id=zone["id"],
                features=features,
                plastic_result=plastic_result,
                carbon_result=carbon_result,
                damage_result=damage_result,
                attribution=attribution,
            )
            logger.info(f"[Scheduler] ✓ Supabase: saved prediction for {zone['id']}")
        except Exception as db_err:
            logger.warning(f"[Scheduler] Supabase save skipped: {db_err}")

    except Exception as e:
        logger.error(f"[Scheduler] Failed to refresh {zone['id']}: {e}")



def refresh_all_zone_data() -> None:
    """Refresh all monitored zones. Called by APScheduler every 24h."""
    logger.info(f"[Scheduler] Starting scheduled refresh for {len(ZONES)} zones...")
    for zone in ZONES:
        refresh_zone(zone)
    logger.info("[Scheduler] All zones refreshed.")


def start_scheduler() -> BackgroundScheduler:
    """Initialize and start the background scheduler."""
    scheduler = BackgroundScheduler(timezone="UTC")

    # Refresh every 6 hours — stores to Supabase automatically
    scheduler.add_job(
        refresh_all_zone_data,
        trigger="interval",
        hours=3,
        id="zone_refresh",
        replace_existing=True,
        next_run_time=__import__('datetime').datetime.now(__import__('datetime').timezone.utc),  # run immediately on startup
    )
    scheduler.start()
    logger.info("[Scheduler] Background scheduler started (refresh every 6h, first run: immediate).")
    return scheduler
