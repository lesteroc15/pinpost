import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';
import { Icon } from '../components/Icons';

export default function Success() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const checkinId = params.get('id');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!checkinId) return;
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
    <div className="app-shell flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mb-5">
        <Icon.Check className="w-10 h-10 text-brand-700" />
      </div>
      <h1 className="h-display mb-1">Check-in Saved</h1>
      <p className="meta mb-6">Nice work — your job is on its way to Google.</p>

      {status ? (
        <StatusRow status={status.gbp_status} error={status.gbp_error} />
      ) : (
        <div className="pill pill-neutral">
          <Icon.Loader className="w-3.5 h-3.5 animate-spin" />
          Processing…
        </div>
      )}

      <p className="text-xs text-ink-400 mt-8">Returning to check-in in a moment…</p>
      <button onClick={() => navigate('/checkin')} className="btn-primary mt-4 max-w-xs">
        <Icon.Plus className="w-5 h-5" />
        New Check-in
      </button>
    </div>
  );
}

function StatusRow({ status, error }) {
  const cfg = {
    posted:  { cls: 'pill-success', icon: <Icon.CheckCircle className="w-3.5 h-3.5" />, label: 'Posted to Google Business Profile' },
    pending: { cls: 'pill-neutral', icon: <Icon.Loader className="w-3.5 h-3.5 animate-spin" />, label: 'Posting to Google…' },
    failed:  { cls: 'pill-danger',  icon: <Icon.AlertCircle className="w-3.5 h-3.5" />, label: error || 'Failed to post' },
    skipped: { cls: 'pill-neutral', icon: <Icon.Info className="w-3.5 h-3.5" />, label: 'Google Business Profile not connected' }
  }[status] || { cls: 'pill-neutral', icon: <Icon.Loader className="w-3.5 h-3.5 animate-spin" />, label: 'Processing…' };

  return (
    <div className={`pill ${cfg.cls} px-4 py-2 text-sm`}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </div>
  );
}
