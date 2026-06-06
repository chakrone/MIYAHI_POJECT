import { useCallback, useMemo } from 'react';
import { CloudRain, Thermometer, Droplets, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getCurrentWeather, getWeatherCorrelation, getReadings } from '../../services/api';
import type { MeterReading } from '../../types';

interface Props { meterId: string; }

/**
 * Compute average flow rate from a set of readings.
 */
function avgFlow(readings: MeterReading[]): number {
  if (!readings || readings.length === 0) return 0;
  return readings.reduce((s, r) => s + r.flow_rate, 0) / readings.length;
}

/**
 * Format correlation into a human-readable consumption impact description.
 */
function correlationImpact(corr: number, label: string): { text: string; detail: string } {
  const abs = Math.abs(corr);
  const direction = corr > 0 ? 'increases' : 'decreases';

  if (abs < 0.15) {
    return { text: 'No impact', detail: `${label} has minimal effect on consumption` };
  }
  if (abs < 0.35) {
    return {
      text: corr > 0 ? 'Slight increase' : 'Slight decrease',
      detail: `Higher ${label.toLowerCase()} slightly ${direction} usage`,
    };
  }
  if (abs < 0.6) {
    return {
      text: corr > 0 ? 'Moderate increase' : 'Moderate decrease',
      detail: `Higher ${label.toLowerCase()} moderately ${direction} usage`,
    };
  }
  return {
    text: corr > 0 ? 'Strong increase' : 'Strong decrease',
    detail: `Higher ${label.toLowerCase()} strongly ${direction} usage`,
  };
}

export default function WeatherPanel({ meterId }: Props) {
  const fetchWeather = useCallback(() => getCurrentWeather(), []);
  const fetchCorrelation = useCallback(() => getWeatherCorrelation(meterId, '7d'), [meterId]);
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);

  const { data: weather } = usePolling(fetchWeather, 5000);
  const { data: correlation } = usePolling(fetchCorrelation, 15000);
  const { data: readings } = usePolling(fetchReadings, 10000);

  const currentFlow = useMemo(() => avgFlow(readings ?? []), [readings]);

  const correlations = correlation?.correlations ?? {};
  const hasCorrelation = Object.keys(correlations).length > 0;

  // Weather impact factors — each links a weather metric to its effect on consumption
  const factors = useMemo(() => {
    if (!hasCorrelation) return [];
    const items = [
      {
        key: 'temp',
        label: 'Temperature',
        icon: <Thermometer size={14} />,
        iconColor: '#ef4444',
        currentValue: weather?.temperature != null ? `${weather.temperature}°C` : '—',
        corr: correlations.temp ?? 0,
      },
      {
        key: 'humidity',
        label: 'Humidity',
        icon: <Droplets size={14} />,
        iconColor: '#3b82f6',
        currentValue: weather?.humidity != null ? `${weather.humidity}%` : '—',
        corr: correlations.humidity ?? 0,
      },
      {
        key: 'rainfall',
        label: 'Rainfall',
        icon: <CloudRain size={14} />,
        iconColor: '#14b8a6',
        currentValue: weather?.rainfall_mm != null ? `${weather.rainfall_mm} mm` : '—',
        corr: correlations.rainfall ?? 0,
      },
    ];
    return items;
  }, [hasCorrelation, correlations, weather]);

  const trendIcon = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs < 0.15) return <Minus size={12} />;
    return corr > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const impactColor = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs < 0.15) return 'var(--text-muted)';
    if (abs < 0.35) return corr > 0 ? '#f59e0b' : '#22c55e';
    return corr > 0 ? '#ef4444' : '#22c55e';
  };

  // Impact bar width: scale |correlation| to percentage (max bar at ±1.0)
  const barWidth = (corr: number) => Math.min(100, Math.abs(corr) * 100);

  return (
    <div className="card" id="weather-impact-panel">
      <div className="card__header">
        <span className="card__title">Weather Impact on Usage</span>
        {currentFlow > 0 && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}>
            Current: {currentFlow.toFixed(1)} L/min
          </span>
        )}
      </div>

      {/* Current conditions row */}
      <div className="weather-grid" style={{ marginBottom: 12 }}>
        <div className="weather-stat">
          <Thermometer size={14} style={{ color: '#ef4444', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.temperature ?? '—'}°C</div>
          <div className="weather-stat__label">Temperature</div>
        </div>
        <div className="weather-stat">
          <Droplets size={14} style={{ color: '#3b82f6', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.humidity ?? '—'}%</div>
          <div className="weather-stat__label">Humidity</div>
        </div>
        <div className="weather-stat">
          <CloudRain size={14} style={{ color: '#14b8a6', margin: '0 auto 4px' }} />
          <div className="weather-stat__value">{weather?.rainfall_mm ?? '0'} mm</div>
          <div className="weather-stat__label">Rainfall</div>
        </div>
      </div>

      {/* Correlation impact section */}
      {hasCorrelation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            marginBottom: 2,
          }}>
            Consumption Impact · 7 days
          </div>
          {factors.map(f => {
            const impact = correlationImpact(f.corr, f.label);
            return (
              <div key={f.key} style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-light)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: f.iconColor, display: 'flex' }}>{f.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {f.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: impactColor(f.corr), display: 'flex' }}>
                      {trendIcon(f.corr)}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: impactColor(f.corr),
                    }}>
                      {impact.text}
                    </span>
                  </div>
                </div>
                {/* Impact bar */}
                <div style={{
                  height: 4,
                  borderRadius: 99,
                  background: 'var(--border-light)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${barWidth(f.corr)}%`,
                    height: '100%',
                    borderRadius: 99,
                    background: impactColor(f.corr),
                    transition: 'width .6s cubic-bezier(.4,0,.2,1)',
                    minWidth: Math.abs(f.corr) > 0.05 ? 4 : 0,
                  }} />
                </div>
                <div style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginTop: 3,
                }}>
                  {impact.detail}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 4, fontSize: 11 }}>
          Analysing weather–consumption patterns…
        </div>
      )}
    </div>
  );
}
