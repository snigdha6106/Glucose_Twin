# Diabetes Digital Twin Platform: In Silico Prediction, Physiological ODE Simulation & Explainable AI

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61dafb.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/3D%20Twin-Three.js-black.svg)](https://threejs.org/)
[![PyTorch](https://img.shields.io/badge/Deep%20Learning-PyTorch-EE4C2C.svg)](https://pytorch.org/)
[![SHAP](https://img.shields.io/badge/Explainability-Tree%20SHAP-blueviolet.svg)](https://github.com/slundberg/shap)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

An end-to-end biomedical AI research platform and in silico digital twin for continuous glucose monitoring (CGM), personalized physiological modeling, multi-step trajectory forecasting, and causal what-if counterfactual scenario simulation.

---

## 1. Executive Summary & Scientific Motivation

Diabetes mellitus is characterized by impaired endogenous glucose regulation. While modern Continuous Glucose Monitors (CGM) record interstitial glucose every 1 to 5 minutes, raw sensor readings lack causal interpretability and predictive forward projection.

This platform bridges computational physiology and modern biomedical machine learning by providing:
1. **Track 1: Type 1 Diabetes Physiological Digital Twin (ReplayBG)**: Grounded in the scientific framework of Cappon et al. (*IEEE TBME 2023*), coupling a 2-compartment gut carbohydrate absorption submodel, subcutaneous insulin pharmacokinetics, and a remote insulin action compartment ($X$) to solve patient blood glucose ODEs and execute mechanistic counterfactual what-if simulations.
2. **Track 2: Type 2 Diabetes & Multi-Phenotype Predictive Pipeline (CGMacros)**: Comparative benchmarking across 11 machine learning and deep learning algorithms on 8,276 records from Healthy (`001`), Prediabetes (`008`), and Type 2 Diabetes (`003`) cohorts using PhysioNet CGMacros v1.0.0.
3. **Rigorous Methodological Safeguards**: Zero data leakage via strict chronological partitioning, a 30-minute temporal embargo between training and test sets, and exclusion of all future-derived features (`target_30m`, `target_timestamp`).
4. **Clinical Grid Validation & Explainability**: Evaluation via Mean Absolute Error (MAE), Root Mean Square Error (RMSE), Mean Absolute Relative Difference (MARD), Clarke Error Grid Analysis (EGA Zones A–E), Parkes Consensus Grid, Tree SHAP attributions, and local waterfall explanations.

---

## 2. Distinction: Digital Twin vs. Predictive Model vs. LLM

| Feature / Dimension | Physiological Digital Twin (ReplayBG) | Pure Machine Learning Predictor | Conversational LLM (e.g., ChatGPT) |
| :--- | :--- | :--- | :--- |
| **Foundational Paradigm** | First-principles differential equations (ODEs) derived from mass-balance biological conservation laws. | Statistical gradient descent optimizing empirical risk minimization ($\min \mathcal{L}(y, \hat{y})$). | Statistical token prediction optimizing cross-entropy loss over web text distributions. |
| **Causal Counterfactuals** | **True Mechanistic Causality**: Dynamically integrates $\frac{dQ_{gut}}{dt}$ and $\frac{dS}{dt}$; altering insulin or carbs shifts internal compartments. | **Feature Perturbation**: Modifying inputs changes statistical projection, but cannot account for unobserved physiological states. | **Plausible Textual Descriptions**: Generates text about physiology, but cannot compute numerical ODE trajectories. |
| **Personalization** | Physiological parameter identification ($k_{abs}, S_I, V_G, k_d$) via regularized Bayesian non-linear least squares. | Hyperparameter tuning and patient feature conditioning (e.g. baseline HbA1c, fasting insulin). | Prompt conditioning or system instructions; cannot compute numerical parameters. |
| **Output** | Continuous physical states: Carbs on Board (COB), Insulin on Board (IOB), Rate of Appearance ($Ra$), Glycemia ($G$). | Point forecast $\hat{G}(t + H)$ with empirical uncertainty intervals. | Unverified textual descriptions or code snippets. |

---

## 3. Dataset Architecture & Empirical Audit Findings

### 3.1 ReplayBG Dataset (Type 1 Diabetes)
- **Files:** `data_day_1.csv`, `data_day_2.csv`, `data_day_1_extended.csv`, `patient_info.csv`
- **Patient Profile:** Body Weight $bw = 100\text{ kg}$, Basal steady-state delivery $u_{2ss} = 0.24405$.
- **Audit Discovery:** 
  - `data_day_1.csv` spans `2027-05-11 06:00:00` to `2027-05-12 03:55:00` (264 records). Contains **31 consecutive missing glucose readings** at the start (155-minute sensor initialization), but preserves carbohydrate and bolus events.
  - `data_day_2.csv` spans `2027-05-12 04:00:00` to `2027-05-13 03:55:00` (288 records) with **100% complete glucose readings**.
  - `data_day_1_extended.csv` spans `2027-05-11 06:00:00` to `2027-05-13 03:55:00` (552 records).
  - **Empirical Relationship:** The time difference between Day 1 end (`03:55:00`) and Day 2 start (`04:00:00`) is **exactly 5.0 minutes**. `data_day_1_extended.csv` is the exact continuous concatenation ($552 = 264 + 288$). Treating these files as independent patients would be scientifically erroneous.

### 3.2 PhysioNet CGMacros v1.0.0 Dataset
- **Files:** `cgmacros_demo.csv`, `cgmacros_demo.metadata.json`
- **Source:** PhysioNet CGMacros v1.0.0 (DOI: [10.13026/3z8q-x658](https://doi.org/10.13026/3z8q-x658)), CC BY-NC-SA 4.0.
- **Cohort Structure:**
  - `001` (Healthy): 2,750 rows, age 27, BMI 22.3, HbA1c 5.4%, fasting glucose 91 mg/dL, mean CGM 102.5 mg/dL.
  - `008` (Prediabetes): 2,731 rows, age 54, BMI 39.9, HbA1c 5.8%, fasting glucose 112 mg/dL, mean CGM 114.7 mg/dL.
  - `003` (Type 2 Diabetes): 2,795 rows, age 59, BMI 26.9, HbA1c 6.5%, fasting glucose 118 mg/dL, mean CGM 126.8 mg/dL.
- **Target Alignment:** `target_30m` corresponds to future glucose at `target_timestamp` ($\Delta t = 30\text{ min}$, mean difference = 0.0000 mg/dL).

---

## 4. Mathematical & Physiological Equations

### 4.1 ReplayBG Gut Carbohydrate Absorption Submodel
Ingested carbohydrates ($CHO$, mg/min) enter a two-compartment gastrointestinal transit chain:
$$\frac{dQ_{gut1}(t)}{dt} = -k_{abs} Q_{gut1}(t) + CHO(t)$$
$$\frac{dQ_{gut2}(t)}{dt} = k_{abs} Q_{gut1}(t) - k_{abs} Q_{gut2}(t)$$
Rate of glucose appearance into the systemic circulation ($Ra$, mg/dL/min):
$$Ra(t) = \frac{f \cdot k_{abs} \cdot Q_{gut2}(t)}{bw \cdot V_G}$$
where $f = 0.85$ (bioavailability), $bw = 100\text{ kg}$, and $V_G = 1.75\text{ dL/kg}$.

### 4.2 Subcutaneous Insulin Kinetics & Active Compartment
Rapid-acting insulin infusion ($u(t) = u_{bolus} + u_{basal}$, mU/min) transits two subcutaneous state compartments:
$$\frac{dS_1(t)}{dt} = u(t) - k_d S_1(t)$$
$$\frac{dS_2(t)}{dt} = k_d S_1(t) - k_d S_2(t)$$
Plasma insulin appearance ($I_{plasma}$, mU/L):
$$\frac{dI(t)}{dt} = \frac{k_d \cdot S_2(t)}{V_I \cdot bw} - k_e I(t)$$
Active insulin action compartment ($X(t)$, $\text{min}^{-1}$), suppressing hepatic production and promoting peripheral uptake:
$$\frac{dX(t)}{dt} = -p_2 X(t) + S_I \cdot p_2 \max(0, I(t) - I_b)$$

### 4.3 Blood Glucose Dynamics ODE
$$\frac{dG(t)}{dt} = - (S_G + X(t)) G(t) + S_G G_b + Ra(t)$$
where $S_G$ is glucose effectiveness at zero insulin, and $G_b$ is the basal equilibrium target glucose.

### 4.4 Trapezoidal Glycemic Area Under the Curve (AUC)
Total glycemic exposure over a simulation duration $T$ is computed via numerical trapezoidal quadrature:
$$AUC = \int_{0}^{T} G(t) dt \approx \sum_{k=1}^{N-1} \frac{G(t_k) + G(t_{k+1})}{2} \Delta t$$

---

## 5. Machine Learning & Deep Learning Architectures

The platform implements 11 supervised regression architectures evaluated under strict chronological temporal embargo:

| Architecture | Model Family | MAE (mg/dL) | RMSE (mg/dL) | $R^2$ Score | Clarke Zone A (%) | Clinical Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **SVR** | Support Vector Regressor (Linear) | **9.50** | **14.21** | **0.580** | **93.5%** | ★ **Top Performer** |
| **Ridge** | L2 Regularized Linear Model | **10.52** | **13.83** | **0.602** | **90.1%** | Outstanding Linear Fit |
| **Linear** | Ordinary Least Squares | 10.55 | 13.85 | 0.601 | 90.1% | Robust Baseline |
| **XGBoost** | Gradient Boosted Trees | 10.59 | 15.34 | 0.511 | 87.0% | Top Tree Ensemble |
| **LightGBM** | Leaf-Wise Boosted Trees | 10.60 | 15.47 | 0.503 | 88.1% | Ultra-Fast Tree Model |
| **GBR** | Gradient Boosting Regressor | 10.65 | 15.53 | 0.499 | 87.4% | Smooth Gradient Descent |
| **MLP** | PyTorch Deep Feedforward | 14.74 | 22.39 | -0.042 | 77.2% | Non-Linear Deep Net |
| **LSTM** | PyTorch Recurrent (LSTM) | 14.24 | 19.82 | 0.183 | 79.9% | Sequential Memory |
| **GRU** | PyTorch Recurrent (GRU) | 13.03 | 18.01 | 0.326 | 78.8% | Gated Recurrent Net |
| **Random Forest** | Bagging Ensemble | 13.47 | 21.82 | 0.011 | 79.7% | Robust Outlier Rejection |
| **1D-CNN** | PyTorch Temporal Convolutional | 16.67 | 25.04 | -0.303 | 72.2% | Multi-Scale Receptive Fields |

---

## 6. Project Architecture

```
GLUCOSE_TWIN/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py         # REST API routes (Dataset, Model, Replay, Simulation, Explain)
│   │   ├── core/
│   │   │   └── config.py            # Settings, paths, environment configuration
│   │   ├── data/
│   │   │   └── loader.py            # Dataset repository, file loading & quality inspection
│   │   ├── digital_twin/
│   │   │   └── replaybg_model.py    # ReplayBG ODE system, RK4 solver & Bayesian personalization
│   │   ├── evaluation/
│   │   │   └── metrics.py           # MAE, RMSE, R2, MARD, Clarke Error Grid, Parkes Grid
│   │   ├── explainability/
│   │   │   └── explainer.py         # Tree SHAP, Linear SHAP, Waterfall decomposition
│   │   ├── models/
│   │   │   └── model_registry.py    # 11 ML/DL algorithms with unified wrapper
│   │   ├── preprocessing/
│   │   │   ├── cgmacros_preprocessor.py  # Embargo splits, scaling, no-leakage features
│   │   │   └── t1d_preprocessor.py       # IOB/COB tracking, multi-step targets
│   │   ├── schemas/
│   │   │   └── schemas.py           # Pydantic request/response models
│   │   ├── simulation/
│   │   │   └── engine.py            # What-if counterfactual scenario engine & metrics
│   │   └── main.py                  # FastAPI entry point & static frontend mounting
│   ├── tests/
│   │   └── test_pipeline.py         # Pytest test suite (10 comprehensive tests)
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClarkeErrorGrid.tsx  # Interactive Clarke Error Grid chart
│   │   │   ├── DigitalTwin3D.tsx    # Three.js 3D avatar & metabolic glow visualization
│   │   │   ├── Navbar.tsx           # Platform header & safety badges
│   │   │   └── Sidebar.tsx          # 8-page navigation sidebar
│   │   ├── pages/
│   │   │   ├── HomePage.tsx               # Overview & research tracks
│   │   │   ├── DatasetExplorerPage.tsx   # Data audit, missingness & table preview
│   │   │   ├── DigitalTwinPage.tsx       # 3D Twin, ODE replay & personalized parameters
│   │   │   ├── PredictionLabPage.tsx     # Trajectory forecasts with 95% confidence bands
│   │   │   ├── ExplainabilityLabPage.tsx # SHAP importance & local waterfall
│   │   │   ├── SimulationLabPage.tsx     # What-if scenario parameters & delta charts
│   │   │   ├── ModelComparisonPage.tsx   # Benchmark table & Clarke Error Grid
│   │   │   └── ResearchInsightsPage.tsx  # Phenotype comparisons & citations
│   │   ├── services/
│   │   │   └── api.ts               # Typed API client
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript data contracts
│   │   ├── App.tsx                  # App layout
│   │   └── main.tsx                 # React entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data_day_1.csv                   # ReplayBG Day 1
├── data_day_1_extended.csv          # ReplayBG Day 1 Extended (Contiguous 46h)
├── data_day_2.csv                   # ReplayBG Day 2
├── patient_info.csv                 # Patient physiological constants (bw, u2ss)
├── cgmacros_demo.csv                # PhysioNet CGMacros demo subset
├── cgmacros_demo.metadata.json      # CGMacros metadata
├── run.sh                           # Single-command startup script
└── README.md
```

---

## 7. Local Setup & Execution Guide (macOS)

### Prerequisites
- macOS 12+ (Apple Silicon or Intel)
- Python 3.11+
- Node.js v18+ and npm

### Quick Start (Single Command)
From the root workspace directory, run:
```bash
./run.sh
```
This script will:
1. Initialize the Python virtual environment in `.venv/` if not present.
2. Install all required Python packages.
3. Start the unified FastAPI backend on `http://127.0.0.1:8000`.
4. Serve both the interactive React web application and OpenAPI docs.

Open your browser to:
- **Interactive Web Dashboard:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Manual Step-by-Step Setup

#### 1. Backend Setup
```bash
# Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# Run pytest verification suite
export PYTHONPATH=backend
pytest backend/tests/test_pipeline.py -v

# Start FastAPI server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Development Server (Optional)
If you wish to run the Vite hot-reloading development server:
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server will run on `http://localhost:3000` with automated API proxying to `http://127.0.0.1:8000`.

---

## 8. Navigating the 8 Platform Pages

1. **Home / Overview (`/`)**: High-level platform telemetry, research track selection, dataset highlights, and scientific methodology statement.
2. **Dataset Explorer**: In-depth quality audits of all 6 files, sampling intervals, missing value analysis, Time in Range (TIR) distributions, and 25-row tabular previews.
3. **Digital Twin 3D**: Real-time holographic Three.js patient model with glycemic status glow, active Carbs on Board (COB), Insulin on Board (IOB), steady-state basal rate, Bayesian estimated parameter table with 95% credible intervals, and 12-hour continuous ODE replay.
4. **Prediction Lab**: 30-minute out-of-sample glucose trajectory forecasting with shaded 95% empirical confidence intervals, error annotations, and adjustable time scrubbers (1h to 6h).
5. **Explainability Lab**: Tree SHAP global feature importances, feature correlation matrix, interactive prediction point slider, and local waterfall attribution charts with dynamically assembled natural-language explanations.
6. **Simulation Lab**: Interactive what-if scenario engine. Adjust meal carbs (-50% to +100%), meal shift timing, bolus doses, bolus delay, and basal infusion rates. Visualizes baseline vs. simulated trajectories, point-by-point difference curves ($\Delta G(t)$), peak shifts, trapezoidal AUC change, and saves scenarios for side-by-side comparison.
7. **Model Comparison**: Standardized benchmark table across all 11 models reporting MAE, RMSE, $R^2$, MARD, training latency, inference latency, Clarke Zone A %, and interactive Clarke Error Grid scatter plots.
8. **Research Insights**: Automatically generated scientific findings comparing Healthy, Prediabetes, Type 2, and Type 1 diabetes dynamics, model inductive bias takeaways, and scientific literature citations.

---

## 9. Scientific Limitations & Ethical Disclaimers

1. **Academic Demonstration Only**: This software is not an FDA-cleared or CE-marked medical device. It must **not** be used for clinical treatment decisions, diagnosis, or insulin dose titration.
2. **Exploratory Cohort Sizes**: The PhysioNet CGMacros demo subset contains one participant per diagnosis group (`001`, `008`, `003`). While each participant possesses thousands of time-series observations, results demonstrate individual glycemic dynamics and must not be interpreted as generalized population-level clinical evidence.
3. **Single Patient T1D Data**: The ReplayBG data represents a single patient recorded over 46 continuous hours. Parameter estimates ($k_{abs}, S_I, V_G$) describe this specific individual.
4. **Correlation vs. Causation**: Feature attributions (SHAP) describe mathematical associations learned by regression algorithms to minimize prediction loss. Only the physiological ODE model (Track 1) represents causal compartmental mechanisms.
