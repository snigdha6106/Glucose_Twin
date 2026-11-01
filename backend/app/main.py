import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import router as api_router
from app.data.loader import dataset_repo

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("diabetes_twin")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Diabetes Digital Twin Platform...")
    logger.info(f"Loaded {len(dataset_repo._raw_cache)} datasets into memory.")
    logger.info("Ready to accept requests.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description="End-to-End Biomedical AI Platform for Personalized Glucose Prediction, ReplayBG Physiological Digital Twin Simulation, and Explainable What-If Analysis."
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Mount API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/api/status")
def status_endpoint():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs",
        "scientific_frameworks": [
            "ReplayBG Physiological ODE Digital Twin (Cappon et al., IEEE TBME 2023)",
            "PhysioNet CGMacros Multi-Phenotype Prediction (DOI: 10.13026/3z8q-x658)",
            "SHAP Game-Theoretic Explainability (Lundberg & Lee, NeurIPS)",
            "Clarke & Parkes Error Grid Analysis"
        ]
    }

# Mount built frontend if dist directory exists
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
