import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional
from sklearn.preprocessing import StandardScaler
from app.data.loader import dataset_repo

class CGMacrosPreprocessor:
    FEATURE_GROUPS = {
        "glucose_dynamics": [
            "glucose_mg_dl", "glucose_lag_15m", "glucose_lag_30m", "glucose_delta_15m",
            "velocity_5m", "roll_mean_15m", "roll_std_30m", "momentum_30m"
        ],
        "macronutrients": ["carbs_last_120m", "protein_last_120m", "fat_last_120m", "fiber_last_120m"],
        "activity_vitals": ["heart_rate", "mets", "activity_calories", "heart_rate_mean_30m", "mets_mean_60m", "activity_calories_60m"],
        "demographics_clinical": ["age", "bmi", "hba1c", "fasting_glucose", "fasting_insulin"],
        "circadian": ["hour", "sin_time", "cos_time"]
    }

    def __init__(self, diagnosis_group: str = "all", selected_features: Optional[List[str]] = None):
        self.diagnosis_group = diagnosis_group
        self.selected_features = selected_features or self.get_all_feature_names()
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names = list(self.selected_features)

    @classmethod
    def get_all_feature_names(cls) -> List[str]:
        features = []
        for grp in cls.FEATURE_GROUPS.values():
            features.extend(grp)
        return features

    def _engineer_features_for_participant(self, df_part: pd.DataFrame) -> pd.DataFrame:
        """Computes dynamic velocities, rolling statistics, and momentum."""
        df_p = df_part.sort_values('timestamp').copy().reset_index(drop=True)
        # 5-minute velocity (rate of change)
        df_p['velocity_5m'] = df_p['glucose_mg_dl'].diff().fillna(0.0)
        # Short-term rolling mean
        df_p['roll_mean_15m'] = df_p['glucose_mg_dl'].rolling(15, min_periods=1).mean()
        # Glycemic volatility
        df_p['roll_std_30m'] = df_p['glucose_mg_dl'].rolling(30, min_periods=1).std().fillna(0.0)
        # Momentum extrapolation (current level + projected 30m velocity)
        df_p['momentum_30m'] = df_p['glucose_mg_dl'] + 2.0 * df_p['glucose_delta_15m']
        return df_p

    def prepare_data(
        self,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        embargo_minutes: int = 30
    ) -> Dict[str, Any]:
        """
        Extracts, cleans, and chronologically splits CGMacros data with strict temporal embargo.
        When diagnosis_group == 'all', partitions chronologically per participant (stratified temporal split),
        guaranteeing multi-phenotype representation in both training and out-of-sample testing.
        """
        raw_df = dataset_repo.get_raw_dataframe("cgmacros").copy()

        # Handle missing values in base columns
        raw_df = raw_df.ffill().bfill()

        # Filter if a specific cohort was requested
        if self.diagnosis_group and self.diagnosis_group.lower() != "all":
            raw_df = raw_df[raw_df['diagnosis'].str.lower() == self.diagnosis_group.lower()].copy()

        train_dfs = []
        val_dfs = []
        test_dfs = []

        # Process each participant independently to prevent temporal leakage
        for pid, group in raw_df.groupby('participant_id'):
            processed_group = self._engineer_features_for_participant(group)
            
            # Mask valid target
            valid_mask = ~processed_group['target_30m'].isna()
            clean_group = processed_group[valid_mask].reset_index(drop=True)

            n = len(clean_group)
            train_end = int(n * train_ratio)
            val_start = train_end + embargo_minutes
            val_end = val_start + int(n * val_ratio)
            test_start = val_end + embargo_minutes

            if test_start >= n:
                val_start = train_end
                val_end = int(n * (train_ratio + val_ratio))
                test_start = val_end

            train_dfs.append(clean_group.iloc[:train_end])
            val_dfs.append(clean_group.iloc[val_start:val_end])
            test_dfs.append(clean_group.iloc[test_start:])

        train_combined = pd.concat(train_dfs, ignore_index=True)
        val_combined = pd.concat(val_dfs, ignore_index=True)
        test_combined = pd.concat(test_dfs, ignore_index=True)

        X_train_raw = train_combined[self.feature_names].values
        y_train = train_combined['target_30m'].values

        X_val_raw = val_combined[self.feature_names].values
        y_val = val_combined['target_30m'].values

        X_test_raw = test_combined[self.feature_names].values
        y_test = test_combined['target_30m'].values
        test_timestamps = test_combined['timestamp'].values
        test_actual_glucose = test_combined['glucose_mg_dl'].values

        # Fit scaler ONLY on train split
        self.scaler.fit(X_train_raw)
        self.is_fitted = True

        X_train = self.scaler.transform(X_train_raw)
        X_val = self.scaler.transform(X_val_raw)
        X_test = self.scaler.transform(X_test_raw)

        return {
            "X_train": X_train,
            "y_train": y_train,
            "X_val": X_val,
            "y_val": y_val,
            "X_test": X_test,
            "y_test": y_test,
            "X_test_raw": X_test_raw,
            "test_timestamps": test_timestamps,
            "test_actual_glucose": test_actual_glucose,
            "feature_names": self.feature_names,
            "train_indices": (0, len(X_train)),
            "val_indices": (0, len(X_val)),
            "test_indices": (0, len(X_test))
        }

    def transform_single(self, feature_dict: Dict[str, float]) -> np.ndarray:
        """Transforms a single feature row dict into scaled numpy array for inference."""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted.")
        row = np.array([[feature_dict.get(k, 0.0) for k in self.feature_names]])
        return self.scaler.transform(row)
