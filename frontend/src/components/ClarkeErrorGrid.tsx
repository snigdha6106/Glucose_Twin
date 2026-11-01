import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export type ClarkeZone = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Assigns each (reference, predicted) glucose pair to a Clarke Error Grid zone:
 * - Zone A: Clinically accurate (within 20% or ref <= 70 and pred <= 70)
 * - Zone E: Erroneous treatment (opposite clinical direction)
 * - Zone D: Failure to detect hypoglycemia or hyperglycemia
 * - Zone C: Overcorrection errors
 * - Zone B: Benign errors (acceptable, safe)
 */
export const getClarkeZone = (ref: number, pred: number): ClarkeZone => {
  // Zone A: Clinically accurate
  if ((ref <= 70.0 && pred <= 70.0) || Math.abs(pred - ref) <= 0.20 * ref) {
    return 'A';
  }
  // Zone E: Erroneous treatment (opposite clinical direction)
  if ((ref <= 70.0 && pred >= 180.0) || (ref >= 180.0 && pred <= 70.0)) {
    return 'E';
  }
  // Zone D: Failure to detect hypoglycemia or hyperglycemia
  if ((ref < 70.0 && pred > 70.0) || (ref > 240.0 && pred >= 70.0 && pred <= 180.0)) {
    return 'D';
  }
  // Zone C: Overcorrection errors
  if (ref >= 70.0 && ref <= 290.0 && (pred >= ref + 110.0 || pred <= (7.0 / 9.0) * ref - 18.2)) {
    return 'C';
  }
  // Zone B: Benign deviation (all other points)
  return 'B';
};

export const ZONE_DETAILS: Record<ClarkeZone, {
  name: string;
  clinicalMeaning: string;
  actionRisk: string;
  color: string;
  tailwindBg: string;
  tailwindBorder: string;
  tailwindText: string;
}> = {
  A: {
    name: 'Zone A',
    clinicalMeaning: 'Clinically Accurate',
    actionRisk: 'Within 20% of reference or ≤70 mg/dL. Leads to correct clinical decisions.',
    color: '#10b981', // Emerald Green
    tailwindBg: 'bg-emerald-500/15',
    tailwindBorder: 'border-emerald-500/30',
    tailwindText: 'text-emerald-400',
  },
  B: {
    name: 'Zone B',
    clinicalMeaning: 'Benign Errors',
    actionRisk: 'Outside 20% margin, but leads to benign or no clinical action deviation.',
    color: '#38bdf8', // Sky Blue
    tailwindBg: 'bg-sky-500/15',
    tailwindBorder: 'border-sky-500/30',
    tailwindText: 'text-sky-400',
  },
  C: {
    name: 'Zone C',
    clinicalMeaning: 'Overcorrection Risk',
    actionRisk: 'Error would prompt unnecessary corrective insulin bolus or carbs.',
    color: '#f59e0b', // Amber Yellow
    tailwindBg: 'bg-amber-500/15',
    tailwindBorder: 'border-amber-500/30',
    tailwindText: 'text-amber-400',
  },
  D: {
    name: 'Zone D',
    clinicalMeaning: 'Failure to Detect',
    actionRisk: 'Fails to detect dangerous hypoglycemia (<70) or hyperglycemia (>240).',
    color: '#f97316', // Orange
    tailwindBg: 'bg-orange-500/15',
    tailwindBorder: 'border-orange-500/30',
    tailwindText: 'text-orange-400',
  },
  E: {
    name: 'Zone E',
    clinicalMeaning: 'Erroneous Treatment',
    actionRisk: 'Treatment is opposite to what is required (e.g. giving insulin during hypoglycemia).',
    color: '#ef4444', // Red
    tailwindBg: 'bg-rose-500/15',
    tailwindBorder: 'border-rose-500/30',
    tailwindText: 'text-rose-400',
  },
};

interface ClarkeErrorGridProps {
  dataPoints: { actual: number; predicted: number }[];
  zonePercentages?: { A: number; B: number; C: number; D: number; E: number };
}

export const ClarkeErrorGrid: React.FC<ClarkeErrorGridProps> = ({
  dataPoints,
  zonePercentages
}) => {
  // Validate and classify points into Clarke zones
  const validPoints = dataPoints.filter(
    p => p.actual !== null && p.predicted !== null && !isNaN(p.actual) && !isNaN(p.predicted)
  );

  const pointsWithZones = validPoints.map((p, idx) => {
    const x = Math.round(p.actual * 10) / 10;
    const y = Math.round(p.predicted * 10) / 10;
    const zone = getClarkeZone(x, y);
    return {
      x,
      y,
      zone,
      color: ZONE_DETAILS[zone].color,
      id: idx + 1
    };
  });

  // Calculate empirical counts and percentages from points
  const counts: Record<ClarkeZone, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  pointsWithZones.forEach(pt => {
    counts[pt.zone]++;
  });

  const total = pointsWithZones.length;
  const computedPct = total > 0 ? {
    A: Math.round((counts.A / total) * 1000) / 10,
    B: Math.round((counts.B / total) * 1000) / 10,
    C: Math.round((counts.C / total) * 1000) / 10,
    D: Math.round((counts.D / total) * 1000) / 10,
    E: Math.round((counts.E / total) * 1000) / 10,
  } : (zonePercentages || { A: 0, B: 0, C: 0, D: 0, E: 0 });

  // Sample points for smooth rendering
  const plotData = pointsWithZones.slice(0, 350);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header and Zone Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Clarke Error Grid Analysis (EGA)</span>
            <span className="text-xs font-normal text-slate-400">Clinical Consensus Validation</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Colored circles visualize the clinical severity zone for each paired continuous glucose reading.
          </p>
        </div>

        {/* Zone Badges with Colored Circle Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {(['A', 'B', 'C', 'D', 'E'] as ClarkeZone[]).map((z) => {
            const conf = ZONE_DETAILS[z];
            const pct = computedPct[z] ?? 0;
            const count = counts[z] ?? 0;
            return (
              <div
                key={z}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${conf.tailwindBg} ${conf.tailwindBorder} ${conf.tailwindText}`}
                title={`${conf.name}: ${conf.clinicalMeaning} - ${conf.actionRisk}`}
              >
                {/* Colored Circle Indicator */}
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm flex-shrink-0"
                  style={{ backgroundColor: conf.color }}
                />
                <span>{conf.name}:</span>
                <span className="font-bold font-mono">{pct}%</span>
                <span className="text-[10px] opacity-75 font-normal">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Scatter Plot */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 25, bottom: 25, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Reference Glucose"
              unit=" mg/dL"
              domain={[0, 400]}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: 'Reference Continuous Glucose (mg/dL)',
                position: 'insideBottom',
                offset: -12,
                fill: '#94a3b8',
                fontSize: 12
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Predicted Glucose"
              unit=" mg/dL"
              domain={[0, 400]}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: 'Predicted Glucose (mg/dL)',
                angle: -90,
                position: 'insideLeft',
                offset: -5,
                fill: '#94a3b8',
                fontSize: 12
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#64748b' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const conf = ZONE_DETAILS[d.zone as ClarkeZone] || ZONE_DETAILS.A;
                  const absDiff = Math.abs(d.y - d.x).toFixed(1);
                  const relPct = d.x > 0 ? ((Math.abs(d.y - d.x) / d.x) * 100).toFixed(1) : '0.0';
                  return (
                    <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
                        <span className="font-bold text-white">Observation #{d.id}</span>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: conf.color }}
                          />
                          <span className={`font-bold ${conf.tailwindText}`}>{conf.name}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="flex justify-between space-x-4 text-slate-300">
                          <span>Reference Glucose:</span>
                          <span className="font-mono font-bold text-white">{d.x} mg/dL</span>
                        </p>
                        <p className="flex justify-between space-x-4 text-slate-300">
                          <span>Predicted Glucose:</span>
                          <span className="font-mono font-bold text-cyan-400">{d.y} mg/dL</span>
                        </p>
                        <p className="flex justify-between space-x-4 text-slate-400 pt-1 border-t border-slate-800/80">
                          <span>Absolute Error:</span>
                          <span className="font-mono font-bold text-amber-300">
                            {absDiff} mg/dL ({relPct}%)
                          </span>
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
                        <span className="font-bold text-slate-300">{conf.clinicalMeaning}:</span>{' '}
                        {conf.actionRisk}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Identity diagonal (y = x, perfect agreement) */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 400, y: 400 }]}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Upper 20% Zone A boundary (y = 1.2x) */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 333.3, y: 400 }]}
              stroke="#10b981"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />

            {/* Lower 20% Zone A boundary (y = 0.8x) */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 400, y: 320 }]}
              stroke="#10b981"
              strokeWidth={1.2}
              strokeDasharray="3 3"
            />

            {/* Zone C upper line: y = x + 110 */}
            <ReferenceLine
              segment={[{ x: 70, y: 180 }, { x: 290, y: 400 }]}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeOpacity={0.6}
            />

            {/* Zone C lower line: y = (7/9)*x - 18.2 */}
            <ReferenceLine
              segment={[{ x: 70, y: 36.2 }, { x: 400, y: 292.9 }]}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeOpacity={0.6}
            />

            {/* Hypoglycemia threshold: 70 mg/dL */}
            <ReferenceLine x={70} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" strokeOpacity={0.35} />
            <ReferenceLine y={70} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" strokeOpacity={0.35} />

            {/* Hyperglycemia threshold: 180 mg/dL */}
            <ReferenceLine y={180} stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 2" strokeOpacity={0.3} />

            {/* Scatter points rendered as colored circles representing clinical zones */}
            <Scatter
              name="Observations"
              data={plotData}
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
                  return <g />;
                }
                const fill = payload?.color || '#10b981';
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={fill}
                    stroke="#020617"
                    strokeWidth={1}
                    fillOpacity={0.88}
                  />
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Clinical Zone Explanation Legend with Colored Circle Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2 text-[11px] text-slate-300">
        {(['A', 'B', 'C', 'D', 'E'] as ClarkeZone[]).map((z) => {
          const conf = ZONE_DETAILS[z];
          const pct = computedPct[z] ?? 0;
          return (
            <div
              key={z}
              className={`p-3 rounded-xl border ${conf.tailwindBg} ${conf.tailwindBorder} space-y-1.5`}
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm flex-shrink-0"
                  style={{ backgroundColor: conf.color }}
                />
                <span className={conf.tailwindText}>
                  {conf.name}: {conf.clinicalMeaning}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                {conf.actionRisk}
              </p>
              <div className="pt-1 border-t border-slate-800/60 text-[10px] font-mono font-bold flex justify-between text-slate-300">
                <span>Distribution:</span>
                <span className={conf.tailwindText}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
