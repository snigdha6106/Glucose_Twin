import React, { useState, useEffect } from 'react';
import { fetchModelComparison, fetchPredictionTrajectory } from '../services/api';
import { ModelComparisonItem } from '../types';
import { ClarkeErrorGrid } from '../components/ClarkeErrorGrid';
import {
  BarChart3,
  Award,
  Zap,
  Clock,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Sparkles
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

export const ModelComparisonPage: React.FC = () => {
  const [datasetId, setDatasetId] = useState<string>('cgmacros');
  const [diagnosisGroup, setDiagnosisGroup] = useState<string>('all');
  const [models, setModels] = useState<ModelComparisonItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [gridLoading, setGridLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Scatter points for Clarke grid from selected model
  const [scatterPoints, setScatterPoints] = useState<{ actual: number; predicted: number }[]>([]);
  const [zonePct, setZonePct] = useState<{ A: number; B: number; C: number; D: number; E: number }>({
    A: 90, B: 8, C: 1.5, D: 0.5, E: 0.0
  });

  const loadGridForModel = async (modelType: string, modelItem?: ModelComparisonItem) => {
    try {
      setGridLoading(true);
      const traj = await fetchPredictionTrajectory({
        dataset_id: datasetId,
        diagnosis_group: diagnosisGroup,
        model_type: modelType.toLowerCase(),
        window_points: 250
      });
      const pts = traj.trajectory
        .filter(p => p.actual_glucose !== null)
        .map(p => ({ actual: p.actual_glucose!, predicted: p.predicted_glucose }));
      setScatterPoints(pts);

      if (modelItem) {
        if (modelItem.clarke_grid) {
          setZonePct({
            A: modelItem.clarke_grid.A ?? modelItem.clarke_zone_a_pct,
            B: modelItem.clarke_grid.B ?? Math.round((modelItem.clarke_zone_a_b_pct - modelItem.clarke_zone_a_pct) * 10) / 10,
            C: modelItem.clarke_grid.C ?? 0,
            D: modelItem.clarke_grid.D ?? 0,
            E: modelItem.clarke_grid.E ?? 0
          });
        } else {
          setZonePct({
            A: modelItem.clarke_zone_a_pct,
            B: Math.round((modelItem.clarke_zone_a_b_pct - modelItem.clarke_zone_a_pct) * 10) / 10,
            C: 0,
            D: 0,
            E: 0
          });
        }
      }
    } catch (err: any) {
      // fallback
    } finally {
      setGridLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchModelComparison(datasetId, diagnosisGroup);
      setModels(data);

      const best = data.find(m => m.is_best) || data[0];
      if (best) {
        const rawType = best.model_name.split(' ')[0].toLowerCase();
        setSelectedModelId(rawType);
        await loadGridForModel(rawType, best);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load model comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datasetId, diagnosisGroup]);

  const handleSelectModel = (m: ModelComparisonItem) => {
    const rawType = m.model_name.split(' ')[0].toLowerCase();
    setSelectedModelId(rawType);
    loadGridForModel(rawType, m);
  };

  const bestModel = models.find((m) => m.is_best) || models[0];

  const maeChartData = models.map((m) => ({
    name: m.model_name.split(' ')[0],
    fullName: m.model_name,
    mae: m.mae,
    isBest: m.is_best
  }));

  const r2ChartData = models.map((m) => ({
    name: m.model_name.split(' ')[0],
    fullName: m.model_name,
    r2: m.r2,
    isBest: m.is_best
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            <span>Model Benchmark & Comparative Evaluation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardized out-of-sample benchmarking of 11 machine learning and deep learning algorithms with chronological embargo.
          </p>
        </div>

        {/* Dataset & Cohort Track Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dataset Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Track:</span>
            <select
              value={datasetId}
              onChange={(e) => {
                const newDs = e.target.value;
                setDatasetId(newDs);
                if (newDs === 'day_1_extended') {
                  setDiagnosisGroup('all');
                }
              }}
              className="bg-transparent text-xs text-emerald-400 font-semibold cursor-pointer focus:outline-none"
            >
              <option value="day_1_extended" className="bg-slate-900 text-white">🩸 Type 1 Diabetes (ReplayBG 46h Contiguous)</option>
              <option value="cgmacros" className="bg-slate-900 text-white">📊 Multi-Phenotype & T2D (CGMacros Cohort)</option>
            </select>
          </div>

          {/* Cohort Selector (Active for CGMacros) */}
          {datasetId === 'cgmacros' ? (
            <select
              value={diagnosisGroup}
              onChange={(e) => setDiagnosisGroup(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white cursor-pointer"
            >
              <option value="all">Cohort: All Groups (Pooled)</option>
              <option value="healthy">Cohort: Healthy</option>
              <option value="prediabetes">Cohort: Prediabetes</option>
              <option value="type2_diabetes">Cohort: Type 2 Diabetes</option>
            </select>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
              Cohort: Type 1 Diabetes (Patient 1)
            </span>
          )}
        </div>
      </div>

      {/* Loading State Spinner */}
      {loading && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
          <h3 className="text-base font-bold text-white">Benchmarking All 11 Machine Learning & Deep Learning Models...</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Evaluating Ridge, Linear, Random Forest, GBR, XGBoost, LightGBM, LinearSVR, PyTorch MLP, LSTM, GRU, and 1D-CNN on the {datasetId === 'day_1_extended' ? 'Type 1 Diabetes (46h ReplayBG)' : 'CGMacros Multi-Phenotype'} test dataset with strict chronological embargo.
          </p>
        </div>
      )}

      {/* PLAIN ENGLISH METRICS GUIDE (For Everyday Users) */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
          <div className="flex items-start space-x-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex-shrink-0">🎯 MAE</span>
            <div>
              <strong className="text-slate-200 block">Mean Absolute Error (Lower is Better)</strong>
              <span className="text-slate-400 text-[11px]">
                On average, how many mg/dL the AI is off. Under 15 mg/dL is top-tier medical grade!
              </span>
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold flex-shrink-0">📊 R² Score</span>
            <div>
              <strong className="text-slate-200 block">Fit Accuracy (Higher is Better)</strong>
              <span className="text-slate-400 text-[11px]">
                How well the model captures real glucose swings. 1.0 is a 100% perfect match.
              </span>
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 font-bold flex-shrink-0">🛡️ Clarke Zone A</span>
            <div>
              <strong className="text-slate-200 block">Clinical Safety (Higher is Better)</strong>
              <span className="text-slate-400 text-[11px]">
                % of predictions safe enough for insulin or meal dosing decisions without medical risk.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Best Performing Model Highlight Card */}
      {!loading && bestModel && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Top Performing Algorithm
                </span>
                <span className="text-xs text-slate-400 font-mono">Benchmark Leader</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">{bestModel.model_name}</h2>
              <p className="text-xs text-slate-300">
                Achieved Mean Absolute Error of <strong className="text-emerald-400">{bestModel.mae} mg/dL</strong> with <strong className="text-cyan-300">{bestModel.clarke_zone_a_pct}%</strong> in clinically accurate Clarke Zone A.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">MAE</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">{bestModel.mae} mg/dL</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">R² Score</span>
              <span className="text-base font-bold text-cyan-400 mt-0.5 block">{bestModel.r2}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Inference</span>
              <span className="text-base font-bold text-purple-400 mt-0.5 block">{bestModel.inference_time_ms} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Performance Comparison Charts */}
      {!loading && maeChartData.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAE Comparison Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>Mean Absolute Error (MAE in mg/dL)</span>
            <span className="text-xs font-normal text-slate-400">(Lower is better)</span>
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-35} textAnchor="end" interval={0} />
                <YAxis stroke="#64748b" fontSize={10} unit=" mg/dL" domain={[0, 'auto']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs">
                          <p className="font-bold text-white">{d.fullName}</p>
                          <p className="text-emerald-400 font-bold">MAE: {d.mae} mg/dL</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="mae">
                  {maeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isBest ? '#10b981' : '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* R² Score Comparison Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>Coefficient of Determination (R²)</span>
            <span className="text-xs font-normal text-slate-400">(Higher is better)</span>
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r2ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-35} textAnchor="end" interval={0} />
                <YAxis domain={['auto', 1.0]} stroke="#64748b" fontSize={10} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs">
                          <p className="font-bold text-white">{d.fullName}</p>
                          <p className="text-cyan-400 font-bold">R²: {d.r2}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="r2">
                  {r2ChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isBest ? '#10b981' : '#a855f7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* Comprehensive Benchmark Metrics Table */}
      {!loading && models.length > 0 && (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Complete Algorithm Performance Benchmark</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Tip: Click any row to view its Clarke Error Grid below
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-xs">
            <thead className="bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Model Algorithm</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Cohort</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">MAE (mg/dL)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">RMSE (mg/dL)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">R² Score</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">MARD (%)</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Clarke Zone A</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Zones A+B</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Train Time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">Inference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {models.map((m) => {
                const isSelected = selectedModelId === m.model_name.split(' ')[0].toLowerCase();
                return (
                  <tr
                    key={m.model_id}
                    onClick={() => handleSelectModel(m)}
                    className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${
                      isSelected ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : (m.is_best ? 'bg-emerald-500/5' : '')
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white flex items-center space-x-2">
                      <span>{m.model_name}</span>
                      {m.is_best && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          BEST
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{m.diagnosis_group}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">{m.mae}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{m.rmse}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400 font-semibold">{m.r2}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{m.mard}%</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{m.clarke_zone_a_pct}%</td>
                    <td className="px-4 py-3 font-mono text-cyan-300 font-semibold">{m.clarke_zone_a_b_pct}%</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.training_time_sec}s</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{m.inference_time_ms}ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Interactive Clarke Error Grid Component */}
      {!loading && models.length > 0 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Viewing Clarke Error Grid for: <strong className="text-cyan-400 uppercase">{selectedModelId || 'Best Model'}</strong></span>
          </span>
          {gridLoading && <span className="text-xs text-slate-400 animate-pulse">Updating scatter plot...</span>}
        </div>
        <ClarkeErrorGrid
          dataPoints={scatterPoints}
          zonePercentages={zonePct}
        />
      </div>
      )}
    </div>
  );
};
