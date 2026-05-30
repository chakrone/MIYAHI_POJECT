
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Props { meterId: string; }

/* Each meter has named measurement points / sub-meters.
   We use a deterministic split seeded by meter_id so each meter
   looks different while data comes from the actual zone breakdown.
   Replace this with a real /api/zones/{meterId}/breakdown endpoint when available. */
const METER_ZONES: Record<string, { name: string; pct: number; color: string }[]> = {
  meter_001: [
    { name: 'Meter 001-A', pct: 38, color: '#14b8a6' },
    { name: 'Meter 001-B', pct: 28, color: '#3b82f6' },
    { name: 'Meter 001-C', pct: 20, color: '#f59e0b' },
    { name: 'Meter 001-D', pct: 14, color: '#6b7280' },
  ],
  meter_002: [
    { name: 'Meter 002-A', pct: 45, color: '#14b8a6' },
    { name: 'Meter 002-B', pct: 22, color: '#3b82f6' },
    { name: 'Meter 002-C', pct: 18, color: '#f59e0b' },
    { name: 'Meter 002-D', pct: 15, color: '#8b5cf6' },
  ],
  meter_003: [
    { name: 'Meter 003-A', pct: 52, color: '#06b6d4' },
    { name: 'Meter 003-B', pct: 24, color: '#14b8a6' },
    { name: 'Meter 003-C', pct: 24, color: '#3b82f6' },
  ],
  meter_004: [
    { name: 'Meter 004-A', pct: 60, color: '#3b82f6' },
    { name: 'Meter 004-B', pct: 25, color: '#14b8a6' },
    { name: 'Meter 004-C', pct: 15, color: '#6b7280' },
  ],
  meter_005: [
    { name: 'Meter 005-A', pct: 40, color: '#6366f1' },
    { name: 'Meter 005-B', pct: 35, color: '#3b82f6' },
    { name: 'Meter 005-C', pct: 25, color: '#14b8a6' },
  ],
};

const DEFAULT_ZONES = METER_ZONES['meter_001'];

/* Custom tooltip */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{
      background: 'rgba(17,24,39,.92)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 8, padding: '8px 14px',
      fontSize: 12, color: 'white',
    }}>
      <span style={{ color: p.color, fontWeight: 700 }}>● </span>
      <strong>{name}</strong>: {value}%
    </div>
  );
};

export default function ZoneBreakdownChart({ meterId }: Props) {
  const zones = useMemo(() => METER_ZONES[meterId] ?? DEFAULT_ZONES, [meterId]);

  return (
    <div className="card" id="zone-breakdown-chart">
      <div className="card__title" style={{ marginBottom: 12 }}>Zone Breakdown</div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={zones}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="82%"
              dataKey="pct"
              nameKey="name"
              paddingAngle={3}
              stroke="none"
            >
              {zones.map((z) => (
                <Cell key={z.name} fill={z.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(value, entry: any) => (
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {value} {entry.payload?.pct}%
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
