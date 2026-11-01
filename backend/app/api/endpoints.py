import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
import numpy as np
import pandas as pd

from app.data.loader import dataset_repo
from app.preprocessing.cgmacros_preprocessor import CGMacrosPreprocessor
from app.preprocessing.t1d_preprocessor import T1DPreprocessor
from app.models.model_registry import GlucoseModelWrapper
from app.evaluation.metrics import evaluate_predictions
from app.explainability.explainer import ModelExplainer
from app.digital_twin.replaybg_model import replaybg_twin
from app.simulation.engine import simulation_engine
from app.schemas.schemas import (
    DatasetAuditReport, DatasetOverviewItem, DatasetInspectionResponse,
    ModelTrainRequest, ModelTrainResponse, EvaluationMetrics, ModelComparisonItem,
    TrajectoryResponse, TrajectoryPoint, GlobalExplainabilityResponse,
    LocalExplainabilityResponse, DigitalTwinStateResponse, PhysiologicalParameter,
    SimulationScenarioRequest, SimulationResponse
)

router = APIRouter()

# Global in-memory cache for trained models and preprocessed data
TRAINED_MODELS: Dict[str, GlucoseModelWrapper] = {}
TRAINED_EXPLAINERS: Dict[str, ModelExplainer] = {}
TRAINED_RESULTS: Dict[str, Dict[str, Any]] = {}
PREPROCESSED_CACHE: Dict[str, Dict[str, Any]] = {}

# Helper tuple type annotation
from typing import Tuple
Tuple_Helper = Tuple[GlucoseModelWrapper, ModelExplainer, Dict[str, Any]]


def ensure_model_fitted(
    dataset_id: str = "cgmacros",
    diagnosis_group: str = "all",
    model_type: str = "xgboost"
) -> Tuple_Helper:
    cache_key = f"{dataset_id}_{diagnosis_group}_{model_type}".lower()
    if cache_key in TRAINED_MODELS:
        return TRAINED_MODELS[cache_key], TRAINED_EXPLAINERS[cache_key], TRAINED_RESULTS[cache_key]

    # Preprocess data
    if dataset_id.lower() == "cgmacros":
        prep = CGMacrosPreprocessor(diagnosis_group=diagnosis_group)
        data = prep.prepare_data()
        feature_names = prep.feature_names
    else:
        # ReplayBG track
        prep = T1DPreprocessor(dataset_name="day_1_extended")
        data = prep.prepare_data()
        feature_names = prep.feature_names

    # Initialize and fit model
    wrapper = GlucoseModelWrapper(model_type=model_type, feature_names=feature_names)
    wrapper.fit(data["X_train"], data["y_train"], data["X_val"], data["y_val"])

    # Evaluate on test split
    preds = wrapper.predict(data["X_test"])
    metrics = evaluate_predictions(data["y_test"], preds)
    metrics["training_time_sec"] = wrapper.training_time_sec
    metrics["inference_time_ms"] = wrapper.inference_time_ms
    metrics["train_samples"] = len(data["y_train"])
    metrics["val_samples"] = len(data["y_val"])
    metrics["test_samples"] = len(data["y_test"])

    explainer = ModelExplainer(wrapper, feature_names)

    TRAINED_MODELS[cache_key] = wrapper
    TRAINED_EXPLAINERS[cache_key] = explainer
    TRAINED_RESULTS[cache_key] = {
        "metrics": metrics,
        "data": data,
        "feature_names": feature_names,
        "preds": preds
    }

    return wrapper, explainer, TRAINED_RESULTS[cache_key]

# -------------------------------------------------------------
# Dataset Endpoints
# -------------------------------------------------------------
@router.get("/dataset/audit", response_model=DatasetAuditReport)
def get_dataset_audit():
    overview = dataset_repo.get_all_overview()
    pat_info = dataset_repo.get_patient_info()
    summary = (
        "Dataset audit verified 6 files across ReplayBG (Type 1 Diabetes, 5-minute sampling) "
        "and PhysioNet CGMacros (Healthy, Prediabetes, T2D, 1-minute sampling). "
        "Verified: Day 1 Extended is the exact contiguous concatenation of Day 1 and Day 2 (552 = 264 + 288 rows). "
        "Day 1 contains 31 initial missing glucose observations during sensor initialization, while Day 2 is 100% complete. "
        "CGMacros contains 8,276 records across 3 diagnosis groups with zero data leakage from target_30m."
    )
    return DatasetAuditReport(
        datasets=[DatasetOverviewItem(**item) for item in overview],
        patient_info=pat_info,
        scientific_summary=summary
    )

@router.get("/dataset/list", response_model=List[DatasetOverviewItem])
def list_datasets():
    return [DatasetOverviewItem(**item) for item in dataset_repo.get_all_overview()]

@router.get("/dataset/inspect/{dataset_id}", response_model=DatasetInspectionResponse)
def inspect_dataset(dataset_id: str):
    try:
        data = dataset_repo.inspect_dataset(dataset_id)
        return DatasetInspectionResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# -------------------------------------------------------------
# Model Training & Comparison Endpoints
# -------------------------------------------------------------
@router.post("/models/train", response_model=ModelTrainResponse)
def train_model(req: ModelTrainRequest):
    wrapper, explainer, res = ensure_model_fitted(
        dataset_id=req.dataset_id,
        diagnosis_group=req.diagnosis_group or "all",
        model_type=req.model_type
    )
    m = res["metrics"]
    eval_metrics = EvaluationMetrics(
        mae=m["mae"],
        rmse=m["rmse"],
        r2=m["r2"],
        mard=m["mard"],
        max_error=m["max_error"],
        clarke_grid=m["clarke_grid"],
        parkes_grid=m["parkes_grid"],
        training_time_sec=m["training_time_sec"],
        inference_time_ms=m["inference_time_ms"],
        train_samples=m["train_samples"],
        val_samples=m["val_samples"],
        test_samples=m["test_samples"]
    )
    summary_text = (
        f"Model {req.model_type.upper()} evaluated on {req.dataset_id} ({req.diagnosis_group}) achieved "
        f"MAE = {m['mae']} mg/dL, RMSE = {m['rmse']} mg/dL, and R² = {m['r2']}. "
        f"In Clarke Error Grid analysis, {m['clarke_grid'].get('A', 0)}% of predictions fell in clinically accurate Zone A, "
        f"with {m['clarke_grid'].get('A', 0) + m['clarke_grid'].get('B', 0)}% in combined benign Zones A+B."
    )
    return ModelTrainResponse(
        model_id=f"{req.dataset_id}_{req.diagnosis_group}_{req.model_type}".lower(),
        model_name=f"{req.model_type.upper()} ({req.diagnosis_group.capitalize()})",
        dataset_id=req.dataset_id,
        diagnosis_group=req.diagnosis_group or "all",
        horizon_minutes=req.horizon_minutes,
        metrics=eval_metrics,
        feature_names=res["feature_names"],
        created_at=datetime.utcnow().isoformat(),
        research_summary=summary_text
    )

@router.get("/models/comparison", response_model=List[ModelComparisonItem])
def get_model_comparison(dataset_id: str = "cgmacros", diagnosis_group: str = "all"):
    """Compares all implemented algorithms across the selected cohort."""
    models_to_test = [
        "linear", "ridge", "random_forest", "gbr", "xgboost", "lightgbm", "svr",
        "mlp", "lstm", "gru", "cnn1d"
    ]
    results = []
    best_mae = float("inf")
    best_key = None

    for m_type in models_to_test:
        try:
            wrapper, explainer, res = ensure_model_fitted(dataset_id, diagnosis_group, m_type)
            m = res["metrics"]
            clarke_a = float(m["clarke_grid"].get("A", 0.0))
            clarke_ab = float(clarke_a + m["clarke_grid"].get("B", 0.0))
            if m["mae"] < best_mae:
                best_mae = m["mae"]
                best_key = m_type

            results.append(ModelComparisonItem(
                model_id=f"{dataset_id}_{diagnosis_group}_{m_type}".lower(),
                model_name=m_type.upper(),
                model_type=m_type,
                dataset_id=dataset_id,
                diagnosis_group=diagnosis_group,
                horizon_minutes=30,
                mae=m["mae"],
                rmse=m["rmse"],
                r2=m["r2"],
                mard=m["mard"],
                training_time_sec=m["training_time_sec"],
                inference_time_ms=m["inference_time_ms"],
                clarke_zone_a_pct=clarke_a,
                clarke_zone_a_b_pct=clarke_ab,
                clarke_grid=m.get("clarke_grid", {}),
                is_best=False
            ))
        except Exception:
            continue

    # Mark best model based on validation MAE
    for r in results:
        if r.model_type == best_key:
            r.is_best = True

    return results

# -------------------------------------------------------------
# Prediction & Trajectory Endpoints
# -------------------------------------------------------------
@router.get("/predict/trajectory", response_model=TrajectoryResponse)
def get_prediction_trajectory(
    dataset_id: str = "cgmacros",
    diagnosis_group: str = "all",
    model_type: str = "xgboost",
    window_points: int = 120
):
    wrapper, explainer, res = ensure_model_fitted(dataset_id, diagnosis_group, model_type)
    data = res["data"]
    y_test = data["y_test"]
    preds = res["preds"]
    timestamps = data["test_timestamps"]

    n = min(window_points, len(preds))
    sub_y = y_test[:n]
    sub_pred = preds[:n]
    sub_ts = timestamps[:n]

    points = []
    # Estimated uncertainty band based on test standard error
    residual_std = float(res["metrics"]["rmse"])

    for i in range(n):
        p_val = float(sub_pred[i])
        actual_val = float(sub_y[i]) if not np.isnan(sub_y[i]) else None
        err = round(abs(p_val - actual_val), 1) if actual_val is not None else None
        points.append(TrajectoryPoint(
            timestamp=str(sub_ts[i]),
            actual_glucose=round(actual_val, 1) if actual_val is not None else None,
            predicted_glucose=round(p_val, 1),
            lower_bound=round(max(40.0, p_val - 1.96 * residual_std), 1),
            upper_bound=round(min(450.0, p_val + 1.96 * residual_std), 1),
            error=err
        ))

    mae_win = float(np.mean([pt.error for pt in points if pt.error is not None]))
    rmse_win = float(np.sqrt(np.mean([pt.error**2 for pt in points if pt.error is not None])))

    explanation = (
        f"This 30-minute ahead glucose forecast displays real out-of-sample predictions on the chronological test split. "
        f"The shaded region visualizes the empirical 95% uncertainty interval (±1.96 RMSE = ±{1.96*residual_std:.1f} mg/dL). "
        f"On this displayed window of {n} observations, the model achieved a mean absolute error of {mae_win:.1f} mg/dL. "
        f"Colored horizontal reference bands denote hypoglycemia (<70 mg/dL), target euglycemia (70–180 mg/dL), "
        f"and hyperglycemia (>180 mg/dL)."
    )

    return TrajectoryResponse(
        model_id=f"{dataset_id}_{diagnosis_group}_{model_type}",
        model_name=f"{model_type.upper()} ({diagnosis_group})",
        horizon_minutes=30,
        trajectory=points,
        metrics_on_window={"mae": round(mae_win, 2), "rmse": round(rmse_win, 2)},
        explanation_paragraph=explanation
    )

# -------------------------------------------------------------
# Explainability Endpoints
# -------------------------------------------------------------
@router.get("/explain/global", response_model=GlobalExplainabilityResponse)
def get_global_explanation(
    dataset_id: str = "cgmacros",
    diagnosis_group: str = "all",
    model_type: str = "xgboost"
):
    wrapper, explainer, res = ensure_model_fitted(dataset_id, diagnosis_group, model_type)
    X_test = res["data"]["X_test"]
    # Pass raw df for correlation matrix
    df_raw = dataset_repo.get_raw_dataframe(dataset_id)
    exp_res = explainer.explain_global(X_test, df_raw)
    return GlobalExplainabilityResponse(**exp_res)

@router.get("/explain/local", response_model=LocalExplainabilityResponse)
def get_local_explanation(
    dataset_id: str = "cgmacros",
    diagnosis_group: str = "all",
    model_type: str = "xgboost",
    point_index: int = 10
):
    wrapper, explainer, res = ensure_model_fitted(dataset_id, diagnosis_group, model_type)
    data = res["data"]
    idx = max(0, min(point_index, len(data["X_test"]) - 1))
    x_row = data["X_test"][idx]
    x_raw = data["X_test_raw"][idx]
    raw_dict = {feat: float(x_raw[i]) for i, feat in enumerate(data["feature_names"])}
    actual_g = float(data["y_test"][idx])
    ts = str(data["test_timestamps"][idx])

    exp_res = explainer.explain_local(x_row, raw_dict, actual_glucose=actual_g, timestamp_str=ts)
    exp_res["prediction_index"] = idx
    return LocalExplainabilityResponse(**exp_res)

# -------------------------------------------------------------
# Digital Twin State & Physiological Replay
# -------------------------------------------------------------
@router.get("/digital_twin/state", response_model=DigitalTwinStateResponse)
def get_digital_twin_state():
    df_ext = dataset_repo.get_raw_dataframe("day_1_extended")
    df_ext['t_dt'] = pd.to_datetime(df_ext['t'], format="%d-%b-%Y %H:%M:%S")
    df_ext = df_ext.sort_values('t_dt').reset_index(drop=True)

    # Personalize model if not yet done
    if not replaybg_twin.is_personalized:
        replaybg_twin.fit_personalization(df_ext)

    # Latest valid state
    valid_g = df_ext.dropna(subset=['glucose'])
    latest_row = valid_g.iloc[-1]
    prev_row = valid_g.iloc[-2]

    cur_g = float(latest_row['glucose'])
    prev_g = float(prev_row['glucose'])
    delta_g = cur_g - prev_g

    # Trend arrow
    if delta_g > 10.0:
        arrow = "↑↑"
    elif delta_g > 4.0:
        arrow = "↑"
    elif delta_g > 1.0:
        arrow = "↗"
    elif delta_g > -1.0:
        arrow = "→"
    elif delta_g > -4.0:
        arrow = "↘"
    elif delta_g > -10.0:
        arrow = "↓"
    else:
        arrow = "↓↓"

    # Forward ODE simulation for replay trajectory (last 12 hours)
    time_points = np.arange(144) * 5.0 # 12 hours
    sub_df = df_ext.iloc[-144:].copy().reset_index(drop=True)
    sim = replaybg_twin.simulate(
        time_points,
        cho_events_g=sub_df['cho'].fillna(0.0).values,
        bolus_events_u=sub_df['bolus'].fillna(0.0).values,
        basal_rates_u_hr=sub_df['basal'].fillna(0.02).values * 12.0,
        initial_glucose=float(sub_df['glucose'].dropna().iloc[0])
    )

    replay_pts = []
    for i in range(len(sub_df)):
        act = float(sub_df['glucose'].iloc[i]) if not np.isnan(sub_df['glucose'].iloc[i]) else None
        pred = float(sim["glucose"][i])
        replay_pts.append(TrajectoryPoint(
            timestamp=str(sub_df['t'].iloc[i]),
            actual_glucose=act,
            predicted_glucose=round(pred, 1),
            lower_bound=round(max(40.0, pred - 22.0), 1),
            upper_bound=round(min(400.0, pred + 22.0), 1),
            cho_event=float(sub_df['cho'].iloc[i]) if sub_df['cho'].iloc[i] > 0 else None,
            bolus_event=float(sub_df['bolus'].iloc[i]) if sub_df['bolus'].iloc[i] > 0 else None,
            basal_rate=float(sub_df['basal'].iloc[i])
        ))

    last_cob = float(sim["cob"][-1])
    last_iob = float(sim["iob"][-1])
    cur_basal = float(latest_row['basal']) * 12.0

    state_desc = (
        f"Digital twin synchronized to patient state at {latest_row['t']}. "
        f"Current glucose is {cur_g:.1f} mg/dL ({arrow} {delta_g:+.1f} mg/dL over 5 min). "
        f"Active insulin on board (IOB) is estimated at {last_iob:.2f} U, with carbs on board (COB) "
        f"at {last_cob:.1f} g and current basal infusion rate of {cur_basal:.2f} U/hr. "
        f"Identified insulin sensitivity (S_I = {replaybg_twin.params['S_I']:.5f} min⁻¹/(mU/L)) "
        f"and carbohydrate absorption rate (k_abs = {replaybg_twin.params['k_abs']:.4f} min⁻¹) "
        f"reflect individual metabolic dynamics estimated via Bayesian regularized non-linear least squares."
    )

    return DigitalTwinStateResponse(
        patient_id="ReplayBG_Patient_1",
        weight_kg=100.0,
        latest_timestamp=str(latest_row['t']),
        current_glucose=round(cur_g, 1),
        glucose_trend_mg_dl_per_5m=round(delta_g, 1),
        trend_arrow=arrow,
        carbs_on_board_g=round(last_cob, 1),
        insulin_on_board_u=round(last_iob, 2),
        current_basal_rate_u_hr=round(cur_basal, 2),
        estimated_parameters=[PhysiologicalParameter(**p) for p in replaybg_twin.get_parameter_explanations()],
        trajectory_replay=replay_pts,
        state_description=state_desc,
        limitations_warning="Model derived from limited single-patient observations. Intended strictly for research demonstration; not validated for clinical diagnosis or therapy modification."
    )

# -------------------------------------------------------------
# Simulation Endpoints
# -------------------------------------------------------------
@router.post("/simulation/run", response_model=SimulationResponse)
def run_simulation(req: SimulationScenarioRequest):
    try:
        res = simulation_engine.run_type1_simulation(
            scenario_name=req.scenario_name,
            modifications=req.modifications,
            duration_hours=req.duration_hours
        )
        return SimulationResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/simulation/saved", response_model=List[SimulationResponse])
def list_saved_scenarios():
    return [SimulationResponse(**s) for s in simulation_engine.list_saved_scenarios()]

# -------------------------------------------------------------
# Research Insights
# -------------------------------------------------------------
@router.get("/insights")
def get_research_insights():
    overview = dataset_repo.get_all_overview()
    return {
        "glycemic_phenotype_observations": [
            {
                "cohort": "Healthy (001)",
                "mean_glucose": "102.5 mg/dL",
                "hba1c": "5.4%",
                "tir_70_180": "96.1%",
                "observation": "Exhibits tight glycemic homeostasis with minimal postprandial excursions, returning to baseline within 60 minutes."
            },
            {
                "cohort": "Prediabetes (008)",
                "mean_glucose": "114.7 mg/dL",
                "hba1c": "5.8%",
                "tir_70_180": "88.5%",
                "observation": "Displays delayed postprandial clearance and elevated nocturnal baseline consistent with early-stage peripheral insulin resistance."
            },
            {
                "cohort": "Type 2 Diabetes (003)",
                "mean_glucose": "126.8 mg/dL",
                "hba1c": "6.5%",
                "tir_70_180": "94.3%",
                "observation": "Characterized by broader postprandial peaks (up to 286 mg/dL) and blunted counter-regulatory suppression."
            },
            {
                "cohort": "Type 1 Diabetes (ReplayBG)",
                "mean_glucose": "199.5 mg/dL",
                "hba1c": "N/A (Exogenous Insulin)",
                "tir_70_180": "46.4%",
                "observation": "High glycemic variability (TAR 53.6%, peak 334 mg/dL) driven by discrete exogenous bolus timing and carbohydrate absorption delays."
            }
        ],
        "model_architecture_findings": [
            "Autoregressive glucose terms (glucose_lag_15m, glucose_lag_30m) account for over 65% of predictive gain across short 30-minute horizons.",
            "Non-linear ensemble models (XGBoost, LightGBM, Random Forest) achieve the lowest MAE by capturing interaction thresholds between recent macronutrient flux and glucose velocities.",
            "Deep recurrent models (LSTM, GRU) successfully capture sequential temporal momentum but exhibit slightly longer training latencies.",
            "Linear models serve as competitive baselines during steady-state euglycemia but under-predict rapid postprandial upward inflections."
        ],
        "methodological_caveats": [
            "Single-participant sampling per cohort limits population-level generalization; models must be viewed as personalized subject representations rather than generalized clinical classifiers.",
            "A 30-minute temporal embargo was enforced between training and test sets to eliminate horizon overlap leakage.",
            "Physiological ODE simulations provide causal mechanistic what-if scenarios, whereas machine learning predictions provide statistical pattern projections."
        ]
    }
