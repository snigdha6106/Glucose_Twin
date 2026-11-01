import json
import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.core.config import settings

class DatasetRepository:
    def __init__(self):
        self._raw_cache: Dict[str, pd.DataFrame] = {}
        self._metadata_cache: Dict[str, Any] = {}
        self.load_all()

    def load_all(self):
        """Loads and indexes all six data files."""
        # 1. Patient info
        if settings.PATIENT_INFO_FILE.exists():
            df_pat = pd.read_csv(settings.PATIENT_INFO_FILE)
            self._raw_cache["patient_info"] = df_pat
            self._metadata_cache["patient_info"] = df_pat.to_dict(orient="records")[0] if len(df_pat) > 0 else {}

        # 2. ReplayBG files
        if settings.DAY_1_FILE.exists():
            df_d1 = pd.read_csv(settings.DAY_1_FILE)
            df_d1['t_dt'] = pd.to_datetime(df_d1['t'], format="%d-%b-%Y %H:%M:%S")
            self._raw_cache["day_1"] = df_d1

        if settings.DAY_2_FILE.exists():
            df_d2 = pd.read_csv(settings.DAY_2_FILE)
            df_d2['t_dt'] = pd.to_datetime(df_d2['t'], format="%d-%b-%Y %H:%M:%S")
            self._raw_cache["day_2"] = df_d2

        if settings.DAY_1_EXT_FILE.exists():
            df_ext = pd.read_csv(settings.DAY_1_EXT_FILE)
            df_ext['t_dt'] = pd.to_datetime(df_ext['t'], format="%d-%b-%Y %H:%M:%S")
            self._raw_cache["day_1_extended"] = df_ext

        # 3. CGMacros metadata & CSV
        if settings.CGMACROS_META_FILE.exists():
            with open(settings.CGMACROS_META_FILE, 'r') as f:
                self._metadata_cache["cgmacros"] = json.load(f)

        if settings.CGMACROS_FILE.exists():
            df_cg = pd.read_csv(settings.CGMACROS_FILE)
            df_cg['timestamp_dt'] = pd.to_datetime(df_cg['timestamp'])
            self._raw_cache["cgmacros"] = df_cg

    def get_raw_dataframe(self, dataset_id: str) -> pd.DataFrame:
        if dataset_id not in self._raw_cache:
            raise KeyError(f"Dataset '{dataset_id}' not found in repository.")
        return self._raw_cache[dataset_id].copy()

    def get_patient_info(self) -> Dict[str, Any]:
        return self._metadata_cache.get("patient_info", {
            "patient": 1,
            "bw": 100.0,
            "u2ss": 0.2440484700275897
        })

    def get_cgmacros_metadata(self) -> Dict[str, Any]:
        return self._metadata_cache.get("cgmacros", {})

    def get_all_overview(self) -> List[Dict[str, Any]]:
        """Produces a structured dataset overview for all datasets."""
        overview = []
        
        # Day 1 Extended (Primary T1D)
        df_ext = self.get_raw_dataframe("day_1_extended")
        valid_g = df_ext['glucose'].dropna()
        ext_missing_pct = float(df_ext['glucose'].isna().mean() * 100)
        overview.append({
            "id": "day_1_extended",
            "name": "ReplayBG Day 1 Extended (Continuous 46h)",
            "source": "Cappon et al., IEEE TBME 2023",
            "diagnosis_group": "Type 1 Diabetes",
            "records": len(df_ext),
            "participants": 1,
            "time_coverage": f"{df_ext['t_dt'].min().strftime('%Y-%m-%d %H:%M')} to {df_ext['t_dt'].max().strftime('%Y-%m-%d %H:%M')}",
            "sampling_frequency": "5 minutes",
            "missing_pct": round(ext_missing_pct, 2),
            "features": ["t", "glucose", "cho", "bolus", "basal", "bolus_label", "cho_label"],
            "quality_warnings": [
                "Contains 31 initial missing glucose values (155 min sensor initialization window) during which carbs and bolus insulin are recorded.",
                "Identified as exact contiguous union of Day 1 and Day 2 (552 = 264 + 288 records)."
            ]
        })

        # Day 1
        df_d1 = self.get_raw_dataframe("day_1")
        d1_missing_pct = float(df_d1['glucose'].isna().mean() * 100)
        overview.append({
            "id": "day_1",
            "name": "ReplayBG Day 1 (Identification Window)",
            "source": "Cappon et al., IEEE TBME 2023",
            "diagnosis_group": "Type 1 Diabetes",
            "records": len(df_d1),
            "participants": 1,
            "time_coverage": f"{df_d1['t_dt'].min().strftime('%Y-%m-%d %H:%M')} to {df_d1['t_dt'].max().strftime('%Y-%m-%d %H:%M')}",
            "sampling_frequency": "5 minutes",
            "missing_pct": round(d1_missing_pct, 2),
            "features": ["t", "glucose", "cho", "bolus", "basal", "bolus_label", "cho_label"],
            "quality_warnings": [
                "Contains initial 31 missing glucose readings (11.74% missingness).",
                "Useful for parameter identification before forward simulation on Day 2."
            ]
        })

        # Day 2
        df_d2 = self.get_raw_dataframe("day_2")
        overview.append({
            "id": "day_2",
            "name": "ReplayBG Day 2 (Validation Window)",
            "source": "Cappon et al., IEEE TBME 2023",
            "diagnosis_group": "Type 1 Diabetes",
            "records": len(df_d2),
            "participants": 1,
            "time_coverage": f"{df_d2['t_dt'].min().strftime('%Y-%m-%d %H:%M')} to {df_d2['t_dt'].max().strftime('%Y-%m-%d %H:%M')}",
            "sampling_frequency": "5 minutes",
            "missing_pct": 0.0,
            "features": ["t", "glucose", "cho", "bolus", "basal", "bolus_label", "cho_label"],
            "quality_warnings": [
                "100% complete glucose profile (0 missing values across 24 hours).",
                "Starts exactly 5 minutes after Day 1 concludes."
            ]
        })

        # CGMacros (Healthy, Prediabetes, T2D)
        df_cg = self.get_raw_dataframe("cgmacros")
        overview.append({
            "id": "cgmacros",
            "name": "PhysioNet CGMacros Demo Subset (Multi-Phenotype)",
            "source": "PhysioNet CGMacros v1.0.0 (DOI: 10.13026/3z8q-x658)",
            "diagnosis_group": "Healthy (001), Prediabetes (008), Type 2 Diabetes (003)",
            "records": len(df_cg),
            "participants": 3,
            "time_coverage": "48 hours per participant (earliest usable window)",
            "sampling_frequency": "1 minute",
            "missing_pct": 0.01,
            "features": [c for c in df_cg.columns if c != 'timestamp_dt'],
            "quality_warnings": [
                "Single-participant per diagnosis group (exploratory demonstration subset).",
                "Does NOT include insulin dosing time-series.",
                "Target 30m aligns with future glucose at target_timestamp; must NOT be used as input feature."
            ]
        })

        return overview

    def inspect_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Provides in-depth inspection statistics and preview rows."""
        df = self.get_raw_dataframe(dataset_id)
        
        # Select preview columns (excluding helper datetime)
        cols = [c for c in df.columns if not c.endswith('_dt')]
        
        # Missing values
        missing_counts = {c: int(df[c].isna().sum()) for c in cols}
        missing_pcts = {c: round(float(df[c].isna().mean() * 100), 2) for c in cols}
        
        # Data types
        dtypes = {c: str(df[c].dtype) for c in cols}
        
        # Summary statistics for numeric columns
        numeric_cols = df[cols].select_dtypes(include=[np.number]).columns
        desc = df[numeric_cols].describe().to_dict()
        clean_desc = {}
        for col, stats in desc.items():
            clean_desc[col] = {stat: round(val, 3) for stat, val in stats.items()}
            
        # Glycemic ranges if glucose column exists
        glycemic = {}
        g_col = 'glucose' if 'glucose' in df.columns else ('glucose_mg_dl' if 'glucose_mg_dl' in df.columns else None)
        if g_col:
            vg = df[g_col].dropna()
            glycemic = {
                "mean": round(float(vg.mean()), 1),
                "std": round(float(vg.std()), 1),
                "min": round(float(vg.min()), 1),
                "max": round(float(vg.max()), 1),
                "severe_hypo_pct": round(float((vg < 54).mean() * 100), 1),
                "hypo_pct": round(float(((vg >= 54) & (vg < 70)).mean() * 100), 1),
                "tir_pct": round(float(((vg >= 70) & (vg <= 180)).mean() * 100), 1),
                "tar_pct": round(float((vg > 180).mean() * 100), 1),
                "severe_hyper_pct": round(float((vg > 250).mean() * 100), 1),
            }

        # Head records (replace NaN with None for clean JSON serialization)
        head_records = df[cols].head(25).replace({np.nan: None}).to_dict(orient="records")

        return {
            "id": dataset_id,
            "name": dataset_id.replace("_", " ").title(),
            "total_rows": len(df),
            "columns": cols,
            "dtypes": dtypes,
            "head": head_records,
            "summary_stats": clean_desc,
            "missing_counts": missing_counts,
            "missing_percentages": missing_pcts,
            "glycemic_ranges": glycemic
        }

# Global singleton repository
dataset_repo = DatasetRepository()
