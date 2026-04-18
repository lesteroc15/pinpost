import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Settings() {
  const [org, setOrg] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [params] = useSearchParams();

  const success = params.get('success');
  const error = params.get('error');

  useEffect(() => {
    api.get('/auth/me').then(r => {
      setOrg(r.data.org);
      setLoading(false);
      // Auto-load accounts if Google connected but no location selected
      if (r.data.org?.gbp_connected && !r.data.org?.gbp_location_name) {
        loadAccounts();
      }
    }).catch(() => setLoading(false));
  }, []);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const { data } = await api.get('/admin/gbp/accounts');
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err.response?.data?.error);
    } finally {
      setLoadingAccounts(false);
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

  const connectUrl = `/api/admin/gbp/connect?token=${localStorage.getItem('token')}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

  // Three GBP states: not connected, connected but no location, fully set up
  const gbpConnected = org?.gbp_connected;
  const gbpLocationSet = org?.gbp_location_name;

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Link to="/dashboard" className="text-brand-100 text-sm underline">Dashboard</Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {success === 'google_connected' && (
          <div className="p-3 bg-green-50 text-green-600 rounded-xl text-sm">Google account connected! Now select your business location below.</div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error === 'google_denied' ? 'Google connection cancelled.' :
             error === 'google_failed' ? 'Google connection failed. Please try again.' :
             'Connection failed. Please try again.'}
          </div>
        )}

        {/* Google Business Profile */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Google Business Profile</h2>

          {gbpLocationSet ? (
            <div>
              <p className="text-sm text-green-600 font-medium">Connected: {org.gbp_location_name}</p>
              <button onClick={loadAccounts} className="text-brand-500 text-sm mt-1">Change location</button>
              <a href={connectUrl} className="text-gray-400 text-sm mt-1 ml-3">Reconnect Google</a>
            </div>
          ) : gbpConnected ? (
            <div>
              <p className="text-sm text-green-600 font-medium mb-3">Google account connected</p>
              {loadingAccounts ? (
                <p className="text-sm text-gray-400">Loading your business profiles...</p>
              ) : accounts.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">No Google Business Profiles found for this account. Make sure your Google account is the owner or manager of a Google Business Profile.</p>
                  <button onClick={loadAccounts} className="text-brand-500 text-sm">Retry</button>
                  <a href={connectUrl} className="text-gray-400 text-sm ml-3">Try different Google account</a>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">Connect your Google Business Profile to post check-ins to Google Maps.</p>
              <a href={connectUrl} className="btn-primary block text-center !py-3">Connect Google</a>
            </div>
          )}

          {/* Account selection */}
          {accounts.length > 0 && !gbpLocationSet && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Select your business:</p>
              {accounts.map(a => (
                <button key={a.name} onClick={() => loadLocations(a.name)}
                  className="w-full text-left card !p-3 text-sm active:bg-gray-50">{a.accountName || a.name}</button>
              ))}
            </div>
          )}

          {/* Location selection */}
          {locations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Select a location:</p>
              {locations.map(l => (
                <button key={l.name} onClick={() => selectLocation(accounts[0]?.name, l)}
                  className="w-full text-left card !p-3 text-sm active:bg-gray-50">
                  {l.title}
                  {l.storefrontAddress && <span className="text-gray-400 text-xs block">{l.storefrontAddress.addressLines?.join(', ')}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Change location when already set */}
          {accounts.length > 0 && gbpLocationSet && (
            <div className="space-y-2 mt-3">
              <p className="text-sm font-medium">Select a different business:</p>
              {accounts.map(a => (
                <button key={a.name} onClick={() => loadLocations(a.name)}
                  className="w-full text-left card !p-3 text-sm active:bg-gray-50">{a.accountName || a.name}</button>
              ))}
            </div>
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
