import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import CheckIn from './pages/CheckIn';
import Success from './pages/Success';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';

function HomeRedirect() {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'super_admin') return <Navigate to="/superadmin" replace />;
  if (role === 'admin') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/checkin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/checkin" element={
          <ProtectedRoute allowedRoles={['worker', 'admin', 'super_admin']}>
            <CheckIn />
          </ProtectedRoute>
        } />
        <Route path="/success" element={
          <ProtectedRoute allowedRoles={['worker', 'admin', 'super_admin']}>
            <Success />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <Team />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/superadmin" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdmin />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
