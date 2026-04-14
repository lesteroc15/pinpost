import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const role = params.get('role');
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
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in...</p>
    </div>
  );
}
