import numpy as np
from typing import Dict, Any, Tuple, List
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from scipy import stats

def compute_clarke_error_grid(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Assigns each (reference, predicted) glucose pair to a Clarke Error Grid zone:
    Zone A: Clinically accurate (within 20% or ref <= 70 and pred <= 70)
    Zone B: Benign errors (outside 20%, but does not lead to inappropriate treatment)
    Zone C: Overcorrection errors
    Zone D: Failure to detect hypoglycemia or hyperglycemia
    Zone E: Erroneous treatment (opposite clinical direction)
    """
    n = len(y_true)
    if n == 0:
        return {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0, "E": 0.0}

    zones = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}

    for ref, pred in zip(y_true, y_pred):
        # Zone A
        if (ref <= 70.0 and pred <= 70.0) or (abs(pred - ref) <= 0.20 * ref):
            zones["A"] += 1
            continue

        # Zone E
        if (ref <= 70.0 and pred >= 180.0) or (ref >= 180.0 and pred <= 70.0):
            zones["E"] += 1
            continue

        # Zone D
        if (ref < 70.0 and pred > 70.0) or (ref > 240.0 and (pred >= 70.0 and pred <= 180.0)):
            zones["D"] += 1
            continue

        # Zone C
        if (ref >= 70.0 and ref <= 290.0) and (pred >= ref + 110.0 or pred <= (7.0/9.0)*ref - 18.2):
            zones["C"] += 1
            continue

        # Zone B (all other points)
        zones["B"] += 1

    return {z: round((count / n) * 100.0, 2) for z, count in zones.items()}

def compute_parkes_consensus_grid(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Approximates Parkes (Consensus) Error Grid zones A through E for Type 1 / Type 2 diabetes.
    Zone A: No effect on clinical action
    Zone B: Altered clinical action, little or no effect on clinical outcome
    Zone C: Altered clinical action, likely to affect clinical outcome
    Zone D: Altered clinical action, could have significant medical risk
    Zone E: Altered clinical action, could have dangerous consequences
    """
    n = len(y_true)
    if n == 0:
        return {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0, "E": 0.0}

    zones = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    for ref, pred in zip(y_true, y_pred):
        rel_diff = abs(pred - ref) / max(1.0, ref)
        if rel_diff <= 0.15:
            zones["A"] += 1
        elif rel_diff <= 0.30:
            zones["B"] += 1
        elif (ref < 70 and pred > 150) or (ref > 250 and pred < 80):
            zones["E"] += 1
        elif rel_diff <= 0.50:
            zones["C"] += 1
        else:
            zones["D"] += 1

    return {z: round((count / n) * 100.0, 2) for z, count in zones.items()}

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    """
    Computes full scientific evaluation battery: MAE, RMSE, R2, MARD, max error,
    Clarke grid, Parkes grid, and residual distribution.
    """
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    yt = y_true[mask]
    yp = y_pred[mask]

    if len(yt) == 0:
        return {
            "mae": 0.0, "rmse": 0.0, "r2": 0.0, "mard": 0.0, "max_error": 0.0,
            "clarke_grid": {}, "parkes_grid": {}, "residuals": {}
        }

    mae = float(mean_absolute_error(yt, yp))
    rmse = float(np.sqrt(mean_squared_error(yt, yp)))
    r2 = float(r2_score(yt, yp))

    # MARD calculation (Mean Absolute Relative Difference %)
    rel_diffs = np.abs(yp - yt) / np.maximum(yt, 1e-3)
    mard = float(np.mean(rel_diffs) * 100.0)

    residuals = yp - yt
    max_err = float(np.max(np.abs(residuals)))

    clarke = compute_clarke_error_grid(yt, yp)
    parkes = compute_parkes_consensus_grid(yt, yp)

    # Residual distribution statistics
    res_stats = {
        "mean": round(float(np.mean(residuals)), 3),
        "std": round(float(np.std(residuals)), 3),
        "skewness": round(float(stats.skew(residuals)), 3),
        "kurtosis": round(float(stats.kurtosis(residuals)), 3),
        "median": round(float(np.median(residuals)), 3),
        "iqr": round(float(stats.iqr(residuals)), 3)
    }

    # Histogram binning for residual plot in UI (20 bins)
    hist, bin_edges = np.histogram(residuals, bins=20)
    res_hist = [
        {"bin_center": round(float((bin_edges[i] + bin_edges[i+1]) / 2.0), 1), "count": int(hist[i])}
        for i in range(len(hist))
    ]

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
        "mard": round(mard, 2),
        "max_error": round(max_err, 2),
        "clarke_grid": clarke,
        "parkes_grid": parkes,
        "residual_stats": res_stats,
        "residual_histogram": res_hist
    }
