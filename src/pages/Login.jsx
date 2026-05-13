import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('profilePic', data.profilePic || '');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Left panel */}
      <div className="split-left">
        <div className="split-left-content">
          <div className="brand-logo">🏦</div>
          <h1 className="brand-name">Vaultly</h1>
          <p className="brand-tagline">Your personal AI-powered finance tracker</p>

          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <strong>Track Every Dollar</strong>
                <p>Log income and expenses by category in seconds</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <div>
                <strong>AI Financial Advisor</strong>
                <p>Get personalized insights powered by Google Gemini</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <strong>Live Balance Summary</strong>
                <p>Always know where your money stands</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="split-right">
        <div className="split-form-box">
          <h2>Welcome back</h2>
          <p className="split-subtitle">Sign in to your account</p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={submit}>
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required />

            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="Your password" required />

            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Log In'}</button>
          </form>

          <p className="switch-link">
            Don't have an account? <a onClick={() => navigate('/signup')}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
