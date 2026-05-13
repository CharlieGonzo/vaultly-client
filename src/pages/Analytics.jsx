import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/api';

const COLORS = ['#9C2113', '#099078', '#FFD6D1', '#F9ECE5', '#014B43', '#c0392b', '#1abc9c', '#e74c3c'];

function fmt(n) { return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transactions')
      .then(r => setTransactions(r.data))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, []);

  // ── Monthly income vs expense bar data ──────────────────
  const monthlyMap = {};
  transactions.forEach(t => {
    const key = getMonthKey(t.date);
    if (!monthlyMap[key]) monthlyMap[key] = { month: getMonthLabel(key), income: 0, expense: 0 };
    if (t.type === 'income')  monthlyMap[key].income  += t.amount;
    if (t.type === 'expense') monthlyMap[key].expense += t.amount;
  });
  const monthlyData = Object.keys(monthlyMap).sort().map(k => monthlyMap[k]);

  // ── Running balance line data ────────────────────────────
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const balanceData = sorted.map(t => {
    running += t.type === 'income' ? t.amount : -t.amount;
    return {
      date: new Date(t.date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      balance: parseFloat(running.toFixed(2)),
    };
  });

  // ── Expense by category pie data ────────────────────────
  const expCatMap = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    expCatMap[t.category] = (expCatMap[t.category] || 0) + t.amount;
  });
  const expensePieData = Object.entries(expCatMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  // ── Income by category pie data ─────────────────────────
  const incCatMap = {};
  transactions.filter(t => t.type === 'income').forEach(t => {
    incCatMap[t.category] = (incCatMap[t.category] || 0) + t.amount;
  });
  const incomePieData = Object.entries(incCatMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  // ── Area data (income + expense over time) ───────────────
  const areaData = monthlyData;

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;

  const noData = <p className="chart-empty">No data yet — add transactions on the dashboard.</p>;

  return (
    <div className="dash-layout">
      <header className="dash-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="brand" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span>📊</span> Analytics
        </div>
        <div className="user-info">
          <button className="cog-btn" onClick={() => navigate('/account')} title="Account settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {loading
        ? <div className="chart-loading">Loading your data…</div>
        : (
        <div className="analytics-grid">

          {/* ── Stat tiles ── */}
          <div className="tile stat-tile" style={{ borderLeftColor: 'var(--green)' }}>
            <div className="tile-label">Total Income</div>
            <div className="tile-big-number" style={{ color: 'var(--green)' }}>{fmt(totalIncome)}</div>
          </div>
          <div className="tile stat-tile" style={{ borderLeftColor: 'var(--red)' }}>
            <div className="tile-label">Total Expenses</div>
            <div className="tile-big-number" style={{ color: 'var(--red)' }}>{fmt(totalExpense)}</div>
          </div>
          <div className="tile stat-tile" style={{ borderLeftColor: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            <div className="tile-label">Net Balance</div>
            <div className="tile-big-number" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {balance < 0 ? '-' : ''}{fmt(Math.abs(balance))}
            </div>
          </div>
          <div className="tile stat-tile" style={{ borderLeftColor: 'var(--primary)' }}>
            <div className="tile-label">Savings Rate</div>
            <div className="tile-big-number" style={{ color: savingsRate >= 20 ? 'var(--green)' : 'var(--red)' }}>
              {savingsRate}%
            </div>
          </div>

          {/* ── Bar chart: Monthly income vs expenses ── */}
          <div className="tile chart-tile chart-wide">
            <div className="tile-label">Monthly Income vs Expenses — Bar Chart</div>
            {monthlyData.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#099078" strokeOpacity={0.2} />
                  <XAxis dataKey="month" tick={{ fill: '#FFD6D1', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#FFD6D1', fontSize: 11 }} tickFormatter={v => '$' + v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#FFD6D1' }} />
                  <Bar dataKey="income"  name="Income"   fill="#099078" radius={[3,3,0,0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#9C2113" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Area chart: Income & expense trend ── */}
          <div className="tile chart-tile chart-wide">
            <div className="tile-label">Income & Expense Trend — Area Chart</div>
            {areaData.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={areaData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#099078" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#099078" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#9C2113" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#9C2113" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#099078" strokeOpacity={0.2} />
                  <XAxis dataKey="month" tick={{ fill: '#FFD6D1', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#FFD6D1', fontSize: 11 }} tickFormatter={v => '$' + v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#FFD6D1' }} />
                  <Area type="monotone" dataKey="income"  name="Income"   stroke="#099078" fill="url(#incomeGrad)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Expenses" stroke="#9C2113" fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Line chart: Running balance ── */}
          <div className="tile chart-tile chart-wide">
            <div className="tile-label">Running Balance Over Time — Line Chart</div>
            {balanceData.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={balanceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#099078" strokeOpacity={0.2} />
                  <XAxis dataKey="date" tick={{ fill: '#FFD6D1', fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#FFD6D1', fontSize: 11 }} tickFormatter={v => '$' + v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="balance" name="Balance" stroke="#F9ECE5" strokeWidth={2} dot={{ r: 3, fill: '#F9ECE5' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Pie: Expenses by category ── */}
          <div className="tile chart-tile chart-half">
            <div className="tile-label">Expenses by Category — Pie Chart</div>
            {expensePieData.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expensePieData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #099078', borderRadius: 4, color: '#F9ECE5', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#FFD6D1' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Pie: Income by category ── */}
          <div className="tile chart-tile chart-half">
            <div className="tile-label">Income by Category — Pie Chart</div>
            {incomePieData.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={incomePieData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {incomePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #099078', borderRadius: 4, color: '#F9ECE5', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#FFD6D1' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
