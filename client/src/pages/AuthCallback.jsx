import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Token + role come in the URL fragment so they never hit server logs.
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const role = params.get('role');

    // Wipe the hash from the URL bar so the token isn't sitting in shared screenshots.
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (token && role) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      if (role === 'super_admin') navigate('/superadmin', { replace: true });
      else if (role === 'admin') navigate('/dashboard', { replace: true });
      else navigate('/checkin', { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, []);

  return (
    <div className="app-shell flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="brand-mark opacity-80">
          <Icon.PinMark className="w-7 h-7 text-white" />
        </div>
        <div className="flex items-center gap-2 text-ink-500 text-sm">
          <Icon.Loader className="w-4 h-4 animate-spin" />
          Signing you in…
        </div>
      </div>
    </div>
  );
}
