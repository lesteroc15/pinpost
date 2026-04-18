import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';

export default function Success() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const checkinId = params.get('id');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!checkinId) return;
    // Poll for posting status
    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/checkins/${checkinId}`);
        setStatus(data);
        if (data.gbp_status !== 'pending') clearInterval(poll);
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [checkinId]);

  useEffect(() => {
    const t = setTimeout(() => navigate('/checkin'), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <span className="text-5xl">✅</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Check-in Saved!</h1>

      {status ? (
        <div className="space-y-2 mb-6">
          <StatusBadge label="Google Maps" status={status.gbp_status} error={status.gbp_error} />
        </div>
      ) : (
        <p className="text-gray-500 mb-6">Processing your check-in...</p>
      )}

      <p className="text-gray-400 text-sm mb-6">Redirecting in a moment...</p>
      <button onClick={() => navigate('/checkin')} className="btn-primary max-w-xs">
        New Check-in
      </button>
    </div>
  );
}

function StatusBadge({ label, status, error }) {
  const styles = {
    posted: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-gray-100 text-gray-500'
  };
  const icons = { posted: '✓', pending: '⏳', failed: '✕', skipped: '—' };
  const messages = {
    posted: 'Posted successfully',
    pending: 'Posting...',
    failed: error || 'Failed to post',
    skipped: 'Not connected yet'
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${styles[status] || styles.pending}`}>
      <span>{icons[status] || '⏳'}</span>
      <span>{label}: {messages[status] || 'Processing'}</span>
    </div>
  );
}
