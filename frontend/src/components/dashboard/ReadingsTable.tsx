import { useState, useCallback } from 'react';
import { Clock, Search, Download, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { usePolling } from '../../hooks/usePolling';
import { getReadings } from '../../services/api';

interface Props { meterId: string; }

export default function ReadingsTable({ meterId }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const fetchReadings = useCallback(() => getReadings(meterId, '24h'), [meterId]);
  const { data: rawReadings } = usePolling(fetchReadings, 15000);

  const readings = (rawReadings || []).map(r => ({
    timestamp: new Date(r.time).toISOString().replace('T', ' ').substring(0, 19),
    flow: r.flow_rate,
    flowUnit: 'L/min',
    velocity: parseFloat((r.flow_rate / 60 * 0.8).toFixed(1)),
    positiveCum: r.volume,
    negativeCum: 0.0,
    cumulativeTotal: r.volume,
    cumulativeUnit: 'm³',
  }));

  const totalPages = Math.max(1, Math.ceil(readings.length / perPage));
  const pageData = readings.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="card data-table-card" style={{ padding: 0 }}>
      <div className="data-table-header">
        <div className="data-table-header__title">
          <Clock size={14} />
          {readings.length > 0 ? 'Realtime · last day' : 'No data available'}
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
              <th>Flow</th>
              <th>Flow unit</th>
              <th>Velocity</th>
              <th>Positive Cumulative</th>
              <th>Negative Cumulative</th>
              <th>Cumulative Total</th>
              <th>Cumulative Unit</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No readings — start the simulator to generate data
                </td>
              </tr>
            )}
            {pageData.map((r, i) => (
              <tr key={i}>
                <td>{r.timestamp}</td>
                <td>{r.flow}</td>
                <td>{r.flowUnit}</td>
                <td>{r.velocity} m/s</td>
                <td>{r.positiveCum}</td>
                <td>{r.negativeCum}</td>
                <td>{r.cumulativeTotal}</td>
                <td>{r.cumulativeUnit}</td>
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
