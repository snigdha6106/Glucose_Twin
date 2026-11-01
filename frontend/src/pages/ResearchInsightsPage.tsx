import React, { useState, useEffect } from 'react';
import { fetchResearchInsights } from '../services/api';
import {
  Lightbulb,
  Activity,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

export const ResearchInsightsPage: React.FC = () => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchResearchInsights();
        setInsights(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            <span>Scientific Research Insights & Clinical Observations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirically derived findings across metabolic phenotypes, model inductive biases, and methodological caveats.
          </p>
        </div>
      </div>

      {/* Phenotype Comparison Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Glycemic Phenotype Stratification</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights?.glycemic_phenotype_observations.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-white">{item.cohort}</span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-slate-950 font-mono text-cyan-400 border border-slate-800">
                  TIR: {item.tir_70_180}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Mean Glucose</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{item.mean_glucose}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block uppercase">Baseline HbA1c</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{item.hba1c}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
                {item.observation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Model Inductive Biases & Architecture Findings */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Machine Learning Architecture Findings</span>
        </h2>

        <div className="space-y-3">
          {insights?.model_architecture_findings.map((f: string, idx: number) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-300 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Methodological Integrity & Rigor Notes */}
      <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Methodological Rigor & Data Leakage Prevention</span>
        </h2>

        <div className="space-y-3">
          {insights?.methodological_caveats.map((c: string, idx: number) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scientific Citation Notice */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Scientific Dataset & Literature Attribution</span>
        </div>
        <p className="leading-relaxed">
          1. <strong>ReplayBG Framework:</strong> Cappon et al., "ReplayBG: a digital twin-based methodology to identify a personalized model from type 1 diabetes data and simulate glucose concentrations to assess alternative therapies," <em>IEEE Transactions on Biomedical Engineering</em>, 2023. DOI: 10.1109/TBME.2023.3286856.
        </p>
        <p className="leading-relaxed">
          2. <strong>PhysioNet CGMacros:</strong> PhysioNet CGMacros v1.0.0 (DOI: 10.13026/3z8q-x658). Distributed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0).
        </p>
      </div>
    </div>
  );
};
