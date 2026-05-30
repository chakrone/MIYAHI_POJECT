
import { useCallback } from 'react';
import { Droplets, Gauge } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { usePolling } from '../../hooks/usePolling';
import { getReadings, getLatestReading } from '../../services/api';


interface Props { meterId: string; }

export default function SensorHero({ meterId }: Props) {
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const fetchLatest = useCallback(() => getLatestReading(meterId), [meterId]);
  const { data: readings } = usePolling(fetchReadings, 2000);
  const { data: latest } = usePolling(fetchLatest, 1000);

  const flow = latest?.flow_rate ?? 0;
  const totalConsumed = latest?.volume ?? 0;

  // Compute today's usage as volume delta over 24h window
  let todaysUsage = 0;
  if (readings && readings.length >= 2) {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    todaysUsage = Math.max(0, sorted[sorted.length - 1].volume - sorted[0].volume);
  }



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

  // Color coding for usage level
  const usageColor = todaysUsage > 2 ? 'var(--rose-500, #f43f5e)' :
                     todaysUsage > 0.5 ? 'var(--amber-500, #f59e0b)' :
                     'var(--emerald-500, #10b981)';



  return (
    <>
      {/* Stacked Live Metrics — middle column of row-1 */}
      <div className="hero-metrics-stack">
        <div className="metric-row">
          <div className="metric-row__icon"><Droplets size={18} /></div>
          <div>
            <div className="metric-row__label">Flow Rate</div>
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
            <div className="metric-row__label">Today's Usage</div>
            <div className="metric-row__sublabel">Last 24h</div>
          </div>
          <div className="metric-row__value" style={{ color: usageColor }}>
            {todaysUsage.toFixed(3)}<span className="metric-row__unit">m³</span>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric-row__icon" style={{ background: '#0d9488' }}>
            <Gauge size={18} />
          </div>
          <div>
            <div className="metric-row__label">Total Consumed</div>
            <div className="metric-row__sublabel">All-time</div>
          </div>
          <div className="metric-row__value">
            {totalConsumed.toFixed(1)}<span className="metric-row__unit">m³</span>
          </div>
        </div>
      </div>

      {/* Consumption Bar Chart — right column of row-1 */}
      <div className="card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div className="card__title">Hourly Consumption</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {hasData ? 'Avg flow rate per hour · last 24h' : 'No data available'}
            </div>
          </div>
        </div>
        <div style={{ height: 120 }}>
          {hours.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} unit=" L/m" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4 }} formatter={(value) => [`${value} L/min`, 'Avg Flow']} />
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
          <span style={{ color: 'var(--text-muted)' }}>● Avg Flow Rate / Hour</span>
          <span style={{ fontWeight: 700 }}>{dailyTotal > 0 ? (dailyTotal / Math.max(hours.length, 1)).toFixed(1) : '—'} L/min avg</span>
        </div>
      </div>
    </>
  );
}

