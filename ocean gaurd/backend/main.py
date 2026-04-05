"""
OceanGuard FastAPI Backend
Estimates microplastic zones, carbon damage, and recovery scenarios.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Global model instances (loaded once at startup) ──────────────────────────
plastic_model = None
carbon_model = None
scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load/train both ML models and start the background scheduler."""
    global plastic_model, carbon_model, scheduler

    logger.info("╔═══════════════════════════════════════╗")
    logger.info("║        OceanGuard Backend v1.0        ║")
    logger.info("╚═══════════════════════════════════════╝")

    # Load ML models (trains from synthetic data if .pkl doesn't exist)
    logger.info("Loading Plastic Risk Model (XGBoost)...")
    from models.plastic_model import PlasticRiskModel
    plastic_model = PlasticRiskModel()
    logger.info("✓ Plastic Risk Model ready")

    logger.info("Loading Carbon Absorption Model (Random Forest)...")
    from models.carbon_model import CarbonModel
    carbon_model = CarbonModel()
    logger.info("✓ Carbon Model ready")

    # Start 24h background refresh scheduler (optional)
    try:
        from services.scheduler import start_scheduler
        scheduler = start_scheduler()
        logger.info("✓ Background scheduler started")
    except Exception as e:
        logger.warning(f"Scheduler not started (non-critical): {e}")
        scheduler = None

    logger.info("━━━ All systems ready. API available at http://localhost:8000 ━━━")
    logger.info("📚 Interactive docs: http://localhost:8000/docs")

    yield  # App runs here

    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped.")


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="OceanGuard API",
    description=(
        "Ocean Plastic Climate Damage Estimator — "
        "predicts microplastic risk, carbon absorption loss, "
        "economic damage, and recovery scenarios for Indian coastal zones."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ─────────────────────────────────────────────────────────────
from routers import zones, plastic, carbon, damage, source, simulate, improve

app.include_router(zones.router, tags=["Zones"])
app.include_router(plastic.router, tags=["Plastic Risk"])
app.include_router(carbon.router, tags=["Carbon Absorption"])
app.include_router(damage.router, tags=["Damage Cost"])
app.include_router(source.router, tags=["Source Attribution"])
app.include_router(simulate.router, tags=["Simulation"])
app.include_router(improve.router, tags=["Improvement"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "OceanGuard API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "endpoints": [
            "GET  /api/zones",
            "POST /api/plastic-risk",
            "POST /api/carbon-absorption",
            "POST /api/damage-cost",
            "POST /api/plastic-source",
            "POST /api/simulate",
        ],
    }


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "models": {
            "plastic_model": plastic_model is not None,
            "carbon_model": carbon_model is not None,
        },
        "scheduler": scheduler.running if scheduler else False,
    }
