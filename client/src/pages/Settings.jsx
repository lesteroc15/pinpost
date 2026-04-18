import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Settings() {
  const [org, setOrg] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();

  const success = params.get('success');
  const error = params.get('error');

  useEffect(() => {
    api.get('/auth/me').then(r => { setOrg(r.data.org); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function loadAccounts() {
    try {
      const { data } = await api.get('/admin/gbp/accounts');
      setAccounts(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load accounts');
    }
  }

  async function loadLocations(accountId) {
    const { data } = await api.get(`/admin/gbp/locations/${accountId}`);
    setLocations(data);
  }

  async function selectLocation(accountId, loc) {
    await api.post('/admin/gbp/location', {
      accountId,
      locationId: loc.name,
      locationName: loc.title
    });
    setOrg({ ...org, gbp_location_name: loc.title, gbp_location_id: loc.name });
    setAccounts([]);
    setLocations([]);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Link to="/dashboard" className="text-brand-100 text-sm underline">Dashboard</Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {success === 'meta_connected' && (
          <div className="p-3 bg-green-50 text-green-600 rounded-xl text-sm">Facebook/Instagram connected!</div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error === 'no_pages' ? 'No Facebook Pages found. Create one first.' :
             error === 'meta_denied' ? 'Facebook/Instagram connection cancelled.' :
             'Connection failed. Please try again.'}
          </div>
        )}

        {/* Google Business Profile */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Google Business Profile</h2>
          {org?.gbp_location_name ? (
            <div>
              <p className="text-sm text-green-600 font-medium">Connected: {org.gbp_location_name}</p>
              <a href="/api/admin/gbp/connect" className="text-brand-500 text-sm mt-1 block">Reconnect</a>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">Connect your Google Business Profile to post check-ins to Google Maps.</p>
              <a href="/api/admin/gbp/connect" className="btn-primary block text-center !py-3">Connect Google</a>

              {accounts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Select a business:</p>
                  {accounts.map(a => (
                    <button key={a.name} onClick={() => loadLocations(a.name)}
                      className="w-full text-left card !p-3 text-sm">{a.accountName || a.name}</button>
                  ))}
                </div>
              )}

              {locations.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Select a location:</p>
                  {locations.map(l => (
                    <button key={l.name} onClick={() => selectLocation(accounts[0]?.name, l)}
                      className="w-full text-left card !p-3 text-sm">
                      {l.title}
                      {l.storefrontAddress && <span className="text-gray-400 text-xs block">{l.storefrontAddress.addressLines?.join(', ')}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!accounts.length && org?.gbp_location_name && (
            <button onClick={loadAccounts} className="text-brand-500 text-sm">Change location</button>
          )}
        </div>

        {/* Facebook / Instagram — coming soon */}
        <div className="card space-y-3 opacity-60">
          <h2 className="font-semibold text-gray-900">Facebook & Instagram</h2>
          <p className="text-sm text-gray-500">Social media posting coming soon. Contact your provider to enable this feature.</p>
        </div>

        <button
          onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = '/login'; }}
          className="w-full text-center text-red-400 text-sm py-4"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
