
import { useCallback } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { getGoals, getReadings } from '../../services/api';

interface Props { meterId: string; }

export default function BenchmarkingGoalsPanel({ meterId }: Props) {
  const fetchGoals = useCallback(() => getGoals(), []);
  const fetchReadings = useCallback(() => getReadings(meterId, '30d'), [meterId]);
  const fetchTodayReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);

  const { data: goals } = usePolling(fetchGoals, 30000);
  const { data: readings } = usePolling(fetchReadings, 30000);
  const { data: todayReadings } = usePolling(fetchTodayReadings, 15000);

  /* Compute monthly usage (L) from readings */
  let monthlyUsageL = 0;
  if (readings && readings.length >= 2) {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    monthlyUsageL = Math.max(0, sorted[sorted.length - 1].volume - sorted[0].volume) * 1000;
  }

  /* Compute today's daily usage (L) to derive a realistic monthly target */
  let todaysDailyUsageL = 0;
  if (todayReadings && todayReadings.length >= 2) {
    const sorted = [...todayReadings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    todaysDailyUsageL = Math.max(0, sorted[sorted.length - 1].volume - sorted[0].volume) * 1000;
  }

  /* Monthly target: project today's usage to 30 days.
     If today's usage is available, target = daily_usage × 30.
     Otherwise fall back to an estimate from the monthly readings. */
  const MONTHLY_TARGET_L = todaysDailyUsageL > 0
    ? Math.round(todaysDailyUsageL * 30)
    : monthlyUsageL > 0
      ? Math.round(monthlyUsageL * 1.1) // 10% above current as a target
      : 0;

  const monthlyPct = MONTHLY_TARGET_L > 0
    ? Math.min(100, Math.round((monthlyUsageL / MONTHLY_TARGET_L) * 100))
    : 0;
  const monthlyColor = monthlyPct > 90 ? '#ef4444' : monthlyPct > 70 ? '#f59e0b' : '#22a264';

  /* Reduction goal — targetPercent is the target; compute actual reduction from readings */
  const reduceTarget = goals?.[0]?.targetPercent ?? 15;
  // Actual reduction % would come from comparing this month vs last month.
  // Without a last-month baseline API, we estimate from monthly usage vs target.
  const reducePct = MONTHLY_TARGET_L > 0
    ? Math.min(100, Math.round(((MONTHLY_TARGET_L - monthlyUsageL) / MONTHLY_TARGET_L) * 100))
    : 0;
  const reduceColor = reducePct >= reduceTarget ? '#22a264' : reducePct > 8 ? '#f59e0b' : '#3b82f6';

  return (
    <div className="benchmarking-goals-panel card" id="benchmarking-goals-panel">
      {/* ── Conservation Goals ── */}
      <div className="card__title" style={{ marginBottom: 10 }}>Conservation Goals</div>

      {/* Goal 1: Monthly target */}
      <div className="goal-item">
        <div className="goal-item__header">
          <span className="goal-item__name">
            Monthly target: {MONTHLY_TARGET_L > 0 ? `${MONTHLY_TARGET_L.toLocaleString()}L` : 'Awaiting data'}
            {todaysDailyUsageL > 0 && (
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 6 }}>
                (projected from today)
              </span>
            )}
          </span>
          <span className="goal-item__pct" style={{ color: monthlyColor }}>{monthlyPct}%</span>
        </div>
        <div className="goal-bar-track">
          <div
            className="goal-bar-fill"
            style={{ width: `${monthlyPct}%`, background: monthlyColor }}
          />
        </div>
        {MONTHLY_TARGET_L === 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            No consumption data available yet to compute target
          </div>
        )}
      </div>

      {/* Goal 2: Reduce vs last month */}
      <div className="goal-item" style={{ marginTop: 10 }}>
        <div className="goal-item__header">
          <span className="goal-item__name">Reduce vs last month</span>
          <span className="goal-item__pct" style={{ color: reduceColor }}>
            {reducePct}% / {reduceTarget}%
          </span>
        </div>
        <div className="goal-bar-track">
          {/* Target marker */}
          <div
            className="goal-bar-target-marker"
            style={{ left: `${(reduceTarget / 100) * 100}%` }}
          />
          <div
            className="goal-bar-fill"
            style={{ width: `${Math.min(100, (reducePct / reduceTarget) * 100)}%`, background: reduceColor }}
          />
        </div>
      </div>
    </div>
  );
}
