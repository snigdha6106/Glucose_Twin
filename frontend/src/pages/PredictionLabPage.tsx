import React, { useState, useEffect } from 'react';
import { fetchPredictionTrajectory, trainModel } from '../services/api';
import { TrajectoryResponse } from '../types';
import {
  TrendingUp,
  Activity,
  Sliders,
  AlertCircle,
  Clock,
  Sparkles,
  BarChart2,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea
} from 'recharts';

export const PredictionLabPage: React.FC = () => {
  const [datasetId, setDatasetId] = useState<string>('cgmacros');
  const [diagnosisGroup, setDiagnosisGroup] = useState<string>('all');
  const [modelType, setModelType] = useState<string>('xgboost');
  const [windowPoints, setWindowPoints] = useState<number>(120);
  const [showUncertainty, setShowUncertainty] = useState<boolean>(true);

  const [trajectoryData, setTrajectoryData] = useState<TrajectoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const modelsList = [
    { id: 'xgboost', name: 'XGBoost Regressor' },
    { id: 'lightgbm', name: 'LightGBM Regressor' },
    { id: 'random_forest', name: 'Random Forest' },
    { id: 'gbr', name: 'Gradient Boosting' },
    { id: 'ridge', name: 'Ridge Regression' },
    { id: 'linear', name: 'Linear Regression' },
    { id: 'svr', name: 'Support Vector Regressor' },
    { id: 'mlp', name: 'PyTorch Deep MLP' },
    { id: 'lstm', name: 'PyTorch LSTM Network' },
    { id: 'gru', name: 'PyTorch GRU Network' },
    { id: 'cnn1d', name: 'PyTorch 1D-CNN' },
  ];

  const cohorts = [
    { id: 'all', label: 'All Cohorts (Pooled)' },
    { id: 'healthy', label: 'Healthy (Participant 001)' },
    { id: 'prediabetes', label: 'Prediabetes (008)' },
    { id: 'type2_diabetes', label: 'Type 2 Diabetes (003)' }
  ];

  const loadTrajectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPredictionTrajectory({
        dataset_id: datasetId,
        diagnosis_group: diagnosisGroup,
        model_type: modelType,
        window_points: windowPoints
      });
      setTrajectoryData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trajectory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrajectory();
  }, [datasetId, diagnosisGroup, modelType, windowPoints]);

  const chartPoints = trajectoryData?.trajectory.map((pt, idx) => ({
    timestamp: pt.timestamp.includes('T') ? pt.timestamp.split('T')[1].slice(0, 5) : (pt.timestamp.split(' ')[1] || pt.timestamp),
    actual: pt.actual_glucose,
    predicted: pt.predicted_glucose,
    lower: pt.lower_bound,
    upper: pt.upper_bound,
    error: pt.error,
    id: idx
  })) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <span>Glucose Trajectory Prediction Lab</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate out-of-sample continuous glucose trajectories with 95% empirical uncertainty confidence bands.
          </p>
        </div>

        {/* Prediction Horizon Badge */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold">
            Forecast Horizon: +30 minutes
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Dataset / Track</label>
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="cgmacros">PhysioNet CGMacros (T2D / Multi-Phenotype)</option>
            <option value="day_1_extended">ReplayBG Extended (Type 1 Diabetes)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Diagnosis Cohort</label>
          <select
            value={diagnosisGroup}
            onChange={(e) => setDiagnosisGroup(e.target.value)}
            disabled={datasetId !== 'cgmacros'}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Predictive Model</label>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {modelsList.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1">Time Window Scrubber</label>
          <select
            value={windowPoints}
            onChange={(e) => setWindowPoints(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value={60}>60 minutes (1 hour)</option>
            <option value={120}>120 minutes (2 hours)</option>
            <option value={240}>240 minutes (4 hours)</option>
            <option value={360}>360 minutes (6 hours)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trajectory Chart Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>Real Blood Sugar vs. AI 30-Minute Forecast</span>
            </h3>
            <p className="text-xs text-slate-400">
              Comparing what the body actually did against what the AI anticipated 30 minutes in advance.
            </p>
          </div>

          {trajectoryData && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Average Error: <strong className="text-emerald-400 font-mono font-bold">{trajectoryData.metrics_on_window.mae} mg/dL</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                Spread (RMSE): <strong className="text-purple-400 font-mono">{trajectoryData.metrics_on_window.rmse} mg/dL</strong>
              </span>
            </div>
          )}
        </div>

        {/* PROMINENT VISUAL KEY GUIDE (Plain English for Normal Humans) */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Real Glucose */}
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="w-3.5 h-1 bg-emerald-400 rounded-full inline-block"></span>
              <span className="text-emerald-300 font-bold">🟢 Real Blood Sugar (Sensor Measured)</span>
            </div>

            {/* AI Forecast */}
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <span className="w-3.5 h-1 bg-purple-400 rounded-full inline-block"></span>
              <span className="text-purple-300 font-bold">🟣 AI Forecast (+30 Mins in Advance)</span>
            </div>

            {/* Confidence Band Toggle */}
            <button
              onClick={() => setShowUncertainty(!showUncertainty)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                showUncertainty
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {showUncertainty ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showUncertainty ? '🔵 95% AI Safety Zone (Dotted Bounds): ON' : 'Safety Zone Bounds: OFF'}</span>
            </button>
          </div>

          {/* Safe Target Zone Pill */}
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block"></span>
            <span>Healthy Target: <strong className="text-slate-200">70–180 mg/dL</strong></span>
          </div>
        </div>

        {/* Recharts Trajectory Plot */}
        <div className="h-80 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading continuous trajectory...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickCount={10} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} unit=" mg/dL" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">Clock Time: {label}</p>
                          {d.actual !== null && (
                            <p className="text-emerald-400 font-semibold flex items-center justify-between space-x-4">
                              <span>🟢 Real Sensor Reading:</span>
                              <strong>{d.actual} mg/dL</strong>
                            </p>
                          )}
                          <p className="text-purple-400 font-semibold flex items-center justify-between space-x-4">
                            <span>🟣 AI Forecast (+30m):</span>
                            <strong>{d.predicted} mg/dL</strong>
                          </p>
                          {d.error !== null && (
                            <p className="text-slate-400 text-[11px] flex items-center justify-between space-x-4">
                              <span>Difference (Error):</span>
                              <span className="font-mono">{d.error} mg/dL</span>
                            </p>
                          )}
                          {showUncertainty && (
                            <p className="text-sky-400/80 text-[10px] pt-1 border-t border-slate-800">
                              95% AI Safety Zone: [{d.lower}, {d.upper}] mg/dL
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Target healthy range background (70 - 180 mg/dL) */}
                <ReferenceArea y1={70} y2={180} fill="#10b981" fillOpacity={0.06} />

                {/* 95% Confidence Interval Dotted Lines (Only shown when toggled ON) */}
                {showUncertainty && (
                  <Line
                    type="monotone"
                    dataKey="upper"
                    name="95% Upper Limit"
                    stroke="#38bdf8"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                    dot={false}
                  />
                )}
                {showUncertainty && (
                  <Line
                    type="monotone"
                    dataKey="lower"
                    name="95% Lower Limit"
                    stroke="#38bdf8"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                    dot={false}
                  />
                )}

                {/* 🟢 Real Observed Glucose Line (Solid Emerald Green, strokeWidth 3) */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Real Blood Sugar"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                />

                {/* 🟣 AI Predicted Glucose Line (Solid Bold Purple, strokeWidth 3) */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="AI Prediction (+30m)"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PLAIN ENGLISH GUIDE (For Everyday Humans) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>How to Read This Chart Without a Medical Degree</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-emerald-400">The Green Line</strong> shows where the person's blood sugar actually was, continuously measured by the wearable sensor under their skin.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-purple-400">The Purple Line</strong> shows what our AI model forecasted 30 minutes before it happened. The closer purple stays to green, the more accurate the prediction!
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-sky-400">The Blue Dotted Lines</strong> show the AI's safety buffer zone (95% statistical confidence). You can turn them on or off using the toggle above.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>What Blood Sugar Numbers Mean</span>
            </h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-emerald-400">70 to 180 mg/dL:</strong> The healthy safe zone (shaded green box). The body is functioning well here.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-amber-400">Above 180 mg/dL:</strong> High sugar (Hyperglycemia). Often follows a large carbohydrate meal.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong className="text-rose-400">Below 70 mg/dL:</strong> Low sugar (Hypoglycemia). High risk of shakiness or dizziness; requires immediate fast-acting carbohydrates.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Research Explanation */}
      {trajectoryData && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Research Explanation of Trajectory</span>
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {trajectoryData.explanation_paragraph}
          </p>
        </div>
      )}
    </div>
  );
};
