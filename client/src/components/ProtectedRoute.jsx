import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'super_admin') return <Navigate to="/superadmin" replace />;
    if (role === 'admin') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/checkin" replace />;
  }
  return children;
}
