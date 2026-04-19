import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api';

const ERROR_MESSAGES = {
  google_denied: 'Google sign-in was cancelled.',
  not_registered: 'This Google account is not registered. Contact your admin.',
  suspended: 'Your account has been suspended.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  auth_failed: 'Authentication failed. Please try again.'
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const urlError = params.get('error');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      if (data.role === 'super_admin') navigate('/superadmin');
      else if (data.role === 'admin') navigate('/dashboard');
      else navigate('/checkin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
        <h1 className="text-3xl font-bold text-gray-900">PinPost</h1>
        <p className="text-gray-500 mt-1">Check in. Rank higher.</p>
      </div>

      {(urlError || error) && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm text-center">
          {ERROR_MESSAGES[urlError] || error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-sm">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <a href="/api/auth/google" className="btn-secondary flex items-center justify-center gap-3">
        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </a>
      <p className="text-center text-xs text-gray-400 mt-3">Google sign-in for admins only</p>
    </div>
  );
}
