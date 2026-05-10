import { useCallback } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getAlerts, acknowledgeAlert } from '../../services/api';

export default function AlertFeed() {
  const fetchAlerts = useCallback(() => getAlerts(), []);
  const { data: alerts, refresh } = usePolling(fetchAlerts, 6000);

  const handleAck = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      refresh();
    } catch { /* silent */ }
  };

  const sorted = [...(alerts || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const severityClass = (s: string) => {
    if (s === 'critical') return 'alert-item__dot--critical';
    if (s === 'warning') return 'alert-item__dot--warning';
    return 'alert-item__dot--info';
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="card span-2">
      <div className="card__header">
        <span className="card__title">Alert Feed</span>
        <div className="card__icon icon-rose"><Bell size={18} /></div>
      </div>
      <div className="alert-feed">
        {sorted.length === 0 && (
          <div className="empty-state">No alerts — all systems normal</div>
        )}
        {sorted.map(a => (
          <div
            key={a.id}
            className={`alert-item ${a.acknowledged ? 'alert-item--acknowledged' : ''}`}
          >
            <div className={`alert-item__dot ${severityClass(a.severity)}`} />
            <div style={{ flex: 1 }}>
              <div className="alert-item__message">{a.message || a.type}</div>
              <div className="alert-item__time">
                {a.meter_id} · {timeAgo(a.created_at)}
              </div>
            </div>
            {!a.acknowledged && (
              <button className="alert-item__ack-btn" onClick={() => handleAck(a.id)}>
                <CheckCircle size={12} style={{ marginRight: 4 }} />
                Ack
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
