import React, { useState, useEffect } from 'react';
import { fetchDatasetsList, fetchDatasetInspection, fetchDatasetAudit } from '../services/api';
import { DatasetOverviewItem, DatasetInspectionData, DatasetAuditReport } from '../types';
import { Database, AlertTriangle, CheckCircle, FileText, BarChart2, Layers } from 'lucide-react';

export const DatasetExplorerPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetOverviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('day_1_extended');
  const [inspection, setInspection] = useState<DatasetInspectionData | null>(null);
  const [audit, setAudit] = useState<DatasetAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dsList, auditData] = await Promise.all([
          fetchDatasetsList(),
          fetchDatasetAudit()
        ]);
        setDatasets(dsList);
        setAudit(auditData);
        if (dsList.length > 0) {
          const insp = await fetchDatasetInspection(selectedId);
          setInspection(insp);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dataset details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectDataset = async (id: string) => {
    setSelectedId(id);
    try {
      setLoading(true);
      const insp = await fetchDatasetInspection(id);
      setInspection(insp);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedMeta = datasets.find(d => d.id === selectedId);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <span>Dataset Explorer & Scientific Data Audit</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical quality audit, sampling intervals, missing value analysis, and raw feature distributions.
          </p>
        </div>

        {/* Dataset Select Buttons */}
        <div className="flex flex-wrap gap-2">
          {datasets.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSelectDataset(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedId === d.id
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {d.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {selectedMeta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{selectedMeta.records.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400">{selectedMeta.time_coverage}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sampling Frequency</span>
            <span className="text-xl font-extrabold text-cyan-400 mt-1 block">{selectedMeta.sampling_frequency}</span>
            <span className="text-[11px] text-slate-400">{selectedMeta.participants} participant(s)</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Missing Glucose</span>
            <span className="text-xl font-extrabold text-white mt-1 block">{selectedMeta.missing_pct}%</span>
            <span className="text-[11px] text-slate-400">{selectedMeta.missing_pct > 0 ? 'Sensor initialization' : 'Complete recording'}</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Diagnosis Group</span>
            <span className="text-sm font-bold text-emerald-400 mt-1.5 block truncate">{selectedMeta.diagnosis_group}</span>
            <span className="text-[11px] text-slate-400">{selectedMeta.source.split(' (')[0]}</span>
          </div>
        </div>
      )}

      {/* Audit Warnings & Quality Insights */}
      {selectedMeta && selectedMeta.quality_warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Dataset Integrity & Quality Warnings</span>
          </h3>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            {selectedMeta.quality_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Glycemic Distribution Profile */}
      {inspection && inspection.glycemic_ranges && inspection.glycemic_ranges.mean && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span>Glycemic Range Profile & Time-in-Range (TIR)</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Mean Glucose</span>
              <span className="text-base font-bold text-white mt-1 block">{inspection.glycemic_ranges.mean} mg/dL</span>
              <span className="text-[10px] text-slate-400">σ = {inspection.glycemic_ranges.std}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-400 block uppercase">Time In Range (70-180)</span>
              <span className="text-base font-bold text-emerald-300 mt-1 block">{inspection.glycemic_ranges.tir_pct}%</span>
              <span className="text-[10px] text-slate-400">Target Range</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 text-center">
              <span className="text-[10px] text-amber-400 block uppercase">Hyperglycemia (&gt;180)</span>
              <span className="text-base font-bold text-amber-300 mt-1 block">{inspection.glycemic_ranges.tar_pct}%</span>
              <span className="text-[10px] text-slate-400">Above Range</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-400 block uppercase">Severe Hyper (&gt;250)</span>
              <span className="text-base font-bold text-rose-300 mt-1 block">{inspection.glycemic_ranges.severe_hyper_pct}%</span>
              <span className="text-[10px] text-slate-400">High Risk</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-red-500/20 text-center">
              <span className="text-[10px] text-red-400 block uppercase">Hypoglycemia (&lt;70)</span>
              <span className="text-base font-bold text-red-400 mt-1 block">{inspection.glycemic_ranges.hypo_pct}%</span>
              <span className="text-[10px] text-slate-400">Below Range</span>
            </div>
          </div>
        </div>
      )}

      {/* Raw Data Preview Table */}
      {inspection && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Observation Preview (First 25 Samples)</span>
            </h3>
            <span className="text-xs text-slate-400">{inspection.columns.length} columns • {inspection.total_rows} total rows</span>
          </div>

          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-[11px]">
              <thead className="bg-slate-950 sticky top-0">
                <tr>
                  {inspection.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold text-slate-300 whitespace-nowrap">
                      <div>{col}</div>
                      <div className="text-[9px] font-normal text-slate-400">{inspection.dtypes[col]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                {inspection.head.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    {inspection.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap font-mono text-[10px]">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-rose-400 font-sans italic">NaN</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
