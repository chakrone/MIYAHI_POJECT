import { useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getAnomalies } from '../../services/api';

interface Props { meterId: string; }

export default function ConsumptionChart({ meterId }: Props) {
  const fetchAnomalies = useCallback(() => getAnomalies(meterId, '24h'), [meterId]);
  const { data: anomalies } = usePolling(fetchAnomalies, 10000);

  // Generate mock hourly consumption data (in production, this would come from an API)
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, '0');
    const base = 8 + Math.sin(i * 0.6) * 5 + Math.random() * 3;
    const hasAnomaly = anomalies?.some(a => {
      const aHour = new Date(a.time).getHours();
      return aHour === i;
    });
    return {
      hour: `${h}:00`,
      volume: parseFloat(base.toFixed(1)),
      anomaly: hasAnomaly ? parseFloat(base.toFixed(1)) : 0,
    };
  });

  return (
    <div className="card span-2">
      <div className="card__header">
        <span className="card__title">Hourly Consumption</span>
        <div className="card__icon icon-water"><BarChart3 size={18} /></div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hours} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
              interval={3}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" L"
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
              labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
            <Bar dataKey="volume" fill="url(#waterGrad)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="anomaly" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Anomaly" />
            <ReferenceLine y={12} stroke="var(--amber-400)" strokeDasharray="5 5" label="" />
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2196f3" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
