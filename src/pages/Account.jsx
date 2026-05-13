import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import supabase from '../lib/supabase';

export default function Account() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({ username: '', email: '', profilePic: '' });
  const [form, setForm]       = useState({ username: '', email: '' });
  const [pwForm, setPwForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [uploading, setUploading]   = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw]     = useState(false);

  const [infoMsg, setInfoMsg]   = useState({ text: '', error: false });
  const [pwMsg, setPwMsg]       = useState({ text: '', error: false });
  const [picMsg, setPicMsg]     = useState({ text: '', error: false });

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setProfile(data);
      setForm({ username: data.username, email: data.email });
    }).catch(() => navigate('/login'));
  }, []);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setPicMsg({ text: 'Only JPG, PNG, WEBP, or GIF allowed.', error: true });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPicMsg({ text: 'File must be under 5MB.', error: true });
      return;
    }

    setUploading(true);
    setPicMsg({ text: '', error: false });

    try {
      const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;
      const ext    = file.name.split('.').pop();
      const path   = `${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { data } = await api.put('/users/me', { profilePic: publicUrl });
      setProfile(p => ({ ...p, profilePic: data.profilePic }));
      localStorage.setItem('profilePic', data.profilePic);
      setPicMsg({ text: 'Profile picture updated!', error: false });
    } catch (err) {
      setPicMsg({ text: err.message || 'Upload failed.', error: true });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg({ text: '', error: false });
    try {
      const { data } = await api.put('/users/me', { username: form.username, email: form.email });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setProfile(p => ({ ...p, username: data.username, email: data.email }));
      setInfoMsg({ text: 'Account info updated!', error: false });
    } catch (err) {
      setInfoMsg({ text: err.response?.data?.message || 'Update failed.', error: true });
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ text: '', error: false });
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ text: 'New passwords do not match.', error: true });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters.', error: true });
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/users/me', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg({ text: 'Password changed successfully!', error: false });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg({ text: err.response?.data?.message || 'Password change failed.', error: true });
    } finally {
      setSavingPw(false);
    }
  };

  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="dash-layout">
      <header className="dash-header">
        <div className="brand">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
        <div className="brand" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <span>🏦</span> Vaultly
        </div>
        <div className="user-info">
          <span>👤 {profile.username}</span>
          <button className="logout-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}>Log out</button>
        </div>
      </header>

      <div className="account-grid">

        {/* Profile picture tile */}
        <div className="tile account-pic-tile">
          <div className="tile-label">Profile Picture</div>
          <div className="avatar-upload-area" onClick={handleAvatarClick}>
            {profile.profilePic
              ? <img src={profile.profilePic} alt="avatar" className="avatar-preview" />
              : <div className="avatar-initials">{initials}</div>
            }
            <div className="avatar-overlay">{uploading ? 'Uploading…' : 'Change Photo'}</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          {picMsg.text && <p className={picMsg.error ? 'acct-error' : 'acct-success'}>{picMsg.text}</p>}
          <p className="tile-sub">JPG, PNG, WEBP or GIF · max 5MB<br />Stored in Supabase</p>
        </div>

        {/* Account info tile */}
        <div className="tile account-info-tile">
          <div className="tile-label">Account Information</div>
          <form onSubmit={saveInfo} className="acct-form">
            <label>Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Username"
              required
            />
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email"
              required
            />
            {infoMsg.text && <p className={infoMsg.error ? 'acct-error' : 'acct-success'}>{infoMsg.text}</p>}
            <button type="submit" className="add-btn" disabled={savingInfo}>
              {savingInfo ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password tile */}
        <div className="tile account-pw-tile">
          <div className="tile-label">Change Password</div>
          <form onSubmit={savePassword} className="acct-form">
            <label>Current Password</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Current password"
              required
            />
            <label>New Password</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="New password (min 6 chars)"
              minLength={6}
              required
            />
            <label>Confirm New Password</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Repeat new password"
              required
            />
            {pwMsg.text && <p className={pwMsg.error ? 'acct-error' : 'acct-success'}>{pwMsg.text}</p>}
            <button type="submit" className="add-btn" disabled={savingPw}>
              {savingPw ? 'Updating…' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
