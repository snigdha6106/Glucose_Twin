import React from 'react';
import {
  Home,
  Database,
  Cpu,
  TrendingUp,
  BrainCircuit,
  Sliders,
  BarChart3,
  Lightbulb,
  HeartPulse
} from 'lucide-react';

export type PageId =
  | 'home'
  | 'anatomy'
  | 'datasets'
  | 'digital-twin'
  | 'predictions'
  | 'explainability'
  | 'simulation'
  | 'comparison'
  | 'insights';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Overview & Home', icon: <Home className="w-4 h-4" /> },
    { id: 'anatomy', label: '3D Anatomical Twin', icon: <HeartPulse className="w-4 h-4 text-rose-400" />, badge: 'Biomedical 3D' },
    { id: 'datasets', label: 'Dataset Explorer', icon: <Database className="w-4 h-4" />, badge: '6 Files' },
    { id: 'digital-twin', label: 'Digital Twin 3D', icon: <Cpu className="w-4 h-4" />, badge: 'ODE' },
    { id: 'predictions', label: 'Prediction Lab', icon: <TrendingUp className="w-4 h-4" />, badge: '30m' },
    { id: 'explainability', label: 'Explainability Lab', icon: <BrainCircuit className="w-4 h-4" />, badge: 'SHAP' },
    { id: 'simulation', label: 'Simulation Lab', icon: <Sliders className="w-4 h-4" />, badge: 'What-If' },
    { id: 'comparison', label: 'Model Benchmark', icon: <BarChart3 className="w-4 h-4" />, badge: '11 ML' },
    { id: 'insights', label: 'Research Insights', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navigation Modules
        </div>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scientific Framework Footer */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400 px-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">T1D Engine:</span>
          <span className="text-cyan-400 font-mono">ReplayBG ODE</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">T2D Engine:</span>
          <span className="text-emerald-400 font-mono">CGMacros v1</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Attribution:</span>
          <span className="text-purple-400 font-mono">Tree SHAP</span>
        </div>
      </div>
    </aside>
  );
};
