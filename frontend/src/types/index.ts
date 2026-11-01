export interface DatasetOverviewItem {
  id: string;
  name: string;
  source: string;
  diagnosis_group: string;
  records: number;
  participants: number;
  time_coverage: string;
  sampling_frequency: string;
  missing_pct: number;
  features: string[];
  quality_warnings: string[];
}

export interface DatasetAuditReport {
  datasets: DatasetOverviewItem[];
  patient_info: {
    patient: number;
    u2ss: number;
    bw: number;
  };
  scientific_summary: string;
}

export interface DatasetInspectionData {
  id: string;
  name: string;
  total_rows: number;
  columns: string[];
  dtypes: Record<string, string>;
  head: Record<string, any>[];
  summary_stats: Record<string, Record<string, number>>;
  missing_counts: Record<string, number>;
  missing_percentages: Record<string, number>;
  glycemic_ranges: {
    mean: number;
    std: number;
    min: number;
    max: number;
    severe_hypo_pct: number;
    hypo_pct: number;
    tir_pct: number;
    tar_pct: number;
    severe_hyper_pct: number;
  };
}

export interface TrajectoryPoint {
  timestamp: string;
  actual_glucose: number | null;
  predicted_glucose: number;
  lower_bound?: number | null;
  upper_bound?: number | null;
  error?: number | null;
  cho_event?: number | null;
  bolus_event?: number | null;
  basal_rate?: number | null;
}

export interface TrajectoryResponse {
  model_id: string;
  model_name: string;
  horizon_minutes: number;
  trajectory: TrajectoryPoint[];
  metrics_on_window: {
    mae: number;
    rmse: number;
  };
  reference_ranges: Record<string, number>;
  explanation_paragraph: string;
}

export interface ModelComparisonItem {
  model_id: string;
  model_name: string;
  model_type: string;
  dataset_id: string;
  diagnosis_group: string;
  horizon_minutes: number;
  mae: number;
  rmse: number;
  r2: number;
  mard: number;
  training_time_sec: number;
  inference_time_ms: number;
  clarke_zone_a_pct: number;
  clarke_zone_a_b_pct: number;
  clarke_grid?: Record<string, number>;
  is_best: boolean;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  normalized_importance: number;
}

export interface GlobalExplainabilityResponse {
  model_id: string;
  method: string;
  feature_importances: FeatureImportanceItem[];
  correlation_matrix: Record<string, Record<string, number>>;
  shap_summary?: {
    feature: string;
    mean_abs_shap: number;
    sample_points: { feature_val: number; shap_val: number }[];
  }[];
  research_interpretation: string;
}

export interface LocalAttributionItem {
  feature: string;
  friendly_name?: string;
  value: number;
  attribution: number;
  direction: 'increases_glucose' | 'decreases_glucose';
  friendly_effect?: string;
}

export interface LocalExplainabilityResponse {
  model_id: string;
  prediction_index: number;
  timestamp: string;
  actual_glucose: number | null;
  predicted_glucose: number;
  baseline_value: number;
  attributions: LocalAttributionItem[];
  explanation_paragraph: string;
  plain_english_summary?: string;
  clinical_risk_level?: string;
  practical_action_tip?: string;
}

export interface PhysiologicalParameter {
  name: string;
  symbol: string;
  estimated_value: number;
  nominal_value: number;
  unit: string;
  confidence_interval: [number, number];
  description: string;
}

export interface DigitalTwinStateResponse {
  patient_id: string;
  weight_kg: number;
  latest_timestamp: string;
  current_glucose: number;
  glucose_trend_mg_dl_per_5m: number;
  trend_arrow: string;
  carbs_on_board_g: number;
  insulin_on_board_u: number;
  current_basal_rate_u_hr: number;
  estimated_parameters: PhysiologicalParameter[];
  trajectory_replay: TrajectoryPoint[];
  state_description: string;
  limitations_warning: string;
}

export interface WhatIfModification {
  meal_carbs_factor: number;
  meal_shift_minutes: number;
  bolus_factor: number;
  bolus_delay_minutes: number;
  basal_factor: number;
  carbs_offset_g?: number;
  mets_factor?: number;
}

export interface ScenarioTrajectoryPoint {
  timestamp: string;
  actual_glucose?: number | null;
  baseline_glucose: number;
  simulated_glucose: number;
  delta_glucose: number;
  pct_change: number;
  carbs_input: number;
  bolus_input: number;
  basal_input: number;
}

export interface SimulationComparisonMetrics {
  baseline_peak_glucose: number;
  simulated_peak_glucose: number;
  peak_diff_mg_dl: number;
  baseline_time_to_peak_min: number;
  simulated_time_to_peak_min: number;
  time_to_peak_diff_min: number;
  baseline_mean_glucose: number;
  simulated_mean_glucose: number;
  mean_diff_mg_dl: number;
  baseline_auc: number;
  simulated_auc: number;
  auc_diff: number;
  auc_pct_change: number;
  baseline_tir_pct: number;
  simulated_tir_pct: number;
  baseline_tar_pct: number;
  simulated_tar_pct: number;
  baseline_tbr_pct: number;
  simulated_tbr_pct: number;
  max_absolute_diff_mg_dl: number;
  time_of_max_diff: string;
}

export interface SimulationResponse {
  scenario_id: string;
  scenario_name: string;
  track: string;
  modifications: WhatIfModification;
  trajectory: ScenarioTrajectoryPoint[];
  comparison_metrics: SimulationComparisonMetrics;
  natural_language_explanation: string;
  physiological_mechanism_notes: string;
  plain_english_summary?: string;
  actionable_takeaway?: string;
  safety_disclaimer: string;
}
