import React, { useState, useEffect } from 'react';
import { fetchGlobalExplanation, fetchLocalExplanation } from '../services/api';
import { GlobalExplainabilityResponse, LocalExplainabilityResponse } from '../types';
import {
  BrainCircuit,
  Sliders,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

const FRIENDLY_NAMES: Record<string, string> = {
  glucose_mg_dl: 'Current Blood Sugar',
  glucose_lag_5m: 'Blood Sugar (5m ago)',
  glucose_lag_15m: 'Blood Sugar (15m ago)',
  glucose_lag_30m: 'Blood Sugar (30m ago)',
  glucose_delta_5m: '5-min Sugar Trend',
  glucose_delta_15m: '15-min Trend Velocity',
  velocity_5m: 'Instant Sugar Speed',
  roll_mean_15m: 'Recent Average Sugar',
  roll_std_30m: 'Sugar Volatility',
  momentum_30m: 'Projected Momentum',
  carbs_last_120m: 'Carbs Eaten (Last 2h)',
  protein_last_120m: 'Protein Eaten (Last 2h)',
  fat_last_120m: 'Dietary Fat Intake',
  fiber_last_120m: 'Dietary Fiber',
  heart_rate: 'Heart Rate (BPM)',
  mets: 'Physical Activity',
  activity_calories: 'Calories Burned',
  age: 'Patient Age',
  bmi: 'Body Mass Index (BMI)',
  hba1c: '3-Month Avg (HbA1c)',
  fasting_glucose: 'Fasting Blood Sugar',
  fasting_insulin: 'Fasting Insulin',
  sin_time: 'Time of Day',
  cos_time: 'Circadian Rhythm',
  cho: 'Carbohydrates',
  cob: 'Digesting Food (COB)',
  bolus: 'Meal Insulin Dose',
  iob: 'Active Insulin (IOB)',
  basal: 'Background Insulin'
};

export const ExplainabilityLabPage: React.FC = () => {
  const [modelType, setModelType] = useState<string>('xgboost');
  const [diagnosisGroup, setDiagnosisGroup] = useState<string>('all');
  const [pointIndex, setPointIndex] = useState<number>(15);

  const [globalExp, setGlobalExp] = useState<GlobalExplainabilityResponse | null>(null);
  const [localExp, setLocalExp] = useState<LocalExplainabilityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGlobal() {
      try {
        setLoading(true);
        const data = await fetchGlobalExplanation({
          dataset_id: 'cgmacros',
          diagnosis_group: diagnosisGroup,
          model_type: modelType
        });
        setGlobalExp(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadGlobal();
  }, [modelType, diagnosisGroup]);

  useEffect(() => {
    async function loadLocal() {
      try {
        setLocalLoading(true);
        const data = await fetchLocalExplanation({
          dataset_id: 'cgmacros',
          diagnosis_group: diagnosisGroup,
          model_type: modelType,
          point_index: pointIndex
        });
        setLocalExp(data);
      } catch (err: any) {
        // silent fallback
      } finally {
        setLocalLoading(false);
      }
    }
    loadLocal();
  }, [modelType, diagnosisGroup, pointIndex]);

  // Format global importance for horizontal bar chart
  const globalChartData = globalExp?.feature_importances.slice(0, 10).map((f) => ({
    name: f.feature,
    friendly_name: FRIENDLY_NAMES[f.feature] || f.feature.replace(/_/g, ' '),
    importance: Math.round(f.importance * 1000) / 10,
    normalized: f.normalized_importance
  })) || [];

  // Format local waterfall data
  const localChartData = localExp?.attributions.slice(0, 8).map((a) => ({
    name: a.feature,
    friendly_name: a.friendly_name || FRIENDLY_NAMES[a.feature] || a.feature.replace(/_/g, ' '),
    attribution: a.attribution,
    direction: a.direction,
    friendly_effect: a.friendly_effect,
    value: a.value
  })) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            <span>Explainable AI & Feature Attribution Lab</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Understand why models make each forecast • Game-theoretic SHAP attributions translated into plain English.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={diagnosisGroup}
            onChange={(e) => setDiagnosisGroup(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
          >
            <option value="all">Cohort: All Groups</option>
            <option value="healthy">Cohort: Healthy</option>
            <option value="prediabetes">Cohort: Prediabetes</option>
            <option value="type2_diabetes">Cohort: Type 2 Diabetes</option>
          </select>

          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
          >
            <option value="xgboost">XGBoost Regressor</option>
            <option value="lightgbm">LightGBM Regressor</option>
            <option value="gbr">Gradient Boosting</option>
            <option value="random_forest">Random Forest</option>
            <option value="ridge">Ridge Regression</option>
            <option value="linear">Linear Regression</option>
          </select>
        </div>
      </div>

      {/* PLAIN ENGLISH EXPLANATION CARD (For Everyday Humans) */}
      {localExp && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Plain English Explanation (For Everyday Users)
                </span>
                <h3 className="text-sm font-bold text-white">Why did the model predict this blood sugar?</h3>
              </div>
            </div>

            {localExp.clinical_risk_level && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                {localExp.clinical_risk_level}
              </span>
            )}
          </div>

          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {localExp.plain_english_summary || localExp.explanation_paragraph}
          </p>

          {localExp.practical_action_tip && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-300 font-medium">
              💡 {localExp.practical_action_tip}
            </div>
          )}
        </div>
      )}

      {/* Local Prediction Waterfall Attribution */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Factor-by-Factor Breakdown (SHAP Waterfall)</span>
            </h3>
            <p className="text-xs text-slate-400">
              See exactly how much each individual factor pushes blood sugar up or pulls it down.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Sample Timepoint:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pointIndex}
              onChange={(e) => setPointIndex(Number(e.target.value))}
              className="w-28 accent-cyan-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyan-400 w-8 text-center">#{pointIndex}</span>
          </div>
        </div>

        {localExp && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Timestamp</span>
              <span className="font-mono text-slate-200 mt-1 block truncate">{localExp.timestamp || 'N/A'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Baseline Normal</span>
              <span className="text-base font-bold text-slate-300 mt-1 block">{localExp.baseline_value} mg/dL</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 block uppercase">Predicted Sugar</span>
              <span className="text-base font-bold text-cyan-300 mt-1 block">{localExp.predicted_glucose} mg/dL</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 block uppercase">Actual Observed</span>
              <span className="text-base font-bold text-emerald-300 mt-1 block">{localExp.actual_glucose ?? 'N/A'} mg/dL</span>
            </div>
          </div>
        )}

        {/* Local Waterfall Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={localChartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={10} unit=" mg/dL" />
              <YAxis
                type="category"
                dataKey="friendly_name"
                width={140}
                stroke="#94a3b8"
                fontSize={11}
                tick={{ fill: '#cbd5e1' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-white">{d.friendly_name}</p>
                        <p className="text-slate-300">Measured Value: <strong>{d.value}</strong></p>
                        <p className={d.attribution >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          Effect on Sugar: {d.attribution > 0 ? `+${d.attribution}` : d.attribution} mg/dL
                        </p>
                        {d.friendly_effect && (
                          <p className="text-slate-400 text-[10px]">{d.friendly_effect}</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="attribution">
                {localChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.attribution >= 0 ? '#f43f5e' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Local Waterfall Legend */}
        <div className="flex items-center space-x-6 text-xs pt-2 border-t border-slate-800">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
            <span className="text-slate-300">Pushes Blood Sugar Higher</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
            <span className="text-slate-300">Helps Keep Blood Sugar Down</span>
          </span>
        </div>
      </div>

      {/* Global Feature Importance Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Overall Most Influential Factors ({globalExp?.method || 'Attribution'})</span>
          </h3>
          <p className="text-xs text-slate-400">
            Average importance across all observations showing which factors matter most for glucose forecasting.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={globalChartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={10} unit="%" />
              <YAxis
                type="category"
                dataKey="friendly_name"
                width={140}
                stroke="#94a3b8"
                fontSize={11}
                tick={{ fill: '#cbd5e1' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                        <p className="font-bold text-white">{d.friendly_name}</p>
                        <p className="text-purple-400 font-bold">Relative Influence: {d.importance}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="importance" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {globalExp && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs text-slate-400">
            <span className="font-bold text-purple-400 uppercase tracking-wider text-[10px] block">
              Methodological Interpretation
            </span>
            <p className="leading-relaxed">{globalExp.research_interpretation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
