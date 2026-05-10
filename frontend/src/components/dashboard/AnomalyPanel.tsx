import { useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getAnomalyStats, getAnomalies } from '../../services/api';
import type { AnomalyFlag } from '../../types';

interface Props { meterId: string; }

export default function AnomalyPanel({ meterId }: Props) {
  const fetchStats = useCallback(() => getAnomalyStats(), []);
  const fetchAnomalies = useCallback(() => getAnomalies(meterId, '24h'), [meterId]);
  const { data: stats } = usePolling(fetchStats, 8000);
  const { data: anomalies } = usePolling(fetchAnomalies, 8000);

  const list: AnomalyFlag[] = Array.isArray(anomalies) ? anomalies : [];

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Anomaly Detection</span>
        <div className="card__icon icon-rose"><ShieldAlert size={18} /></div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="weather-stat" style={{ flex: 1 }}>
          <div className="weather-stat__value">{stats?.readings_processed ?? 0}</div>
          <div className="weather-stat__label">Analyzed</div>
        </div>
        <div className="weather-stat" style={{ flex: 1 }}>
          <div className="weather-stat__value" style={{ color: 'var(--rose-400)' }}>
            {stats?.anomalies_detected ?? 0}
          </div>
          <div className="weather-stat__label">Detected</div>
        </div>
      </div>
      <div style={{ maxHeight: 180, overflow: 'auto' }}>
        {list.length === 0 && <div className="empty-state">No anomalies in last 24h</div>}
        {list.slice(0, 5).map((a, i) => (
          <div key={i} className="alert-item" style={{ marginBottom: 4 }}>
            <div className={`alert-item__dot ${a.severity === 'critical' ? 'alert-item__dot--critical' : 'alert-item__dot--warning'}`} />
            <div>
              <div className="alert-item__message">{a.description}</div>
              <div className="alert-item__time">{new Date(a.time).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
