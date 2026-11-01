import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.preprocessing import StandardScaler
from app.data.loader import dataset_repo

def compute_iob_series(bolus_series: np.ndarray, dt_min: float = 5.0, action_duration_min: float = 240.0) -> np.ndarray:
    """
    Computes Insulin On Board (IOB) using a continuous exponential decay model.
    Standard Mudaliar / Hovorka rapid-acting insulin decay curve approximation.
    """
    n = len(bolus_series)
    iob = np.zeros(n)
    tau = action_duration_min / 3.0 # decay time constant ~ 80 min
    
    current_iob = 0.0
    decay = np.exp(-dt_min / tau)
    for i in range(n):
        current_iob = current_iob * decay + bolus_series[i]
        iob[i] = current_iob
    return iob

def compute_cob_series(cho_series: np.ndarray, dt_min: float = 5.0, abs_duration_min: float = 180.0) -> np.ndarray:
    """
    Computes Carbs On Board (COB) using gut transit absorption decay.
    """
    n = len(cho_series)
    cob = np.zeros(n)
    tau = abs_duration_min / 2.5 # ~ 72 min
    
    current_cob = 0.0
    decay = np.exp(-dt_min / tau)
    for i in range(n):
        current_cob = current_cob * decay + cho_series[i]
        cob[i] = current_cob
    return cob

class T1DPreprocessor:
    FEATURES = [
        "glucose",
        "glucose_lag_5m",
        "glucose_lag_15m",
        "glucose_lag_30m",
        "glucose_delta_5m",
        "glucose_delta_15m",
        "cho",
        "cho_accum_60m",
        "cob",
        "bolus",
        "bolus_accum_60m",
        "iob",
        "basal",
        "hour",
        "sin_time",
        "cos_time"
    ]

    def __init__(self, dataset_name: str = "day_1_extended", horizon_steps: int = 6): # 6 * 5 min = 30 min
        self.dataset_name = dataset_name
        self.horizon_steps = horizon_steps
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names = list(self.FEATURES)

    def prepare_data(
        self,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15
    ) -> Dict[str, Any]:
        """
        Processes ReplayBG data, engineer physiological features (COB, IOB, lags),
        constructs multi-step target, and splits chronologically.
        """
        df = dataset_repo.get_raw_dataframe(self.dataset_name)
        df['t_dt'] = pd.to_datetime(df['t'], format="%d-%b-%Y %H:%M:%S")
        df = df.sort_values('t_dt').reset_index(drop=True)

        # Feature Engineering on full timeline (even when glucose is temporarily missing)
        df['hour'] = df['t_dt'].dt.hour + df['t_dt'].dt.minute / 60.0
        df['sin_time'] = np.sin(2 * np.pi * df['hour'] / 24.0)
        df['cos_time'] = np.cos(2 * np.pi * df['hour'] / 24.0)

        # COB and IOB
        df['cob'] = compute_cob_series(df['cho'].fillna(0.0).values)
        df['iob'] = compute_iob_series(df['bolus'].fillna(0.0).values)

        # Rolling accumulators (12 steps = 60 min)
        df['cho_accum_60m'] = df['cho'].fillna(0.0).rolling(window=12, min_periods=1).sum()
        df['bolus_accum_60m'] = df['bolus'].fillna(0.0).rolling(window=12, min_periods=1).sum()

        # Glucose lags and velocities
        df['glucose_lag_5m'] = df['glucose'].shift(1)
        df['glucose_lag_15m'] = df['glucose'].shift(3)
        df['glucose_lag_30m'] = df['glucose'].shift(6)
        df['glucose_delta_5m'] = df['glucose'] - df['glucose_lag_5m']
        df['glucose_delta_15m'] = df['glucose'] - df['glucose_lag_15m']

        # Target horizon (default 6 steps ahead = 30 min)
        df['target_glucose'] = df['glucose'].shift(-self.horizon_steps)

        # Mask out rows where current glucose, key lags, or target are NaN
        # (This correctly skips the 31-step sensor warm-up while keeping COB/IOB accurate)
        valid_mask = (
            ~df['glucose'].isna() &
            ~df['glucose_lag_30m'].isna() &
            ~df['target_glucose'].isna()
        )
        valid_df = df[valid_mask].copy().reset_index(drop=True)

        X_df = valid_df[self.feature_names]
        y_series = valid_df['target_glucose'].values
        timestamps = valid_df['t'].values
        actual_glucose = valid_df['glucose'].values

        n_total = len(valid_df)
        train_end = int(n_total * train_ratio)
        val_end = train_end + int(n_total * val_ratio)

        # Temporal embargo: discard horizon_steps to avoid target overlap
        embargo = self.horizon_steps
        val_start = train_end + embargo
        test_start = val_end + embargo

        if test_start >= n_total:
            val_start = train_end
            val_end = int(n_total * (train_ratio + val_ratio))
            test_start = val_end

        X_train_raw = X_df.iloc[:train_end].values
        y_train = y_series[:train_end]

        X_val_raw = X_df.iloc[val_start:val_end].values
        y_val = y_series[val_start:val_end]

        X_test_raw = X_df.iloc[test_start:].values
        y_test = y_series[test_start:]
        test_timestamps = timestamps[test_start:]
        test_actual_glucose = actual_glucose[test_start:]

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
            "full_processed_df": df
        }
