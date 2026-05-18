import { useState } from 'react';
import { Clock, Search, Download, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Props { meterId: string; }

interface Reading {
  timestamp: string;
  flow: number;
  flowUnit: string;
  velocity: number;
  positiveCum: number;
  negativeCum: number;
  cumulativeTotal: number;
  cumulativeUnit: string;
}

function generateReadings(meterId: string): Reading[] {
  void meterId;
  const rows: Reading[] = [];
  const baseDate = new Date();
  baseDate.setMinutes(0, 0, 0);
  for (let i = 0; i < 96; i++) {
    const ts = new Date(baseDate.getTime() - i * 15 * 60000);
    const flow = +(1.5 + Math.random() * 3).toFixed(1);
    const velocity = +(0.1 + Math.random() * 0.9).toFixed(1);
    const cumBase = 11466.7 - i * 3.1;
    rows.push({
      timestamp: ts.toISOString().replace('T', ' ').substring(0, 19),
      flow,
      flowUnit: 'm3/h',
      velocity,
      positiveCum: +cumBase.toFixed(1),
      negativeCum: 0.0,
      cumulativeTotal: +cumBase.toFixed(1),
      cumulativeUnit: 'm3',
    });
  }
  return rows;
}

export default function ReadingsTable({ meterId }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const readings = generateReadings(meterId);
  const totalPages = Math.ceil(readings.length / perPage);
  const pageData = readings.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="card data-table-card" style={{ padding: 0 }}>
      <div className="data-table-header">
        <div className="data-table-header__title">
          <Clock size={14} />
          Realtime · last day
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
        <span>{page * perPage + 1} – {Math.min((page + 1) * perPage, readings.length)} of {readings.length}</span>
        <button disabled={page === 0} onClick={() => setPage(0)}><ChevronsLeft size={13} /></button>
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13} /></button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={13} /></button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><ChevronsRight size={13} /></button>
      </div>
    </div>
  );
}
