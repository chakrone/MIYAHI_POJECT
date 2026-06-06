import { useCallback } from 'react';
import { AlertTriangle, ArrowUp, Check, Bell, Activity, ShieldCheck } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getAlerts } from '../../services/api';


/* ── Format meter_id for display ── */
function formatMeterId(id: string) {
  // "meter_001" → "Meter 001", keep anything that already looks clean
  return id.replace(/^meter_/i, 'Meter ').replace(/_/g, ' ');
}

interface Props {
  meterId: string;
}

export default function AlertFeed({ meterId }: Props) {
  const fetchAlerts = useCallback(() => getAlerts(), []);
  const { data: alerts } = usePolling(fetchAlerts, 5000);

  const allAlerts = alerts && alerts.length > 0 ? alerts : [];

  // Filter to selected meter — if no alerts match, show all
  const meterAlerts = allAlerts.filter(a => a.meter_id === meterId);
  const displayAlerts = meterAlerts.length > 0 ? meterAlerts : allAlerts;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertTriangle size={16} />,
          color: '#ef4444',
          bg: 'rgba(239,68,68,.12)',
          border: 'rgba(239,68,68,.25)',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={16} />,
          color: '#f59e0b',
          bg: 'rgba(245,158,11,.12)',
          border: 'rgba(245,158,11,.25)',
        };
      case 'success':
        return {
          icon: <Check size={16} />,
          color: '#22c55e',
          bg: 'rgba(34,197,94,.12)',
          border: 'rgba(34,197,94,.25)',
        };
      default: // info
        return {
          icon: <ArrowUp size={16} />,
          color: '#3b82f6',
          bg: 'rgba(59,130,246,.12)',
          border: 'rgba(59,130,246,.25)',
        };
    }
  };

  const meterLabel = formatMeterId(meterId);

  return (
    <div className="card" id="alert-feed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={14} />
          Alert Feed
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
          {displayAlerts.length > 0 && <Activity size={10} style={{ color: '#22c55e' }} />}
          {displayAlerts.length > 0
            ? `${displayAlerts.length} alert${displayAlerts.length !== 1 ? 's' : ''} · ${meterAlerts.length > 0 ? meterLabel : 'All meters'}`
            : 'Live'}
        </div>
      </div>

      {displayAlerts.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '28px 16px',
          color: 'var(--text-muted)',
        }}>
          <ShieldCheck size={28} style={{ color: '#22c55e', opacity: 0.7 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>No active alerts</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>All systems operating normally</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayAlerts.slice(0, 6).map(a => {
            const cfg = getSeverityConfig(a.severity);
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 12px ${cfg.border}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'none';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Severity icon */}
                <div style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: cfg.color,
                  background: cfg.bg,
                }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: cfg.color,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {a.message || a.type}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatMeterId(a.meter_id)}
                  </div>
                </div>

                {/* Time */}
                <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {formatTime(a.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
