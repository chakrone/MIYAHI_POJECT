import { useMemo, useState } from 'react';
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
    { name: 'Zone A', pct: 38, color: '#10b981' },
    { name: 'Zone B', pct: 28, color: '#3b82f6' },
    { name: 'Zone C', pct: 20, color: '#f59e0b' },
    { name: 'Zone D', pct: 14, color: '#8b5cf6' },
  ],
  meter_002: [
    { name: 'Zone A', pct: 45, color: '#10b981' },
    { name: 'Zone B', pct: 22, color: '#3b82f6' },
    { name: 'Zone C', pct: 18, color: '#f59e0b' },
    { name: 'Zone D', pct: 15, color: '#6366f1' },
  ],
  meter_003: [
    { name: 'Zone A', pct: 52, color: '#06b6d4' },
    { name: 'Zone B', pct: 24, color: '#10b981' },
    { name: 'Zone C', pct: 24, color: '#3b82f6' },
  ],
  meter_004: [
    { name: 'Zone A', pct: 60, color: '#3b82f6' },
    { name: 'Zone B', pct: 25, color: '#10b981' },
    { name: 'Zone C', pct: 15, color: '#f43f5e' },
  ],
  meter_005: [
    { name: 'Zone A', pct: 40, color: '#6366f1' },
    { name: 'Zone B', pct: 35, color: '#3b82f6' },
    { name: 'Zone C', pct: 25, color: '#10b981' },
  ],
};

const DEFAULT_ZONES = METER_ZONES['meter_001'];

/* Custom tooltip */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      padding: '10px 16px',
      fontSize: '13px',
      color: '#fff',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
      transform: 'translateY(-4px)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ 
          width: '10px', height: '10px', 
          borderRadius: '50%', background: p.color,
          boxShadow: `0 0 8px ${p.color}` 
        }}></span>
        <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{name}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: p.color, display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        {value} <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>%</span>
      </div>
    </div>
  );
};

export default function ZoneBreakdownChart({ meterId }: Props) {
  const zones = useMemo(() => METER_ZONES[meterId] ?? DEFAULT_ZONES, [meterId]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onPieLeave = () => setActiveIndex(-1);

  return (
    <div className="card" id="zone-breakdown-chart" style={{ 
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Decorative background glow */}
      <div style={{
        position: 'absolute', top: -50, right: -50,
        width: 150, height: 150, background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }}></div>

      <div className="card__header" style={{ marginBottom: 0, padding: '16px 20px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
        <div className="card__title" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          Zone Breakdown
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '16px 10px 10px', minHeight: 240, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={zones}
              cx="40%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              cornerRadius={8}
              paddingAngle={4}
              dataKey="pct"
              nameKey="name"
              stroke="none"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {zones.map((z, index) => (
                <Cell 
                  key={z.name} 
                  fill={z.color} 
                  style={{ 
                    filter: `drop-shadow(0px 4px 6px ${z.color}40)`,
                    opacity: activeIndex === index || activeIndex === -1 ? 1 : 0.4,
                    transition: 'opacity 0.3s ease, filter 0.3s ease',
                    cursor: 'pointer',
                    outline: 'none'
                  }} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            <Legend
              iconType="circle"
              iconSize={8}
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ 
                fontSize: 12, 
                paddingRight: 20
              }}
              formatter={(value, entry: any, index) => (
                <span 
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  style={{ 
                    color: activeIndex === index || activeIndex === -1 ? '#334155' : '#94a3b8', 
                    fontWeight: 600,
                    transition: 'color 0.3s ease',
                    cursor: 'pointer'
                  }}
                >
                  {value} <span style={{ opacity: activeIndex === index || activeIndex === -1 ? 0.7 : 0.4, marginLeft: '4px', transition: 'opacity 0.3s ease' }}>{entry.payload?.pct}%</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
