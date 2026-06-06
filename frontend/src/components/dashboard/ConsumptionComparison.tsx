import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface Props { meterId?: string; }



export default function ConsumptionComparison({ meterId }: Props) {
  // Hardcoded data based on typical values for meter_001
  const { todayVol, yesterdayVol, weekAvg, days } = useMemo(() => {
    return {
      todayVol: 14.2,
      yesterdayVol: 15.8,
      weekAvg: 13.5,
      days: []
    };
  }, [meterId]);

  // Percentage change: today vs yesterday
  const vsYesterday = yesterdayVol > 0
    ? ((todayVol - yesterdayVol) / yesterdayVol) * 100
    : 0;

  // Percentage change: today vs 7-day average
  const vsAvg = weekAvg > 0
    ? ((todayVol - weekAvg) / weekAvg) * 100
    : 0;

  const hasData = days.length > 0;

  // Find max for bar scaling
  const allValues = [todayVol, yesterdayVol, weekAvg].filter(v => v > 0);
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;

  const bars = [
    { label: 'Today', value: todayVol, color: '#2563eb', accent: 'rgba(37,99,235,.12)' },
    { label: 'Yesterday', value: yesterdayVol, color: '#6366f1', accent: 'rgba(99,102,241,.12)' },
    { label: '7-day Avg', value: weekAvg, color: '#14b8a6', accent: 'rgba(20,184,166,.12)' },
  ];

  const trendIcon = (pct: number) => {
    if (Math.abs(pct) < 1) return <Minus size={12} />;
    return pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const trendColor = (pct: number) => {
    if (Math.abs(pct) < 1) return 'var(--text-muted)';
    // For water usage: going up = warning/red, going down = good/green
    return pct > 0 ? '#ef4444' : '#22c55e';
  };

  return (
    <div className="card" id="consumption-comparison" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={14} />
            Consumption Comparison
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            Volume consumed · selected meter
          </div>
        </div>
      </div>

      {!hasData ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
        }}>
          Waiting for readings data…
        </div>
      ) : (
        <>
          {/* Horizontal bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            {bars.map(bar => (
              <div key={bar.label}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 5,
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}>
                    {bar.label}
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                  }}>
                    {bar.value > 0 ? `${(bar.value * 1000).toFixed(1)} L` : '—'}
                  </span>
                </div>
                {/* Bar track */}
                <div style={{
                  height: 10,
                  borderRadius: 99,
                  background: 'var(--bg-muted)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{
                    width: `${maxVal > 0 ? (bar.value / maxVal) * 100 : 0}%`,
                    height: '100%',
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${bar.color}, ${bar.color}cc)`,
                    transition: 'width .8s cubic-bezier(.4,0,.2,1)',
                    minWidth: bar.value > 0 ? 4 : 0,
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Trend chips */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid var(--border-light)',
          }}>
            {/* vs Yesterday */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-light)',
            }}>
              <span style={{ color: trendColor(vsYesterday), display: 'flex' }}>
                {trendIcon(vsYesterday)}
              </span>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>vs Yesterday</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: trendColor(vsYesterday),
                }}>
                  {yesterdayVol > 0
                    ? `${vsYesterday > 0 ? '+' : ''}${vsYesterday.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {/* vs 7-day Avg */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-light)',
            }}>
              <span style={{ color: trendColor(vsAvg), display: 'flex' }}>
                {trendIcon(vsAvg)}
              </span>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>vs 7-day Avg</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: trendColor(vsAvg),
                }}>
                  {weekAvg > 0
                    ? `${vsAvg > 0 ? '+' : ''}${vsAvg.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
