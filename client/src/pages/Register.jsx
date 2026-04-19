import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Icon } from '../components/Icons';

export default function Register() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token) return (
    <div className="app-shell flex items-center justify-center p-6 text-center">
      <div>
        <div className="brand-mark mb-5 mx-auto opacity-50">
          <Icon.PinMark className="w-7 h-7 text-white" />
        </div>
        <p className="meta">This invite link is invalid or expired.</p>
        <a href="/login" className="btn-ghost mt-4 inline-flex">Go to login <Icon.ArrowRight className="w-4 h-4" /></a>
      </div>
    </div>
  );

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', { token, name, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      navigate('/checkin');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="brand-mark mb-5 mx-auto">
          <Icon.PinMark className="w-7 h-7 text-white" />
        </div>
        <h1 className="h-display">Join PinPost</h1>
        <p className="meta mt-2">Set up your account to start checking in.</p>
      </div>

      {error && (
        <div className="banner banner-error mb-5">
          <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3">
        <div>
          <label className="label">Your name</label>
          <input
            className="input-field"
            type="text"
            placeholder="First and last name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Create a password</label>
          <input
            className="input-field"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button className="btn-primary mt-2" type="submit" disabled={loading}>
          {loading ? 'Creating…' : (<>Create Account <Icon.ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>
    </div>
  );
}
