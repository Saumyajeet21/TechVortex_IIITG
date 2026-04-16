"""
Data Fetcher Service — pulls live ocean/marine data from free APIs.
Falls back to mock data when API keys are missing or requests fail.
Supports 14 plastic features + 12 carbon features for upgraded models.
"""
import os
import json
import math
import random
import httpx
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = Path(__file__).parent.parent / "data" / "zone_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

GFW_TOKEN       = os.getenv("GFW_API_TOKEN", "")
COPERNICUS_USER = os.getenv("COPERNICUS_USERNAME", "")
COPERNICUS_PASS = os.getenv("COPERNICUS_PASSWORD", "")


# ─────────────────────────────────────────────────────────────────────────────
# OPEN-METEO MARINE API (free, no key)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_marine_data(lat: float, lon: float) -> dict:
    """
    Fetch SST, wave direction/height/period, precipitation, current speed.
    Derives: wave_energy_index, rainfall_mm_month, wind_onshore_score.
    """
    url = "https://marine-api.open-meteo.com/v1/marine"
    params = {
        "latitude": lat, "longitude": lon,
        "hourly": ["wave_direction", "sea_surface_temperature",
                   "wave_height", "wave_period", "ocean_current_velocity"],
        "daily": ["precipitation_sum"],
        "forecast_days": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            h = data.get("hourly", {})
            d = data.get("daily", {})

            idx         = 12  # midday reading
            wave_dir    = _safe(h.get("wave_direction"), idx, 180.0)
            sst         = _safe(h.get("sea_surface_temperature"), idx, 27.0)
            wave_ht     = _safe(h.get("wave_height"), idx, 1.0)
            wave_period = _safe(h.get("wave_period"), idx, 6.0)
            current_v   = _safe(h.get("ocean_current_velocity"), idx, 0.3)
            daily_rain  = _safe(d.get("precipitation_sum"), 0, 3.0)

            rainfall_mm = float(daily_rain or 3.0) * 30  # monthly proxy

            # Onshore wind score: cosine(angle vs shore normal)
            shore_normal = 270.0 if lon < 80 else 90.0
            angle_diff = abs(float(wave_dir or 180) - shore_normal)
            if angle_diff > 180: angle_diff = 360 - angle_diff
            wind_onshore = max(0.0, round(math.cos(math.radians(angle_diff)), 3))

            # Wave energy index: H² × T (J/m proportional)
            wh = float(wave_ht or 1.0)
            wp = float(wave_period or 6.0)
            wave_energy = round(wh ** 2 * wp, 2)

            return {
                "source": "live",
                "sea_surface_temperature_c": round(float(sst or 27.0), 2),
                "wind_onshore_score":        wind_onshore,
                "wave_height_m":             round(wh, 2),
                "wave_energy_index":         wave_energy,
                "rainfall_mm_month":         round(rainfall_mm, 1),
                "ocean_current_speed_ms":    round(float(current_v or 0.3), 3),
            }
    except Exception as e:
        print(f"[DataFetcher] Open-Meteo error: {e} — using mock marine data")
        return _mock_marine_data(lat, lon)


def _mock_marine_data(lat: float, lon: float) -> dict:
    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed)
    wh = round(random.uniform(0.5, 3.0), 2)
    wp = round(random.uniform(5.0, 12.0), 1)
    return {
        "source": "mock",
        "sea_surface_temperature_c": round(random.uniform(24.0, 31.0), 2),
        "wind_onshore_score":        round(random.uniform(0.2, 0.9), 3),
        "wave_height_m":             wh,
        "wave_energy_index":         round(wh ** 2 * wp, 2),
        "rainfall_mm_month":         round(random.uniform(20, 350), 1),
        "ocean_current_speed_ms":    round(random.uniform(0.05, 1.2), 3),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL FISHING WATCH (requires GFW_API_TOKEN)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_ship_density(lat: float, lon: float, radius_km: float = 50) -> dict:
    if not GFW_TOKEN:
        return _mock_ship_data(lat, lon)
    deg = radius_km / 111.0
    bbox = [lon - deg, lat - deg, lon + deg, lat + deg]
    headers = {"Authorization": f"Bearer {GFW_TOKEN}"}
    url = "https://gateway.api.globalfishingwatch.org/v3/4wings/report"
    params = {
        "datasets[0]": "public-global-fishing-effort:latest",
        "date-range": "2023-01-01,2023-12-31",
        "spatial-resolution": "LOW",
        "temporal-resolution": "MONTHLY",
        "region": json.dumps({"type": "Feature", "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [bbox[0],bbox[1]], [bbox[2],bbox[1]],
                [bbox[2],bbox[3]], [bbox[0],bbox[3]], [bbox[0],bbox[1]]
            ]]
        }}),
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            total_hours = sum(e.get("value", 0) for e in data.get("entries", []))
            area_km2 = math.pi * radius_km ** 2
            ship_density = round(total_hours / area_km2 * 0.1, 2)
            return {
                "source": "live",
                "ship_density_count": min(ship_density, 300),
                "fishing_vessel_hours": round(total_hours / 52, 2),
            }
    except Exception as e:
        print(f"[DataFetcher] GFW error: {e} — using mock ship data")
        return _mock_ship_data(lat, lon)


def _mock_ship_data(lat: float, lon: float) -> dict:
    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed + 1)
    return {
        "source": "mock",
        "ship_density_count":   round(random.uniform(20, 180), 1),
        "fishing_vessel_hours": round(random.uniform(15, 80), 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
# OSM OVERPASS — River data (free, no key)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_river_data(lat: float, lon: float, radius_km: float = 50) -> dict:
    deg = radius_km / 111.0
    bbox_str = f"{lat-deg},{lon-deg},{lat+deg},{lon+deg}"
    query = f'[out:json][timeout:15]; (way["waterway"="river"]({bbox_str}); relation["waterway"="river"]({bbox_str});); out center;'
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=20.0)
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            if not elements:
                return _mock_river_data(lat, lon)
            river_names, min_dist = [], float("inf")
            for el in elements[:12]:
                c = el.get("center", {})
                dist = _haversine(lat, lon, c.get("lat", lat), c.get("lon", lon))
                if dist < min_dist: min_dist = dist
                name = el.get("tags", {}).get("name")
                if name and name not in river_names: river_names.append(name)
            est_discharge = min(max(len(elements) * 5.0 + max(0, 100 - min_dist * 2), 5), 400)
            return {
                "source": "live",
                "river_discharge_m3s":         round(est_discharge, 1),
                "distance_to_river_mouth_km":  round(min_dist, 2),
                "top_rivers":                  river_names[:3],
            }
    except Exception as e:
        print(f"[DataFetcher] Overpass error: {e} — using mock river data")
        return _mock_river_data(lat, lon)


def _mock_river_data(lat: float, lon: float) -> dict:
    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed + 2)
    return {
        "source": "mock",
        "river_discharge_m3s":        round(random.uniform(10, 150), 1),
        "distance_to_river_mouth_km": round(random.uniform(1, 25), 2),
        "top_rivers": ["Unknown River"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# NDVI — NASA MODIS (requires NASA Earthdata credentials)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_ndvi(lat: float, lon: float) -> dict:
    """Live path: set NASA_EARTHDATA_TOKEN env var to enable."""
    # Uncomment when credentials available in .env:
    # import earthaccess
    # earthaccess.login(strategy="environment")
    # ...
    return _mock_ndvi(lat, lon)


def _mock_ndvi(lat: float, lon: float) -> dict:
    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed + 3)
    base = 0.65 if abs(lat) < 20 else 0.50
    ndvi = round(random.uniform(base - 0.25, base + 0.15), 3)
    return {"source": "mock", "ndvi_score": max(0.1, min(0.95, ndvi))}


# ─────────────────────────────────────────────────────────────────────────────
# TURBIDITY + OCEAN BIOGEOCHEMISTRY — CMEMS
# (requires COPERNICUS_USERNAME + COPERNICUS_PASSWORD)
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_ocean_biogeochem(lat: float, lon: float) -> dict:
    """
    Fetch KD490 turbidity, chlorophyll-a, dissolved oxygen, salinity, pH
    from Copernicus Marine Service. Falls back to mock when credentials absent.
    """
    if COPERNICUS_USER and COPERNICUS_PASS:
        try:
            import copernicusmarine as cm
            ds = cm.open_dataset(
                dataset_id="GLOBAL_MULTIYEAR_BGC_001_029",
                variables=["o2", "ph", "no3", "chl", "so"],
                minimum_latitude=lat - 0.2, maximum_latitude=lat + 0.2,
                minimum_longitude=lon - 0.2, maximum_longitude=lon + 0.2,
            )
            return {
                "source": "live",
                "dissolved_oxygen_mg_l":    float(ds["o2"].mean()) * 1.4,   # mmol→mg/L approx
                "ph_level":                 float(ds["ph"].mean()),
                "nitrogen_concentration":   float(ds["no3"].mean()),
                "chlorophyll_a_mg_m3":      float(ds["chl"].mean()),
                "salinity_ppt":             float(ds["so"].mean()),
            }
        except Exception as e:
            print(f"[DataFetcher] CMEMS BGC error: {e}")

    return _mock_biogeochem(lat, lon)


def _mock_biogeochem(lat: float, lon: float) -> dict:
    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed + 5)
    return {
        "source": "mock",
        "water_turbidity_ntu":   round(random.uniform(1.0, 15.0), 2),
        "dissolved_oxygen_mg_l": round(random.uniform(4.0, 10.0), 2),
        "ph_level":              round(random.uniform(7.8, 8.3), 3),
        "chlorophyll_a_mg_m3":   round(random.uniform(0.3, 8.0), 2),
        "salinity_ppt":          round(random.uniform(22.0, 36.0), 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# AGGREGATE: all features for one zone
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_all_features(lat: float, lon: float, radius_km: float = 50) -> dict:
    """Gather all 14 plastic + 12 carbon features. Returns flat feature dict."""
    import asyncio
    marine, ships, rivers, ndvi_data, bgc = await asyncio.gather(
        fetch_marine_data(lat, lon),
        fetch_ship_density(lat, lon, radius_km),
        fetch_river_data(lat, lon, radius_km),
        fetch_ndvi(lat, lon),
        fetch_ocean_biogeochem(lat, lon),
    )

    month = datetime.now(timezone.utc).month
    monsoon_flag = 1.0 if 6 <= month <= 9 else 0.0

    seed = int(abs(lat * 100 + lon * 100)) % 1000
    random.seed(seed + 99)

    # GDP / urbanization proxies by latitude band (India-specific)
    gdp_proxy      = 1 - min(abs(lat - 20) / 20, 1.0) * 0.4  # rough north-south proxy
    urban_score    = round(random.uniform(0.2, 0.8), 3)
    waste_pc       = round(random.uniform(0.15, 0.55), 3)
    tidal_range    = round(random.uniform(0.3, 5.0), 2)
    river_d        = rivers.get("river_discharge_m3s", 50.0)
    sediment_proxy = round(min(river_d / 400, 1.0), 3)          # higher discharge → more sediment
    pop            = round(random.uniform(300000, 2500000))
    nitrogen_proxy = round(min((pop / 2500000) * (river_d / 400), 1.0), 3)
    turbidity      = bgc.get("water_turbidity_ntu", 4.0)
    benthic_par    = round(max(0.0, 1 - turbidity / 20), 3)     # derived from turbidity

    return {
        # ── Plastic model (14) ──────────────────────────────────────
        "ship_density_count":           ships.get("ship_density_count", 60.0),
        "river_discharge_m3s":          river_d,
        "wind_onshore_score":           marine.get("wind_onshore_score", 0.5),
        "population_within_50km":       pop,
        "fishing_vessel_hours":         ships.get("fishing_vessel_hours", 30.0),
        "distance_to_river_mouth_km":   rivers.get("distance_to_river_mouth_km", 10.0),
        "seasonal_monsoon_flag":        monsoon_flag,
        "wave_energy_index":            marine.get("wave_energy_index", 6.0),
        "rainfall_mm_month":            marine.get("rainfall_mm_month", 80.0),
        "plastic_waste_per_capita_kg":  waste_pc,
        "coastal_urbanization_score":   urban_score,
        "tidal_range_m":                tidal_range,
        "ocean_current_speed_ms":       marine.get("ocean_current_speed_ms", 0.3),
        "gdp_per_capita_proxy":         round(gdp_proxy, 3),
        # ── Carbon model (12) ───────────────────────────────────────
        "ndvi_score":                   ndvi_data.get("ndvi_score", 0.55),
        "water_turbidity_ntu":          turbidity,
        "sea_surface_temperature_c":    marine.get("sea_surface_temperature_c", 27.0),
        "seagrass_coverage_pct":        round(random.uniform(0.2, 0.7), 3),
        "ph_level":                     bgc.get("ph_level", 8.1),
        "salinity_ppt":                 bgc.get("salinity_ppt", 30.0),
        "chlorophyll_a_mg_m3":          bgc.get("chlorophyll_a_mg_m3", 2.0),
        "dissolved_oxygen_mg_l":        bgc.get("dissolved_oxygen_mg_l", 7.0),
        "sediment_load_proxy":          sediment_proxy,
        "nitrogen_eutrophication":      nitrogen_proxy,
        "benthic_light_availability":   benthic_par,
        # ── Metadata ────────────────────────────────────────────────
        "top_rivers": rivers.get("top_rivers", []),
        "data_sources": {
            "marine": marine.get("source"),
            "ships":  ships.get("source"),
            "rivers": rivers.get("source"),
            "ndvi":   ndvi_data.get("source"),
            "bgc":    bgc.get("source"),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _safe(lst, idx, default=None):
    try:
        val = lst[idx]
        return val if val is not None else default
    except (IndexError, TypeError):
        return default
