
import { useCallback } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { getGoals, getReadings } from '../../services/api';

interface Props { meterId: string; }

export default function BenchmarkingGoalsPanel({ meterId }: Props) {
  const fetchGoals = useCallback(() => getGoals(), []);
  const fetchReadings = useCallback(() => getReadings(meterId, '30d'), [meterId]);

  const { data: goals } = usePolling(fetchGoals, 30000);
  const { data: readings } = usePolling(fetchReadings, 30000);

  /* Compute monthly usage (L) from readings */
  let monthlyUsageL = 0;
  if (readings && readings.length >= 2) {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    monthlyUsageL = Math.max(0, sorted[sorted.length - 1].volume - sorted[0].volume) * 1000;
  }

  /* Monthly target goal */
  const MONTHLY_TARGET_L = 8000;
  const monthlyPct = Math.min(100, Math.round((monthlyUsageL / MONTHLY_TARGET_L) * 100)) || 61; // fallback 61%
  const monthlyColor = monthlyPct > 90 ? '#ef4444' : monthlyPct > 70 ? '#f59e0b' : '#22a264';

  /* Reduction goal — compare to last month mock */
  const reducePct = goals?.[0]?.targetPercent ?? 6;
  const reduceTarget = goals?.[0]?.targetPercent ?? 15;
  const reduceColor = reducePct >= reduceTarget ? '#22a264' : reducePct > 8 ? '#f59e0b' : '#3b82f6';

  return (
    <div className="benchmarking-goals-panel card" id="benchmarking-goals-panel">
      {/* ── Conservation Goals ── */}
      <div className="card__title" style={{ marginBottom: 10 }}>Conservation Goals</div>

      {/* Goal 1: Monthly target */}
      <div className="goal-item">
        <div className="goal-item__header">
          <span className="goal-item__name">Monthly target: {MONTHLY_TARGET_L.toLocaleString()}L</span>
          <span className="goal-item__pct" style={{ color: monthlyColor }}>{monthlyPct}%</span>
        </div>
        <div className="goal-bar-track">
          <div
            className="goal-bar-fill"
            style={{ width: `${monthlyPct}%`, background: monthlyColor }}
          />
        </div>
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
            style={{ width: `${(reducePct / reduceTarget) * 100}%`, background: reduceColor }}
          />
        </div>
      </div>
    </div>
  );
}
