import React, { useState, useEffect } from 'react';
import { fetchDigitalTwinState } from '../services/api';
import { DigitalTwinStateResponse } from '../types';
import { DigitalTwin3D } from '../components/DigitalTwin3D';
import {
  Cpu,
  Activity,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea
} from 'recharts';

export const DigitalTwinPage: React.FC = () => {
  const [twinState, setTwinState] = useState<DigitalTwinStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchDigitalTwinState();
        setTwinState(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Synchronizing physiological ODE digital twin...</p>
      </div>
    );
  }

  if (error || !twinState) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        <p className="font-bold">Error loading digital twin state:</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const chartData = twinState.trajectory_replay.map((pt, idx) => ({
    timestamp: pt.timestamp.split(' ')[1] || pt.timestamp,
    actual: pt.actual_glucose,
    predicted: pt.predicted_glucose,
    lower: pt.lower_bound,
    upper: pt.upper_bound,
    meal: pt.cho_event,
    bolus: pt.bolus_event,
    id: idx
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span>Type 1 Diabetes Physiological Digital Twin</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ReplayBG Framework (Cappon et al., IEEE TBME 2023) • Gut Transit, Subcutaneous Insulin Kinetics & ODE Personalization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-semibold">
            Patient: {twinState.patient_id} ({twinState.weight_kg} kg)
          </span>
        </div>
      </div>

      {/* VIRTUAL BODY CLONE EXPLANATION (For Normal Humans) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              🧬 Virtual Body Replica (In Silico Flight Simulator)
            </span>
            <h2 className="text-base font-bold text-white">What is a Diabetes Digital Twin?</h2>
          </div>
          {/* Live Metabolic Tug of War Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Live Tug-of-War:</span>
            {twinState.glucose_trend_mg_dl_per_5m > 0.5 ? (
              <span className="text-orange-400 font-bold">🍔 Carbs Dominant (Sugar Rising)</span>
            ) : twinState.glucose_trend_mg_dl_per_5m < -0.5 ? (
              <span className="text-cyan-400 font-bold">💉 Insulin Dominant (Sugar Dropping)</span>
            ) : (
              <span className="text-emerald-400 font-bold">⚖️ Metabolic Equilibrium (Stable)</span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Unlike a generic machine-learning guess, a <strong>Digital Twin</strong> is a personalized biological clone of this patient’s individual metabolism. It runs continuous differential equations (ODEs) modeling four interconnected physiological systems:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-orange-400 font-bold block mb-1">🫁 1. Stomach & Gut</span>
            <span className="text-slate-300 text-[11px] block">
              Digests food into <strong>Carbs on Board ({twinState.carbs_on_board_g}g)</strong>, releasing glucose into the blood.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-cyan-400 font-bold block mb-1">💉 2. Under the Skin</span>
            <span className="text-slate-300 text-[11px] block">
              Injected insulin forms a subcutaneous depot, diffusing into <strong>Insulin on Board ({twinState.insulin_on_board_u} U)</strong>.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-purple-400 font-bold block mb-1">⚖️ 3. The Metabolic Balance</span>
            <span className="text-slate-300 text-[11px] block">
              A continuous tug-of-war: Insulin pushes glucose into muscles, while meals push sugar up.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">🩸 4. Circulating Blood</span>
            <span className="text-slate-300 text-[11px] block">
              Real-time glucose concentration: <strong>{twinState.current_glucose} mg/dL</strong> (Speed: {twinState.glucose_trend_mg_dl_per_5m} mg/dL/5m).
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Visualization + Dynamic State Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Holographic Twin (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <DigitalTwin3D
            currentGlucose={twinState.current_glucose}
            glucoseTrend={twinState.glucose_trend_mg_dl_per_5m}
            cob={twinState.carbs_on_board_g}
            iob={twinState.insulin_on_board_u}
            basalRate={twinState.current_basal_rate_u_hr}
          />
        </div>

        {/* Real-time Physiological State & Summary (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Glucose</span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-black text-white">{twinState.current_glucose}</span>
                <span className="text-xs text-slate-400">mg/dL</span>
              </div>
              <span className="text-xs font-mono text-cyan-400 mt-1 block">
                {twinState.trend_arrow} {twinState.glucose_trend_mg_dl_per_5m > 0 ? `+${twinState.glucose_trend_mg_dl_per_5m}` : twinState.glucose_trend_mg_dl_per_5m} / 5m
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-orange-500/20">
              <span className="text-[10px] uppercase font-bold text-orange-400 block">Carbs on Board</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-orange-300">{twinState.carbs_on_board_g}</span>
                <span className="text-xs text-slate-400">g</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Gut absorption decay</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">Insulin on Board</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-cyan-300">{twinState.insulin_on_board_u}</span>
                <span className="text-xs text-slate-400">U</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Subcutaneous S1/S2</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/20">
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Basal Infusion</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-purple-300">{twinState.current_basal_rate_u_hr}</span>
                <span className="text-xs text-slate-400">U/h</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">u2ss steady state</span>
            </div>
          </div>

          {/* Natural Language State Description */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Activity className="w-4 h-4" />
              <span>Digital Twin Dynamic Assessment</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {twinState.state_description}
            </p>
          </div>

          {/* Research Caveat */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2 text-[11px] text-amber-200">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <span>{twinState.limitations_warning}</span>
          </div>
        </div>
      </div>

      {/* Trajectory Replay Graph */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>Physiological Replay & ODE Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400">
              Continuous forward ODE simulation synchronized with real clinical CGM observations (5-minute resolution).
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <span className="w-3.5 h-1 bg-emerald-400 rounded-full inline-block"></span>
              <span>🟢 Real Sensor CGM</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-semibold">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-white inline-block"></span>
              <span>⚪ ODE Twin Replay</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickCount={8} />
              <YAxis domain={[40, 360]} stroke="#64748b" fontSize={10} unit=" mg/dL" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                        <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                        {d.actual !== null && (
                          <p className="text-emerald-400 font-semibold">🟢 Observed CGM: {d.actual} mg/dL</p>
                        )}
                        <p className="text-white font-semibold">⚪ Replay ODE: {d.predicted} mg/dL</p>
                        {d.meal && <p className="text-orange-400 font-semibold">Meal Event: {d.meal} g CHO</p>}
                        {d.bolus && <p className="text-cyan-300 font-semibold">Bolus Event: {d.bolus} U</p>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Target range background */}
              <ReferenceArea y1={70} y2={180} fill="#10b981" fillOpacity={0.06} />
              {/* Hyperglycemia reference line */}
              <ReferenceArea y1={180} y2={360} fill="#f59e0b" fillOpacity={0.04} />

              {/* Observed CGM Line (Solid Emerald Green) */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Observed CGM"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              {/* Model ODE Replay Line (Distinct Dashed White) */}
              <Line
                type="monotone"
                dataKey="predicted"
                name="ODE Replay"
                stroke="#f8fafc"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Identified Physiological Parameters Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Personalized Biological Parameters (The Patient's Metabolic DNA)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified via Bayesian Regularized Non-linear Least Squares (Scipy TRF) specifically for Patient 1.
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Bayesian Fitted
          </span>
        </div>

        {/* Plain English Translation of Key Dials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div>
            <span className="font-bold text-cyan-400 block">S_I (Insulin Sensitivity)</span>
            <span className="text-slate-400">Power of 1 unit of insulin to clear blood glucose.</span>
          </div>
          <div>
            <span className="font-bold text-orange-400 block">k_abs (Digestion Speed)</span>
            <span className="text-slate-400">How rapidly the stomach empties meal carbs into blood.</span>
          </div>
          <div>
            <span className="font-bold text-purple-400 block">V_G (Fluid Volume)</span>
            <span className="text-slate-400">Total liquid space in body where sugar circulates.</span>
          </div>
          <div>
            <span className="font-bold text-emerald-400 block">G_b (Basal Setpoint)</span>
            <span className="text-slate-400">Natural fasting equilibrium blood sugar level.</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Parameter</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Symbol</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Estimated Value</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Nominal Prior</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Unit</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">95% Credible Interval</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Physiological Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {twinState.estimated_parameters.map((p) => (
                <tr key={p.symbol} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-cyan-400 font-semibold">{p.symbol}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{p.estimated_value}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{p.nominal_value}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{p.unit}</td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-[11px]">
                    [{p.confidence_interval[0]}, {p.confidence_interval[1]}]
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px] max-w-xs">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
