
import { useCallback, useMemo } from 'react';
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Lock, Maximize2, BarChart3 } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadings, getForecast, getWeatherHistory } from '../../services/api';

interface Props { meterId: string; }

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  // Group by type for cleaner display
  const usage = payload.filter((p: any) => ['Consumption', 'Forecast (lower)', 'Forecast (upper)'].includes(p.name));
  const weather = payload.filter((p: any) => ['Temperature', 'Rainfall'].includes(p.name));

  return (
    <div style={{
      background: 'rgba(17,24,39,.92)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,.1)', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, color: 'white', minWidth: 180
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#9ca3af', fontSize: 11 }}>{label}</div>

      {usage.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: 3, letterSpacing: '.3px' }}>
            Usage
          </div>
          {usage.map((p: any) => (
            <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
              <span style={{ color: p.color || p.fill, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontWeight: 700 }}>{p.value != null ? `${p.value.toFixed(1)} L/min` : '—'}</span>
            </div>
          ))}
        </>
      )}

      {weather.length > 0 && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginTop: 6, marginBottom: 3, letterSpacing: '.3px' }}>
            Weather
          </div>
          {weather.map((p: any) => (
            <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
              <span style={{ color: p.color || p.fill, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontWeight: 700 }}>
                {p.value != null
                  ? p.name === 'Rainfall' ? `${p.value.toFixed(1)} mm` : `${p.value.toFixed(1)}°C`
                  : '—'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default function UsageForecastWeatherChart({ meterId }: Props) {
  const fetchHistory = useCallback(() => getReadings(meterId, '7d'), [meterId]);
  const fetchForecast = useCallback(() => getForecast(meterId, 7), [meterId]);
  const fetchWeather = useCallback(() => getWeatherHistory(168), []); // 7d × 24h

  const { data: history } = usePolling(fetchHistory, 30000);
  const { data: forecastData } = usePolling(fetchForecast, 60000);
  const { data: weather } = usePolling(fetchWeather, 60000);

  /* Build unified time-bucketed dataset (daily buckets) */
  const chartData = useMemo(() => {
    const buckets: Record<string, {
      timestamp: number;
      actual?: number; lower?: number; upper?: number;
      temp?: number; rainfall?: number; isFuture: boolean
    }> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- History: bucket by day label ---
    if (history && history.length > 0) {
      const dayBuckets: Record<string, number[]> = {};
      for (const r of history) {
        const d = new Date(r.time);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (!dayBuckets[key]) dayBuckets[key] = [];
        dayBuckets[key].push(r.flow_rate);
        if (!buckets[key]) buckets[key] = { isFuture: false, timestamp: d.getTime() };
      }
      for (const [key, vals] of Object.entries(dayBuckets)) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        buckets[key].actual = parseFloat(avg.toFixed(1));
        buckets[key].isFuture = false;
      }
    }

    // --- Forecast: add lower/upper band ---
    if (forecastData?.predictions && forecastData.predictions.length > 0) {
      const futureBuckets: Record<string, { lower: number[]; upper: number[] }> = {};
      for (const p of forecastData.predictions) {
        const d = new Date(p.time);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' }) + (d >= today ? '+' : '');
        if (!futureBuckets[key]) futureBuckets[key] = { lower: [], upper: [] };
        futureBuckets[key].lower.push(p.lower_bound);
        futureBuckets[key].upper.push(p.upper_bound);
        if (!buckets[key]) buckets[key] = { isFuture: true, timestamp: d.getTime() };
      }
      for (const [key, { lower, upper }] of Object.entries(futureBuckets)) {
        const lo = lower.reduce((a, b) => a + b, 0) / lower.length;
        const hi = upper.reduce((a, b) => a + b, 0) / upper.length;
        buckets[key].lower = parseFloat(lo.toFixed(1));
        buckets[key].upper = parseFloat(hi.toFixed(1));
        buckets[key].isFuture = true;
      }
    }

    // --- Weather: bucket by day (temp + rainfall) ---
    if (weather && weather.length > 0) {
      const tempBuckets: Record<string, number[]> = {};
      const rainBuckets: Record<string, number[]> = {};
      for (const w of weather) {
        const d = new Date(w.time);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (!tempBuckets[key]) tempBuckets[key] = [];
        tempBuckets[key].push(w.temperature);
        if (!rainBuckets[key]) rainBuckets[key] = [];
        rainBuckets[key].push(w.rainfall_mm);
        if (!buckets[key]) buckets[key] = { isFuture: false, timestamp: d.getTime() };
        // Mirror into future keys if they exist
        const futureKey = key + '+';
        if (buckets[futureKey]) {
          if (!tempBuckets[futureKey]) tempBuckets[futureKey] = [];
          tempBuckets[futureKey].push(w.temperature);
          if (!rainBuckets[futureKey]) rainBuckets[futureKey] = [];
          rainBuckets[futureKey].push(w.rainfall_mm);
        }
      }
      for (const [key, vals] of Object.entries(tempBuckets)) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (!buckets[key]) buckets[key] = { isFuture: false, timestamp: Date.now() };
        buckets[key].temp = parseFloat(avg.toFixed(1));
      }
      for (const [key, vals] of Object.entries(rainBuckets)) {
        const total = vals.reduce((a, b) => a + b, 0);
        if (buckets[key]) {
          buckets[key].rainfall = parseFloat(total.toFixed(1));
        }
      }
    }

    // Sort: historical first, then future
    const hist = Object.entries(buckets)
      .filter(([, v]) => !v.isFuture)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const fut = Object.entries(buckets)
      .filter(([, v]) => v.isFuture)
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const sorted = [...hist, ...fut];

    // Bridge: copy last actual value into the first future point so lines connect
    const lastHistIdx = sorted.findLastIndex(([, v]) => !v.isFuture && v.actual != null);
    const firstFutIdx = sorted.findIndex(([, v]) => v.isFuture);
    if (lastHistIdx >= 0 && firstFutIdx >= 0) {
      const lastActual = sorted[lastHistIdx][1].actual!;
      sorted[firstFutIdx][1].actual = lastActual;
    }

    return sorted.map(([day, v]) => ({
      day,
      actual: v.actual ?? null,
      lower: v.lower ?? null,
      upper: v.upper ?? null,
      band: v.lower != null && v.upper != null ? [v.lower, v.upper] : null,
      temp: v.temp ?? null,
      rainfall: v.rainfall ?? null,
      isFuture: v.isFuture,
    }));
  }, [history, forecastData, weather]);

  const data = chartData;
  const hasData = chartData.length >= 3;

  // Find today separator index
  const todayIdx = data.findIndex(d => d.isFuture);
  const todayLabel = todayIdx > 0 ? data[todayIdx - 1]?.day : undefined;

  // Summary insights
  const hasRainfall = data.some(d => d.rainfall != null && d.rainfall > 0);

  return (
    <div className="card" id="forecast-weather-chart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div className="card__title">Usage Forecast + Weather Overlay</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            {hasData ? 'Live data · 7-day history + forecast' : 'Waiting for readings & forecast data…'}
            {hasRainfall && <span style={{ marginLeft: 6, color: '#14b8a6' }}>● Rainfall shown as bars</span>}
          </div>
        </div>
        <div className="card__actions">
          <button title="Lock"><Lock size={13} /></button>
          <button title="Fullscreen"><Maximize2 size={13} /></button>
        </div>
      </div>

      <div style={{ height: 240 }}>
        {!hasData ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-muted)',
          }}>
            <BarChart3 size={28} style={{ opacity: 0.4 }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>No forecast data yet</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Charts will appear once readings are collected</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 50, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              {/* Left Y: Usage (L/min) */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                unit=" L"
              />
              {/* Right Y: Temperature */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#f59e0b' }}
                tickLine={false}
                axisLine={false}
                unit="°"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Today separator */}
              {todayLabel && (
                <ReferenceLine
                  yAxisId="left"
                  x={todayLabel}
                  stroke="rgba(156,163,175,.6)"
                  strokeDasharray="4 3"
                  label={{ value: 'Today', position: 'top', fontSize: 9, fill: 'var(--text-muted)' }}
                />
              )}

              {/* Rainfall bars — visually shows rain days vs consumption */}
              <Bar
                yAxisId="left"
                dataKey="rainfall"
                fill="rgba(20,184,166,.25)"
                stroke="rgba(20,184,166,.5)"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
                barSize={14}
                name="Rainfall"
              />

              {/* Usage area fill for depth */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="actual"
                stroke="none"
                fill="url(#usageGradient)"
                legendType="none"
                dot={false}
                activeDot={false}
                tooltipType="none"
                connectNulls
              />

              {/* Forecast confidence band — upper bound (filled) */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#forecastBand)"
                legendType="none"
                dot={false}
                activeDot={false}
                name="Upper bound"
                tooltipType="none"
              />
              {/* Forecast lower bound line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="lower"
                stroke="#14b8a6"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#14b8a6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name="Forecast (lower)"
              />
              {/* Forecast upper bound line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="upper"
                stroke="#14b8a6"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#14b8a6', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name="Forecast (upper)"
                legendType="none"
              />

              {/* Actual usage line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                connectNulls={true}
                name="Consumption"
              />

              {/* Temperature overlay */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
                name="Temperature"
              />

              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => (
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
