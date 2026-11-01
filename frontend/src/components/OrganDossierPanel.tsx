import React from 'react';
import { OrganAnatomyInfo } from '../data/anatomyData';
import { X, Activity, Dna, Stethoscope, AlertTriangle, CheckCircle2, ChevronRight, Layers } from 'lucide-react';
import { DiabetesMode } from './AnatomicalTwinCanvas';

interface OrganDossierPanelProps {
  organ: OrganAnatomyInfo | null;
  onClose: () => void;
  currentGlucose: number;
  activeInsulin: number;
  mode: DiabetesMode;
}

export const OrganDossierPanel: React.FC<OrganDossierPanelProps> = ({
  organ,
  onClose,
  currentGlucose,
  activeInsulin,
  mode
}) => {
  if (!organ) return null;

  // Compute live organ metabolic state based on simulation
  const getLiveOrganStatus = () => {
    switch (organ.id) {
      case 'pancreas':
        if (mode === 'type1') {
          return {
            status: 'Severe Endogenous Defect',
            color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
            description: 'Beta-cell mass severely depleted (>90% loss). Zero endogenous insulin detected. External subcutaneous insulin required.'
          };
        } else if (mode === 'type2') {
          return {
            status: 'Compensatory Secretory Strain',
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            description: 'Hypersecreting insulin against peripheral tissue resistance. Risk of long-term islet amyloid deposition and beta-cell apoptosis.'
          };
        }
        return {
          status: 'Physiological Homeostasis',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          description: `Responsive biphasic insulin secretion. Current systemic glucose: ${Math.round(currentGlucose)} mg/dL.`
        };

      case 'liver':
        const hepaticSuppressed = activeInsulin > 1.2 || currentGlucose > 140;
        return {
          status: hepaticSuppressed ? 'Gluconeogenesis Suppressed' : 'Basal Glucose Production Active',
          color: hepaticSuppressed ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          description: hepaticSuppressed
            ? 'Insulin presence activates glycogen synthase and shuts down PEPCK/G6Pase endogenous glucose output.'
            : 'Fasting state: Liver releasing ~2.0 mg/kg/min glucose to nourish central nervous system and erythrocytes.'
        };

      case 'skeletal_muscle':
        const glut4Active = activeInsulin > 0.8 && mode !== 'type2';
        return {
          status: glut4Active ? 'GLUT4 Translocation Active' : (mode === 'type2' ? 'Insulin Resistance Impaired' : 'Basal Uptake'),
          color: glut4Active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-300 bg-slate-800 border-slate-700',
          description: glut4Active
            ? 'Insulin receptor signaling promotes vesicle fusion to sarcolemma, accelerating glucose clearance into myocytes.'
            : (mode === 'type2' ? 'Intracellular lipid metabolites blunting IRS-1/Akt activation; reduced postprandial clearance.' : 'Basal uptake mediated by non-insulin dependent GLUT1.')
        };

      case 'kidneys':
        const aboveThreshold = currentGlucose >= 180;
        return {
          status: aboveThreshold ? 'Glucosuria Active (>180 mg/dL)' : '100% SGLT2 Reabsorption',
          color: aboveThreshold ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          description: aboveThreshold
            ? 'Tubular transport maximum (Tm_G) exceeded! Excess glucose spilling into urine, promoting osmotic diuresis.'
            : 'Renal threshold for glucose not exceeded. All filtered glucose reabsorbed in proximal tubules via SGLT2/1.'
        };

      default:
        return {
          status: 'Active Physiological Surveillance',
          color: 'text-slate-300 bg-slate-800 border-slate-700',
          description: `Continuous nutrient exchange under current systemic glucose (${Math.round(currentGlucose)} mg/dL).`
        };
    }
  };

  const liveStatus = getLiveOrganStatus();

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-5 space-y-4 backdrop-blur-xl animate-fadeIn max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {organ.system}
            </span>
            <span className="text-xs italic text-slate-400 font-serif">
              {organ.latinName}
            </span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
            <span>{organ.name}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {organ.location}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Close Organ Dossier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Simulation Status for this Organ */}
      <div className={`p-3 rounded-xl border ${liveStatus.color} space-y-1`}>
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Current In Silico Metabolic State:</span>
          </span>
          <span className="uppercase text-[11px] tracking-wider font-mono">{liveStatus.status}</span>
        </div>
        <p className="text-xs opacity-90 leading-relaxed">{liveStatus.description}</p>
      </div>

      {/* Role in Glucose Regulation */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Primary Role in Glucose Regulation</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          {organ.primaryGlucoseRole}
        </p>
      </div>

      {/* Insulin & Glucose Interaction */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
          <Dna className="w-3.5 h-3.5" />
          <span>Molecular Interaction with Insulin & Glucose</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          {organ.insulinInteraction}
        </p>
      </div>

      {/* Healthy vs T1D vs T2D Comparative Physiological Matrix */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-rose-400" />
          <span>Comparative Diabetes Pathology Matrix</span>
        </h3>

        <div className="space-y-2 text-xs">
          {/* Healthy */}
          <div className={`p-2.5 rounded-xl border transition-all ${mode === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-slate-950/40 border-slate-800/80 text-slate-400'}`}>
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">Healthy Homeostatic Physiology:</span>
            </div>
            <p className="leading-relaxed text-[11px]">{organ.healthyPhysiology}</p>
          </div>

          {/* Type 1 Diabetes */}
          <div className={`p-2.5 rounded-xl border transition-all ${mode === 'type1' ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' : 'bg-slate-950/40 border-slate-800/80 text-slate-400'}`}>
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300 font-semibold">Type 1 Diabetes (Autoimmune Destruction):</span>
            </div>
            <p className="leading-relaxed text-[11px]">{organ.type1DiabetesImpact}</p>
          </div>

          {/* Type 2 Diabetes */}
          <div className={`p-2.5 rounded-xl border transition-all ${mode === 'type2' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-slate-950/40 border-slate-800/80 text-slate-400'}`}>
            <div className="flex items-center space-x-1.5 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-semibold">Type 2 Diabetes (Insulin Resistance):</span>
            </div>
            <p className="leading-relaxed text-[11px]">{organ.type2DiabetesImpact}</p>
          </div>
        </div>
      </div>

      {/* Key Transporters & Biochemical Pathways */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
          Key Transporters, Receptors & Hormones
        </span>
        <div className="flex flex-wrap gap-1.5">
          {organ.transportersAndHormones.map((item, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-mono font-medium text-slate-300 border border-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Clinical Reference Benchmarks */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
          Clinical Benchmark Values
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {organ.clinicalMetrics.map((m, idx) => (
            <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{m.label}</span>
              <span className="font-mono font-bold text-white text-xs">
                {m.normalValue} <span className="text-[10px] text-slate-400 font-normal">{m.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
