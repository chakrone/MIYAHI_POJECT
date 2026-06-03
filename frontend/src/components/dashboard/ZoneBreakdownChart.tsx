
import { useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { usePolling } from '../../hooks/usePolling';
import { getMeterBreakdown } from '../../services/api';
import type { MeterBreakdown } from '../../services/api';

/* Colour palette for pie slices — assigned by index */
const SLICE_COLORS = [
  '#3b82f6', '#14b8a6', '#f59e0b', '#6366f1', '#06b6d4',
  '#8b5cf6', '#ec4899', '#22c55e', '#ef4444', '#a855f7',
];

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

export default function ZoneBreakdownChart() {
  const fetchBreakdown = useCallback(() => getMeterBreakdown('24h'), []);
  const { data: breakdown } = usePolling(fetchBreakdown, 10000);

  // Map API data into chart-friendly format with colours
  const zones = (breakdown ?? []).map((b: MeterBreakdown, i: number) => ({
    name: b.label,
    pct: b.pct,
    color: SLICE_COLORS[i % SLICE_COLORS.length],
  }));

  const totalPct = zones.reduce((s: number, z: { pct: number }) => s + z.pct, 0);
  const hasData = zones.length > 0;

  return (
    <div className="card" id="zone-breakdown-chart" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div className="card__title">Meter Breakdown</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          Volume distribution · Last 24h
        </div>
      </div>

      {!hasData ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}>
          Waiting for meter data…
        </div>
      ) : (
        /* Main content: pie + legend side by side */
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
                  {zones.map((z: { name: string; color: string }) => (
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
            {zones.map((z: { name: string; pct: number; color: string }) => (
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
                      {z.name}
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
                    width: `${totalPct > 0 ? (z.pct / totalPct) * 100 : 0}%`,
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
      )}
    </div>
  );
}
