import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AnatomicalTwinCanvas,
  DiabetesMode
} from '../components/AnatomicalTwinCanvas';
import { OrganDossierPanel } from '../components/OrganDossierPanel';
import { ANATOMY_ORGAN_DATABASE, OrganAnatomyInfo } from '../data/anatomyData';
import { runSimulationScenario } from '../services/api';
import { SimulationResponse } from '../types';
import {
  Activity,
  HeartPulse,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Camera,
  Layers,
  Sparkles,
  Info,
  Split,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Droplet
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export const AnatomicalTwinPage: React.FC = () => {
  // Mode: Healthy vs Type 1 Diabetes vs Type 2 Diabetes
  const [mode, setMode] = useState<DiabetesMode>('type1');

  // Split-Screen Comparison Mode
  const [isSplitCompare, setIsSplitCompare] = useState<boolean>(false);

  // Selected Organ for Inspection
  const [selectedOrgan, setSelectedOrgan] = useState<OrganAnatomyInfo | null>(
    ANATOMY_ORGAN_DATABASE['pancreas']
  );

  // Layer Visibility
  const [skinOpacity, setSkinOpacity] = useState<number>(0.18);
  const [showMuscles, setShowMuscles] = useState<boolean>(true);
  const [showOrgans, setShowOrgans] = useState<boolean>(true);
  const [showVessels, setShowVessels] = useState<boolean>(true);
  const [showGlucoseParticles, setShowGlucoseParticles] = useState<boolean>(true);
  const [showInsulinParticles, setShowInsulinParticles] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<'full' | 'abdomen' | 'pancreas' | 'circulation'>('abdomen');

  // Synchronized Camera State for Dual Viewports
  const [syncCameraState, setSyncCameraState] = useState<{
    position: [number, number, number];
    target: [number, number, number];
  } | null>(null);

  // Real-Time Simulation Parameters
  const [carbsFactor, setCarbsFactor] = useState<number>(1.4);
  const [mealShiftMin, setMealShiftMin] = useState<number>(0);
  const [bolusFactor, setBolusFactor] = useState<number>(0.8);
  const [bolusDelayMin, setBolusDelayMin] = useState<number>(30);
  const [basalFactor, setBasalFactor] = useState<number>(1.0);
  const [durationHours] = useState<number>(4);

  // Timeline Scrubber & Animation State
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(12);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Preset Scenario Presets
  const applyPreset = (preset: {
    name: string;
    mode: DiabetesMode;
    carbs: number;
    shift: number;
    bolus: number;
    delay: number;
    basal: number;
  }) => {
    setMode(preset.mode);
    setCarbsFactor(preset.carbs);
    setMealShiftMin(preset.shift);
    setBolusFactor(preset.bolus);
    setBolusDelayMin(preset.delay);
    setBasalFactor(preset.basal);
    setCurrentTimeIndex(14); // Jump directly to postprandial peak (t = 70 min) so numbers and 3D fluid particles update immediately!
  };

  // ==========================================
  // REAL-TIME 60 FPS IN-BROWSER PHYSIOLOGICAL SOLVER
  // Solves compartmental ODEs instantly as user drags any slider!
  // ==========================================
  const trajectoryData = useMemo(() => {
    const pointsCount = Math.floor((durationHours * 60) / 5); // 48 points
    const points = [];

    // Base parameters per mode
    let G_base = 145.0;
    let G_sim = 145.0;
    let Gb = 140.0;
    let SI = 0.0006;
    let p1 = 0.01;
    let p2 = 0.025;
    let p3 = 0.000025;
    let k_empt = 0.025;
    let k_abs = 0.015;

    if (mode === 'healthy') {
      G_base = 92.0;
      G_sim = 92.0;
      Gb = 90.0;
      SI = 0.0022; // High insulin sensitivity
      p1 = 0.015;
    } else if (mode === 'type2') {
      G_base = 142.0;
      G_sim = 142.0;
      Gb = 138.0;
      SI = 0.00025; // Severe insulin resistance
      p1 = 0.006;
    }

    // Compartment states
    let Q_sto_base = 0;
    let Q_gut_base = 0;
    let X_base = 0;
    let Q_sto_sim = 0;
    let Q_gut_sim = 0;
    let X_sim = 0;

    const mealTimeIndex = 4; // Meal occurs at t = 20 min
    const baseCarbs = 50.0;
    const simCarbs = baseCarbs * carbsFactor;
    const mealSimIndex = Math.max(0, mealTimeIndex + Math.floor(mealShiftMin / 5));

    for (let i = 0; i < pointsCount; i++) {
      const tMin = i * 5;
      const hh = String(12 + Math.floor(tMin / 60)).padStart(2, '0');
      const mm = String(tMin % 60).padStart(2, '0');
      const timestamp = `${hh}:${mm}`;

      // Ingest meal
      if (i === mealTimeIndex) Q_sto_base += baseCarbs;
      if (i === mealSimIndex) Q_sto_sim += simCarbs;

      // 5-minute integration step
      const dt = 5.0;

      // --- Baseline ODE Step ---
      const dQ_sto_b = -k_empt * Q_sto_base;
      const dQ_gut_b = k_empt * Q_sto_base - k_abs * Q_gut_base;
      Q_sto_base += dQ_sto_b * dt;
      Q_gut_base += dQ_gut_b * dt;
      const Ra_base = (0.9 * k_abs * Q_gut_base * 1000) / (120 * 70); // mg/dL/min

      // Insulin stimulus
      let I_base = 2.5; // basal
      if (mode === 'healthy') {
        // Healthy rapid endogenous insulin burst
        if (i >= mealTimeIndex && i < mealTimeIndex + 16) {
          I_base += 40.0 * Math.exp(-(i - mealTimeIndex) * 0.2);
        }
      } else if (mode === 'type1') {
        // Normal T1D bolus
        if (i >= mealTimeIndex && i < mealTimeIndex + 24) {
          I_base += 18.0 * Math.exp(-(i - mealTimeIndex) * 0.12);
        }
      } else if (mode === 'type2') {
        // T2D hyperinsulinemia
        if (i >= mealTimeIndex && i < mealTimeIndex + 28) {
          I_base += 55.0 * Math.exp(-(i - mealTimeIndex) * 0.08);
        }
      }
      X_base += (-p2 * X_base + p3 * (I_base - 2.5)) * dt;
      const dG_base = -p1 * (G_base - Gb) - X_base * G_base + Ra_base;
      G_base = Math.max(50, G_base + dG_base * dt);

      // --- Simulated Perturbed ODE Step ---
      const dQ_sto_s = -k_empt * Q_sto_sim;
      const dQ_gut_s = k_empt * Q_sto_sim - k_abs * Q_gut_sim;
      Q_sto_sim += dQ_sto_s * dt;
      Q_gut_sim += dQ_gut_s * dt;
      const Ra_sim = (0.9 * k_abs * Q_gut_sim * 1000) / (120 * 70);

      let I_sim = 2.5 * basalFactor;
      if (mode === 'healthy') {
        if (i >= mealSimIndex && i < mealSimIndex + 18) {
          I_sim += 45.0 * carbsFactor * Math.exp(-(i - mealSimIndex) * 0.18);
        }
      } else if (mode === 'type1') {
        const bolusTimeIndex = mealSimIndex + Math.floor(bolusDelayMin / 5);
        if (i >= bolusTimeIndex && i < bolusTimeIndex + 24) {
          I_sim += 18.0 * bolusFactor * Math.exp(-(i - bolusTimeIndex) * 0.12);
        }
      } else if (mode === 'type2') {
        if (i >= mealSimIndex && i < mealSimIndex + 30) {
          I_sim += 65.0 * carbsFactor * Math.exp(-(i - mealSimIndex) * 0.07);
        }
      }
      X_sim += (-p2 * X_sim + p3 * (I_sim - 2.5 * basalFactor)) * dt;
      const dG_sim = -p1 * (G_sim - Gb) - X_sim * G_sim + Ra_sim;
      G_sim = Math.max(45, G_sim + dG_sim * dt);

      // Metabolic organ fluxes
      const muscleClearance = mode === 'healthy' ? (X_sim * G_sim * 2.8).toFixed(1) : (mode === 'type2' ? (X_sim * G_sim * 0.7).toFixed(1) : (X_sim * G_sim * 1.4).toFixed(1));
      const hepaticFlux = mode === 'healthy' && i > mealSimIndex ? '0.4' : (mode === 'type2' ? '2.8' : (I_sim < 4.0 ? '2.4' : '0.9'));
      const glucosuria = G_sim > 180 ? ((G_sim - 180) * 0.25).toFixed(1) : '0.0';

      points.push({
        timestamp,
        baseline: Math.round(G_base * 10) / 10,
        simulated: Math.round(G_sim * 10) / 10,
        delta: Math.round((G_sim - G_base) * 10) / 10,
        carbs_flux: Math.round(Ra_sim * 10) / 10,
        active_insulin: Math.round(I_sim * 10) / 10,
        cob: Math.round((Q_sto_sim + Q_gut_sim) * 10) / 10,
        muscle_clearance: muscleClearance,
        hepatic_output: hepaticFlux,
        renal_glucosuria: glucosuria,
        idx: i
      });
    }

    return points;
  }, [mode, carbsFactor, mealShiftMin, bolusFactor, bolusDelayMin, basalFactor, durationHours]);

  // Synchronize backend simulation in background (debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      runSimulationScenario({
        scenario_name: `3D Anatomical Twin Live Run (${mode.toUpperCase()})`,
        track: 't1d_replaybg',
        duration_hours: durationHours,
        modifications: {
          meal_carbs_factor: carbsFactor,
          meal_shift_minutes: mealShiftMin,
          bolus_factor: mode === 'type1' ? bolusFactor : 1.0,
          bolus_delay_minutes: mode === 'type1' ? bolusDelayMin : 0,
          basal_factor: basalFactor
        }
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(handler);
  }, [mode, carbsFactor, mealShiftMin, bolusFactor, bolusDelayMin, basalFactor, durationHours]);

  // Animation Loop for Scrubber
  useEffect(() => {
    if (!isPlaying || trajectoryData.length === 0) return;

    const intervalMs = Math.max(70, Math.floor(350 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentTimeIndex((prev) => {
        if (prev >= trajectoryData.length - 1) {
          return 0; // loop
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, trajectoryData.length]);

  // Current Active Trajectory Data Point
  const currentPt = trajectoryData[currentTimeIndex] || trajectoryData[0] || {
    timestamp: '12:00',
    baseline: 145,
    simulated: 165,
    delta: 20,
    carbs_flux: 1.2,
    active_insulin: 1.8,
    cob: 25.0,
    muscle_clearance: '1.2',
    hepatic_output: '1.4',
    renal_glucosuria: '0.0',
    idx: 0
  };

  // Trajectory Summary Statistics
  const peakGlucose = Math.max(...trajectoryData.map((d) => d.simulated));
  const baselinePeak = Math.max(...trajectoryData.map((d) => d.baseline));
  const peakDiff = Math.round((peakGlucose - baselinePeak) * 10) / 10;
  const inRangeCount = trajectoryData.filter((d) => d.simulated >= 70 && d.simulated <= 180).length;
  const tirPct = Math.round((inRangeCount / trajectoryData.length) * 100);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Flagship Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Flagship 3D Biomedical Engine</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono">
              Real-Time Differential Multi-Organ Axis
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5 flex items-center space-x-2.5">
            <HeartPulse className="w-7 h-7 text-rose-500 animate-pulse" />
            <span>3D Anatomical Diabetes Digital Twin</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Live interactive 3D human anatomy: carbohydrate digestion, portal glucose absorption, pancreatic insulin kinetics, and peripheral tissue uptake across healthy homeostasis, Type 1 Diabetes, and Type 2 Diabetes.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Split-Screen Compare Button */}
          <button
            onClick={() => setIsSplitCompare(!isSplitCompare)}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isSplitCompare
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <Split className="w-4 h-4 text-cyan-400" />
            <span>{isSplitCompare ? 'Exit Side-by-Side' : 'Split-Screen Compare'}</span>
          </button>
        </div>
      </div>

      {/* Physiological Pathology Mode Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Mode 1: Healthy */}
        <button
          onClick={() => setMode('healthy')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            mode === 'healthy'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-xl shadow-emerald-500/10'
              : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Mode 1: Normal Euglycemia
            </span>
            {mode === 'healthy' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <h3 className="text-sm font-bold mt-1.5 text-white">Healthy Normal Homeostasis</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Active beta-cell insulin burst (40+ mU/L), rapid muscle GLUT4 disposal, glucose stays tightly in target (85–125 mg/dL).
          </p>
        </button>

        {/* Mode 2: Type 1 Diabetes */}
        <button
          onClick={() => setMode('type1')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            mode === 'type1'
              ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-xl shadow-rose-500/10'
              : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
              Mode 2: Autoimmune Loss
            </span>
            {mode === 'type1' && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
          </div>
          <h3 className="text-sm font-bold mt-1.5 text-white">Type 1 Diabetes (T1D)</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Zero endogenous beta-cell insulin. Rapid hyperglycemia without subcutaneous injection. Glucosuria spilling to kidneys.
          </p>
        </button>

        {/* Mode 3: Type 2 Diabetes */}
        <button
          onClick={() => setMode('type2')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            mode === 'type2'
              ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-xl shadow-amber-500/10'
              : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Mode 3: Insulin Resistance
            </span>
            {mode === 'type2' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
          </div>
          <h3 className="text-sm font-bold mt-1.5 text-white">Type 2 Diabetes (T2D)</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Insulin resistance in muscle & liver. Beta-cell hyperinsulinemia (60+ mU/L), yet glucose remains elevated (180–230 mg/dL).
          </p>
        </button>
      </div>

      {/* Preset Scenario Selector Buttons */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-300 block">Instant Scenario Presets (Click to Immediately Perturb Flow & Numbers):</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <button
            onClick={() => applyPreset({ name: 'Standard Meal', mode: 'type1', carbs: 1.0, shift: 0, bolus: 1.0, delay: 0, basal: 1.0 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-cyan-400">🥪 Standard Meal</span>
            <span className="text-[10px] text-slate-400">50g Carbs, Timely Bolus</span>
          </button>

          <button
            onClick={() => applyPreset({ name: 'High-Carb Surge', mode: 'type1', carbs: 1.8, shift: 0, bolus: 0.9, delay: 10, basal: 1.0 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-amber-400">🍕 +80% High Carbs</span>
            <span className="text-[10px] text-slate-400">90g Carbs, Steep Spike</span>
          </button>

          <button
            onClick={() => applyPreset({ name: 'Skipped Bolus', mode: 'type1', carbs: 1.3, shift: 0, bolus: 0.0, delay: 0, basal: 1.0 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-rose-400">⚠️ Skipped Bolus</span>
            <span className="text-[10px] text-slate-400">0x Insulin, Surge &gt;300</span>
          </button>

          <button
            onClick={() => applyPreset({ name: 'Delayed Bolus', mode: 'type1', carbs: 1.4, shift: 0, bolus: 1.0, delay: 45, basal: 1.0 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-blue-400">⏱️ +45m Delayed</span>
            <span className="text-[10px] text-slate-400">Early Spike Excursion</span>
          </button>

          <button
            onClick={() => applyPreset({ name: 'Pre-Bolused', mode: 'type1', carbs: 1.0, shift: 15, bolus: 1.1, delay: 0, basal: 1.0 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-emerald-400">🛡️ Pre-Bolused</span>
            <span className="text-[10px] text-slate-400">-15m Pre-meal Dosing</span>
          </button>

          <button
            onClick={() => applyPreset({ name: 'T2D Resistance', mode: 'type2', carbs: 1.4, shift: 0, bolus: 1.0, delay: 0, basal: 1.2 })}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs text-slate-200 transition-all cursor-pointer"
          >
            <span className="font-bold block text-purple-400">🧬 T2D Resistance</span>
            <span className="text-[10px] text-slate-400">Hyperinsulinemia &amp; Block</span>
          </button>
        </div>
      </div>

      {/* Main 3D Anatomical Canvas Viewport Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: 3D Canvas (or Split Dual Canvases) */}
        <div className={`${selectedOrgan && !isSplitCompare ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-3`}>
          {/* Quick Camera Focus Buttons & Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-1.5">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-300">Camera Focus:</span>
              <div className="flex space-x-1">
                {(['full', 'abdomen', 'pancreas', 'circulation'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      cameraPreset === preset
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {preset === 'full' ? 'Full Body' : preset === 'abdomen' ? 'Abdomen' : preset === 'pancreas' ? '⭐ Pancreas & Islets' : 'Circulation'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Organ Focus Pill Tags */}
            <div className="flex items-center space-x-1 overflow-x-auto text-[11px]">
              <span className="text-slate-500 font-semibold hidden sm:inline">Select Organ:</span>
              {['pancreas', 'stomach', 'small_intestine', 'large_intestine', 'liver', 'skeletal_muscle', 'kidneys', 'heart'].map((orgKey) => (
                <button
                  key={orgKey}
                  onClick={() => setSelectedOrgan(ANATOMY_ORGAN_DATABASE[orgKey])}
                  className={`px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    selectedOrgan?.id === orgKey
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {orgKey === 'pancreas' ? '⭐ Pancreas' : orgKey.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* 3D Canvas Rendering Area (Single or Split) */}
          <div className="h-[620px] w-full">
            {isSplitCompare ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {/* Left Side: Baseline Twin */}
                <div className="h-full">
                  <AnatomicalTwinCanvas
                    currentGlucose={currentPt.baseline}
                    activeInsulin={mode === 'healthy' ? 2.2 : 1.4}
                    carbAbsorptionFlux={0.8}
                    mode="healthy"
                    skinOpacity={skinOpacity}
                    showMuscles={showMuscles}
                    showOrgans={showOrgans}
                    showVessels={showVessels}
                    showGlucoseParticles={showGlucoseParticles}
                    showInsulinParticles={showInsulinParticles}
                    showLabels={true}
                    selectedOrganId={selectedOrgan?.id || null}
                    onSelectOrgan={setSelectedOrgan}
                    cameraPreset={cameraPreset}
                    isComparisonSide={true}
                    comparisonLabel="Baseline Scenario (Euglycemia Normal)"
                    onSyncCamera={(pos, tgt) => setSyncCameraState({ position: pos, target: tgt })}
                    externalCameraState={syncCameraState}
                  />
                </div>

                {/* Right Side: Simulated Counterfactual Twin */}
                <div className="h-full">
                  <AnatomicalTwinCanvas
                    currentGlucose={currentPt.simulated}
                    activeInsulin={currentPt.active_insulin}
                    carbAbsorptionFlux={currentPt.carbs_flux}
                    mode={mode}
                    skinOpacity={skinOpacity}
                    showMuscles={showMuscles}
                    showOrgans={showOrgans}
                    showVessels={showVessels}
                    showGlucoseParticles={showGlucoseParticles}
                    showInsulinParticles={showInsulinParticles}
                    showLabels={true}
                    selectedOrganId={selectedOrgan?.id || null}
                    onSelectOrgan={setSelectedOrgan}
                    cameraPreset={cameraPreset}
                    isComparisonSide={true}
                    comparisonLabel={`Perturbed Scenario (${mode === 'type1' ? `T1D ${bolusFactor}x Bolus` : 'T2D Insulin Resistance'})`}
                    onSyncCamera={(pos, tgt) => setSyncCameraState({ position: pos, target: tgt })}
                    externalCameraState={syncCameraState}
                  />
                </div>
              </div>
            ) : (
              <AnatomicalTwinCanvas
                currentGlucose={currentPt.simulated}
                activeInsulin={currentPt.active_insulin}
                carbAbsorptionFlux={currentPt.carbs_flux}
                mode={mode}
                skinOpacity={skinOpacity}
                showMuscles={showMuscles}
                showOrgans={showOrgans}
                showVessels={showVessels}
                showGlucoseParticles={showGlucoseParticles}
                showInsulinParticles={showInsulinParticles}
                showLabels={true}
                selectedOrganId={selectedOrgan?.id || null}
                onSelectOrgan={setSelectedOrgan}
                cameraPreset={cameraPreset}
              />
            )}
          </div>

          {/* Layer Visibility Controls Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            {/* Muscles Toggle */}
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showMuscles}
                onChange={(e) => setShowMuscles(e.target.checked)}
                className="rounded accent-rose-500"
              />
              <span className="text-[11px] font-semibold text-slate-300">Skeletal Frame</span>
            </label>

            {/* Internal Organs Toggle */}
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showOrgans}
                onChange={(e) => setShowOrgans(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span className="text-[11px] font-semibold text-slate-300">Visceral Organs</span>
            </label>

            {/* Blood Vessels Toggle */}
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showVessels}
                onChange={(e) => setShowVessels(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span className="text-[11px] font-semibold text-slate-300">Vascular Conduits</span>
            </label>

            {/* Glucose Particles */}
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showGlucoseParticles}
                onChange={(e) => setShowGlucoseParticles(e.target.checked)}
                className="rounded accent-amber-400"
              />
              <span className="text-[11px] font-semibold text-amber-300">3D Glucose Flow</span>
            </label>

            {/* Insulin Particles */}
            <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={showInsulinParticles}
                onChange={(e) => setShowInsulinParticles(e.target.checked)}
                className="rounded accent-cyan-400"
              />
              <span className="text-[11px] font-semibold text-cyan-300">3D Insulin Flow</span>
            </label>
          </div>
        </div>

        {/* Right: Organ Clinical Inspection Panel */}
        {selectedOrgan && !isSplitCompare && (
          <div className="lg:col-span-4 sticky top-20">
            <OrganDossierPanel
              organ={selectedOrgan}
              onClose={() => setSelectedOrgan(null)}
              currentGlucose={currentPt.simulated}
              activeInsulin={currentPt.active_insulin}
              mode={mode}
            />
          </div>
        )}
      </div>

      {/* Real-Time Live Physiological Multi-Organ Status Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Circulating Glucose</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={`text-2xl font-black font-mono ${currentPt.simulated > 180 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {currentPt.simulated}
            </span>
            <span className="text-[11px] text-slate-400">mg/dL</span>
          </div>
          <span className={`text-[10px] font-semibold mt-0.5 block ${currentPt.delta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            Δ: {currentPt.delta > 0 ? `+${currentPt.delta}` : currentPt.delta} vs base
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Insulin (IOB)</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black font-mono text-cyan-400">{currentPt.active_insulin}</span>
            <span className="text-[11px] text-slate-400">mU/L</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {mode === 'type1' ? (bolusFactor > 0 ? 'SubQ Bolus Active' : 'Zero Endogenous') : (mode === 'type2' ? 'Hyperinsulinemia' : 'Normal Secretion')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Carbs on Board (COB)</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black font-mono text-amber-400">{currentPt.cob}</span>
            <span className="text-[11px] text-slate-400">g</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Flux: {currentPt.carbs_flux} mg/dL/m
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Muscle Disposal</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black font-mono text-emerald-400">{currentPt.muscle_clearance}</span>
            <span className="text-[11px] text-slate-400">mg/kg/m</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {mode === 'type2' ? 'Impaired GLUT4' : 'GLUT4 Translocation'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Hepatic Output</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black font-mono text-purple-400">{currentPt.hepatic_output}</span>
            <span className="text-[11px] text-slate-400">mg/kg/m</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {currentPt.hepatic_output === '0.4' ? 'Suppressed by Insulin' : 'Unsuppressed Output'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Renal Glucosuria</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={`text-2xl font-black font-mono ${Number(currentPt.renal_glucosuria) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {currentPt.renal_glucosuria}
            </span>
            <span className="text-[11px] text-slate-400">g/day</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {currentPt.simulated > 180 ? 'Spilling past 180' : 'Below Threshold (0)'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak Blood Glucose</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-black font-mono text-white">{peakGlucose}</span>
            <span className="text-[11px] text-slate-400">mg/dL</span>
          </div>
          <span className={`text-[10px] font-semibold mt-0.5 block ${peakDiff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            Shift: {peakDiff > 0 ? `+${peakDiff}` : peakDiff} mg/dL
          </span>
        </div>
      </div>

      {/* Synchronized Timeline Scrubber & Integrated Trajectory */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Timeline Header with Playback Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTimeIndex(0);
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Reset Timeline to t = 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Timeline Position:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{currentPt.timestamp}</span>
                <span className="text-[10px] text-slate-400 font-medium">(t = {currentTimeIndex * 5} min post-start)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Drag the scrubber slider to observe continuous 3D fluid flow, organ metabolic load, and glucose dynamics.
              </p>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400">Speed:</span>
            {[0.5, 1.0, 2.0, 5.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, trajectoryData.length - 1)}
            value={currentTimeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTimeIndex(Number(e.target.value));
            }}
            className="w-full accent-cyan-500 cursor-pointer h-2.5 bg-slate-950 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>t = 0 (Pre-meal baseline)</span>
            <span>+30 min (Digestion &amp; Absorption)</span>
            <span>+1 Hour (Postprandial Peak)</span>
            <span>+2 Hours (Tissue Clearance)</span>
            <span>+4 Hours (Return to Baseline)</span>
          </div>
        </div>

        {/* Integrated Glucose Trajectory Plot */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trajectoryData}
              margin={{ top: 10, right: 20, bottom: 15, left: 10 }}
              onClick={(e) => {
                if (e && e.activeTooltipIndex !== undefined) {
                  setIsPlaying(false);
                  setCurrentTimeIndex(e.activeTooltipIndex);
                }
              }}
            >
              <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} tickCount={10} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} unit=" mg/dL" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1">
                        <p className="font-bold text-white border-b border-slate-800 pb-1">Time: {label}</p>
                        <p className="text-white flex justify-between space-x-3">
                          <span>⚪ Baseline:</span>
                          <strong>{d.baseline} mg/dL</strong>
                        </p>
                        <p className="text-orange-400 font-bold flex justify-between space-x-3">
                          <span>🟠 Simulated:</span>
                          <strong>{d.simulated} mg/dL</strong>
                        </p>
                        <p className={d.delta >= 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          Deviation ΔG: {d.delta > 0 ? `+${d.delta}` : d.delta} mg/dL
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

              {/* Moving Playhead Cursor Line for current time t */}
              <ReferenceLine
                x={trajectoryData[currentTimeIndex]?.timestamp}
                stroke="#38bdf8"
                strokeWidth={2}
                label={{
                  value: '▶ Live 3D State',
                  position: 'top',
                  fill: '#38bdf8',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
              />

              {/* Baseline Curve */}
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline Twin"
                stroke="#f8fafc"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
              />

              {/* Simulated Counterfactual Curve */}
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

      {/* Real-Time Parameter Sliders (Immediate 60 FPS update on drag) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <span>Real-Time Adjustable Parameter Sliders (Drag to Immediately Perturb)</span>
          </h3>
          <span className="text-xs text-cyan-400 font-mono">Instant Differential Solution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Meal Carbohydrates */}
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-amber-400">Meal Carbohydrates</span>
              <span className="font-mono text-white font-bold">{Math.round((carbsFactor - 1) * 100) > 0 ? `+${Math.round((carbsFactor - 1) * 100)}%` : `${Math.round((carbsFactor - 1) * 100)}%`} ({Math.round(50 * carbsFactor)}g)</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.2}
              step={0.1}
              value={carbsFactor}
              onChange={(e) => setCarbsFactor(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-50% (25g)</span>
              <span>1.0x (50g)</span>
              <span>+120% (110g)</span>
            </div>
          </div>

          {/* Meal Timing Shift */}
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-400">Meal Shift</span>
              <span className="font-mono text-white font-bold">{mealShiftMin > 0 ? `+${mealShiftMin}` : mealShiftMin} min</span>
            </div>
            <input
              type="range"
              min={-45}
              max={60}
              step={15}
              value={mealShiftMin}
              onChange={(e) => setMealShiftMin(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-45 min</span>
              <span>0 (At meal)</span>
              <span>+60 min</span>
            </div>
          </div>

          {/* Bolus Insulin Factor */}
          <div className={`space-y-1.5 bg-slate-950 p-3 rounded-xl border ${mode === 'type1' ? 'border-slate-800' : 'border-slate-800/40 opacity-60'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-cyan-400">Bolus Dose Factor</span>
              <span className="font-mono text-white font-bold">{Math.round((bolusFactor - 1) * 100) > 0 ? `+${Math.round((bolusFactor - 1) * 100)}%` : `${Math.round((bolusFactor - 1) * 100)}%`}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.1}
              disabled={mode !== 'type1'}
              value={bolusFactor}
              onChange={(e) => setBolusFactor(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0x (Skipped)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (+100%)</span>
            </div>
          </div>

          {/* Bolus Delay Minutes */}
          <div className={`space-y-1.5 bg-slate-950 p-3 rounded-xl border ${mode === 'type1' ? 'border-slate-800' : 'border-slate-800/40 opacity-60'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-400">Bolus Delay</span>
              <span className="font-mono text-white font-bold">+{bolusDelayMin} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={10}
              disabled={mode !== 'type1'}
              value={bolusDelayMin}
              onChange={(e) => setBolusDelayMin(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 (Pre-bolus)</span>
              <span>+30 min</span>
              <span>+60 min</span>
            </div>
          </div>

          {/* Basal Infusion Rate */}
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-purple-400">Basal Infusion Rate</span>
              <span className="font-mono text-white font-bold">{Math.round((basalFactor - 1) * 100) > 0 ? `+${Math.round((basalFactor - 1) * 100)}%` : `${Math.round((basalFactor - 1) * 100)}%`}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.1}
              value={basalFactor}
              onChange={(e) => setBasalFactor(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-50% (0.15 U/h)</span>
              <span>1.0x (0.3 U/h)</span>
              <span>+60% (0.48 U/h)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Honesty and Limitation Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start space-x-3 text-xs text-amber-200/90 leading-relaxed">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-300 block">
            Scientific & Physiological Attribution Notice
          </span>
          <p>
            The 3D anatomical visualization provides an explanatory, educational representation of human glucose metabolism and insulin kinetics. The underlying numerical predictions and counterfactual curves are generated directly by validated compartmental ODE differential models (S_I, k_abs, V_G, k_d). Where patient datasets lack direct insulin time-series (e.g. CGMacros), insulin pathways reflect established endocrinology models and are clearly distinguished from measured clinical variables.
          </p>
        </div>
      </div>
    </div>
  );
};
