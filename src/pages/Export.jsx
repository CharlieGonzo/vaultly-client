import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const PRESETS = [
  { label: 'This Month',    getDates: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
  { label: 'Last Month',    getDates: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth()-1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]; } },
  { label: 'Last 3 Months', getDates: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth()-3, 1), n]; } },
  { label: 'Last 6 Months', getDates: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth()-6, 1), n]; } },
  { label: 'This Year',     getDates: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n]; } },
  { label: 'All Time',      getDates: () => [new Date('2000-01-01'), new Date()] },
];

function toInputDate(d) {
  return d.toISOString().split('T')[0];
}

function fmt(n) {
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function Export() {
  const navigate = useNavigate();
  const today = toInputDate(new Date());
  const firstOfMonth = toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [startDate, setStartDate]       = useState(firstOfMonth);
  const [endDate, setEndDate]           = useState(today);
  const [typeFilter, setTypeFilter]     = useState('all');
  const [activePreset, setActivePreset] = useState('This Month');

  useEffect(() => {
    api.get('/transactions')
      .then(r => setTransactions(r.data))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  const applyPreset = (preset) => {
    const [s, e] = preset.getDates();
    setStartDate(toInputDate(s));
    setEndDate(toInputDate(e));
    setActivePreset(preset.label);
  };

  const filtered = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');
    return transactions.filter(t => {
      const d = new Date(t.date);
      const inRange = d >= start && d <= end;
      const inType  = typeFilter === 'all' || t.type === typeFilter;
      return inRange && inType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, startDate, endDate, typeFilter]);

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance   = totalIncome - totalExpense;

  const exportCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = filtered.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.category,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
    ]);

    const summary = [
      [],
      ['Summary'],
      ['Total Income',  totalIncome.toFixed(2)],
      ['Total Expenses', totalExpense.toFixed(2)],
      ['Net Balance',   netBalance.toFixed(2)],
      ['Date Range',    `${startDate} to ${endDate}`],
      ['Records',       filtered.length],
    ];

    const csv = [headers, ...rows, ...summary].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vaultly-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dash-layout">
      <header className="dash-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="brand" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span>📥</span> Export to CSV
        </div>
        <div className="user-info">
          <button
            className="export-btn-header"
            onClick={exportCSV}
            disabled={loading || filtered.length === 0}
          >
            ⬇ Download CSV {!loading && `(${filtered.length} rows)`}
          </button>
          <button className="cog-btn" onClick={() => navigate('/account')} title="Account settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {loading
        ? <div className="chart-loading">Loading transactions…</div>
        : (
        <div className="export-layout">

          {/* ── Left: Controls ── */}
          <div className="export-controls">

            <div className="tile">
              <div className="tile-label">Quick Select</div>
              <div className="preset-grid">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    className={`preset-btn ${activePreset === p.label ? 'active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tile">
              <div className="tile-label">Custom Date Range</div>
              <label className="export-label">Start Date</label>
              <input
                type="date"
                className="export-input"
                value={startDate}
                max={endDate}
                onChange={e => { setStartDate(e.target.value); setActivePreset(''); }}
              />
              <label className="export-label" style={{ marginTop: '0.6rem' }}>End Date</label>
              <input
                type="date"
                className="export-input"
                value={endDate}
                min={startDate}
                max={today}
                onChange={e => { setEndDate(e.target.value); setActivePreset(''); }}
              />
            </div>

            <div className="tile">
              <div className="tile-label">Filter by Type</div>
              <div className="type-filter-row">
                {['all', 'income', 'expense'].map(t => (
                  <button
                    key={t}
                    className={`type-filter-btn ${typeFilter === t ? 'active' : ''}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="tile export-summary-tile">
              <div className="tile-label">Summary for Selection</div>
              <div className="export-stat">
                <span>Records</span>
                <span>{filtered.length}</span>
              </div>
              <div className="export-stat">
                <span>Income</span>
                <span style={{ color: 'var(--green)' }}>{fmt(totalIncome)}</span>
              </div>
              <div className="export-stat">
                <span>Expenses</span>
                <span style={{ color: 'var(--red)' }}>{fmt(totalExpense)}</span>
              </div>
              <div className="export-stat" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span>Net</span>
                <span style={{ color: netBalance >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                  {netBalance < 0 ? '-' : ''}{fmt(Math.abs(netBalance))}
                </span>
              </div>

              <button
                className="export-btn"
                onClick={exportCSV}
                disabled={filtered.length === 0}
              >
                ⬇ Download CSV ({filtered.length} rows)
              </button>
            </div>

          </div>

          {/* ── Right: Preview table ── */}
          <div className="tile export-preview-tile">
            <div className="tile-label">
              Preview — {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} from {startDate} to {endDate}
            </div>

            {filtered.length === 0
              ? <p className="chart-empty">No transactions match this date range.</p>
              : (
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t._id}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`type-badge ${t.type}`}>
                            {t.type}
                          </span>
                        </td>
                        <td>{t.category}</td>
                        <td className="desc-cell">{t.description || '—'}</td>
                        <td className={`amount-cell ${t.type}`}>
                          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
