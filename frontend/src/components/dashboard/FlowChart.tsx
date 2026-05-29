
import { useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Lock, Maximize2 } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadings } from '../../services/api';


interface Props { meterId: string; }

export default function FlowChart({ meterId }: Props) {
  const fetchReadings = useCallback(() => getReadings(meterId, '1h'), [meterId]);
  const { data: readings } = usePolling(fetchReadings, 2000);

  // Bucket readings by minute
  const chartData: { time: string; flow: number }[] = [];
  if (readings && readings.length > 0) {
    const buckets: Record<string, number[]> = {};
    for (const r of readings) {
      const date = new Date(r.time);
      const m = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
      if (!buckets[m]) buckets[m] = [];
      buckets[m].push(r.flow_rate);
    }
    for (const [m, vals] of Object.entries(buckets).sort()) {
      chartData.push({ time: m, flow: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) });
    }
  }

  const avg = chartData.length > 0
    ? (chartData.reduce((s, h) => s + h.flow, 0) / chartData.length).toFixed(2)
    : '—';
  const total = chartData.length > 0
    ? chartData.reduce((s, h) => s + h.flow, 0).toFixed(2)
    : '—';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="card__title">Flow</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {chartData.length > 0 ? 'Live · Last hour' : 'No data available'}
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
            <BarChart data={chartData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid var(--border)' }} />
              <Bar dataKey="flow" fill="#2563eb" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No flow data
          </div>
        )}
      </div>
      <div className="chart-footer">
        <div className="chart-legend">
          <div className="chart-legend__dot" style={{ background: '#2563eb' }} />
          <span>Flow</span>
        </div>
        <div className="chart-stats">
          <span><small>Avg</small>{avg}</span>
          <span><small>Total</small>{total}</span>
        </div>
      </div>
    </div>
  );
}
