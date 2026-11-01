import React from 'react';
import { Activity, ShieldAlert, BookOpen, GitBranch } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">Diabetes Digital Twin</h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Research v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Personalized Glucose Prediction, Physiological ODE Simulation & Explainable AI</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Academic Demonstration • Not a Medical Device</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-200 font-mono text-[11px]">API Online</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
