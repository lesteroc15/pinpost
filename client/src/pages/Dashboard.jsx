import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

const STATUS_COLORS = {
  posted: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
  skipped: 'text-gray-400 bg-gray-50'
};

export default function Dashboard() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    api.get('/checkins').then(r => { setCheckins(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const withCoords = checkins.filter(c => c.lat && c.lng);

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link to="/checkin" className="bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
            + Check-in
          </Link>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{checkins.length}</div>
            <div className="text-brand-100 text-xs">Total</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{checkins.filter(c => c.gbp_status === 'posted').length}</div>
            <div className="text-brand-100 text-xs">On Google</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{checkins.filter(c => c.fb_status === 'posted').length}</div>
            <div className="text-brand-100 text-xs">On Social</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex border-b border-gray-100 bg-white">
        {['list', 'map'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${view === v ? 'text-brand-600 border-b-2 border-brand-500' : 'text-gray-400'}`}>
            {v === 'list' ? '📋 List' : '🗺️ Map'}
          </button>
        ))}
        <Link to="/team" className="flex-1 py-3 text-sm font-medium text-gray-400 text-center">👥 Team</Link>
        <Link to="/settings" className="flex-1 py-3 text-sm font-medium text-gray-400 text-center">⚙️ Settings</Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading...</div>
      ) : view === 'map' ? (
        <div className="h-96">
          {withCoords.length > 0 ? (
            <MapContainer center={[withCoords[0].lat, withCoords[0].lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {withCoords.map(c => (
                <Marker key={c.id} position={[c.lat, c.lng]}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-semibold">{c.address}</p>
                      <p className="text-gray-500">{c.worker_name}</p>
                      <p className="text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="p-8 text-center text-gray-400">No check-ins with GPS data yet</div>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {checkins.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📍</div>
              <p>No check-ins yet.</p>
              <Link to="/checkin" className="text-brand-500 text-sm mt-2 block">Create your first check-in</Link>
            </div>
          ) : checkins.map(c => (
            <div key={c.id} className="card">
              <div className="flex gap-3">
                {(c.collage_path || c.photo_paths?.[0]) && (
                  <img
                    src={`/uploads/${c.collage_path || c.photo_paths[0]}`}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{c.address}</p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{c.description}</p>
                  <p className="text-gray-400 text-xs mt-1">{c.worker_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {[
                  { label: 'Google', status: c.gbp_status },
                  { label: 'FB', status: c.fb_status },
                  { label: 'IG', status: c.ig_status }
                ].map(({ label, status }) => (
                  <span key={label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
                    {label}: {status || 'pending'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
