import { useCallback } from 'react';
import { Droplets, Activity, Gauge, Zap } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadingsStats, getMeters } from '../../services/api';

export default function KPICards() {
  const fetchStats = useCallback(() => getReadingsStats(), []);
  const fetchMeters = useCallback(() => getMeters(), []);
  const { data: stats } = usePolling(fetchStats, 4000);
  const { data: meters } = usePolling(fetchMeters, 10000);

  const activeMeters = stats?.active_meters ?? 0;
  const processed = stats?.messages_processed ?? 0;
  const dropped = stats?.messages_dropped ?? 0;
  const efficiency = processed > 0 ? (((processed - dropped) / processed) * 100).toFixed(1) : '100.0';

  const cards = [
    {
      title: 'Active Meters',
      value: activeMeters,
      unit: 'devices',
      icon: <Droplets size={18} />,
      iconClass: 'icon-water',
      change: null,
    },
    {
      title: 'Messages Processed',
      value: processed.toLocaleString(),
      unit: 'total',
      icon: <Activity size={18} />,
      iconClass: 'icon-teal',
      change: null,
    },
    {
      title: 'Total Zones',
      value: meters ? new Set(meters.map(m => m.zone?.name).filter(Boolean)).size : 0,
      unit: 'zones',
      icon: <Gauge size={18} />,
      iconClass: 'icon-violet',
      change: null,
    },
    {
      title: 'Pipeline Efficiency',
      value: efficiency,
      unit: '%',
      icon: <Zap size={18} />,
      iconClass: 'icon-emerald',
      change: dropped === 0
        ? { label: '0 dropped', direction: 'down' as const }
        : { label: `${dropped} dropped`, direction: 'up' as const },
    },
  ];

  return (
    <>
      {cards.map((c) => (
        <div className="card kpi-card" key={c.title}>
          <div className="card__header">
            <span className="card__title">{c.title}</span>
            <div className={`card__icon ${c.iconClass}`}>{c.icon}</div>
          </div>
          <div className="kpi-card__value">
            {c.value}
            <span className="kpi-card__unit">{c.unit}</span>
          </div>
          {c.change && (
            <span className={`kpi-card__change kpi-card__change--${c.change.direction}`}>
              {c.change.label}
            </span>
          )}
        </div>
      ))}
    </>
  );
}
