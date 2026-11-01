import React from 'react';
import { PageId } from '../components/Sidebar';
import {
  Activity,
  Cpu,
  TrendingUp,
  BrainCircuit,
  Sliders,
  BarChart3,
  ArrowRight,
  ShieldAlert,
  Database,
  HeartPulse
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Biomedical AI Research Platform • Cappon et al. & PhysioNet CGMacros</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Personalized Diabetes Digital Twin: <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Prediction, ODE Simulation & Explainable AI
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            A research-oriented platform integrating two independent scientific paradigms: a personalized physiological ODE digital twin for Type 1 Diabetes (carbohydrate absorption & insulin action dynamics) and an explainable machine learning pipeline for continuous glucose forecasting across Healthy, Prediabetes, and Type 2 Diabetes phenotypes.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('anatomy')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/25 cursor-pointer"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Launch 3D Anatomical Twin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('digital-twin')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <span>ODE Replay Twin</span>
            </button>
            <button
              onClick={() => onNavigate('simulation')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Run What-If Scenarios</span>
            </button>
            <button
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Explore Datasets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Scientific Experimental Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Track A: Type 1 ReplayBG */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Track 1 • Physiological ODE Twin
              </span>
              <span className="text-xs text-slate-400">ReplayBG • T1D</span>
            </div>
            <h2 className="text-xl font-bold text-white">Type 1 Diabetes: ReplayBG Digital Twin</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Implements the ReplayBG framework (Cappon et al., IEEE TBME 2023) modeling 2-compartment gut carbohydrate absorption, subcutaneous insulin pharmacokinetics, and remote insulin action. Features Bayesian parameter personalization on Patient 1 (bw = 100 kg, u2ss = 0.244).
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Sampling Grid</span>
                <span className="font-bold text-slate-200">5-min intervals</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Continuous Span</span>
                <span className="font-bold text-slate-200">46h contiguous (552 pts)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-slate-800/80 mt-6">
            <span className="text-xs text-cyan-400 font-medium">What-if meal & insulin counterfactuals</span>
            <button
              onClick={() => onNavigate('digital-twin')}
              className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Track B: CGMacros Type 2 & Multi-Phenotype */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Track 2 • Multi-Phenotype ML Pipeline
              </span>
              <span className="text-xs text-slate-400">PhysioNet CGMacros</span>
            </div>
            <h2 className="text-xl font-bold text-white">CGMacros: Multi-Model Glucose Prediction</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Benchmarking 11 machine learning and deep learning architectures (XGBoost, LightGBM, Random Forest, SVR, MLP, LSTM, GRU, 1D-CNN) on 8,276 records spanning Healthy (001), Prediabetes (008), and Type 2 Diabetes (003) cohorts with strict temporal embargo validation.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Sampling Interval</span>
                <span className="font-bold text-slate-200">1-min continuous</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Prediction Target</span>
                <span className="font-bold text-slate-200">30-min horizon (target_30m)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-slate-800/80 mt-6">
            <span className="text-xs text-emerald-400 font-medium">SHAP attribution & Clarke EGA</span>
            <button
              onClick={() => onNavigate('predictions')}
              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Modules Quick Access */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Core Research Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('predictions')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-800/60 transition-all cursor-pointer group"
          >
            <TrendingUp className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white">Prediction Lab</h3>
            <p className="text-[11px] text-slate-400 mt-1">Multi-step forecast trajectory with 95% confidence intervals.</p>
          </div>

          <div
            onClick={() => onNavigate('explainability')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-800/60 transition-all cursor-pointer group"
          >
            <BrainCircuit className="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white">Explainability Lab</h3>
            <p className="text-[11px] text-slate-400 mt-1">Tree SHAP, feature importances, and local waterfall explanations.</p>
          </div>

          <div
            onClick={() => onNavigate('simulation')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-800/60 transition-all cursor-pointer group"
          >
            <Sliders className="w-6 h-6 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white">What-If Simulation</h3>
            <p className="text-[11px] text-slate-400 mt-1">Altered meal size, bolus insulin timing, AUC and peak shifts.</p>
          </div>

          <div
            onClick={() => onNavigate('comparison')}
            className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:bg-slate-800/60 transition-all cursor-pointer group"
          >
            <BarChart3 className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white">Model Benchmark</h3>
            <p className="text-[11px] text-slate-400 mt-1">MAE, RMSE, R², MARD, and Clarke Error Grid zones.</p>
          </div>
        </div>
      </div>

      {/* Scientific Honesty and Limitation Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start space-x-3 text-xs text-amber-200/90 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block">Scientific & Academic Disclaimer</span>
          This platform is built strictly for biomedical AI research, educational demonstration, and scientific inquiry. It is not an FDA/CE-cleared medical device. The models and simulations are calibrated on demo research subsets and do not represent generalized medical advice, insulin dosing recommendations, or treatment plans.
        </div>
      </div>
    </div>
  );
};
