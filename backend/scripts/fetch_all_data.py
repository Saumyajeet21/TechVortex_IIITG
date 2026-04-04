"""
Full data pipeline — fetches live data for all zones and runs predictions.
Run: python scripts/fetch_all_data.py
Schedule: called by APScheduler every 24h, or run manually.
"""
import sys
import os
import json
import asyncio
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ZONES = [
    {"id": "MUM-001", "name": "Mumbai Coast",      "lat": 18.92, "lon": 72.82},
    {"id": "CHN-001", "name": "Chennai Marina",    "lat": 13.05, "lon": 80.27},
    {"id": "KOC-001", "name": "Kochi Backwaters",  "lat":  9.93, "lon": 76.26},
    {"id": "SUN-001", "name": "Sundarbans Delta",  "lat": 21.94, "lon": 89.18},
    {"id": "GOA-001", "name": "Goa North Coast",   "lat": 15.49, "lon": 73.82},
]

CACHE_DIR = Path(__file__).parent.parent / "data" / "zone_cache"
PRED_DIR = Path(__file__).parent.parent / "data" / "predictions"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
PRED_DIR.mkdir(parents=True, exist_ok=True)


async def process_zone(zone: dict) -> dict:
    from services.data_fetcher import fetch_all_features
    from models.plastic_model import PlasticRiskModel
    from models.carbon_model import CarbonModel
    from services.calculator import (
        calculate_damage_cost,
        calculate_source_attribution,
        generate_interventions,
    )

    print(f"\n[Pipeline] Processing {zone['name']} ({zone['id']})...")

    # 1. Fetch all features
    features = await fetch_all_features(zone["lat"], zone["lon"])
    print(f"  ✓ Features fetched (sources: {features.get('data_sources', {})})")

    # 2. Run models
    plastic_model = PlasticRiskModel()
    carbon_model = CarbonModel()

    plastic_result = plastic_model.predict(features)
    carbon_result = carbon_model.predict(features)
    print(f"  ✓ Plastic risk: {plastic_result['plastic_risk_score']:.3f} ({plastic_result['risk_label']})")
    print(f"  ✓ Carbon absorption: {carbon_result['carbon_absorption_pct']:.3f}")

    # 3. Calculate damage
    damage_result = calculate_damage_cost(
        carbon_result["lost_absorption_tonnes_year"], "monthly"
    )
    print(f"  ✓ Monthly damage: ${damage_result['headline_damage_usd']:,.2f}")

    # 4. Attribution + interventions
    attribution = calculate_source_attribution(features)
    interventions = generate_interventions(
        attribution, features,
        top_rivers=features.get("top_rivers", []),
        zone_name=zone["name"],
    )

    # 5. Build cache entry
    entry = {
        "zone_id": zone["id"],
        "name": zone["name"],
        "lat": zone["lat"],
        "lon": zone["lon"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "features": {k: v for k, v in features.items() if k != "data_sources"},
        "data_sources": features.get("data_sources", {}),
        "plastic_risk": {**plastic_result, "zone_id": zone["id"]},
        "carbon": carbon_result,
        "damage": damage_result,
        "source": {
            "attribution": attribution,
            "top_rivers": features.get("top_rivers", []),
            "interventions": interventions,
        },
    }

    # 6. Save cache
    cache_path = CACHE_DIR / f"{zone['id']}.json"
    with open(cache_path, "w") as f:
        json.dump(entry, f, indent=2)
    print(f"  ✓ Saved to {cache_path}")

    return entry


async def main():
    print("=" * 60)
    print("OceanGuard — Full Data Pipeline")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    results = []
    for zone in ZONES:
        result = await process_zone(zone)
        results.append(result)

    # Save combined predictions
    pred_path = PRED_DIR / "latest.json"
    with open(pred_path, "w") as f:
        json.dump({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "zones": results,
        }, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"✓ Pipeline complete. Predictions saved to {pred_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
