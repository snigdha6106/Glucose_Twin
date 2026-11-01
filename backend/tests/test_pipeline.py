import os
import sys
import pytest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.data.loader import dataset_repo
from app.preprocessing.cgmacros_preprocessor import CGMacrosPreprocessor
from app.preprocessing.t1d_preprocessor import T1DPreprocessor
from app.models.model_registry import GlucoseModelWrapper
from app.evaluation.metrics import evaluate_predictions, compute_clarke_error_grid
from app.digital_twin.replaybg_model import replaybg_twin
from app.simulation.engine import simulation_engine
from app.schemas.schemas import WhatIfModification

client = TestClient(app)

def test_root_endpoint():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    # Root endpoint serves index.html
    res_root = client.get("/")
    assert res_root.status_code == 200


def test_dataset_audit():
    res = client.get("/api/dataset/audit")
    assert res.status_code == 200
    data = res.json()
    assert len(data["datasets"]) >= 4
    assert data["patient_info"]["bw"] == 100.0

def test_cgmacros_preprocessor_no_leakage():
    prep = CGMacrosPreprocessor(diagnosis_group="healthy")
    data = prep.prepare_data()
    # Check that target_30m is not in features
    assert "target_30m" not in prep.feature_names
    assert "target_timestamp" not in prep.feature_names
    # Check dimensions
    assert len(data["X_train"]) > 0
    assert len(data["X_test"]) > 0
    assert data["X_train"].shape[1] == len(prep.feature_names)

def test_t1d_preprocessor_cob_iob():
    prep = T1DPreprocessor(dataset_name="day_1_extended")
    data = prep.prepare_data()
    assert "cob" in prep.feature_names
    assert "iob" in prep.feature_names
    assert len(data["X_train"]) > 0

def test_model_training_and_metrics():
    prep = CGMacrosPreprocessor(diagnosis_group="all")
    data = prep.prepare_data()
    model = GlucoseModelWrapper(model_type="ridge", feature_names=prep.feature_names)
    model.fit(data["X_train"], data["y_train"])
    preds = model.predict(data["X_test"])
    metrics = evaluate_predictions(data["y_test"], preds)
    assert metrics["mae"] > 0
    assert metrics["rmse"] > 0
    assert "A" in metrics["clarke_grid"]

def test_replaybg_physiological_simulation():
    time_pts = np.arange(24) * 5.0 # 2 hours
    cho = np.zeros(24)
    cho[2] = 30.0 # 30g carb meal at step 2
    bolus = np.zeros(24)
    bolus[2] = 3.0 # 3U bolus
    basal = np.ones(24) * 0.5 # 0.5 U/hr
    res = replaybg_twin.simulate(time_pts, cho, bolus, basal, initial_glucose=110.0)
    g = res["glucose"]
    assert len(g) == 24
    assert np.all(g > 20.0)
    assert np.all(g < 500.0)

def test_simulation_engine_whatif():
    mod = WhatIfModification(meal_carbs_factor=1.5, bolus_factor=0.8)
    res = simulation_engine.run_type1_simulation(
        scenario_name="Test High Carb Low Bolus",
        modifications=mod,
        duration_hours=6
    )
    assert "comparison_metrics" in res
    assert len(res["trajectory"]) > 0
    # Mean difference should be positive since carbs increased and bolus decreased
    assert res["comparison_metrics"]["simulated_mean_glucose"] > 0

def test_api_predict_trajectory():
    res = client.get("/api/predict/trajectory?dataset_id=cgmacros&model_type=ridge&window_points=30")
    assert res.status_code == 200
    data = res.json()
    assert len(data["trajectory"]) > 0
    assert "predicted_glucose" in data["trajectory"][0]

def test_api_digital_twin_state():
    res = client.get("/api/digital_twin/state")
    assert res.status_code == 200
    data = res.json()
    assert data["patient_id"] == "ReplayBG_Patient_1"
    assert data["current_glucose"] > 0
    assert len(data["estimated_parameters"]) >= 5

def test_api_explain_global():
    res = client.get("/api/explain/global?dataset_id=cgmacros&model_type=ridge")
    assert res.status_code == 200
    data = res.json()
    assert len(data["feature_importances"]) > 0
