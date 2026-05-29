import { useState, useCallback } from 'react';
import { Clock, Search, Download, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadings } from '../../services/api';

interface Props { meterId: string; }

export default function ReadingsTable({ meterId }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const { data: rawReadings } = usePolling(fetchReadings, 2000);

  const readings = (rawReadings || []).map(r => ({
    timestamp: new Date(r.time).toISOString().replace('T', ' ').substring(0, 19),
    flowRate: r.flow_rate,
    pressure: r.pressure,
    temperature: r.temperature,
    volume: r.volume,
    status: r.status,
  }));

  const totalPages = Math.max(1, Math.ceil(readings.length / perPage));
  const pageData = readings.slice(page * perPage, (page + 1) * perPage);

  const statusBadge = (status: string) => {
    if (status === 'ok') return <span className="status-badge status-badge--ok">OK</span>;
    if (status === 'leak_suspected') return <span className="status-badge status-badge--critical">Leak</span>;
    if (status === 'low_pressure') return <span className="status-badge status-badge--warning">Low Press.</span>;
    return <span className="status-badge">{status}</span>;
  };

  return (
    <div className="card data-table-card" style={{ padding: 0 }}>
      <div className="data-table-header">
        <div className="data-table-header__title">
          <Clock size={14} />
          {readings.length > 0 ? 'Sensor Readings · last 24h' : 'No data available'}
        </div>
        <div className="card__actions">
          <button title="Search"><Search size={13} /></button>
          <button title="Download"><Download size={13} /></button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp <ChevronDown size={10} /></th>
              <th>Flow Rate</th>
              <th>Pressure</th>
              <th>Temperature</th>
              <th>Volume</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No readings — start the simulator to generate data
                </td>
              </tr>
            )}
            {pageData.map((r, i) => (
              <tr key={i}>
                <td>{r.timestamp}</td>
                <td>{r.flowRate.toFixed(1)} <span className="unit-label">L/min</span></td>
                <td>{r.pressure.toFixed(2)} <span className="unit-label">bar</span></td>
                <td>{r.temperature.toFixed(1)} <span className="unit-label">°C</span></td>
                <td>{r.volume.toFixed(2)} <span className="unit-label">m³</span></td>
                <td>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <span>Items per page:</span>
        <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(0); }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        <span>{readings.length > 0 ? `${page * perPage + 1} – ${Math.min((page + 1) * perPage, readings.length)} of ${readings.length}` : '0 items'}</span>
        <button disabled={page === 0} onClick={() => setPage(0)}><ChevronsLeft size={13} /></button>
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><ChevronsRight size={13} /></button>
      </div>
    </div>
  );
}

