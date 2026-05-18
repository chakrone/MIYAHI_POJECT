import { Plus, Minus } from 'lucide-react';

interface Props { meterId: string; meterLabel: string; }

export default function MapPanel({ meterId, meterLabel }: Props) {
  const installDate = '20/02/2024';
  const now = new Date();
  const dataUpdated = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Map Placeholder */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="map-placeholder">
          <div className="map-controls">
            <button><Plus size={14} /></button>
            <button><Minus size={14} /></button>
          </div>
          <div className="map-label">IoT-{meterId.split('_')[1]}</div>
          <div className="map-placeholder__pin" />
        </div>
        <div style={{ padding: '4px 10px', fontSize: 9, color: 'var(--text-muted)', textAlign: 'right', borderTop: '1px solid var(--border)' }}>
          Map data © OpenStreetMap contributors
        </div>
      </div>

      {/* Meter Details */}
      <div className="card meter-details">
        <h3>Meter details</h3>
        <dl>
          <div className="meter-details-row">
            <dt>Location:</dt>
            <dd>{meterLabel}</dd>
          </div>
          <div className="meter-details-row">
            <dt>Serial Number:</dt>
            <dd>Not set</dd>
          </div>
          <div className="meter-details-row">
            <dt>Date of Installation:</dt>
            <dd>{installDate}</dd>
          </div>
          <div className="meter-details-row">
            <dt>Status:</dt>
            <dd className="meter-status-online">Online</dd>
          </div>
          <div className="meter-details-row">
            <dt>Data Updated:</dt>
            <dd>{dataUpdated}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
