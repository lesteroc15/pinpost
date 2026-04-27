import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';
import { Icon } from '../components/Icons';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const STATUS = {
  posted:  { cls: 'pill-success', label: 'Posted' },
  failed:  { cls: 'pill-danger',  label: 'Failed' },
  pending: { cls: 'pill-warn',    label: 'Pending' },
  skipped: { cls: 'pill-neutral', label: 'Skipped' }
};

export default function Dashboard() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  function load() {
    api.get('/checkins').then(r => { setCheckins(r.data); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function deleteCheckin(id) {
    if (!confirm('Delete this check-in? This cannot be undone.')) return;
    await api.delete(`/checkins/${id}`);
    setCheckins(checkins.filter(c => c.id !== id));
  }

  async function retryCheckin(id) {
    setCheckins(prev => prev.map(c => c.id === id ? { ...c, gbp_status: 'pending', gbp_error: null } : c));
    try {
      await api.post(`/checkins/${id}/retry`);
      setTimeout(load, 4000); // give GBP a few seconds, then refresh
    } catch (err) {
      const msg = err.response?.data?.error || 'Retry failed.';
      alert(msg);
      load();
    }
  }

  const withCoords = checkins.filter(c => c.lat && c.lng);
  const postedCount = checkins.filter(c => c.gbp_status === 'posted').length;
  const locationsCount = new Set(checkins.map(c => c.address)).size;

  return (
    <div className="app-shell-wide pb-8">
      <header className="topbar">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Icon.PinMark className="w-7 h-7 text-white/90" />
            <div>
              <h1 className="topbar-title">Dashboard</h1>
              <p className="topbar-sub">All check-ins from your team</p>
            </div>
          </div>
          <Link to="/checkin" className="btn btn-md bg-white text-brand-700 hover:bg-brand-50 font-semibold">
            <Icon.Plus className="w-4 h-4" />
            Check-in
          </Link>
        </div>
        <div className="flex gap-3">
          <div className="stat-tile">
            <div className="stat-val">{checkins.length}</div>
            <div className="stat-lbl">Check-ins</div>
          </div>
          <div className="stat-tile">
            <div className="stat-val">{postedCount}</div>
            <div className="stat-lbl">On Google</div>
          </div>
          <div className="stat-tile">
            <div className="stat-val">{locationsCount}</div>
            <div className="stat-lbl">Locations</div>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button onClick={() => setView('list')}
          className={`tab ${view === 'list' ? 'tab-active' : ''}`}>
          <Icon.LayoutList className="w-4 h-4" />
          List
        </button>
        <button onClick={() => setView('map')}
          className={`tab ${view === 'map' ? 'tab-active' : ''}`}>
          <Icon.Map className="w-4 h-4" />
          Map
        </button>
        <Link to="/team" className="tab">
          <Icon.Users className="w-4 h-4" />
          Team
        </Link>
        <Link to="/settings" className="tab">
          <Icon.Settings className="w-4 h-4" />
          Settings
        </Link>
      </nav>

      {loading ? (
        <div className="p-10 text-center text-ink-400 flex items-center justify-center gap-2">
          <Icon.Loader className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : view === 'map' ? (
        <div className="h-[28rem] md:h-[32rem]">
          {withCoords.length > 0 ? (
            <MapContainer center={[withCoords[0].lat, withCoords[0].lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {withCoords.map(c => (
                <Marker key={c.id} position={[c.lat, c.lng]}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">{c.address}</p>
                      <p className="text-ink-500">{c.worker_name}</p>
                      <p className="text-ink-400">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <EmptyState
              icon={<Icon.Map className="w-10 h-10 text-ink-300" />}
              title="No GPS data yet"
              body="Check-ins with location will appear here."
            />
          )}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {checkins.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState
                icon={<Icon.MapPin className="w-10 h-10 text-ink-300" />}
                title="No check-ins yet"
                body="Your team's first check-in will show up here."
                action={<Link to="/checkin" className="btn-ghost"><Icon.Plus className="w-4 h-4" />Create one</Link>}
              />
            </div>
          ) : checkins.map(c => {
            const s = STATUS[c.gbp_status] || STATUS.pending;
            return (
              <article key={c.id} className="card card-pad">
                <div className="flex gap-3">
                  {(c.collage_path || c.photo_paths?.[0]) && (
                    <img
                      src={`/uploads/${c.collage_path || c.photo_paths[0]}`}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-ink-100"
                      alt=""
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 text-sm truncate">{c.address}</p>
                    <p className="text-ink-600 text-xs mt-0.5 line-clamp-2">{c.description}</p>
                    <p className="text-ink-400 text-xs mt-1">{c.worker_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`pill ${s.cls}`} title={c.gbp_error || ''}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                    Google {s.label}
                  </span>
                  {(c.gbp_status === 'failed' || c.gbp_status === 'skipped') && (
                    <button
                      onClick={() => retryCheckin(c.id)}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                    >
                      <Icon.Loader className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                  <button onClick={() => deleteCheckin(c.id)} className="ml-auto text-xs text-ink-400 hover:text-red-600 flex items-center gap-1">
                    <Icon.Trash className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
                {c.gbp_status === 'failed' && c.gbp_error && (
                  <p className="text-xs text-red-600 mt-2 line-clamp-2">{c.gbp_error}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-ink-50 mb-4">
        {icon}
      </div>
      <h3 className="h2">{title}</h3>
      <p className="meta mt-1">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
