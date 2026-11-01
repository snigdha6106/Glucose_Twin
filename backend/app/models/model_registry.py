import time
import os
import joblib
import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Any, List, Optional, Tuple
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR, LinearSVR
import xgboost as xgb
import lightgbm as lgb
from app.core.config import settings

# -------------------------------------------------------------
# PyTorch Deep Learning Architectures
# -------------------------------------------------------------
class PyTorchMLP(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, 32)
        self.fc3 = nn.Linear(32, 1)

    def forward(self, x):
        h = self.relu(self.fc1(x))
        h = self.relu(self.fc2(h))
        return self.fc3(h).squeeze(-1)

class PyTorchRNN(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 48, rnn_type: str = "lstm"):
        super().__init__()
        self.rnn_type = rnn_type
        if rnn_type == "lstm":
            self.rnn = nn.LSTM(input_dim, hidden_dim, batch_first=True, num_layers=2, dropout=0.1)
        else:
            self.rnn = nn.GRU(input_dim, hidden_dim, batch_first=True, num_layers=2, dropout=0.1)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        # x shape: (batch_size, seq_len, input_dim) or (batch_size, 1, input_dim)
        if x.dim() == 2:
            x = x.unsqueeze(1)
        out, _ = self.rnn(x)
        last_step = out[:, -1, :]
        return self.fc(last_step).squeeze(-1)

class PyTorchCNN1D(nn.Module):
    def __init__(self, input_dim: int, out_channels: int = 32):
        super().__init__()
        # 1D conv over feature sequence
        self.conv1 = nn.Conv1d(in_channels=1, out_channels=out_channels, kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(in_channels=out_channels, out_channels=out_channels*2, kernel_size=3, padding=1)
        self.pool = nn.AdaptiveAvgPool1d(8)
        self.fc = nn.Sequential(
            nn.Linear(out_channels * 2 * 8, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        if x.dim() == 2:
            x = x.unsqueeze(1) # (B, 1, num_features)
        h = torch.relu(self.conv1(x))
        h = torch.relu(self.conv2(h))
        h = self.pool(h)
        h = h.view(h.size(0), -1)
        return self.fc(h).squeeze(-1)

class PyTorchTemporalAttention(nn.Module):
    def __init__(self, input_dim: int, embed_dim: int = 32):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, embed_dim)
        self.attn = nn.MultiheadAttention(embed_dim=embed_dim, num_heads=4, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(embed_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        if x.dim() == 2:
            x = x.unsqueeze(1)
        proj = self.input_proj(x)
        attn_out, _ = self.attn(proj, proj, proj)
        pooled = attn_out[:, -1, :]
        return self.fc(pooled).squeeze(-1)

# -------------------------------------------------------------
# Unified Model Wrapper
# -------------------------------------------------------------
class GlucoseModelWrapper:
    def __init__(self, model_type: str, feature_names: List[str]):
        self.model_type = model_type.lower()
        self.feature_names = feature_names
        self.model = None
        self.training_time_sec = 0.0
        self.inference_time_ms = 0.0
        self.is_deep_learning = self.model_type in ["mlp", "lstm", "gru", "cnn1d", "attention"]
        self._init_model()

    def _init_model(self):
        input_dim = len(self.feature_names)
        if self.model_type == "linear":
            self.model = LinearRegression()
        elif self.model_type == "ridge":
            self.model = Ridge(alpha=1.0)
        elif self.model_type == "random_forest":
            self.model = RandomForestRegressor(n_estimators=100, max_depth=12, max_features=0.85, random_state=42, n_jobs=-1)
        elif self.model_type == "gbr":
            self.model = GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, subsample=0.85, random_state=42)
        elif self.model_type == "xgboost":
            self.model = xgb.XGBRegressor(n_estimators=120, max_depth=4, learning_rate=0.05, subsample=0.85, colsample_bytree=0.85, random_state=42, n_jobs=-1)
        elif self.model_type == "lightgbm":
            self.model = lgb.LGBMRegressor(n_estimators=120, max_depth=4, num_leaves=15, learning_rate=0.05, subsample=0.85, random_state=42, verbose=-1, n_jobs=1, num_threads=1)
        elif self.model_type == "svr":
            self.model = LinearSVR(C=1.0, max_iter=3000, random_state=42)
        elif self.model_type == "mlp":
            self.model = PyTorchMLP(input_dim=input_dim)
        elif self.model_type == "lstm":
            self.model = PyTorchRNN(input_dim=input_dim, rnn_type="lstm")
        elif self.model_type == "gru":
            self.model = PyTorchRNN(input_dim=input_dim, rnn_type="gru")
        elif self.model_type == "cnn1d":
            self.model = PyTorchCNN1D(input_dim=input_dim)
        elif self.model_type == "attention":
            self.model = PyTorchTemporalAttention(input_dim=input_dim)
        else:
            raise ValueError(f"Unknown model_type: {self.model_type}")

    def fit(self, X_train: np.ndarray, y_train: np.ndarray, X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None):
        t0 = time.time()
        if not self.is_deep_learning:
            self.model.fit(X_train, y_train)
        else:
            self._train_torch(X_train, y_train, X_val, y_val)
        self.training_time_sec = round(time.time() - t0, 3)

    def _train_torch(self, X_train: np.ndarray, y_train: np.ndarray, X_val: Optional[np.ndarray], y_val: Optional[np.ndarray]):
        device = torch.device("cpu")
        self.model.to(device)

        # Initialize output bias to mean target for rapid convergence
        mean_y = float(np.mean(y_train))
        if hasattr(self.model, 'fc3') and hasattr(self.model.fc3, 'bias'):
            self.model.fc3.bias.data.fill_(mean_y)
        elif hasattr(self.model, 'fc') and hasattr(self.model.fc[-1], 'bias'):
            self.model.fc[-1].bias.data.fill_(mean_y)

        self.model.train()

        X_t = torch.tensor(X_train, dtype=torch.float32).to(device)
        y_t = torch.tensor(y_train, dtype=torch.float32).to(device)

        criterion = nn.SmoothL1Loss()
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=0.005, weight_decay=1e-4)
        batch_size = 64
        epochs = 30

        dataset = torch.utils.data.TensorDataset(X_t, y_t)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)

        for epoch in range(epochs):
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                pred = self.model(batch_x)
                loss = criterion(pred, batch_y)
                loss.backward()
                optimizer.step()

        self.model.eval()

    def predict(self, X: np.ndarray) -> np.ndarray:
        t0 = time.time()
        if not self.is_deep_learning:
            preds = self.model.predict(X)
        else:
            device = next(self.model.parameters()).device
            self.model.eval()
            with torch.no_grad():
                X_t = torch.tensor(X, dtype=torch.float32).to(device)
                preds = self.model(X_t).cpu().numpy()
        elapsed_ms = (time.time() - t0) * 1000.0
        self.inference_time_ms = round(elapsed_ms / max(1, len(X)), 4)
        return np.asarray(preds, dtype=float)

    def get_feature_importances(self, X_sample: Optional[np.ndarray] = None) -> Dict[str, float]:
        """Extracts native or permutation feature importances."""
        importances = {}
        if hasattr(self.model, "feature_importances_"):
            vals = self.model.feature_importances_
            total = sum(vals) if sum(vals) > 0 else 1.0
            for name, val in zip(self.feature_names, vals):
                importances[name] = float(val / total)
        elif hasattr(self.model, "coef_"):
            coef = np.abs(self.model.coef_).flatten()
            total = sum(coef) if sum(coef) > 0 else 1.0
            for name, val in zip(self.feature_names, coef):
                importances[name] = float(val / total)
        else:
            # Equal attribution fallback for deep models when SHAP is not yet computed
            n = len(self.feature_names)
            for name in self.feature_names:
                importances[name] = 1.0 / n
        return importances

    def save(self, filepath: str):
        if not self.is_deep_learning:
            joblib.dump({"model": self.model, "type": self.model_type, "features": self.feature_names}, filepath)
        else:
            torch.save({"state_dict": self.model.state_dict(), "type": self.model_type, "features": self.feature_names}, filepath)
