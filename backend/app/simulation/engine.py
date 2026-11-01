import uuid
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from app.digital_twin.replaybg_model import replaybg_twin
from app.data.loader import dataset_repo
from app.schemas.schemas import WhatIfModification, SimulationComparisonMetrics

class SimulationEngine:
    def __init__(self):
        self._saved_scenarios: Dict[str, Dict[str, Any]] = {}

    def run_type1_simulation(
        self,
        scenario_name: str,
        modifications: WhatIfModification,
        duration_hours: int = 12,
        start_step: int = 0
    ) -> Dict[str, Any]:
        """
        Executes a physiological what-if counterfactual simulation on ReplayBG data.
        """
        # Load Day 1 Extended or Day 2
        df = dataset_repo.get_raw_dataframe("day_1_extended")
        df['t_dt'] = pd.to_datetime(df['t'], format="%d-%b-%Y %H:%M:%S")
        df = df.sort_values('t_dt').reset_index(drop=True)

        # Slice simulation window (5-min steps: 12 steps/hr)
        # Skip the initial 31-step sensor initialization warm-up if starting from 0
        offset = 31 if start_step == 0 else start_step
        n_steps = min(len(df) - offset, duration_hours * 12)
        window = df.iloc[offset : offset + n_steps].copy().reset_index(drop=True)
        time_steps = np.arange(len(window)) * 5.0 # minutes

        # Baseline inputs
        base_cho = window['cho'].fillna(0.0).values.copy()
        base_bolus = window['bolus'].fillna(0.0).values.copy()
        base_basal = window['basal'].fillna(0.02).values.copy() * 12.0 # convert to U/hr
        actual_g = window['glucose'].values.copy()
        initial_g = float(window['glucose'].dropna().iloc[0]) if len(window['glucose'].dropna()) > 0 else 125.0

        # Baseline ODE simulation
        base_res = replaybg_twin.simulate(
            time_steps,
            cho_events_g=base_cho,
            bolus_events_u=base_bolus,
            basal_rates_u_hr=base_basal,
            initial_glucose=initial_g
        )
        base_g = base_res["glucose"]

        # Modified Counterfactual inputs
        sim_cho = base_cho * modifications.meal_carbs_factor
        if modifications.meal_shift_minutes != 0:
            shift_steps = int(modifications.meal_shift_minutes / 5)
            sim_cho = np.roll(sim_cho, shift_steps)
            if shift_steps > 0:
                sim_cho[:shift_steps] = 0.0
            elif shift_steps < 0:
                sim_cho[shift_steps:] = 0.0

        sim_bolus = base_bolus * modifications.bolus_factor
        if modifications.bolus_delay_minutes != 0:
            shift_b = int(modifications.bolus_delay_minutes / 5)
            sim_bolus = np.roll(sim_bolus, shift_b)
            if shift_b > 0:
                sim_bolus[:shift_b] = 0.0
            elif shift_b < 0:
                sim_bolus[shift_b:] = 0.0

        sim_basal = base_basal * modifications.basal_factor

        # Counterfactual ODE simulation
        sim_res = replaybg_twin.simulate(
            time_steps,
            cho_events_g=sim_cho,
            bolus_events_u=sim_bolus,
            basal_rates_u_hr=sim_basal,
            initial_glucose=initial_g
        )
        sim_g = sim_res["glucose"]

        # Calculate comparative metrics
        comp_metrics, trajectory = self._compute_comparison_metrics(
            timestamps=window['t'].values,
            base_g=base_g,
            sim_g=sim_g,
            base_cho=base_cho,
            sim_cho=sim_cho,
            sim_bolus=sim_bolus,
            sim_basal=sim_basal,
            actual_g=actual_g
        )

        # Generate scientific and plain-English natural-language explanation
        explanation, mechanism, plain_english, takeaway = self._generate_explanation(modifications, comp_metrics)

        scenario_id = str(uuid.uuid4())[:8]
        result = {
            "scenario_id": scenario_id,
            "scenario_name": scenario_name,
            "track": "t1d_replaybg",
            "modifications": modifications.model_dump(),
            "trajectory": trajectory,
            "comparison_metrics": comp_metrics.model_dump(),
            "natural_language_explanation": explanation,
            "physiological_mechanism_notes": mechanism,
            "plain_english_summary": plain_english,
            "actionable_takeaway": takeaway,
            "safety_disclaimer": "Academic simulation for research demonstration only. Not a medical device; does not provide treatment recommendations or insulin dosing advice."
        }

        # Cache scenario
        self._saved_scenarios[scenario_id] = result
        return result

    def _compute_comparison_metrics(
        self,
        timestamps: np.ndarray,
        base_g: np.ndarray,
        sim_g: np.ndarray,
        base_cho: np.ndarray,
        sim_cho: np.ndarray,
        sim_bolus: np.ndarray,
        sim_basal: np.ndarray,
        actual_g: Optional[np.ndarray] = None
    ) -> Tuple[SimulationComparisonMetrics, List[Dict[str, Any]]]:
        """Calculates trapezoidal AUC, peaks, time-to-peak, and glycemic range metrics."""
        dt_hr = 5.0 / 60.0
        n = len(base_g)

        # Trapezoidal numerical integration for AUC (mg/dL * hr)
        base_auc = float(np.trapezoid(base_g, dx=dt_hr))
        sim_auc = float(np.trapezoid(sim_g, dx=dt_hr))
        auc_diff = sim_auc - base_auc
        auc_pct = (auc_diff / max(1.0, base_auc)) * 100.0

        # Peak analysis evaluated during postprandial period (from first meal onward)
        cho_indices = np.where((sim_cho > 0) | (base_cho > 0))[0]
        start_eval = max(0, cho_indices[0] - 6) if len(cho_indices) > 0 else 0

        base_peak_idx = start_eval + int(np.argmax(base_g[start_eval:]))
        sim_peak_idx = start_eval + int(np.argmax(sim_g[start_eval:]))
        base_peak = float(base_g[base_peak_idx])
        sim_peak = float(sim_g[sim_peak_idx])
        peak_diff = sim_peak - base_peak
        time_to_peak_diff = (sim_peak_idx - base_peak_idx) * 5

        # Glycemic ranges (TIR 70-180, TAR >180, TBR <70)
        base_tir = float(np.mean((base_g >= 70.0) & (base_g <= 180.0)) * 100.0)
        sim_tir = float(np.mean((sim_g >= 70.0) & (sim_g <= 180.0)) * 100.0)

        base_tar = float(np.mean(base_g > 180.0) * 100.0)
        sim_tar = float(np.mean(sim_g > 180.0) * 100.0)

        base_tbr = float(np.mean(base_g < 70.0) * 100.0)
        sim_tbr = float(np.mean(sim_g < 70.0) * 100.0)

        # Trajectory point array
        trajectory = []
        diffs = sim_g - base_g
        abs_diffs = np.abs(diffs)
        max_diff_idx = int(np.argmax(abs_diffs))

        for i in range(n):
            pct_chg = ((sim_g[i] - base_g[i]) / max(1.0, base_g[i])) * 100.0
            act_val = float(actual_g[i]) if actual_g is not None and not np.isnan(actual_g[i]) else None
            trajectory.append({
                "timestamp": str(timestamps[i]),
                "baseline_glucose": round(float(base_g[i]), 1),
                "simulated_glucose": round(float(sim_g[i]), 1),
                "actual_glucose": round(act_val, 1) if act_val is not None else None,
                "delta_glucose": round(float(diffs[i]), 1),
                "pct_change": round(float(pct_chg), 1),
                "carbs_input": round(float(sim_cho[i]), 1),
                "bolus_input": round(float(sim_bolus[i]), 2),
                "basal_input": round(float(sim_basal[i]), 2)
            })

        metrics = SimulationComparisonMetrics(
            baseline_peak_glucose=round(base_peak, 1),
            simulated_peak_glucose=round(sim_peak, 1),
            peak_diff_mg_dl=round(peak_diff, 1),
            baseline_time_to_peak_min=base_peak_idx * 5,
            simulated_time_to_peak_min=sim_peak_idx * 5,
            time_to_peak_diff_min=time_to_peak_diff,
            baseline_mean_glucose=round(float(np.mean(base_g)), 1),
            simulated_mean_glucose=round(float(np.mean(sim_g)), 1),
            mean_diff_mg_dl=round(float(np.mean(sim_g) - np.mean(base_g)), 1),
            baseline_auc=round(base_auc, 1),
            simulated_auc=round(sim_auc, 1),
            auc_diff=round(auc_diff, 1),
            auc_pct_change=round(auc_pct, 1),
            baseline_tir_pct=round(base_tir, 1),
            simulated_tir_pct=round(sim_tir, 1),
            baseline_tar_pct=round(base_tar, 1),
            simulated_tar_pct=round(sim_tar, 1),
            baseline_tbr_pct=round(base_tbr, 1),
            simulated_tbr_pct=round(sim_tbr, 1),
            max_absolute_diff_mg_dl=round(float(abs_diffs[max_diff_idx]), 1),
            time_of_max_diff=str(timestamps[max_diff_idx])
        )

        return metrics, trajectory

    def _generate_explanation(
        self,
        m: WhatIfModification,
        c: SimulationComparisonMetrics
    ) -> Tuple[str, str, str, str]:
        """Generates dynamic scientific research explanation, plain-English summary, and practical takeaways."""
        mod_parts = []
        mod_plain = []
        if m.meal_carbs_factor != 1.0:
            pct = (m.meal_carbs_factor - 1.0) * 100.0
            mod_parts.append(f"meal carbohydrate amounts were modified by {pct:+.0f}%")
            mod_plain.append(f"{abs(pct):.0f}% {'more' if pct > 0 else 'fewer'} carbohydrates in your meal")
        if m.meal_shift_minutes != 0:
            mod_parts.append(f"meal timing was shifted by {m.meal_shift_minutes:+d} minutes")
            mod_plain.append(f"eating {abs(m.meal_shift_minutes)} minutes {'later' if m.meal_shift_minutes > 0 else 'earlier'}")
        if m.bolus_factor != 1.0:
            pct = (m.bolus_factor - 1.0) * 100.0
            mod_parts.append(f"bolus insulin doses were adjusted by {pct:+.0f}%")
            mod_plain.append(f"{abs(pct):.0f}% {'more' if pct > 0 else 'less'} meal insulin")
        if m.bolus_delay_minutes != 0:
            mod_parts.append(f"bolus timing was delayed by {m.bolus_delay_minutes:+d} minutes")
            mod_plain.append(f"waiting {m.bolus_delay_minutes} minutes after eating before taking insulin")
        if m.basal_factor != 1.0:
            pct = (m.basal_factor - 1.0) * 100.0
            mod_parts.append(f"basal insulin infusion was adjusted by {pct:+.0f}%")
            mod_plain.append(f"a {abs(pct):.0f}% {'higher' if pct > 0 else 'lower'} background insulin rate")

        if not mod_parts:
            mod_parts.append("no physiological inputs were altered (baseline replication)")
            mod_plain.append("following your standard baseline daily routine")

        mod_str = "; ".join(mod_parts)
        plain_input_str = " and ".join(mod_plain)

        direction = "elevated" if c.mean_diff_mg_dl > 0 else ("reduced" if c.mean_diff_mg_dl < 0 else "unchanged")
        explanation = (
            f"In this scenario, {mod_str}. Under these counterfactual parameters, the model predicted a net {direction} "
            f"glucose trajectory: mean glucose changed by {c.mean_diff_mg_dl:+.1f} mg/dL (from {c.baseline_mean_glucose} to "
            f"{c.simulated_mean_glucose} mg/dL). Peak postprandial glucose shifted by {c.peak_diff_mg_dl:+.1f} mg/dL, with a "
            f"time-to-peak shift of {c.time_to_peak_diff_min:+d} minutes. The maximal instantaneous deviation between baseline "
            f"and simulation reached {c.max_absolute_diff_mg_dl} mg/dL at {c.time_of_max_diff}. Total glycemic exposure (AUC) "
            f"changed by {c.auc_pct_change:+.1f}%, while Time in Range (70-180 mg/dL) moved from {c.baseline_tir_pct}% to {c.simulated_tir_pct}%."
        )

        mechanism = (
            f"Physiological Submodel Dynamics: The two-compartment gut absorption ODE dictates that oral carbohydrates expand Q_gut "
            f"and drive systemic rate of appearance Ra(t) with rate constant k_abs. Concurrently, subcutaneous insulin absorption (k_d) "
            f"governs the remote active insulin compartment X(t), driving insulin-dependent disposal. The observed trajectory delta reflects "
            f"the differential temporal coupling between carbohydrate appearance and insulin action."
        )

        # Plain English summary for non-technical users
        if c.peak_diff_mg_dl >= 4.0:
            spike_summary = f"spike higher, reaching a peak of {c.simulated_peak_glucose:.0f} mg/dL (up by +{c.peak_diff_mg_dl:.0f} mg/dL compared to normal)"
        elif c.peak_diff_mg_dl <= -4.0:
            spike_summary = f"remain lower, reaching a maximum of {c.simulated_peak_glucose:.0f} mg/dL ({abs(c.peak_diff_mg_dl):.0f} mg/dL lower than normal)"
        elif c.max_absolute_diff_mg_dl >= 4.0:
            spike_summary = f"deviate noticeably from your baseline (by up to {c.max_absolute_diff_mg_dl:.0f} mg/dL, peaking at {c.simulated_peak_glucose:.0f} mg/dL)"
        else:
            spike_summary = f"peak at about {c.simulated_peak_glucose:.0f} mg/dL (closely tracking your baseline)"

        tir_summary = f"You spend {c.simulated_tir_pct:.0f}% of your day in the healthy green target zone (70-180 mg/dL)."
        shift_text = f"shifts by {c.mean_diff_mg_dl:+.1f} mg/dL" if abs(c.mean_diff_mg_dl) >= 0.2 else f"stays steady around {c.simulated_mean_glucose:.0f} mg/dL"
        plain_english = (
            f"What this means in plain English: If you simulate {plain_input_str}, your blood sugar will {spike_summary}. "
            f"{tir_summary} On average across the simulated timeline, your blood sugar {shift_text}."
        )

        # Actionable practical takeaway
        if m.bolus_delay_minutes > 0:
            takeaway = "💡 Practical Tip: Delaying insulin after a meal allows carbs to rush into the blood before insulin activates, causing a sharp spike. Taking insulin 10–15 minutes before eating (pre-bolusing) helps align the insulin peak with food absorption."
        elif m.bolus_factor < 0.85:
            takeaway = "💡 Practical Tip: Under-dosing or skipping meal insulin leaves carbohydrates unbuffered in the bloodstream, resulting in sustained high glucose. Ensure meal boluses match your carbohydrate intake."
        elif m.bolus_factor > 1.15:
            takeaway = "💡 Practical Tip: Over-correcting with excess bolus insulin rapidly pulls your blood sugar down. Watch for low blood sugar (hypoglycemia) symptoms between 2 to 4 hours post-meal."
        elif m.basal_factor > 1.15:
            takeaway = "💡 Practical Tip: Increasing your background basal rate continuously lowers glucose across the entire 24-hour cycle. Monitor closely for overnight low blood sugar (hypoglycemia)."
        elif m.basal_factor < 0.85:
            takeaway = "💡 Practical Tip: Decreasing your basal rate reduces 24-hour baseline insulin coverage, allowing blood sugar to steadily drift upward throughout the day."
        elif m.meal_carbs_factor > 1.2 and m.bolus_factor <= 1.0:
            takeaway = "💡 Practical Tip: Eating extra carbs without increasing your meal insulin creates an insulin deficit, driving a prolonged postprandial spike. Matching your carb-to-insulin ratio is key."
        elif m.meal_carbs_factor < 0.8:
            takeaway = "💡 Practical Tip: Choosing lower-carb meal options flattens the post-meal curve and reduces the amount of insulin needed, keeping blood sugar smoothly in the healthy green zone."
        else:
            takeaway = "💡 Practical Tip: Balanced meal portions and timely insulin dosing keep blood sugar fluctuations gentle and predictable."

        return explanation, mechanism, plain_english, takeaway

    def list_saved_scenarios(self) -> List[Dict[str, Any]]:
        return list(self._saved_scenarios.values())

    def get_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        return self._saved_scenarios.get(scenario_id)

simulation_engine = SimulationEngine()
