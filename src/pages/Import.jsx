import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const VALID_TYPES      = ['income', 'expense'];
const EXPENSE_CATS     = ['Food', 'Housing', 'Transport', 'Healthcare', 'Entertainment', 'Shopping', 'Utilities', 'Other'];
const INCOME_CATS      = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
const ALL_CATS         = [...new Set([...EXPENSE_CATS, ...INCOME_CATS])];

const TEMPLATE_ROWS = [
  ['date', 'type', 'category', 'description', 'amount'],
  ['2026-01-15', 'expense', 'Food', 'Grocery run', '85.50'],
  ['2026-01-16', 'income', 'Salary', 'Monthly paycheck', '3000.00'],
  ['2026-01-18', 'expense', 'Transport', 'Gas', '45.00'],
];

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  return lines.map(line => {
    const fields = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  });
}

function validateRow(row, index) {
  const [date, type, category, description, amount] = row;
  const errors = [];

  const parsedDate = new Date(date);
  if (!date || isNaN(parsedDate.getTime())) errors.push('Invalid date');

  if (!VALID_TYPES.includes((type || '').toLowerCase())) errors.push(`Type must be "income" or "expense"`);

  if (!category || category.trim() === '') errors.push('Category is required');

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) errors.push('Amount must be a positive number');

  return {
    rowNum: index + 2,
    date:        date || '',
    type:        (type || '').toLowerCase(),
    category:    category || '',
    description: description || '',
    amount:      parsedAmount,
    valid:       errors.length === 0,
    errors,
  };
}

function downloadTemplate() {
  const csv = TEMPLATE_ROWS.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'vaultly-import-template.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function Import() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);
  const [rows, setRows]         = useState(null);   // null = no file yet
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState(null);   // { imported, skipped }

  const processFile = file => {
    if (!file || !file.name.endsWith('.csv')) {
      alert('Please upload a .csv file.');
      return;
    }
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = parseCSV(e.target.result);
      if (parsed.length < 2) { setRows([]); return; }

      // Detect and skip header row
      const header = parsed[0].map(h => h.toLowerCase());
      const hasHeader = header.includes('date') || header.includes('type') || header.includes('amount');
      const dataRows  = hasHeader ? parsed.slice(1) : parsed;

      const validated = dataRows
        .filter(r => r.some(c => c !== ''))  // skip blank lines
        .map((r, i) => validateRow(r, i));
      setRows(validated);
    };
    reader.readAsText(file);
  };

  const onFileChange = e => processFile(e.target.files?.[0]);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  }, []);

  const onDragOver = e => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const validRows   = rows?.filter(r => r.valid)   || [];
  const invalidRows = rows?.filter(r => !r.valid)  || [];

  const runImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const { data } = await api.post('/transactions/bulk', {
        transactions: validRows.map(r => ({
          date:        r.date,
          type:        r.type,
          category:    r.category,
          description: r.description,
          amount:      r.amount,
        })),
      });
      setResult({ imported: data.imported, skipped: invalidRows.length });
      setRows(null);
      setFileName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const cogSVG = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );

  return (
    <div className="dash-layout">
      <header className="dash-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="brand" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span>📤</span> Import CSV
        </div>
        <div className="user-info">
          {rows && validRows.length > 0 && (
            <button className="export-btn-header" onClick={runImport} disabled={importing}>
              {importing ? 'Importing…' : `⬆ Import ${validRows.length} row${validRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
          <button className="cog-btn" onClick={() => navigate('/account')} title="Account settings">{cogSVG}</button>
        </div>
      </header>

      <div className="export-layout">

        {/* ── Left controls ── */}
        <div className="export-controls">

          {/* Upload area */}
          <div className="tile">
            <div className="tile-label">Upload CSV File</div>
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
              <div className="drop-icon">📂</div>
              {fileName
                ? <><p className="drop-filename">{fileName}</p><p className="drop-sub">Click to replace</p></>
                : <><p className="drop-main">Drop your CSV here</p><p className="drop-sub">or click to browse</p></>
              }
            </div>
          </div>

          {/* Template download */}
          <div className="tile">
            <div className="tile-label">CSV Format</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Your CSV must have these columns in this order:
            </p>
            <div className="schema-table">
              {[
                ['date',        'YYYY-MM-DD',           'required'],
                ['type',        'income or expense',    'required'],
                ['category',    'e.g. Food, Salary',    'required'],
                ['description', 'any text',             'optional'],
                ['amount',      'positive number',      'required'],
              ].map(([col, fmt, req]) => (
                <div key={col} className="schema-row">
                  <code className="schema-col">{col}</code>
                  <span className="schema-fmt">{fmt}</span>
                  <span className={`schema-req ${req}`}>{req}</span>
                </div>
              ))}
            </div>
            <button className="preset-btn active" style={{ marginTop: '0.85rem', width: '100%' }} onClick={downloadTemplate}>
              ⬇ Download Template
            </button>
          </div>

          {/* Validation summary */}
          {rows !== null && (
            <div className="tile">
              <div className="tile-label">Validation Summary</div>
              <div className="export-stat">
                <span>Total rows</span>
                <span>{rows.length}</span>
              </div>
              <div className="export-stat">
                <span>Ready to import</span>
                <span style={{ color: 'var(--green)' }}>{validRows.length}</span>
              </div>
              <div className="export-stat">
                <span>Rows with errors</span>
                <span style={{ color: invalidRows.length > 0 ? 'var(--red)' : 'var(--muted)' }}>{invalidRows.length}</span>
              </div>
              {invalidRows.length > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  Invalid rows will be skipped. Fix them in your file and re-upload to include them.
                </p>
              )}
              <button
                className="export-btn"
                style={{ marginTop: '0.85rem' }}
                onClick={runImport}
                disabled={validRows.length === 0 || importing}
              >
                {importing ? 'Importing…' : `⬆ Import ${validRows.length} valid row${validRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="tile" style={{ borderLeft: '4px solid var(--green)' }}>
              <div className="tile-label">Import Complete</div>
              <div className="export-stat"><span>Imported</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>{result.imported} rows</span></div>
              {result.skipped > 0 && <div className="export-stat"><span>Skipped</span><span style={{ color: 'var(--red)' }}>{result.skipped} invalid</span></div>}
              <button className="preset-btn active" style={{ marginTop: '0.75rem', width: '100%' }} onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            </div>
          )}

        </div>

        {/* ── Right: Preview table ── */}
        <div className="tile export-preview-tile">
          <div className="tile-label">
            {rows === null
              ? 'Preview — upload a CSV to see your data'
              : `Preview — ${rows.length} row${rows.length !== 1 ? 's' : ''} parsed · ${validRows.length} valid · ${invalidRows.length} invalid`
            }
          </div>

          {rows === null && (
            <div className="chart-empty" style={{ marginTop: '3rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</p>
              <p>No file uploaded yet.</p>
              <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Download the template to get started.</p>
            </div>
          )}

          {rows !== null && rows.length === 0 && (
            <p className="chart-empty">No data rows found. Make sure your CSV has data below the header.</p>
          )}

          {rows !== null && rows.length > 0 && (
            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'row-invalid'}>
                      <td style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{row.rowNum}</td>
                      <td>{row.date || <span className="err-cell">—</span>}</td>
                      <td>
                        {row.type
                          ? <span className={`type-badge ${row.type}`}>{row.type}</span>
                          : <span className="err-cell">missing</span>
                        }
                      </td>
                      <td>{row.category || <span className="err-cell">missing</span>}</td>
                      <td className="desc-cell">{row.description || '—'}</td>
                      <td className={`amount-cell ${row.type}`}>
                        {!isNaN(row.amount) && row.amount > 0
                          ? `$${row.amount.toFixed(2)}`
                          : <span className="err-cell">invalid</span>
                        }
                      </td>
                      <td>
                        {row.valid
                          ? <span className="status-ok">✓ Ready</span>
                          : <span className="status-err" title={row.errors.join(' · ')}>✕ {row.errors[0]}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
