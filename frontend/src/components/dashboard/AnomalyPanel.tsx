import { useCallback } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
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
  const issueCount = stats?.anomalies_detected ?? 0;

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Anomaly Detection</span>
        {issueCount === 0 ? (
          <span className="health-badge health-badge--ok"><ShieldCheck size={12} /> All Clear</span>
        ) : (
          <span className="health-badge health-badge--alert"><AlertTriangle size={12} /> {issueCount} Issue{issueCount > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="anomaly-stats">
        <div className="anomaly-stat">
          <div className="anomaly-stat__value" style={{ color: 'var(--blue-600)' }}>{stats?.readings_processed ?? 0}</div>
          <div className="anomaly-stat__label">Readings Scanned</div>
        </div>
        <div className="anomaly-stat">
          <div className="anomaly-stat__value" style={{ color: issueCount > 0 ? 'var(--rose-500)' : 'var(--emerald-500, #10b981)' }}>{issueCount}</div>
          <div className="anomaly-stat__label">Issues Found</div>
        </div>
      </div>
      <div style={{ maxHeight: 160, overflow: 'auto' }}>
        {list.length === 0 && <div className="empty-state">No anomalies in last 24h</div>}
        {list.slice(0, 5).map((a, i) => (
          <div key={i} className="alert-item">
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

