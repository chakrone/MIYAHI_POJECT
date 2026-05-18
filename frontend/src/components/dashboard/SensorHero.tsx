
import { Droplets, Activity, Gauge } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';


interface Props { meterId: string; }

export default function SensorHero({ meterId }: Props) {
  void meterId; // satisfy TS for unused prop

  const velocity = 0.4 + Math.random() * 0.3;
  const flow = 2.5 + Math.random() * 1.5;
  const todayConsumption = 118.8;
  const positiveCum = 11466.7;
  const negativeCum = 0.0;
  const cumulativeTotal = positiveCum - negativeCum;

  // Generate 12h consumption data
  const hours = Array.from({ length: 12 }, (_, i) => {
    const h = (6 + i).toString().padStart(2, '0');
    const base = 20000 + Math.sin(i * 0.8) * 15000 + Math.random() * 10000;
    return { hour: `${h}:00`, volume: parseFloat(base.toFixed(0)) };
  });

  const dailyTotal = hours.reduce((s, h) => s + h.volume, 0);

  return (
    <div className="sensor-hero">
      {/* Sensor Image */}
      <div className="sensor-image-card">
        <img src="/images/water-meter.png" alt="Water Flow Meter Sensor" />
      </div>

      {/* Live Metrics */}
      <div className="live-metrics">
        <div className="metric-row">
          <div className="metric-row__icon"><Activity size={18} /></div>
          <div>
            <div className="metric-row__label">Velocity</div>
            <div className="metric-row__sublabel">Last update 3m ago</div>
          </div>
          <div className="metric-row__value">
            {velocity.toFixed(1)}<span className="metric-row__unit">m/s</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-row__icon"><Droplets size={18} /></div>
          <div>
            <div className="metric-row__label">Flow</div>
            <div className="metric-row__sublabel">Last update 3m ago</div>
          </div>
          <div className="metric-row__value">
            {flow.toFixed(1)}<span className="metric-row__unit">m³/hr</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-row__icon" style={{ background: '#2563eb' }}>
            <Gauge size={18} />
          </div>
          <div>
            <div className="metric-row__label">Today Consumption</div>
          </div>
          <div className="metric-row__value">
            {todayConsumption.toFixed(1)}<span className="metric-row__unit">m³</span>
          </div>
        </div>
      </div>

      {/* Cumulative Stats */}
      <div className="cumulative-stats">
        <div className="cumstat-item">
          <div className="cumstat-item__value">{positiveCum.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Positive Cumulative</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value">{negativeCum.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Negative Cumulative</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value">{cumulativeTotal.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Cumulative Total</div>
        </div>
      </div>

      {/* Consumption Bar Chart */}
      <div className="card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div className="card__title">Consumption</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Realtime · last 12 hours</div>
          </div>
        </div>
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
              <Bar dataKey="volume" fill="#2563eb" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, marginTop: 4, gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>● Daily Consumption</span>
          <span style={{ fontWeight: 700 }}>{dailyTotal.toLocaleString()} m³</span>
        </div>
      </div>
    </div>
  );
}
