import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import supabase from '../lib/supabase';

export default function Signup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm]         = useState({ username: '', email: '', password: '' });
  const [picFile, setPicFile]   = useState(null);
  const [picPreview, setPicPreview] = useState('');
  const [picError, setPicError] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { setPicError('Only JPG, PNG, WEBP or GIF.'); return; }
    if (file.size > 5 * 1024 * 1024)  { setPicError('File must be under 5MB.'); return; }
    setPicError('');
    setPicFile(file);
    setPicPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removePic = () => {
    setPicFile(null);
    if (picPreview) URL.revokeObjectURL(picPreview);
    setPicPreview('');
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let profilePic = '';

      if (picFile) {
        const ext  = picFile.name.split('.').pop();
        const path = `signup-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, picFile, { upsert: true });
        if (upErr) throw new Error('Photo upload failed: ' + upErr.message);
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        profilePic = urlData.publicUrl;
      }

      const { data } = await api.post('/auth/signup', { ...form, profilePic });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('profilePic', data.profilePic || '');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Sign up failed');
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
              <div><strong>Track Every Dollar</strong><p>Log income and expenses by category in seconds</p></div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <div><strong>AI Financial Advisor</strong><p>Get personalized insights powered by Google Gemini</p></div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div><strong>Live Balance Summary</strong><p>Always know where your money stands</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="split-right">
        <div className="split-form-box">
          <h2>Create an account</h2>
          <p className="split-subtitle">Start tracking your finances today</p>

          {/* Avatar picker */}
          <div className="signup-avatar-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="signup-avatar-wrap" onClick={() => !picPreview && fileInputRef.current?.click()}>
              {picPreview
                ? <img src={picPreview} alt="preview" className="signup-avatar-img" />
                : (
                  <div className="signup-avatar-placeholder">
                    <span className="signup-avatar-plus">+</span>
                    <span className="signup-avatar-hint">Photo</span>
                  </div>
                )
              }
              {!picPreview && <div className="signup-avatar-overlay">Choose</div>}
            </div>

            {picPreview && (
              <div className="signup-avatar-actions">
                <button type="button" className="signup-avatar-change" onClick={() => fileInputRef.current?.click()}>Change</button>
                <button type="button" className="signup-avatar-remove" onClick={removePic}>Remove</button>
              </div>
            )}
            {picError && <p className="acct-error">{picError}</p>}
            <p className="signup-avatar-optional">Optional · JPG, PNG, WEBP or GIF · max 5MB</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={submit}>
            <label>Username</label>
            <input name="username" value={form.username} onChange={handle} placeholder="e.g. johndoe" required />

            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required />

            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="Min 6 characters" minLength={6} required />

            <button type="submit" disabled={loading}>
              {loading ? (picFile ? 'Uploading photo…' : 'Creating account…') : 'Sign Up'}
            </button>
          </form>

          <p className="switch-link">
            Already have an account? <a onClick={() => navigate('/login')}>Log in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
