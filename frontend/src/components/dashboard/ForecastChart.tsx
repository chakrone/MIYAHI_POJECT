import { useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getForecast } from '../../services/api';

interface Props { meterId: string; }

export default function ForecastChart({ meterId }: Props) {
  const fetchForecast = useCallback(() => getForecast(meterId, 3), [meterId]);
  const { data: forecast, loading } = usePolling(fetchForecast, 30000);

  if (loading || !forecast?.predictions?.length) {
    return (
      <div className="card span-2">
        <div className="card__header">
          <span className="card__title">Consumption Forecast</span>
          <div className="card__icon icon-teal"><TrendingUp size={18} /></div>
        </div>
        <div className="empty-state">
          {loading ? 'Loading forecast...' : 'No forecast data yet — waiting for model generation'}
        </div>
      </div>
    );
  }

  // Sample every 6th hour to keep chart clean
  const chartData = forecast.predictions
    .filter((_, i) => i % 6 === 0)
    .map(p => ({
      time: new Date(p.time).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit' }),
      predicted: p.predicted_value,
      lower: p.lower_bound,
      upper: p.upper_bound,
    }));

  return (
    <div className="card span-2">
      <div className="card__header">
        <span className="card__title">Consumption Forecast</span>
        <div className="card__icon icon-teal"><TrendingUp size={18} /></div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2196f3" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#2196f3" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" L/m"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
            />
            <Area
              type="monotone" dataKey="upper"
              stroke="none" fill="url(#ciGrad)"
              name="Upper CI"
            />
            <Area
              type="monotone" dataKey="lower"
              stroke="none" fill="url(#ciGrad)"
              name="Lower CI"
            />
            <Area
              type="monotone" dataKey="predicted"
              stroke="#14b8a6" strokeWidth={2.5}
              fill="url(#forecastGrad)"
              dot={false}
              name="Predicted"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
