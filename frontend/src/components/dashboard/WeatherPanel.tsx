import { useCallback } from 'react';
import { CloudRain, Thermometer, Droplets } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getCurrentWeather, getWeatherCorrelation } from '../../services/api';

interface Props { meterId: string; }

export default function WeatherPanel({ meterId }: Props) {
  const fetchWeather = useCallback(() => getCurrentWeather(), []);
  const fetchCorrelation = useCallback(() => getWeatherCorrelation(meterId, '7d'), [meterId]);
  const { data: weather } = usePolling(fetchWeather, 5000);
  const { data: correlation } = usePolling(fetchCorrelation, 5000);

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Weather & Correlation</span>
      </div>
      <div className="weather-grid">
        <div className="weather-stat">
          <Thermometer size={16} style={{ color: '#ef4444', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.temperature ?? '—'}°C</div>
          <div className="weather-stat__label">Temperature</div>
        </div>
        <div className="weather-stat">
          <Droplets size={16} style={{ color: '#3b82f6', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.humidity ?? '—'}%</div>
          <div className="weather-stat__label">Humidity</div>
        </div>
        <div className="weather-stat">
          <CloudRain size={16} style={{ color: '#14b8a6', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.rainfall_mm ?? '0'} mm</div>
          <div className="weather-stat__label">Rainfall</div>
        </div>
      </div>
      {correlation?.correlations && (
        <div className="correlation-grid">
          {Object.entries(correlation.correlations).map(([key, val]) => {
            const interp = correlation.interpretation?.[key] || 'weak';
            return (
              <div key={key} className={`correlation-item correlation-item--${interp}`}>
                <div className="correlation-item__value">{val > 0 ? '+' : ''}{val}</div>
                <div className="correlation-item__label">{key} ↔ usage</div>
              </div>
            );
          })}
        </div>
      )}
      {!correlation?.correlations && (
        <div className="empty-state" style={{ marginTop: 8 }}>Collecting data…</div>
      )}
    </div>
  );
}
