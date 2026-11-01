from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Dataset Schemas ---
class DatasetOverviewItem(BaseModel):
    id: str
    name: str
    source: str
    diagnosis_group: str
    records: int
    participants: int
    time_coverage: str
    sampling_frequency: str
    missing_pct: float
    features: List[str]
    quality_warnings: List[str]

class DatasetAuditReport(BaseModel):
    datasets: List[DatasetOverviewItem]
    patient_info: Dict[str, Any]
    scientific_summary: str

class DatasetInspectionResponse(BaseModel):
    id: str
    name: str
    total_rows: int
    columns: List[str]
    dtypes: Dict[str, str]
    head: List[Dict[str, Any]]
    summary_stats: Dict[str, Dict[str, float]]
    missing_counts: Dict[str, int]
    missing_percentages: Dict[str, float]
    glycemic_ranges: Dict[str, Any]

# --- Model Schemas ---
class ModelTrainRequest(BaseModel):
    dataset_id: str = "cgmacros" # "cgmacros" or "replaybg"
    diagnosis_group: Optional[str] = "all" # "healthy", "prediabetes", "type2_diabetes", or "all"
    model_type: str = "xgboost" # "linear", "ridge", "random_forest", "gbr", "xgboost", "lightgbm", "svr", "mlp", "lstm", "gru", "cnn1d"
    horizon_minutes: int = 30 # 15, 30, 60
    selected_features: Optional[List[str]] = None

class EvaluationMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float
    mard: float
    max_error: float
    clarke_grid: Dict[str, float] # percentages in zone A, B, C, D, E
    parkes_grid: Dict[str, float]
    training_time_sec: float
    inference_time_ms: float
    train_samples: int
    val_samples: int
    test_samples: int

class ModelTrainResponse(BaseModel):
    model_id: str
    model_name: str
    dataset_id: str
    diagnosis_group: str
    horizon_minutes: int
    metrics: EvaluationMetrics
    feature_names: List[str]
    created_at: str
    research_summary: str

class ModelComparisonItem(BaseModel):
    model_id: str
    model_name: str
    model_type: str
    dataset_id: str
    diagnosis_group: str
    horizon_minutes: int
    mae: float
    rmse: float
    r2: float
    mard: float
    training_time_sec: float
    inference_time_ms: float
    clarke_zone_a_pct: float
    clarke_zone_a_b_pct: float
    clarke_grid: Optional[Dict[str, float]] = None
    is_best: bool = False

# --- Prediction Schemas ---
class TrajectoryPoint(BaseModel):
    timestamp: str
    actual_glucose: Optional[float] = None
    predicted_glucose: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    error: Optional[float] = None
    cho_event: Optional[float] = None
    bolus_event: Optional[float] = None
    basal_rate: Optional[float] = None

class TrajectoryResponse(BaseModel):
    model_id: str
    model_name: str
    horizon_minutes: int
    trajectory: List[TrajectoryPoint]
    metrics_on_window: Dict[str, float]
    reference_ranges: Dict[str, float] = {
        "severe_hypo": 54.0,
        "hypo": 70.0,
        "target_low": 70.0,
        "target_high": 180.0,
        "hyper": 180.0,
        "severe_hyper": 250.0
    }
    explanation_paragraph: str

# --- Explainability Schemas ---
class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    normalized_importance: float

class GlobalExplainabilityResponse(BaseModel):
    model_id: str
    method: str
    feature_importances: List[FeatureImportanceItem]
    correlation_matrix: Dict[str, Dict[str, float]]
    shap_summary: Optional[List[Dict[str, Any]]] = None
    research_interpretation: str

class LocalAttributionItem(BaseModel):
    feature: str
    friendly_name: Optional[str] = None
    value: float
    attribution: float # SHAP or contribution value
    direction: str # "increases_glucose" or "decreases_glucose"
    friendly_effect: Optional[str] = None

class LocalExplainabilityResponse(BaseModel):
    model_id: str
    prediction_index: int
    timestamp: str
    actual_glucose: Optional[float]
    predicted_glucose: float
    baseline_value: float
    attributions: List[LocalAttributionItem]
    explanation_paragraph: str
    plain_english_summary: Optional[str] = None
    clinical_risk_level: Optional[str] = None
    practical_action_tip: Optional[str] = None

# --- Digital Twin State Schemas ---
class PhysiologicalParameter(BaseModel):
    name: str
    symbol: str
    estimated_value: float
    nominal_value: float
    unit: str
    confidence_interval: List[float]
    description: str

class DigitalTwinStateResponse(BaseModel):
    patient_id: str
    weight_kg: float
    latest_timestamp: str
    current_glucose: float
    glucose_trend_mg_dl_per_5m: float
    trend_arrow: str
    carbs_on_board_g: float
    insulin_on_board_u: float
    current_basal_rate_u_hr: float
    estimated_parameters: List[PhysiologicalParameter]
    trajectory_replay: List[TrajectoryPoint]
    state_description: str
    limitations_warning: str

# --- Simulation Schemas ---
class WhatIfModification(BaseModel):
    meal_carbs_factor: float = 1.0 # 1.0 = unchanged, 1.5 = +50%, 0.5 = -50%
    meal_shift_minutes: int = 0 # -30, +30, etc.
    bolus_factor: float = 1.0 # 1.0 = unchanged, 1.2 = +20%
    bolus_delay_minutes: int = 0
    basal_factor: float = 1.0 # 1.0 = unchanged, 0.8 = -20%
    # For CGMacros perturbations:
    carbs_offset_g: float = 0.0 # +20g, -10g
    mets_factor: float = 1.0 # 1.0 = unchanged, 1.3 = +30% activity

class SimulationScenarioRequest(BaseModel):
    scenario_name: str
    track: str = "t1d_replaybg" # "t1d_replaybg" or "cgmacros"
    start_time: Optional[str] = None
    duration_hours: int = 12
    modifications: WhatIfModification

class ScenarioTrajectoryPoint(BaseModel):
    timestamp: str
    actual_glucose: Optional[float] = None
    baseline_glucose: float
    simulated_glucose: float
    delta_glucose: float
    pct_change: float
    carbs_input: float
    bolus_input: float
    basal_input: float

class SimulationComparisonMetrics(BaseModel):
    baseline_peak_glucose: float
    simulated_peak_glucose: float
    peak_diff_mg_dl: float
    baseline_time_to_peak_min: int
    simulated_time_to_peak_min: int
    time_to_peak_diff_min: int
    baseline_mean_glucose: float
    simulated_mean_glucose: float
    mean_diff_mg_dl: float
    baseline_auc: float
    simulated_auc: float
    auc_diff: float
    auc_pct_change: float
    baseline_tir_pct: float
    simulated_tir_pct: float
    baseline_tar_pct: float
    simulated_tar_pct: float
    baseline_tbr_pct: float
    simulated_tbr_pct: float
    max_absolute_diff_mg_dl: float
    time_of_max_diff: str

class SimulationResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    track: str
    modifications: WhatIfModification
    trajectory: List[ScenarioTrajectoryPoint]
    comparison_metrics: SimulationComparisonMetrics
    natural_language_explanation: str
    physiological_mechanism_notes: str
    plain_english_summary: Optional[str] = None
    actionable_takeaway: Optional[str] = None
    safety_disclaimer: str

class SavedScenarioSummary(BaseModel):
    id: str
    name: str
    track: str
    created_at: str
    peak_diff: float
    mean_diff: float
    auc_pct_change: float
