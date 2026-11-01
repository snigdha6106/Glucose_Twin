import React, { useState, useEffect } from 'react';
import { runSimulationScenario, fetchSavedScenarios } from '../services/api';
import { SimulationResponse, WhatIfModification } from '../types';
import {
  Sliders,
  Play,
  RotateCcw,
  TrendingUp,
  Activity,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info
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
  ReferenceArea,
  ReferenceLine
} from 'recharts';

export const SimulationLabPage: React.FC = () => {
  const [scenarioName, setScenarioName] = useState<string>('Custom Counterfactual');
  const [carbsFactor, setCarbsFactor] = useState<number>(1.0);
  const [mealShiftMin, setMealShiftMin] = useState<number>(0);
  const [bolusFactor, setBolusFactor] = useState<number>(1.0);
  const [bolusDelayMin, setBolusDelayMin] = useState<number>(0);
  const [basalFactor, setBasalFactor] = useState<number>(1.0);
  const [durationHours, setDurationHours] = useState<number>(12);

  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SimulationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 8 Real-World Preset Scenarios
  const presets = [
    {
      name: 'Baseline: Normal Routine',
      carbs: 1.0,
      shift: 0,
      bolus: 1.0,
      delay: 0,
      basal: 1.0,
      tag: 'Normal'
    },
    {
      name: 'Scenario 1: Large Pizza (+50% Carbs)',
      carbs: 1.5,
      shift: 0,
      bolus: 1.0,
      delay: 0,
      basal: 1.0,
      tag: 'High Spike'
    },
    {
      name: 'Scenario 2: Delayed Bolus (+30 min post-meal)',
      carbs: 1.0,
      shift: 0,
      bolus: 1.0,
      delay: 30,
      basal: 1.0,
      tag: 'Lagging Peak'
    },
    {
      name: 'Scenario 3: Pre-Bolus Strategy (-15 min before meal)',
      carbs: 1.0,
      shift: 15, // meal shifted 15m later relative to bolus
      bolus: 1.0,
      delay: 0,
      basal: 1.0,
      tag: 'Optimal Blunting'
    },
    {
      name: 'Scenario 4: Under-Bolus / Skipped Dose (-40%)',
      carbs: 1.0,
      shift: 0,
      bolus: 0.6,
      delay: 0,
      basal: 1.0,
      tag: 'Prolonged High'
    },
    {
      name: 'Scenario 5: Over-Correction (+40% Bolus - Low Risk)',
      carbs: 1.0,
      shift: 0,
      bolus: 1.4,
      delay: 0,
      basal: 1.0,
      tag: 'Hypo Risk'
    },
    {
      name: 'Scenario 6: Low-Carb Meal Substitution (-50% Carbs)',
      carbs: 0.5,
      shift: 0,
      bolus: 0.6,
      delay: 0,
      basal: 1.0,
      tag: 'Stable Plateau'
    },
    {
      name: 'Scenario 7: Sick Day / High Basal (+40% Basal)',
      carbs: 1.0,
      shift: 0,
      bolus: 1.0,
      delay: 0,
      basal: 1.4,
      tag: 'Basal Shift'
    }
  ];

  const executeSimulationWithParams = async (
    name = scenarioName,
    carbs = carbsFactor,
    shift = mealShiftMin,
    bolus = bolusFactor,
    delay = bolusDelayMin,
    basal = basalFactor,
    dur = durationHours
  ) => {
    try {
      setLoading(true);
      setError(null);
      const mod: WhatIfModification = {
        meal_carbs_factor: carbs,
        meal_shift_minutes: shift,
        bolus_factor: bolus,
        bolus_delay_minutes: delay,
        basal_factor: basal
      };
      const res = await runSimulationScenario({
        scenario_name: name,
        duration_hours: dur,
        modifications: mod
      });
      setSimResult(res);
      const saved = await fetchSavedScenarios();
      setSavedScenarios(saved);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSimulationWithParams();
  }, []);

  const applyPreset = (p: typeof presets[0]) => {
    setScenarioName(p.name);
    setCarbsFactor(p.carbs);
    setMealShiftMin(p.shift);
    setBolusFactor(p.bolus);
    setBolusDelayMin(p.delay);
    setBasalFactor(p.basal);
    // Instant execution on preset selection
    executeSimulationWithParams(p.name, p.carbs, p.shift, p.bolus, p.delay, p.basal, durationHours);
  };

  const resetToDefault = () => {
    setScenarioName('Baseline (Original Inputs)');
    setCarbsFactor(1.0);
    setMealShiftMin(0);
    setBolusFactor(1.0);
    setBolusDelayMin(0);
    setBasalFactor(1.0);
    executeSimulationWithParams('Baseline (Original Inputs)', 1.0, 0, 1.0, 0, 1.0, durationHours);
  };

  const chartData = simResult?.trajectory.map((pt, idx) => ({
    timestamp: pt.timestamp.split(' ')[1]?.slice(0, 5) || pt.timestamp,
    baseline: pt.baseline_glucose,
    simulated: pt.simulated_glucose,
    actual: pt.actual_glucose,
    delta: pt.delta_glucose,
    pct: pt.pct_change,
    carbs: pt.carbs_input,
    bolus: pt.bolus_input,
    basal: pt.basal_input,
    id: idx
  })) || [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-orange-400" />
            <span>Physiological What-If Simulation Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ReplayBG Causal In Silico Counterfactuals • Test how altered meal carbohydrates, bolus delays, and basal rates change future blood sugar.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={resetToDefault}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={() => executeSimulationWithParams()}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{loading ? 'Solving ODEs...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Selector Buttons */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-300 block">Select a Preset Scenario (Click to Instantly Simulate):</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((p, idx) => {
            const isSelected = scenarioName === p.name;
            return (
              <button
                key={idx}
                onClick={() => applyPreset(p)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-md shadow-orange-500/10'
                    : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950 text-orange-400">
                    {p.tag}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                </div>
                <span className="text-xs font-semibold mt-1 block line-clamp-1">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Parameter Control Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Meal Carbs Factor */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-orange-400">Meal Carbs</span>
            <span className="font-mono text-white font-bold">{Math.round((carbsFactor - 1) * 100) > 0 ? `+${Math.round((carbsFactor - 1) * 100)}%` : `${Math.round((carbsFactor - 1) * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={carbsFactor}
            onChange={(e) => setCarbsFactor(Number(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-50%</span>
            <span>1.0x</span>
            <span>+100%</span>
          </div>
        </div>

        {/* Meal Timing Shift */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-amber-400">Meal Shift</span>
            <span className="font-mono text-white font-bold">{mealShiftMin > 0 ? `+${mealShiftMin}` : mealShiftMin} min</span>
          </div>
          <input
            type="range"
            min={-60}
            max={60}
            step={15}
            value={mealShiftMin}
            onChange={(e) => setMealShiftMin(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-60 min</span>
            <span>0</span>
            <span>+60 min</span>
          </div>
        </div>

        {/* Bolus Insulin Factor */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-cyan-400">Bolus Dose</span>
            <span className="font-mono text-white font-bold">{Math.round((bolusFactor - 1) * 100) > 0 ? `+${Math.round((bolusFactor - 1) * 100)}%` : `${Math.round((bolusFactor - 1) * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={bolusFactor}
            onChange={(e) => setBolusFactor(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-50%</span>
            <span>1.0x</span>
            <span>+100%</span>
          </div>
        </div>

        {/* Bolus Delay Minutes */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-blue-400">Bolus Delay</span>
            <span className="font-mono text-white font-bold">+{bolusDelayMin} min</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={10}
            value={bolusDelayMin}
            onChange={(e) => setBolusDelayMin(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 (At meal)</span>
            <span>+30 min</span>
            <span>+60 min</span>
          </div>
        </div>

        {/* Basal Rate Factor */}
        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-purple-400">Basal Rate</span>
            <span className="font-mono text-white font-bold">{Math.round((basalFactor - 1) * 100) > 0 ? `+${Math.round((basalFactor - 1) * 100)}%` : `${Math.round((basalFactor - 1) * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={basalFactor}
            onChange={(e) => setBasalFactor(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>-50%</span>
            <span>1.0x</span>
            <span>+50%</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* PLAIN ENGLISH EXPLANATION CARD (For Everyday Humans) */}
      {simResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-950/30 via-slate-900 to-slate-900 border border-orange-500/30 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                Clear Summary for Everyone
              </span>
              <h3 className="text-sm font-bold text-white">What Happens in this Scenario?</h3>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed font-medium">
            {simResult.plain_english_summary || simResult.natural_language_explanation}
          </p>

          {simResult.actionable_takeaway && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-amber-300 font-medium">
              {simResult.actionable_takeaway}
            </div>
          )}
        </div>
      )}

      {/* Trajectory Comparison Plot */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span>Counterfactual Comparison: Baseline vs. Simulated Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400">
              Shaded green band denotes healthy clinical target range (70–180 mg/dL).
            </p>
          </div>

          {/* Visual Legend Header */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-white inline-block"></span>
              <span className="text-white font-bold">⚪ Baseline Twin (Normal Day)</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30">
              <span className="w-4 h-1 bg-orange-400 inline-block rounded"></span>
              <span className="text-orange-300 font-bold">🟠 Simulated What-If</span>
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickCount={10} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} unit=" mg/dL" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                        <p className="font-bold text-white border-b border-slate-800 pb-1">Time: {label}</p>
                        <p className="text-white font-semibold flex items-center justify-between space-x-4">
                          <span>⚪ Baseline:</span>
                          <strong>{d.baseline} mg/dL</strong>
                        </p>
                        <p className="text-orange-400 font-bold flex items-center justify-between space-x-4">
                          <span>🟠 Simulated:</span>
                          <strong>{d.simulated} mg/dL</strong>
                        </p>
                        <p className={`pt-1 border-t border-slate-800 font-semibold ${d.delta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          Difference: {d.delta > 0 ? `+${d.delta}` : d.delta} mg/dL ({d.pct > 0 ? `+${d.pct}` : d.pct}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceArea y1={70} y2={180} fill="#10b981" fillOpacity={0.06} />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="2 2" strokeWidth={1} />
              <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="2 2" strokeWidth={1} />

              {/* Baseline Twin Glucose (Distinct Bold Dashed White Line, strokeWidth 3) */}
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline Twin"
                stroke="#f8fafc"
                strokeWidth={3}
                strokeDasharray="8 5"
                dot={false}
              />

              {/* Simulated What-If Trajectory (Vibrant Orange Line, strokeWidth 3) */}
              <Line
                type="monotone"
                dataKey="simulated"
                name="Simulated Scenario"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trajectory Difference ΔG(t) Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Point-by-Point Instantaneous Deviation ΔG(t) = G_sim(t) - G_base(t)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Positive values (above 0) show glucose spikes; negative values (below 0) show relative glucose drops.
            </p>
          </div>
          {chartData.length > 0 && chartData.every(d => Math.abs(d.delta) < 0.05) && (
            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
              Exact Baseline Match (ΔG = 0 mg/dL)
            </span>
          )}
        </div>

        {chartData.length > 0 && chartData.every(d => Math.abs(d.delta) < 0.05) && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
            <span className="text-cyan-400">ℹ️</span>
            <span>
              The simulated scenario currently matches the baseline perfectly (0.0 mg/dL difference). Adjust the meal carbs (+/-), bolus dose, or bolus delay sliders above to see the physiological divergence curve.
            </span>
          </div>
        )}

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 15, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickCount={10} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                unit=" mg/dL"
                domain={[
                  (dataMin: number) => (isNaN(dataMin) || Math.abs(dataMin) < 0.1 ? -15 : Math.min(-15, Math.floor(dataMin - 5))),
                  (dataMax: number) => (isNaN(dataMax) || Math.abs(dataMax) < 0.1 ? 15 : Math.max(15, Math.ceil(dataMax + 5)))
                ]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-0.5">
                        <p className="font-bold text-white">{label}</p>
                        <p className={d.delta >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          Deviation ΔG: {d.delta > 0 ? `+${d.delta}` : d.delta} mg/dL
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" />
              <defs>
                <linearGradient id="deltaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="delta"
                stroke="none"
                fill="url(#deltaGradient)"
              />
              <Line
                type="monotone"
                dataKey="delta"
                name="Deviation ΔG"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quantitative Outcome Comparison Cards */}
      {simResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak Blood Sugar</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-white">{simResult.comparison_metrics.simulated_peak_glucose}</span>
              <span className="text-xs text-slate-400">mg/dL</span>
            </div>
            <span className={`text-xs font-semibold mt-1 block ${simResult.comparison_metrics.peak_diff_mg_dl > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {simResult.comparison_metrics.peak_diff_mg_dl > 0 ? `+${simResult.comparison_metrics.peak_diff_mg_dl}` : simResult.comparison_metrics.peak_diff_mg_dl} mg/dL vs baseline
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Time to Peak</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-white">{simResult.comparison_metrics.simulated_time_to_peak_min}</span>
              <span className="text-xs text-slate-400">min</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Shift: {simResult.comparison_metrics.time_to_peak_diff_min > 0 ? `+${simResult.comparison_metrics.time_to_peak_diff_min}` : simResult.comparison_metrics.time_to_peak_diff_min} min
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Glycemic Exposure</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-white">
                {simResult.comparison_metrics.auc_pct_change > 0 ? `+${simResult.comparison_metrics.auc_pct_change}` : simResult.comparison_metrics.auc_pct_change}%
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Trapezoidal AUC Change
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Time in Range (70-180)</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-xl font-bold text-emerald-400">{simResult.comparison_metrics.simulated_tir_pct}%</span>
              <span className="text-xs text-slate-400">(Base: {simResult.comparison_metrics.baseline_tir_pct}%)</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              TAR: {simResult.comparison_metrics.simulated_tar_pct}% | TBR: {simResult.comparison_metrics.simulated_tbr_pct}%
            </span>
          </div>
        </div>
      )}

      {/* Advanced Scientific Mechanism Details */}
      {simResult && (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5 text-xs text-slate-400">
          <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Biomedical Physiological Mechanism (Technical Details)</span>
          </span>
          <p className="leading-relaxed">{simResult.physiological_mechanism_notes}</p>
        </div>
      )}
    </div>
  );
};
