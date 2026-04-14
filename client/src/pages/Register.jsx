import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-gray-500">Invalid invite link.</p>
        <a href="/login" className="text-brand-500 mt-4 block">Go to login</a>
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
    <div className="min-h-screen flex flex-col justify-center p-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4">
          <span className="text-white text-3xl">📍</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Join PinPost</h1>
        <p className="text-gray-500 mt-1">Create your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">{error}</div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <input
          className="input-field"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
