import os
import sys
import json
import numpy as np

# Set environment
os.environ["MPLCONFIGDIR"] = os.path.abspath(".mplcache")
os.environ["MPLBACKEND"] = "Agg"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app

def run_e2e_verification():
    print("=" * 80)
    print("END-TO-END DIABETES DIGITAL TWIN PLATFORM VERIFICATION")
    print("=" * 80)

    client = TestClient(app)

    # 1. API Status & Built Frontend HTML
    print("\n[1/7] Testing Core Endpoints & Frontend Static Mount...")
    r_status = client.get("/api/status")
    assert r_status.status_code == 200
    print("  ✓ /api/status:", r_status.json()["platform"], f"(Version: {r_status.json()['version']})")

    r_root = client.get("/")
    assert r_root.status_code == 200
    assert "Diabetes Digital Twin" in r_root.text
    print("  ✓ / (Built Frontend HTML Index served successfully, length:", len(r_root.text), "bytes)")

    # 2. Dataset Management & Audit
    print("\n[2/7] Testing Dataset Management & Scientific Audit...")
    r_audit = client.get("/api/dataset/audit")
    assert r_audit.status_code == 200
    audit_data = r_audit.json()
    print(f"  ✓ Total verified datasets: {len(audit_data['datasets'])}")
    for d in audit_data["datasets"]:
        print(f"    - {d['id']:16} | {d['name']:40} | Records: {d['records']:5d} | Missing: {d['missing_pct']}%")
    print("  ✓ Patient Constants: bw =", audit_data["patient_info"]["bw"], "kg, u2ss =", audit_data["patient_info"]["u2ss"])

    # 3. Model Training & Benchmarking
    print("\n[3/7] Testing Model Training & Comparative Evaluation...")
    r_comp = client.get("/api/models/comparison?dataset_id=cgmacros&diagnosis_group=all")
    assert r_comp.status_code == 200
    comp_models = r_comp.json()
    print(f"  ✓ Benchmarked {len(comp_models)} algorithms on CGMacros (30-min horizon, temporal embargo):")
    for m in comp_models:
        best_flag = " ★ BEST VALIDATION MODEL" if m.get("is_best") else ""
        print(f"    - {m['model_name']:16} | MAE: {m['mae']:5.2f} mg/dL | RMSE: {m['rmse']:5.2f} | R²: {m['r2']:5.3f} | Clarke A: {m['clarke_zone_a_pct']:5.1f}%{best_flag}")

    # 4. Out-of-Sample Trajectory Prediction
    print("\n[4/7] Testing Glucose Trajectory Prediction with 95% Confidence Intervals...")
    r_traj = client.get("/api/predict/trajectory?dataset_id=cgmacros&model_type=xgboost&window_points=60")
    assert r_traj.status_code == 200
    traj_data = r_traj.json()
    print(f"  ✓ Generated {len(traj_data['trajectory'])} prediction points for {traj_data['model_name']}:")
    p0 = traj_data['trajectory'][0]
    print(f"    Point #0: Timestamp={p0['timestamp']}, Actual={p0['actual_glucose']} mg/dL, Predicted={p0['predicted_glucose']} mg/dL, Error={p0['error']} mg/dL")
    print(f"    95% Uncertainty Band: [{p0['lower_bound']}, {p0['upper_bound']}] mg/dL")
    print(f"    Window MAE: {traj_data['metrics_on_window']['mae']} mg/dL, RMSE: {traj_data['metrics_on_window']['rmse']} mg/dL")

    # 5. Global & Local Explainability
    print("\n[5/7] Testing Explainable AI (SHAP & Waterfall Decomposition)...")
    r_exp_glob = client.get("/api/explain/global?dataset_id=cgmacros&model_type=xgboost")
    assert r_exp_glob.status_code == 200
    exp_glob = r_exp_glob.json()
    print(f"  ✓ Global Feature Importances ({exp_glob['method']}):")
    for f in exp_glob["feature_importances"][:5]:
        print(f"    - {f['feature']:22} | Attribution: {f['importance']*100:5.1f}% (Normalized: {f['normalized_importance']})")

    r_exp_loc = client.get("/api/explain/local?dataset_id=cgmacros&model_type=xgboost&point_index=15")
    assert r_exp_loc.status_code == 200
    exp_loc = r_exp_loc.json()
    print(f"  ✓ Local Prediction Explanation for Observation #15:")
    print(f"    Predicted: {exp_loc['predicted_glucose']} mg/dL (Baseline E[f(x)]: {exp_loc['baseline_value']} mg/dL)")
    for a in exp_loc["attributions"][:3]:
        print(f"    - {a['feature']:20} = {a['value']} -> {a['attribution']:+6.2f} mg/dL ({a['direction']})")
    print(f"    Explanation: {exp_loc['explanation_paragraph'][:150]}...")

    # 6. Type 1 ReplayBG Digital Twin State & Parameter Personalization
    print("\n[6/7] Testing Type 1 Diabetes Digital Twin ODE System & Parameter Estimation...")
    r_twin = client.get("/api/digital_twin/state")
    assert r_twin.status_code == 200
    twin_data = r_twin.json()
    print(f"  ✓ Patient ID: {twin_data['patient_id']} ({twin_data['weight_kg']} kg)")
    print(f"  ✓ Current Glucose: {twin_data['current_glucose']} mg/dL ({twin_data['trend_arrow']} {twin_data['glucose_trend_mg_dl_per_5m']} mg/dL/5m)")
    print(f"  ✓ Carbs on Board (COB): {twin_data['carbs_on_board_g']} g | Insulin on Board (IOB): {twin_data['insulin_on_board_u']} U | Basal: {twin_data['current_basal_rate_u_hr']} U/hr")
    print(f"  ✓ Bayesian Personalized Parameters:")
    for p in twin_data["estimated_parameters"]:
        print(f"    - {p['symbol']:6} ({p['name']}): {p['estimated_value']} {p['unit']:15} | 95% CI: {p['confidence_interval']}")

    # 7. What-If Simulation Engine
    print("\n[7/7] Testing In Silico What-If Scenario Counterfactual Simulation...")
    scenario_payload = {
        "scenario_name": "Postprandial Meal Increase (+50% Carbs) with Delayed Bolus (+30m)",
        "track": "t1d_replaybg",
        "duration_hours": 12,
        "modifications": {
            "meal_carbs_factor": 1.5,
            "meal_shift_minutes": 0,
            "bolus_factor": 0.85,
            "bolus_delay_minutes": 30,
            "basal_factor": 1.0
        }
    }
    r_sim = client.post("/api/simulation/run", json=scenario_payload)
    assert r_sim.status_code == 200
    sim_data = r_sim.json()
    metrics = sim_data["comparison_metrics"]
    print(f"  ✓ Scenario: '{sim_data['scenario_name']}'")
    print(f"    Baseline Peak Glucose : {metrics['baseline_peak_glucose']} mg/dL")
    print(f"    Simulated Peak Glucose: {metrics['simulated_peak_glucose']} mg/dL (Δ = {metrics['peak_diff_mg_dl']:+5.1f} mg/dL)")
    print(f"    Time-to-Peak Shift    : {metrics['time_to_peak_diff_min']:+d} minutes")
    print(f"    Trapezoidal AUC Shift : {metrics['auc_pct_change']:+5.1f}%")
    print(f"    Time in Range (70-180): Baseline {metrics['baseline_tir_pct']}% -> Simulated {metrics['simulated_tir_pct']}%")
    print(f"    Max Absolute Deviation: {metrics['max_absolute_diff_mg_dl']} mg/dL at {metrics['time_of_max_diff']}")
    print(f"    Research Explanation  : {sim_data['natural_language_explanation']}")

    print("\n" + "=" * 80)
    print("ALL 7 CORE PLATFORM SUBSYSTEMS VERIFIED AND PASSING 100%!")
    print("=" * 80)

if __name__ == "__main__":
    run_e2e_verification()
