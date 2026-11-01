import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from app.models.model_registry import GlucoseModelWrapper

FRIENDLY_NAMES = {
    "glucose_mg_dl": "Current Blood Sugar",
    "glucose_lag_5m": "Blood Sugar 5 min ago",
    "glucose_lag_15m": "Blood Sugar 15 min ago",
    "glucose_lag_30m": "Blood Sugar 30 min ago",
    "glucose_delta_5m": "5-min Sugar Trend",
    "glucose_delta_15m": "15-min Trend Velocity",
    "velocity_5m": "Instantaneous Sugar Speed",
    "roll_mean_15m": "Recent 15-min Average Sugar",
    "roll_std_30m": "Blood Sugar Fluctuations (Volatility)",
    "momentum_30m": "Projected Momentum",
    "carbs_last_120m": "Carbs Eaten (Last 2 Hours)",
    "protein_last_120m": "Protein Eaten (Last 2 Hours)",
    "fat_last_120m": "Dietary Fat (Slows Absorption)",
    "fiber_last_120m": "Dietary Fiber (Protects from Spikes)",
    "heart_rate": "Heart Rate / Physical Exertion",
    "mets": "Metabolic Activity (Physical Movement)",
    "activity_calories": "Calories Burned from Activity",
    "age": "Patient Age",
    "bmi": "Body Mass Index (BMI)",
    "hba1c": "3-Month Blood Sugar Average (HbA1c)",
    "fasting_glucose": "Baseline Fasting Blood Sugar",
    "fasting_insulin": "Fasting Insulin Level",
    "sin_time": "Time of Day (Circadian Rhythm)",
    "cos_time": "Circadian Rhythm Factor",
    "cho": "Carbohydrates in Meal",
    "cho_accum_60m": "Recent Carbohydrate Load (1h)",
    "cob": "Food Actively Digesting in Stomach",
    "bolus": "Insulin Injected for Meal",
    "bolus_accum_60m": "Recent Insulin Injected (1h)",
    "iob": "Active Insulin in Bloodstream",
    "basal": "Background Insulin Rate"
}

class ModelExplainer:
    def __init__(self, model_wrapper: GlucoseModelWrapper, feature_names: List[str]):
        self.wrapper = model_wrapper
        self.feature_names = feature_names
        self.shap_explainer = None
        self.expected_value = 120.0
        self._init_shap()

    def _init_shap(self):
        m_type = self.wrapper.model_type
        base_model = self.wrapper.model
        try:
            import shap
            if m_type in ["xgboost", "lightgbm", "random_forest", "gbr"]:
                self.shap_explainer = shap.TreeExplainer(base_model)
                if hasattr(self.shap_explainer, "expected_value"):
                    ev = self.shap_explainer.expected_value
                    self.expected_value = float(ev[0] if isinstance(ev, (list, np.ndarray)) else ev)
            elif m_type in ["linear", "ridge"]:
                dummy_mask = np.zeros((1, len(self.feature_names)))
                self.shap_explainer = shap.LinearExplainer(base_model, dummy_mask)
                self.expected_value = float(self.shap_explainer.expected_value)
            else:

                self.shap_explainer = None
        except Exception:
            self.shap_explainer = None

    def explain_global(self, X_sample: np.ndarray, df_sample: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """
        Computes global feature importances, SHAP values if supported,
        and feature correlation matrix.
        """
        # 1. Native / permutation importance
        native_imp = self.wrapper.get_feature_importances(X_sample)
        sorted_imp = sorted(native_imp.items(), key=lambda x: x[1], reverse=True)
        max_val = max([v for _, v in sorted_imp]) if sorted_imp else 1.0

        importance_list = [
            {
                "feature": k,
                "importance": round(v, 4),
                "normalized_importance": round(v / max_val, 4)
            }
            for k, v in sorted_imp
        ]

        # 2. SHAP summary values
        shap_summary_data = []
        if self.shap_explainer is not None:
            try:
                # Subsample up to 200 points for fast rendering
                sample_sub = X_sample[:min(200, len(X_sample))]
                shap_values = self.shap_explainer.shap_values(sample_sub)
                if isinstance(shap_values, list):
                    shap_values = shap_values[0]

                # Mean absolute SHAP per feature
                mean_shap = np.mean(np.abs(shap_values), axis=0)
                for idx, feat in enumerate(self.feature_names):
                    shap_summary_data.append({
                        "feature": feat,
                        "mean_abs_shap": round(float(mean_shap[idx]), 3),
                        # Sample 15 points for beeswarm visualization
                        "sample_points": [
                            {
                                "feature_val": round(float(sample_sub[row, idx]), 2),
                                "shap_val": round(float(shap_values[row, idx]), 3)
                            }
                            for row in range(min(15, len(sample_sub)))
                        ]
                    })
                shap_summary_data = sorted(shap_summary_data, key=lambda x: x["mean_abs_shap"], reverse=True)
            except Exception:
                shap_summary_data = []

        # 3. Correlation matrix
        corr_matrix = {}
        if df_sample is not None:
            numeric_cols = [c for c in self.feature_names if c in df_sample.columns]
            corr_df = df_sample[numeric_cols].corr().fillna(0.0)
            for c1 in numeric_cols:
                corr_matrix[c1] = {c2: round(float(corr_df.loc[c1, c2]), 3) for c2 in numeric_cols}

        top_feats = [item["feature"] for item in importance_list[:3]]
        research_text = (
            f"Global attribution analysis shows that '{top_feats[0]}' is the dominant predictor of "
            f"future glucose for this {self.wrapper.model_type.upper()} model, followed by '{top_feats[1]}' "
            f"and '{top_feats[2]}'. These feature importances reflect mathematical loss reduction and "
            f"gradient attribution across the training distribution. While consistent with expected physiological "
            f"associations (e.g., autoregressive glucose continuity and macronutrient flux), they describe statistical "
            f"predictive utility and must not be conflated with confirmed causal biological mechanisms."
        )

        return {
            "model_id": self.wrapper.model_type,
            "method": "SHAP & Tree Gain" if self.shap_explainer else "Ensemble & Linear Attribution",
            "feature_importances": importance_list,
            "correlation_matrix": corr_matrix,
            "shap_summary": shap_summary_data,
            "research_interpretation": research_text
        }

    def explain_local(
        self,
        x_row: np.ndarray,
        raw_feature_dict: Dict[str, float],
        actual_glucose: Optional[float] = None,
        timestamp_str: str = ""
    ) -> Dict[str, Any]:
        """
        Computes local feature attributions (waterfall decomposition) for a single prediction point.
        """
        if x_row.ndim == 1:
            x_row = x_row.reshape(1, -1)

        predicted_val = float(self.wrapper.predict(x_row)[0])
        baseline = float(self.expected_value)

        attributions = []
        if self.shap_explainer is not None:
            try:
                sv = self.shap_explainer.shap_values(x_row)
                if isinstance(sv, list):
                    sv = sv[0]
                row_shap = sv[0] if sv.ndim > 1 else sv
                for idx, feat in enumerate(self.feature_names):
                    attr_val = float(row_shap[idx])
                    attributions.append({
                        "feature": feat,
                        "value": round(float(raw_feature_dict.get(feat, 0.0)), 2),
                        "attribution": round(attr_val, 3),
                        "direction": "increases_glucose" if attr_val >= 0 else "decreases_glucose"
                    })
            except Exception:
                pass

        if not attributions:
            # Fallback waterfall using model importances and scaled feature deviation
            native_imp = self.wrapper.get_feature_importances()
            delta = predicted_val - baseline
            for feat in self.feature_names:
                w = native_imp.get(feat, 0.0)
                attr_val = delta * w
                attributions.append({
                    "feature": feat,
                    "value": round(float(raw_feature_dict.get(feat, 0.0)), 2),
                    "attribution": round(attr_val, 3),
                    "direction": "increases_glucose" if attr_val >= 0 else "decreases_glucose"
                })

        # Sort by absolute attribution
        attributions = sorted(attributions, key=lambda x: abs(x["attribution"]), reverse=True)

        for a in attributions:
            feat = a["feature"]
            a["friendly_name"] = FRIENDLY_NAMES.get(feat, feat.replace("_", " ").title())
            if a["direction"] == "increases_glucose":
                a["friendly_effect"] = f"Pushes sugar UP by +{abs(a['attribution']):.1f} mg/dL"
            else:
                a["friendly_effect"] = f"Pulls sugar DOWN by -{abs(a['attribution']):.1f} mg/dL"

        # Dynamic research explanation paragraph
        pos_drivers = [a for a in attributions if a["attribution"] > 0][:2]
        neg_drivers = [a for a in attributions if a["attribution"] < 0][:2]

        pos_str = ", ".join([f"'{d['friendly_name']}' (+{d['attribution']:.1f} mg/dL)" for d in pos_drivers]) or "none"
        neg_str = ", ".join([f"'{d['friendly_name']}' ({d['attribution']:.1f} mg/dL)" for d in neg_drivers]) or "none"

        trend = "elevation" if predicted_val > baseline else "reduction"
        explanation = (
            f"For the prediction at {timestamp_str or 'selected timestamp'}, the model forecasted a glucose level of "
            f"{predicted_val:.1f} mg/dL (a net {trend} relative to baseline {baseline:.1f} mg/dL). "
            f"The primary positive drivers elevating predicted glucose were {pos_str}. "
            f"Conversely, the primary stabilizing or downward contributors were {neg_str}. "
            f"These local attributions quantify each feature's marginal displacement of the model's output surface "
            f"at this specific operating point."
        )

        # Plain English summary for everyday humans
        if predicted_val < 70:
            risk_level = "⚠️ Low Blood Sugar Risk (Hypoglycemia Warning)"
            action_tip = "Keep fast-acting carbohydrates (e.g. 15g juice or glucose tablets) ready to prevent hypoglycemia."
            trend_plain = "drop below safe levels"
        elif predicted_val <= 140:
            risk_level = "✅ Healthy Target Zone (Optimal Range 70-140 mg/dL)"
            action_tip = "Your predicted blood sugar is in a safe, healthy balance. Keep up your current routine."
            trend_plain = "remain steady and in the healthy zone"
        elif predicted_val <= 180:
            risk_level = "ℹ️ Slightly Elevated (Acceptable Post-Meal Range 140-180 mg/dL)"
            action_tip = "This is a normal post-meal curve. A light walk or hydration can help bring it back smoothly."
            trend_plain = "stay slightly elevated after digestion"
        else:
            risk_level = "⚠️ High Blood Sugar Alert (Hyperglycemia Over 180 mg/dL)"
            action_tip = "Drink plenty of water and check active insulin (IOB) before taking an extra correction dose."
            trend_plain = "rise above the target range"

        pos_plain = [f"{d['friendly_name']} (+{abs(d['attribution']):.0f} mg/dL)" for d in pos_drivers]
        neg_plain = [f"{d['friendly_name']} (-{abs(d['attribution']):.0f} mg/dL)" for d in neg_drivers]

        up_text = f"The main factor pushing blood sugar up is {', '.join(pos_plain)}." if pos_plain else "No major factors are pushing sugar up."
        down_text = f"The main factor keeping blood sugar in check is {', '.join(neg_plain)}." if neg_plain else "No strong stabilizing factors were detected."

        plain_summary = (
            f"What this means in plain English: In the next 30 minutes, your blood sugar is expected to be about "
            f"{predicted_val:.0f} mg/dL (meaning it will {trend_plain}). {up_text} {down_text}"
        )

        return {
            "model_id": self.wrapper.model_type,
            "prediction_index": 0,
            "timestamp": timestamp_str,
            "actual_glucose": round(actual_glucose, 1) if actual_glucose is not None else None,
            "predicted_glucose": round(predicted_val, 1),
            "baseline_value": round(baseline, 1),
            "attributions": attributions,
            "explanation_paragraph": explanation,
            "plain_english_summary": plain_summary,
            "clinical_risk_level": risk_level,
            "practical_action_tip": action_tip
        }
