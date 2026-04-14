import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/checkin'), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <span className="text-5xl">✅</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Posted!</h1>
      <p className="text-gray-500 mb-2">Your check-in is being posted to</p>
      <div className="flex gap-3 justify-center mb-8">
        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-medium">Google Maps</span>
        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-medium">Facebook</span>
        <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-medium">Instagram</span>
      </div>
      <p className="text-gray-400 text-sm mb-6">Redirecting in a moment...</p>
      <button
        onClick={() => navigate('/checkin')}
        className="btn-primary max-w-xs"
      >
        New Check-in
      </button>
    </div>
  );
}
