
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Lock, Maximize2 } from 'lucide-react';


interface Props { meterId: string; }

export default function VelocityChart({ meterId }: Props) {
  void meterId; // satisfy TS for unused prop

  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = (6 + (i % 12)).toString().padStart(2, '0');
    const minute = i < 12 ? '00' : '30';
    const base = 0.3 + Math.sin(i * 0.4) * 0.5 + Math.random() * 0.3;
    return { time: `${h}:${minute}`, velocity: parseFloat(Math.max(0, base).toFixed(2)) };
  });

  const avg = (hours.reduce((s, h) => s + h.velocity, 0) / hours.length).toFixed(2);
  const total = hours.reduce((s, h) => s + h.velocity, 0).toFixed(2);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="card__title">Velocity</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Realtime · last 12 hours</div>
        </div>
        <div className="card__actions">
          <button title="Lock"><Lock size={13} /></button>
          <button title="Fullscreen"><Maximize2 size={13} /></button>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hours}>
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
