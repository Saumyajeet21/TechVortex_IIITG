"""GET /api/zones — list all monitored zones with current risk scores."""
import json
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()

CACHE_DIR = Path(__file__).parent.parent / "data" / "zone_cache"
MOCK_PATH  = Path(__file__).parent.parent / "data" / "mock_predictions.json"

# 12 monitored Indian coastal zones
ZONE_META = [
    {"id": "MUM-001", "name": "Mumbai Coast",         "lat": 18.92, "lon": 72.82, "region": "Maharashtra"},
    {"id": "CHN-001", "name": "Chennai Marina",       "lat": 13.05, "lon": 80.27, "region": "Tamil Nadu"},
    {"id": "KOC-001", "name": "Kochi Backwaters",     "lat":  9.93, "lon": 76.26, "region": "Kerala"},
    {"id": "SUN-001", "name": "Sundarbans Delta",     "lat": 21.94, "lon": 89.18, "region": "West Bengal"},
    {"id": "GOA-001", "name": "Goa North Coast",      "lat": 15.49, "lon": 73.82, "region": "Goa"},
    {"id": "VIZ-001", "name": "Visakhapatnam Coast",  "lat": 17.68, "lon": 83.22, "region": "Andhra Pradesh"},
    {"id": "ORS-001", "name": "Odisha Coast",         "lat": 19.90, "lon": 86.10, "region": "Odisha"},
    {"id": "AND-001", "name": "Andaman Islands",      "lat": 11.74, "lon": 92.66, "region": "Andaman & Nicobar"},
    {"id": "MAN-001", "name": "Gulf of Mannar",       "lat":  9.10, "lon": 79.10, "region": "Tamil Nadu"},
    {"id": "KUT-001", "name": "Gulf of Kutch",        "lat": 22.60, "lon": 70.20, "region": "Gujarat"},
    {"id": "MAN-002", "name": "Mangalore Coast",      "lat": 12.87, "lon": 74.84, "region": "Karnataka"},
    {"id": "PAR-001", "name": "Paradip Port",         "lat": 20.32, "lon": 86.61, "region": "Odisha"},
]


def _load_zone_data(zone_id: str) -> dict | None:
    """Try live cache first, then mock predictions."""
    cache_path = CACHE_DIR / f"{zone_id}.json"
    if cache_path.exists():
        try:
            with open(cache_path) as f:
                return json.load(f)
        except Exception:
            pass
    if MOCK_PATH.exists():
        try:
            with open(MOCK_PATH) as f:
                mock = json.load(f)
            return mock.get("zones", {}).get(zone_id)
        except Exception:
            pass
    return None


@router.get("/api/zones")
async def get_zones():
    """Return all 12 monitored zones with current risk score, carbon %, and monthly damage."""
    zones = []
    for meta in ZONE_META:
        data = _load_zone_data(meta["id"])
        risk_score = 0.5
        carbon_pct = 0.5
        damage_usd = 0.0
        risk_label = "MEDIUM"

        if data:
            plastic    = data.get("plastic_risk", {})
            carbon     = data.get("carbon", {})
            damage     = data.get("damage", {})
            risk_score = plastic.get("plastic_risk_score", 0.5)
            carbon_pct = carbon.get("carbon_absorption_pct", 0.5)
            damage_usd = damage.get("headline_damage_usd", 0.0)
            risk_label = plastic.get("risk_label", "MEDIUM")

        zones.append({
            "id":                   meta["id"],
            "name":                 meta["name"],
            "lat":                  meta["lat"],
            "lon":                  meta["lon"],
            "region":               meta.get("region", "India"),
            "risk_score":           risk_score,
            "risk_label":           risk_label,
            "carbon_absorption_pct": carbon_pct,
            "monthly_damage_usd":   damage_usd,
            "last_updated":         data.get("updated_at") if data else datetime.now(timezone.utc).isoformat(),
        })

    # Also fetch recent custom searches from Supabase
    custom_zones = []
    try:
        from services.supabase_service import get_recent_analyses
        recent = get_recent_analyses(limit=5)
        for r in recent:
            custom_zones.append({
                "id":                    f"USR-{r['id'][:8]}",
                "name":                  r.get("location_name", "Custom Search"),
                "lat":                   r.get("lat", 0),
                "lon":                   r.get("lon", 0),
                "region":               "User Search",
                "risk_score":           r.get("plastic_risk_score", 0.5),
                "risk_label":           r.get("risk_label", "MEDIUM"),
                "carbon_absorption_pct": r.get("carbon_absorption_pct", 0.5),
                "monthly_damage_usd":   r.get("monthly_loss_usd") or 0.0,
                "last_updated":         r.get("queried_at", datetime.now(timezone.utc).isoformat()),
                "is_custom":            True,
            })
    except Exception:
        pass

    all_zones = zones + custom_zones
    total_damage = sum(z["monthly_damage_usd"] for z in all_zones)
    worst_zone   = max(all_zones, key=lambda z: z["risk_score"])

    return {
        "zones": all_zones,
        "monitored_count": len(zones),
        "custom_count":    len(custom_zones),
        "summary": {
            "total_monthly_damage_usd": round(total_damage, 2),
            "zones_monitored":          len(zones),
            "custom_searches":          len(custom_zones),
            "worst_zone":               worst_zone["name"],
            "worst_zone_id":            worst_zone["id"],
        },
    }


@router.get("/api/recent-searches")
async def get_recent_searches():
    """Return the last 10 user-searched locations from Supabase."""
    try:
        from services.supabase_service import get_recent_analyses
        return {"searches": get_recent_analyses(limit=10)}
    except Exception as e:
        return {"searches": [], "error": str(e)}
