import {
  DatasetAuditReport,
  DatasetOverviewItem,
  DatasetInspectionData,
  TrajectoryResponse,
  ModelComparisonItem,
  GlobalExplainabilityResponse,
  LocalExplainabilityResponse,
  DigitalTwinStateResponse,
  SimulationResponse,
  WhatIfModification
} from '../types';

const API_BASE = '/api';

export async function fetchDatasetAudit(): Promise<DatasetAuditReport> {
  const res = await fetch(`${API_BASE}/dataset/audit`);
  if (!res.ok) throw new Error('Failed to fetch dataset audit report');
  return res.json();
}

export async function fetchDatasetsList(): Promise<DatasetOverviewItem[]> {
  const res = await fetch(`${API_BASE}/dataset/list`);
  if (!res.ok) throw new Error('Failed to fetch datasets list');
  return res.json();
}

export async function fetchDatasetInspection(datasetId: string): Promise<DatasetInspectionData> {
  const res = await fetch(`${API_BASE}/dataset/inspect/${datasetId}`);
  if (!res.ok) throw new Error(`Failed to inspect dataset ${datasetId}`);
  return res.json();
}

export async function trainModel(params: {
  dataset_id: string;
  diagnosis_group?: string;
  model_type: string;
  horizon_minutes?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/models/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to train model');
  return res.json();
}

export async function fetchModelComparison(
  datasetId: string = 'cgmacros',
  diagnosisGroup: string = 'all'
): Promise<ModelComparisonItem[]> {
  const res = await fetch(`${API_BASE}/models/comparison?dataset_id=${datasetId}&diagnosis_group=${diagnosisGroup}`);
  if (!res.ok) throw new Error('Failed to fetch model comparison');
  return res.json();
}

export async function fetchPredictionTrajectory(params: {
  dataset_id?: string;
  diagnosis_group?: string;
  model_type?: string;
  window_points?: number;
}): Promise<TrajectoryResponse> {
  const q = new URLSearchParams({
    dataset_id: params.dataset_id || 'cgmacros',
    diagnosis_group: params.diagnosis_group || 'all',
    model_type: params.model_type || 'xgboost',
    window_points: String(params.window_points || 120)
  });
  const res = await fetch(`${API_BASE}/predict/trajectory?${q}`);
  if (!res.ok) throw new Error('Failed to fetch prediction trajectory');
  return res.json();
}

export async function fetchGlobalExplanation(params: {
  dataset_id?: string;
  diagnosis_group?: string;
  model_type?: string;
}): Promise<GlobalExplainabilityResponse> {
  const q = new URLSearchParams({
    dataset_id: params.dataset_id || 'cgmacros',
    diagnosis_group: params.diagnosis_group || 'all',
    model_type: params.model_type || 'xgboost'
  });
  const res = await fetch(`${API_BASE}/explain/global?${q}`);
  if (!res.ok) throw new Error('Failed to fetch global explanation');
  return res.json();
}

export async function fetchLocalExplanation(params: {
  dataset_id?: string;
  diagnosis_group?: string;
  model_type?: string;
  point_index?: number;
}): Promise<LocalExplainabilityResponse> {
  const q = new URLSearchParams({
    dataset_id: params.dataset_id || 'cgmacros',
    diagnosis_group: params.diagnosis_group || 'all',
    model_type: params.model_type || 'xgboost',
    point_index: String(params.point_index || 0)
  });
  const res = await fetch(`${API_BASE}/explain/local?${q}`);
  if (!res.ok) throw new Error('Failed to fetch local explanation');
  return res.json();
}

export async function fetchDigitalTwinState(): Promise<DigitalTwinStateResponse> {
  const res = await fetch(`${API_BASE}/digital_twin/state`);
  if (!res.ok) throw new Error('Failed to fetch digital twin state');
  return res.json();
}

export async function runSimulationScenario(params: {
  scenario_name: string;
  track?: string;
  duration_hours?: number;
  modifications: WhatIfModification;
}): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_name: params.scenario_name,
      track: params.track || 't1d_replaybg',
      duration_hours: params.duration_hours || 12,
      modifications: params.modifications
    })
  });
  if (!res.ok) throw new Error('Simulation calculation failed');
  return res.json();
}

export async function fetchSavedScenarios(): Promise<SimulationResponse[]> {
  const res = await fetch(`${API_BASE}/simulation/saved`);
  if (!res.ok) throw new Error('Failed to fetch saved scenarios');
  return res.json();
}

export async function fetchResearchInsights(): Promise<any> {
  const res = await fetch(`${API_BASE}/insights`);
  if (!res.ok) throw new Error('Failed to fetch research insights');
  return res.json();
}
