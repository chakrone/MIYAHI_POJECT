
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

interface Props { meterId: string; }

/* Each meter has sub-meter measurement points.
   Replace with a real /api/zones/{meterId}/breakdown endpoint when available. */
const METER_ZONES: Record<string, { name: string; pct: number; color: string }[]> = {
  meter_001: [
    { name: 'Meter 001-A', pct: 38, color: '#3b82f6' },
    { name: 'Meter 001-B', pct: 28, color: '#14b8a6' },
    { name: 'Meter 001-C', pct: 20, color: '#f59e0b' },
    { name: 'Meter 001-D', pct: 14, color: '#6366f1' },
  ],
  meter_002: [
    { name: 'Meter 002-A', pct: 45, color: '#3b82f6' },
    { name: 'Meter 002-B', pct: 22, color: '#14b8a6' },
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
  const totalPct = zones.reduce((s, z) => s + z.pct, 0);

  // Format meter label
  const meterLabel = meterId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="card" id="zone-breakdown-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div className="card__title">Meter Breakdown</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          Sub-meter distribution · {meterLabel}
        </div>
      </div>

      {/* Main content: pie + legend side by side */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 0,
      }}>
        {/* Pie chart */}
        <div style={{ flex: '0 0 55%', height: '100%', minHeight: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={zones}
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="80%"
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
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with bar indicators */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          justifyContent: 'center',
          paddingRight: 4,
        }}>
          {zones.map(z => (
            <div key={z.name}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: z.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {z.name.split('-').pop()}
                  </span>
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginLeft: 8,
                }}>
                  {z.pct}%
                </span>
              </div>
              {/* Mini progress bar */}
              <div style={{
                height: 4,
                borderRadius: 99,
                background: 'var(--bg-muted)',
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
              }}>
                <div style={{
                  width: `${(z.pct / totalPct) * 100}%`,
                  height: '100%',
                  borderRadius: 99,
                  background: z.color,
                  transition: 'width .6s cubic-bezier(.4,0,.2,1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
