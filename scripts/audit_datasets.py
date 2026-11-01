import json
import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def audit():
    report = {}
    print("=" * 80)
    print("PHASE 1: SCIENTIFIC DATASET AUDIT AND VERIFICATION")
    print("=" * 80)

    # 1. Patient Info
    patient_info_path = os.path.join(BASE_DIR, "patient_info.csv")
    df_patient = pd.read_csv(patient_info_path)
    print("\n--- PATIENT INFO ---")
    print(df_patient.to_string())
    report["patient_info"] = df_patient.to_dict(orient="records")

    # 2. ReplayBG Day files
    t1d_files = {
        "day_1": os.path.join(BASE_DIR, "data_day_1.csv"),
        "day_2": os.path.join(BASE_DIR, "data_day_2.csv"),
        "day_1_extended": os.path.join(BASE_DIR, "data_day_1_extended.csv")
    }
    
    t1d_dfs = {}
    for name, path in t1d_files.items():
        df = pd.read_csv(path)
        df['t_parsed'] = pd.to_datetime(df['t'], format="%d-%b-%Y %H:%M:%S")
        df['t_diff_min'] = df['t_parsed'].diff().dt.total_seconds() / 60.0
        t1d_dfs[name] = df
        
        print(f"\n--- REPLAYBG: {name.upper()} ---")
        print(f"File: {os.path.basename(path)}")
        print(f"Shape: {df.shape[0]} rows, {df.shape[1] - 2} columns (excluding parsed)")
        print(f"Columns: {list(df.columns[:-2])}")
        print(f"Time Range: {df['t_parsed'].min()} to {df['t_parsed'].max()} (Duration: {(df['t_parsed'].max() - df['t_parsed'].min())})")
        print(f"Sampling interval (minutes): median={df['t_diff_min'].median()}, min={df['t_diff_min'].min()}, max={df['t_diff_min'].max()}, std={df['t_diff_min'].std():.4f}")
        
        # Missing values
        missing_s = df.drop(columns=['t_parsed', 't_diff_min']).isna().sum()
        missing_pct = (missing_s / len(df) * 100).round(2)
        missing_df = pd.DataFrame({"Missing Count": missing_s, "Missing %": missing_pct})
        print("Missing Values:\n", missing_df.to_string())
        
        # Glucose stats
        valid_g = df['glucose'].dropna()
        if len(valid_g) > 0:
            print(f"Glucose: count={len(valid_g)}, mean={valid_g.mean():.1f}, std={valid_g.std():.1f}, min={valid_g.min():.1f}, median={valid_g.median():.1f}, max={valid_g.max():.1f}")
            # Ranges
            hypo = (valid_g < 70).sum()
            eugly = ((valid_g >= 70) & (valid_g <= 180)).sum()
            hyper = (valid_g > 180).sum()
            print(f"TIR Ranges: Hypo (<70): {hypo} ({hypo/len(valid_g)*100:.1f}%), In-Range (70-180): {eugly} ({eugly/len(valid_g)*100:.1f}%), Hyper (>180): {hyper} ({hyper/len(valid_g)*100:.1f}%)")
        
        # Carbohydrate events
        cho_events = df[df['cho'] > 0]
        print(f"Carb events (cho > 0): {len(cho_events)} events, Total CHO = {df['cho'].sum():.1f}g")
        if len(cho_events) > 0:
            print(cho_events[['t', 'cho', 'cho_label']].to_string())

        # Bolus events
        bolus_events = df[df['bolus'] > 0]
        print(f"Bolus events (bolus > 0): {len(bolus_events)} events, Total Bolus = {df['bolus'].sum():.2f} U")
        if len(bolus_events) > 0:
            print(bolus_events[['t', 'bolus', 'bolus_label']].to_string())
            
        # Basal rates
        print(f"Basal: mean={df['basal'].mean():.4f} U/5min, sum={df['basal'].sum():.2f} U")

    # 3. Compare ReplayBG files for overlap and relationship
    print("\n" + "=" * 50)
    print("REPLAYBG FILES RELATIONSHIP & OVERLAP ANALYSIS")
    print("=" * 50)
    d1 = t1d_dfs["day_1"]
    d2 = t1d_dfs["day_2"]
    d_ext = t1d_dfs["day_1_extended"]

    print(f"Day 1 span: {d1['t_parsed'].min()} to {d1['t_parsed'].max()} ({len(d1)} rows)")
    print(f"Day 2 span: {d2['t_parsed'].min()} to {d2['t_parsed'].max()} ({len(d2)} rows)")
    print(f"Day 1 Extended span: {d_ext['t_parsed'].min()} to {d_ext['t_parsed'].max()} ({len(d_ext)} rows)")

    # Check intersection of timestamps
    d1_ts = set(d1['t'])
    d2_ts = set(d2['t'])
    ext_ts = set(d_ext['t'])
    
    print(f"Overlap between Day 1 and Day 2: {len(d1_ts.intersection(d2_ts))} timestamps")
    print(f"Day 1 in Extended: {len(d1_ts.intersection(ext_ts))} / {len(d1_ts)} ({len(d1_ts - ext_ts)} missing from ext)")
    print(f"Day 2 in Extended: {len(d2_ts.intersection(ext_ts))} / {len(d2_ts)} ({len(d2_ts - ext_ts)} missing from ext)")
    print(f"Extended timestamps count: {len(ext_ts)}")
    print(f"Union of Day 1 and Day 2 timestamps count: {len(d1_ts.union(d2_ts))}")
    
    # Are values in Day 1 identical to Day 1 Extended for matching timestamps?
    merged_d1_ext = pd.merge(d1, d_ext, on='t', suffixes=('_d1', '_ext'))
    diff_glucose = (merged_d1_ext['glucose_d1'] != merged_d1_ext['glucose_ext']) & ~(merged_d1_ext['glucose_d1'].isna() & merged_d1_ext['glucose_ext'].isna())
    diff_cho = merged_d1_ext['cho_d1'] != merged_d1_ext['cho_ext']
    diff_bolus = merged_d1_ext['bolus_d1'] != merged_d1_ext['bolus_ext']
    diff_basal = merged_d1_ext['basal_d1'] != merged_d1_ext['basal_ext']
    print(f"Differences Day 1 vs Extended: glucose={diff_glucose.sum()}, cho={diff_cho.sum()}, bolus={diff_bolus.sum()}, basal={diff_basal.sum()}")

    # Check gap between Day 1 and Day 2
    gap_min = (d2['t_parsed'].min() - d1['t_parsed'].max()).total_seconds() / 60.0
    print(f"Time gap between Day 1 end ({d1['t_parsed'].max()}) and Day 2 start ({d2['t_parsed'].min()}): {gap_min} minutes ({gap_min/60.0:.2f} hours)")

    # What does Extended have in that gap?
    ext_in_gap = d_ext[(d_ext['t_parsed'] > d1['t_parsed'].max()) & (d_ext['t_parsed'] < d2['t_parsed'].min())]
    print(f"Rows in Extended strictly between Day 1 end and Day 2 start: {len(ext_in_gap)}")
    if len(ext_in_gap) > 0:
        print(f"Gap rows span: {ext_in_gap['t_parsed'].min()} to {ext_in_gap['t_parsed'].max()}")
        print(ext_in_gap[['t', 'glucose', 'cho', 'bolus', 'basal']].head(10).to_string())

    # 4. CGMacros Dataset Inspection
    print("\n" + "=" * 50)
    print("CGMACROS DEMO DATASET AUDIT")
    print("=" * 50)
    cg_meta_path = os.path.join(BASE_DIR, "cgmacros_demo.metadata.json")
    with open(cg_meta_path, 'r') as f:
        cg_meta = json.load(f)
    print("Metadata JSON:")
    print(json.dumps(cg_meta, indent=2))

    cg_path = os.path.join(BASE_DIR, "cgmacros_demo.csv")
    df_cg = pd.read_csv(cg_path)
    print(f"\nCGMacros CSV shape: {df_cg.shape[0]} rows, {df_cg.shape[1]} columns")
    print(f"Columns: {list(df_cg.columns)}")
    
    # Missing values
    cg_missing = df_cg.isna().sum()
    cg_missing_pct = (cg_missing / len(df_cg) * 100).round(2)
    cg_miss_df = pd.DataFrame({"Missing Count": cg_missing, "Missing %": cg_missing_pct})
    print("CGMacros Missing Values (showing non-zero):\n", cg_miss_df[cg_miss_df['Missing Count'] > 0].to_string())

    # Participants and Diagnosis groups
    print("\nDiagnosis Group Breakdown:")
    group_summary = df_cg.groupby(['participant_id', 'diagnosis']).agg(
        rows=('glucose_mg_dl', 'count'),
        start_time=('timestamp', 'min'),
        end_time=('timestamp', 'max'),
        glucose_mean=('glucose_mg_dl', 'mean'),
        glucose_std=('glucose_mg_dl', 'std'),
        glucose_min=('glucose_mg_dl', 'min'),
        glucose_max=('glucose_mg_dl', 'max'),
        age=('age', 'first'),
        bmi=('bmi', 'first'),
        hba1c=('hba1c', 'first'),
        fasting_glucose=('fasting_glucose', 'first'),
        fasting_insulin=('fasting_insulin', 'first')
    )
    print(group_summary.to_string())

    # Check sampling frequency in CGMacros per participant
    print("\nCGMacros Sampling Interval per Participant:")
    for pid, pdf in df_cg.groupby('participant_id'):
        ts = pd.to_datetime(pdf['timestamp'])
        diffs = ts.diff().dt.total_seconds() / 60.0
        print(f"Participant {pid} ({pdf['diagnosis'].iloc[0]}): median interval = {diffs.median()} min, min={diffs.min()}, max={diffs.max()}, value counts of interval:\n{diffs.value_counts().head(5)}")

    # Target 30m alignment check
    print("\nTarget 30m vs Future Glucose verification:")
    for pid, pdf in df_cg.groupby('participant_id'):
        pdf_sorted = pdf.copy().sort_values('timestamp').reset_index(drop=True)
        # Check if target_30m equals glucose_mg_dl shifted by 30 rows (if 1 min interval) or 6 rows (if 5 min interval)
        ts = pd.to_datetime(pdf_sorted['timestamp'])
        ts_target = pd.to_datetime(pdf_sorted['target_timestamp'])
        time_to_target = (ts_target - ts).dt.total_seconds() / 60.0
        print(f"Participant {pid}: Target timestamp diff in minutes: min={time_to_target.min()}, median={time_to_target.median()}, max={time_to_target.max()}")
        
        # Check matching between target_30m and actual future glucose
        # Merge on timestamp == target_timestamp
        merged = pd.merge(
            pdf_sorted[['timestamp', 'glucose_mg_dl', 'target_30m', 'target_timestamp']],
            pdf_sorted[['timestamp', 'glucose_mg_dl']],
            left_on='target_timestamp',
            right_on='timestamp',
            suffixes=('', '_future_actual')
        )
        diff_target = (merged['target_30m'] - merged['glucose_mg_dl_future_actual']).abs()
        print(f"Participant {pid}: Difference between target_30m and actual glucose at target_timestamp: max diff={diff_target.max():.4f}, mean diff={diff_target.mean():.4f}")

if __name__ == "__main__":
    audit()
