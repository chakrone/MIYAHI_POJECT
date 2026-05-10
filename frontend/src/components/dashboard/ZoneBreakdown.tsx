import { useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getMeters } from '../../services/api';

const ZONE_COLORS = ['#2196f3', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#10b981'];

export default function ZoneBreakdown() {
  const fetchMeters = useCallback(() => getMeters(), []);
  const { data: meters } = usePolling(fetchMeters, 15000);

  const zoneMap = new Map<string, number>();
  meters?.forEach(m => {
    const zone = m.zone?.name || 'Unknown';
    zoneMap.set(zone, (zoneMap.get(zone) || 0) + 1);
  });

  const data = Array.from(zoneMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="card span-2">
      <div className="card__header">
        <span className="card__title">Zone Distribution</span>
        <div className="card__icon icon-violet"><PieIcon size={18} /></div>
      </div>
      <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
        <ResponsiveContainer width="50%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, paddingLeft: 16 }}>
          {data.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 12, height: 12, borderRadius: 3,
                background: ZONE_COLORS[i % ZONE_COLORS.length]
              }} />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{d.value} meter{d.value > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
