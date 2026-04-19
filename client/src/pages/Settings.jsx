import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Icon } from '../components/Icons';

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

  if (loading) return (
    <div className="app-shell flex items-center justify-center">
      <div className="flex items-center gap-2 text-ink-400">
        <Icon.Loader className="w-4 h-4 animate-spin" /> Loading…
      </div>
    </div>
  );

  const gbpConnected = org?.gbp_connected;
  const gbpLocationSet = org?.gbp_location_name;

  function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  }

  return (
    <div className="app-shell-wide pb-8">
      <header className="topbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon.Settings className="w-6 h-6 text-white/90" />
            <div>
              <h1 className="topbar-title">Settings</h1>
              <p className="topbar-sub">Integrations & account</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1">
            <Icon.ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {success === 'google_connected' && (
          <div className="banner banner-success">
            <Icon.CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>Google account connected. Now select your business location below.</span>
          </div>
        )}
        {error && (
          <div className="banner banner-error">
            <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              {error === 'google_denied' ? 'Google connection cancelled.' :
               error === 'google_failed' ? 'Google connection failed. Please try again.' :
               'Connection failed. Please try again.'}
            </span>
          </div>
        )}

        {/* Google Business Profile card */}
        <section className="card">
          <div className="card-hd">
            <div>
              <h2 className="h2">Google Business Profile</h2>
              <p className="meta">Where your check-ins get posted.</p>
            </div>
            {gbpLocationSet && <span className="pill pill-success"><Icon.Check className="w-3 h-3" /> Connected</span>}
          </div>
          <div className="card-bd">
            {gbpLocationSet ? (
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Active location</p>
                <p className="text-base font-semibold text-ink-900 mt-1">{org.gbp_location_name}</p>
                <div className="flex gap-4 mt-2">
                  <button onClick={loadAccounts} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Change location</button>
                  <a href={connectUrl} className="text-sm text-ink-500 hover:text-ink-700">Reconnect</a>
                </div>
              </div>
            ) : gbpConnected ? (
              <div>
                <div className="banner banner-success mb-3">
                  <Icon.CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Google account connected. Pick a business below.</span>
                </div>
                {loadingAccounts ? (
                  <p className="meta flex items-center gap-2"><Icon.Loader className="w-4 h-4 animate-spin" /> Loading your business profiles…</p>
                ) : accounts.length === 0 ? (
                  <div>
                    <p className="meta mb-2">
                      No Google Business Profiles found for this account. Make sure the account you signed in with owns or manages a Google Business Profile.
                    </p>
                    <div className="flex gap-4">
                      <button onClick={loadAccounts} className="text-sm font-semibold text-brand-700">Retry</button>
                      <a href={connectUrl} className="text-sm text-ink-500">Try a different Google account</a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="meta mb-3">
                  Connect your Google Business Profile to automatically post check-ins to Google Maps.
                </p>
                <a href={connectUrl} className="btn-primary">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Connect Google
                </a>
              </div>
            )}

            {accounts.length > 0 && !gbpLocationSet && (
              <div className="mt-4">
                <p className="label">Select your business</p>
                <div className="space-y-2">
                  {accounts.map(a => (
                    <button key={a.name} onClick={() => loadLocations(a.name)}
                      className="w-full text-left rounded-xl border border-ink-200 p-3 bg-white hover:bg-ink-50 active:bg-ink-100 flex items-center gap-3">
                      <Icon.Building className="w-5 h-5 text-ink-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-ink-900">{a.accountName || a.name}</span>
                      <Icon.ArrowRight className="w-4 h-4 ml-auto text-ink-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {locations.length > 0 && (
              <div className="mt-4">
                <p className="label">Select a location</p>
                <div className="space-y-2">
                  {locations.map(l => (
                    <button key={l.name} onClick={() => selectLocation(accounts[0]?.name, l)}
                      className="w-full text-left rounded-xl border border-ink-200 p-3 bg-white hover:bg-ink-50 active:bg-ink-100">
                      <div className="flex items-center gap-3">
                        <Icon.MapPin className="w-5 h-5 text-brand-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink-900 truncate">{l.title}</p>
                          {l.storefrontAddress && (
                            <p className="text-xs text-ink-500 truncate">
                              {l.storefrontAddress.addressLines?.join(', ')}
                            </p>
                          )}
                        </div>
                        <Icon.ArrowRight className="w-4 h-4 text-ink-300 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accounts.length > 0 && gbpLocationSet && (
              <div className="mt-4">
                <p className="label">Pick a different business</p>
                <div className="space-y-2">
                  {accounts.map(a => (
                    <button key={a.name} onClick={() => loadLocations(a.name)}
                      className="w-full text-left rounded-xl border border-ink-200 p-3 bg-white hover:bg-ink-50 active:bg-ink-100 flex items-center gap-3">
                      <Icon.Building className="w-5 h-5 text-ink-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-ink-900">{a.accountName || a.name}</span>
                      <Icon.ArrowRight className="w-4 h-4 ml-auto text-ink-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Facebook / Instagram placeholder */}
        <section className="card opacity-60">
          <div className="card-hd">
            <div>
              <h2 className="h2">Facebook & Instagram</h2>
              <p className="meta">Social posting — coming soon.</p>
            </div>
            <span className="pill pill-neutral">Soon</span>
          </div>
          <div className="card-bd">
            <p className="meta">We'll let you know when this lights up. GBP is the priority for v1.</p>
          </div>
        </section>

        <button onClick={signOut} className="w-full text-center text-red-500 hover:text-red-700 text-sm py-4 flex items-center justify-center gap-1.5 font-medium">
          <Icon.LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
