
import { useCallback } from 'react';
import { Droplets, Activity, Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { usePolling } from '../../hooks/usePolling';
import { getReadings, getLatestReading } from '../../services/api';


interface Props { meterId: string; }

export default function SensorHero({ meterId }: Props) {
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const fetchRecentReadings = useCallback(() => getReadings(meterId, '1h'), [meterId]);
  const fetchLatest = useCallback(() => getLatestReading(meterId), [meterId]);
  const { data: readings } = usePolling(fetchReadings, 2000);
  const { data: recentReadings } = usePolling(fetchRecentReadings, 2000);
  const { data: latest } = usePolling(fetchLatest, 1000);

  const velocity = latest ? (latest.flow_rate / 60 * 0.8) : 0;
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

  // Compute average flow rate over last 1h
  let avgFlowRate = 0;
  if (recentReadings && recentReadings.length > 0) {
    avgFlowRate = recentReadings.reduce((sum, r) => sum + r.flow_rate, 0) / recentReadings.length;
  }

  // Compute trend: compare last 30 min avg vs previous 30 min avg
  let flowTrend: 'up' | 'down' | 'stable' = 'stable';
  if (recentReadings && recentReadings.length >= 4) {
    const sorted = [...recentReadings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const olderHalf = sorted.slice(0, mid);
    const newerHalf = sorted.slice(mid);
    const olderAvg = olderHalf.reduce((s, r) => s + r.flow_rate, 0) / olderHalf.length;
    const newerAvg = newerHalf.reduce((s, r) => s + r.flow_rate, 0) / newerHalf.length;
    const diff = newerAvg - olderAvg;
    if (diff > 1) flowTrend = 'up';
    else if (diff < -1) flowTrend = 'down';
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

  const TrendIcon = flowTrend === 'up' ? TrendingUp :
                    flowTrend === 'down' ? TrendingDown : Minus;
  const trendColor = flowTrend === 'up' ? '#f59e0b' :
                     flowTrend === 'down' ? '#10b981' : 'var(--text-muted)';

  return (
    <div className="sensor-hero">

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
            <div className="metric-row__label">Total Meter Reading</div>
            <div className="metric-row__sublabel">Lifetime m³</div>
          </div>
          <div className="metric-row__value">
            {totalConsumed.toFixed(1)}<span className="metric-row__unit">m³</span>
          </div>
        </div>
      </div>

      {/* Key Stats — user-friendly */}
      <div className="cumulative-stats">
        <div className="cumstat-item">
          <div className="cumstat-item__value">{totalConsumed.toFixed(1)} m<sup>3</sup></div>
          <div className="cumstat-item__label">Total Consumed</div>
          <div className="cumstat-item__sublabel">All-time meter reading</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value" style={{ color: usageColor }}>
            {todaysUsage.toFixed(3)} m<sup>3</sup>
          </div>
          <div className="cumstat-item__label">Today's Usage</div>
          <div className="cumstat-item__sublabel">Last 24h consumption</div>
        </div>
        <div className="cumstat-item">
          <div className="cumstat-item__value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {avgFlowRate.toFixed(1)} L/min
            <TrendIcon size={14} style={{ color: trendColor }} />
          </div>
          <div className="cumstat-item__label">Avg Flow (1h)</div>
          <div className="cumstat-item__sublabel">Current activity level</div>
        </div>
      </div>

      {/* Consumption Bar Chart */}
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
    </div>
  );
}

