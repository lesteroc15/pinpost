import { useState, useEffect } from 'react';
import api from '../api';
import { Icon } from '../components/Icons';

const STATUS_PILL = {
  trial:     'pill-warn',
  active:    'pill-success',
  suspended: 'pill-danger'
};

export default function SuperAdmin() {
  const [orgs, setOrgs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ orgName: '', adminEmail: '', adminName: '', adminPassword: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    const { data } = await api.get('/superadmin/orgs');
    setOrgs(data);
    setLoading(false);
  }

  async function createOrg(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/superadmin/orgs', form);
      setForm({ orgName: '', adminEmail: '', adminName: '', adminPassword: '' });
      setShowCreate(false);
      loadOrgs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
    }
  }

  async function toggleStatus(orgId, currentStatus) {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    await api.patch(`/superadmin/orgs/${orgId}/status`, { status: newStatus });
    loadOrgs();
  }

  async function setActive(orgId) {
    await api.patch(`/superadmin/orgs/${orgId}/status`, { status: 'active' });
    loadOrgs();
  }

  async function deleteOrg(orgId, orgName) {
    if (!confirm(`Delete "${orgName}" and all its data? This cannot be undone.`)) return;
    await api.delete(`/superadmin/orgs/${orgId}`);
    loadOrgs();
  }

  function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  }

  const activeOrgs = orgs.filter(o => o.status === 'active').length;
  const totalCheckins = orgs.reduce((s, o) => s + parseInt(o.checkin_count || 0), 0);

  return (
    <div className="app-shell-wide pb-8">
      <header className="topbar-dark">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon.Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="topbar-title">Admin Panel</h1>
              <p className="topbar-sub">Manage all clients</p>
            </div>
          </div>
          <button onClick={signOut} className="text-white/70 hover:text-white text-sm flex items-center gap-1.5">
            <Icon.LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
        <div className="flex gap-3">
          <div className="stat-tile">
            <div className="stat-val">{orgs.length}</div>
            <div className="stat-lbl">Clients</div>
          </div>
          <div className="stat-tile">
            <div className="stat-val">{activeOrgs}</div>
            <div className="stat-lbl">Active</div>
          </div>
          <div className="stat-tile">
            <div className="stat-val">{totalCheckins}</div>
            <div className="stat-lbl">Check-ins</div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <button onClick={() => setShowCreate(!showCreate)}
          className="btn btn-lg w-full bg-ink-900 text-white hover:bg-ink-800 shadow-sm">
          <Icon.Plus className="w-5 h-5" />
          New Client
        </button>

        {showCreate && (
          <form onSubmit={createOrg} className="card card-pad space-y-3">
            <h3 className="h2">Create Client Account</h3>
            {error && (
              <div className="banner banner-error">
                <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="label">Business name</label>
              <input className="input-field" placeholder="e.g. Chicago Plumbing Pros"
                value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Admin name</label>
              <input className="input-field" placeholder="Owner's name"
                value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} />
            </div>
            <div>
              <label className="label">Admin email</label>
              <input className="input-field" type="email" placeholder="owner@business.com"
                value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} required />
            </div>
            <div>
              <label className="label">Admin password</label>
              <input className="input-field" type="password" placeholder="Min 6 characters"
                value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
            </div>
            <button className="btn-primary">Create Client</button>
          </form>
        )}

        {loading ? (
          <div className="p-10 text-center text-ink-400 flex items-center justify-center gap-2">
            <Icon.Loader className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-14">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-ink-100 mb-4">
              <Icon.Building className="w-10 h-10 text-ink-400" />
            </div>
            <h3 className="h2">No clients yet</h3>
            <p className="meta mt-1">Create your first client above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orgs.map(o => (
              <article key={o.id} className="card card-pad">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink-900">{o.name}</h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {o.user_count} users · {o.checkin_count} check-ins
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      Created {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`pill ${STATUS_PILL[o.status] || 'pill-neutral'} capitalize flex-shrink-0`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {o.status === 'trial' && (
                    <button onClick={() => setActive(o.id)} className="btn-chip-brand">
                      <Icon.Check className="w-3.5 h-3.5" /> Activate
                    </button>
                  )}
                  <button onClick={() => toggleStatus(o.id, o.status)}
                    className={o.status === 'suspended' ? 'btn-chip-brand' : 'btn-chip'}>
                    {o.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button onClick={() => deleteOrg(o.id, o.name)} className="btn-danger ml-auto">
                    <Icon.Trash className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
