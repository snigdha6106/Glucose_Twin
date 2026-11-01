import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MPL_CACHE_DIR = BASE_DIR / ".mplcache"
MPL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(MPL_CACHE_DIR)
os.environ["MPLBACKEND"] = "Agg"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["LOKY_MAX_CPU_COUNT"] = "1"

DATA_DIR = BASE_DIR
BACKEND_DIR = BASE_DIR / "backend"
MODELS_DIR = BASE_DIR / "models"
EXPERIMENTS_DIR = BASE_DIR / "experiments"

# Ensure directories exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)
EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseModel):
    PROJECT_NAME: str = "Diabetes Digital Twin Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    MODELS_DIR: Path = MODELS_DIR
    EXPERIMENTS_DIR: Path = EXPERIMENTS_DIR
    
    # Dataset file paths
    PATIENT_INFO_FILE: Path = DATA_DIR / "patient_info.csv"
    DAY_1_FILE: Path = DATA_DIR / "data_day_1.csv"
    DAY_2_FILE: Path = DATA_DIR / "data_day_2.csv"
    DAY_1_EXT_FILE: Path = DATA_DIR / "data_day_1_extended.csv"
    CGMACROS_FILE: Path = DATA_DIR / "cgmacros_demo.csv"
    CGMACROS_META_FILE: Path = DATA_DIR / "cgmacros_demo.metadata.json"

settings = Settings()
