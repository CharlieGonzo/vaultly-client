import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/api';

const EXPENSE_CATEGORIES = ['Food', 'Housing', 'Transport', 'Healthcare', 'Entertainment', 'Shopping', 'Utilities', 'Other'];
const INCOME_CATEGORIES  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
const SUGGESTIONS = [
  'How is my spending looking?',
  'Where can I cut expenses?',
  'Am I saving enough?',
  'Give me a budget plan.',
];

const WIDGET_OPTIONS = [
  { id: 'savings-rate',    icon: '💹', label: 'Savings Rate',      desc: 'What % of your income you actually keep' },
  { id: 'top-category',    icon: '🏆', label: 'Top Expense',       desc: 'Your biggest spending category this month' },
  { id: 'avg-daily',       icon: '📅', label: 'Daily Average',     desc: 'Average amount spent per day this month' },
  { id: 'biggest-expense', icon: '💸', label: 'Biggest Expense',   desc: 'Largest single expense you\'ve logged' },
  { id: 'month-vs-last',   icon: '⚖️', label: 'Month vs Last',     desc: 'This month\'s spending vs last month' },
  { id: 'mini-chart',      icon: '📊', label: 'Spending Chart',    desc: 'Mini bar chart of your last 6 months' },
];

function fmt(n) { return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function useWidgets(transactions) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const daysIntoMonth  = now.getDate();

  const thisMonth  = transactions.filter(t => new Date(t.date) >= thisMonthStart);
  const lastMonth  = transactions.filter(t => { const d = new Date(t.date); return d >= lastMonthStart && d <= lastMonthEnd; });

  const thisExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastExpense = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense= transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;

  const catMap = {};
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const biggest = transactions.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];

  const monthChange = lastExpense > 0 ? ((thisExpense - lastExpense) / lastExpense * 100) : null;

  // Mini chart: last 6 months
  const miniChartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short' });
    const monthTxns = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    });
    miniChartData.push({
      month: label,
      income:  monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }

  return { savingsRate, topCat, biggest, avgDaily: daysIntoMonth > 0 ? thisExpense / daysIntoMonth : 0, monthChange, thisExpense, lastExpense, miniChartData };
}

function Widget({ id, data }) {
  const { savingsRate, topCat, biggest, avgDaily, monthChange, thisExpense, lastExpense, miniChartData } = data;

  if (id === 'savings-rate') {
    const pct = Math.max(0, Math.min(100, savingsRate));
    const color = pct >= 20 ? 'var(--green)' : pct >= 10 ? '#f59e0b' : 'var(--red)';
    return (
      <>
        <div className="tile-label">Savings Rate</div>
        <div className="tile-big-number" style={{ color }}>{pct.toFixed(1)}%</div>
        <div className="widget-bar-track">
          <div className="widget-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <div className="tile-sub">{pct >= 20 ? '✓ On track' : pct >= 10 ? '⚠ Could be better' : '✕ Spending too much'}</div>
      </>
    );
  }

  if (id === 'top-category') {
    return (
      <>
        <div className="tile-label">Top Expense This Month</div>
        {topCat
          ? <><div className="tile-big-number" style={{ fontSize: '1.4rem', color: 'var(--red)' }}>{topCat[0]}</div>
              <div className="tile-sub">{fmt(topCat[1])} spent this month</div></>
          : <div className="tile-sub" style={{ marginTop: '0.5rem' }}>No expenses yet this month</div>
        }
      </>
    );
  }

  if (id === 'avg-daily') {
    return (
      <>
        <div className="tile-label">Avg Daily Spend</div>
        <div className="tile-big-number" style={{ color: 'var(--red)' }}>{fmt(avgDaily)}</div>
        <div className="tile-sub">per day this month</div>
      </>
    );
  }

  if (id === 'biggest-expense') {
    return (
      <>
        <div className="tile-label">Biggest Expense</div>
        {biggest
          ? <><div className="tile-big-number" style={{ fontSize: '1.4rem', color: 'var(--red)' }}>{fmt(biggest.amount)}</div>
              <div className="tile-sub">{biggest.category} — {biggest.description || 'no description'}</div></>
          : <div className="tile-sub" style={{ marginTop: '0.5rem' }}>No expenses logged yet</div>
        }
      </>
    );
  }

  if (id === 'month-vs-last') {
    const up = monthChange !== null && monthChange > 0;
    const color = up ? 'var(--red)' : 'var(--green)';
    return (
      <>
        <div className="tile-label">Month vs Last Month</div>
        {monthChange !== null
          ? <><div className="tile-big-number" style={{ color }}>
              {up ? '▲' : '▼'} {Math.abs(monthChange).toFixed(1)}%
            </div>
            <div className="tile-sub">
              {fmt(thisExpense)} this · {fmt(lastExpense)} last
            </div></>
          : <div className="tile-sub" style={{ marginTop: '0.5rem' }}>Not enough data yet</div>
        }
      </>
    );
  }

  if (id === 'mini-chart') {
    return (
      <>
        <div className="tile-label">Last 6 Months</div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={miniChartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: '#FFD6D1', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={v => fmt(v)}
              contentStyle={{ background: '#014B43', border: '1px solid #099078', borderRadius: 4, fontSize: 11, color: '#F9ECE5' }}
            />
            <Bar dataKey="income"  fill="#099078" radius={[2,2,0,0]} />
            <Bar dataKey="expense" fill="#9C2113" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </>
    );
  }

  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const username   = localStorage.getItem('username') || 'User';

  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'expense', category: 'Food', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [addingTxn, setAddingTxn] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);

  const [activeWidgets, setActiveWidgets] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/transactions').then(r => setTransactions(r.data)).catch(() => {});
    api.get('/users/me').then(r => setActiveWidgets(r.data.widgets || [])).catch(() => {
      setActiveWidgets(JSON.parse(localStorage.getItem('dashWidgets') || '[]'));
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const widgetData   = useWidgets(transactions);

  const toggleWidget = id => {
    setActiveWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      api.put('/users/me', { widgets: next }).catch(() => {});
      return next;
    });
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (name === 'type') updated.category = value === 'income' ? 'Salary' : 'Food';
      return updated;
    });
  };

  const addTransaction = async e => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) return;
    setAddingTxn(true);
    try {
      const { data } = await api.post('/transactions', { ...form, amount: Number(form.amount) });
      setTransactions(prev => [data, ...prev]);
      setForm(f => ({ ...f, description: '', amount: '' }));
    } catch {} finally { setAddingTxn(false); }
  };

  const deleteTransaction = async id => {
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch {}
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || aiLoading) return;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setAiLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const { data } = await api.post('/chat', { message: msg, history });
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ ' + (err.response?.data?.message || 'Something went wrong.') }]);
    } finally { setAiLoading(false); }
  };

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const autoResize = e => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
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
        <div className="brand"><span>🏦</span> Vaultly</div>
        <div className="user-info">
          <button className="export-nav-btn" onClick={() => navigate('/import')}>⬆ Import CSV</button>
          <button className="export-nav-btn" onClick={() => navigate('/export')}>⬇ Export CSV</button>
          <button className="cog-btn" onClick={() => navigate('/account')} title="Account settings">{cogSVG}</button>
          <span>{username}</span>
          <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}>Log out</button>
        </div>
      </header>

      <div className="tile-grid">

        {/* Balance */}
        <div className="tile tile-balance">
          <div className="tile-label">Net Balance</div>
          <div className="tile-big-number" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {balance < 0 ? '-' : ''}{fmt(Math.abs(balance))}
          </div>
          <div className="tile-sub">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} total</div>
        </div>

        {/* Income */}
        <div className="tile tile-income">
          <div className="tile-label">Total Income</div>
          <div className="tile-big-number" style={{ color: 'var(--green)' }}>{fmt(totalIncome)}</div>
          <div className="tile-sub">{transactions.filter(t => t.type === 'income').length} entries</div>
        </div>

        {/* Expense */}
        <div className="tile tile-expense">
          <div className="tile-label">Total Expenses</div>
          <div className="tile-big-number" style={{ color: 'var(--red)' }}>{fmt(totalExpense)}</div>
          <div className="tile-sub">{transactions.filter(t => t.type === 'expense').length} entries</div>
        </div>

        {/* Add Transaction */}
        <div className="tile tile-add">
          <div className="tile-label">Add Transaction</div>
          <form onSubmit={addTransaction} className="tile-form">
            <div className="form-row">
              <select name="type" value={form.type} onChange={handleFormChange}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select name="category" value={form.category} onChange={handleFormChange}>
                {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount ($)" value={form.amount} onChange={handleFormChange} required />
              <input name="date" type="date" value={form.date} onChange={handleFormChange} />
            </div>
            <input name="description" placeholder="Description (optional)" value={form.description} onChange={handleFormChange} />
            <button type="submit" className="add-btn" disabled={addingTxn}>{addingTxn ? 'Adding…' : '+ Add'}</button>
          </form>
        </div>

        {/* Transactions */}
        <div className="tile tile-transactions">
          <div className="tile-label">Recent Transactions <span className="tile-count">({transactions.length})</span></div>
          <div className="txn-scroll">
            {transactions.length === 0 && <p className="empty-txn">No transactions yet. Add one!</p>}
            {transactions.map(t => (
              <div key={t._id} className="txn-item">
                <div className="txn-left">
                  <div className="txn-category">{t.category}</div>
                  <div className="txn-desc">{t.description || t.category}</div>
                  <div className="txn-date">{new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div className={`txn-amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</div>
                <button className="delete-btn" onClick={() => deleteTransaction(t._id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics nav */}
        <div className="tile tile-analytics" onClick={() => navigate('/analytics')}>
          <div className="tile-label">Historical Data</div>
          <div className="analytics-tile-icon">📊</div>
          <div className="analytics-tile-text">View Charts</div>
          <div className="tile-sub">Bar · Line · Area · Pie</div>
        </div>

        {/* AI Advisor */}
        <div className="tile tile-ai">
          <div className="tile-label">🤖 AI Financial Advisor <span className="tile-count">powered by Gemini</span></div>
          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="ai-welcome">
                <p>Ask me anything about your finances, {username}.</p>
                <div className="suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="avatar">{msg.role === 'user' ? '🧑' : '🤖'}</div>
                <div className="bubble">{msg.text}</div>
              </div>
            ))}
            {aiLoading && (
              <div className="message ai typing">
                <div className="avatar">🤖</div>
                <div className="bubble">Analyzing your finances…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="ai-input-row">
            <textarea rows={1} value={input}
              onChange={e => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={onKeyDown}
              placeholder="Ask about your finances… (Enter to send)"
              disabled={aiLoading}
            />
            <button className="send-btn" onClick={() => sendMessage()} disabled={aiLoading || !input.trim()}>➤</button>
          </div>
        </div>

        {/* ── Widget row ── */}
        <div className="tile-widget-row">
          {/* "+" tile */}
          <div className="tile tile-plus" onClick={() => setShowModal(true)}>
            <div className="plus-icon">+</div>
            <div className="plus-label">Add Widget</div>
          </div>

          {/* Active widgets */}
          {activeWidgets.map(id => (
            <div key={id} className="tile tile-widget">
              <button className="widget-remove-btn" onClick={() => toggleWidget(id)} title="Remove widget">✕</button>
              <Widget id={id} data={widgetData} />
            </div>
          ))}
        </div>

      </div>

      {/* Widget selector modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Widgets</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="modal-sub">Select widgets to pin to your dashboard. Your choices are saved automatically.</p>
            <div className="widget-option-grid">
              {WIDGET_OPTIONS.map(w => {
                const active = activeWidgets.includes(w.id);
                return (
                  <button
                    key={w.id}
                    className={`widget-option-card ${active ? 'active' : ''}`}
                    onClick={() => toggleWidget(w.id)}
                  >
                    <div className="widget-option-icon">{w.icon}</div>
                    <div className="widget-option-label">{w.label}</div>
                    <div className="widget-option-desc">{w.desc}</div>
                    <div className="widget-option-check">{active ? '✓ Added' : '+ Add'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
