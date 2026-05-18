
import { useCallback } from 'react';
import { Droplets, Activity, Gauge } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { usePolling } from '../../hooks/usePolling';
import { getReadings, getLatestReading } from '../../services/api';


interface Props { meterId: string; }

export default function SensorHero({ meterId }: Props) {
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const fetchLatest = useCallback(() => getLatestReading(meterId), [meterId]);
  const { data: readings } = usePolling(fetchReadings, 15000);
  const { data: latest } = usePolling(fetchLatest, 5000);

  const velocity = latest ? (latest.flow_rate / 60 * 0.8) : 0;
  const flow = latest?.flow_rate ?? 0;
  const todayConsumption = latest?.volume ?? 0;

  // Aggregate readings into hourly buckets for the consumption bar chart
  const hours: { hour: string; volume: number }[] = [];
  if (readings && readings.length > 0) {
    const buckets: Record<string, number[]> = {};
    for (const r of readings) {
      const h = new Date(r.time).getHours().toString().padStart(2, '0') + ':00';
      if (!buckets[h]) buckets[h] = [];
      buckets[h].push(r.flow_rate);
    }
    for (const [h, vals] of Object.entries(buckets).sort()) {
      hours.push({ hour: h, volume: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)) });
    }
  }

  const dailyTotal = hours.reduce((s, h) => s + h.volume, 0);
  const hasData = readings && readings.length > 0;

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
            <div className="metric-row__sublabel">{hasData ? 'Live' : 'No data'}</div>
          </div>
          <div className="metric-row__value">
            {velocity.toFixed(1)}<span className="metric-row__unit">m/s</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-row__icon"><Droplets size={18} /></div>
          <div>
            <div className="metric-row__label">Flow</div>
            <div className="metric-row__sublabel">{hasData ? 'Live' : 'No data'}</div>
          </div>
          <div className="metric-row__value">
            {flow.toFixed(1)}<span className="metric-row__unit">L/min</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-row__icon" style={{ background: '#2563eb' }}>
            <Gauge size={18} />
          </div>
          <div>
            <div className="metric-row__label">Cumulative Volume</div>
          </div>
          <div className="metric-row__value">
            {todayConsumption.toFixed(1)}<span className="metric-row__unit">m³</span>
          </div>
        </div>
      </div>

      {/* Cumulative Stats */}
      <div className="cumulative-stats">
        <div className="cumstat-item">
          <div className="cumstat-item__value">{todayConsumption.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Positive Cumulative</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value">0.0 m<sup>3</sup></div>
          <div className="cumstat-item__label">Negative Cumulative</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value">{todayConsumption.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Cumulative Total</div>
        </div>
      </div>

      {/* Consumption Bar Chart */}
      <div className="card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div className="card__title">Consumption</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {hasData ? 'Realtime · last 24 hours' : 'No data available'}
            </div>
          </div>
        </div>
        <div style={{ height: 120 }}>
          {hours.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} />
                <Bar dataKey="volume" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No consumption data
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, marginTop: 4, gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>● Daily Consumption</span>
          <span style={{ fontWeight: 700 }}>{dailyTotal.toLocaleString()} L/min avg</span>
        </div>
      </div>
    </div>
  );
}
