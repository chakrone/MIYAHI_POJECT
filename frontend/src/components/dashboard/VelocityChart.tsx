
import { useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Lock, Maximize2 } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadings } from '../../services/api';


interface Props { meterId: string; }

export default function VelocityChart({ meterId }: Props) {
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const { data: readings } = usePolling(fetchReadings, 15000);

  // Convert readings to chart points — derive velocity from flow_rate
  const chartData: { time: string; velocity: number }[] = [];
  if (readings && readings.length > 0) {
    // Bucket by hour
    const buckets: Record<string, number[]> = {};
    for (const r of readings) {
      const h = new Date(r.time).getHours().toString().padStart(2, '0') + ':00';
      if (!buckets[h]) buckets[h] = [];
      buckets[h].push(r.flow_rate / 60 * 0.8); // approximate velocity from flow
    }
    for (const [h, vals] of Object.entries(buckets).sort()) {
      chartData.push({ time: h, velocity: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) });
    }
  }

  const avg = chartData.length > 0
    ? (chartData.reduce((s, h) => s + h.velocity, 0) / chartData.length).toFixed(2)
    : '—';
  const total = chartData.length > 0
    ? chartData.reduce((s, h) => s + h.velocity, 0).toFixed(2)
    : '—';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="card__title">Velocity</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {chartData.length > 0 ? 'Realtime · last 24 hours' : 'No data available'}
          </div>
        </div>
        <div className="card__actions">
          <button title="Lock"><Lock size={13} /></button>
          <button title="Fullscreen"><Maximize2 size={13} /></button>
        </div>
      </div>
      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid var(--border)' }} />
              <Area type="monotone" dataKey="velocity" stroke="#f59e0b" strokeWidth={2} fill="url(#velGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No velocity data
          </div>
        )}
      </div>
      <div className="chart-footer">
        <div className="chart-legend">
          <div className="chart-legend__dot" style={{ background: '#f59e0b' }} />
          <span>Velocity</span>
        </div>
        <div className="chart-stats">
          <span><small>Avg</small>{avg}</span>
          <span><small>Total</small>{total}</span>
        </div>
      </div>
    </div>
  );
}
