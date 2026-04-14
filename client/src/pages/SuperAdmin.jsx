import { useState, useEffect } from 'react';
import api from '../api';

const STATUS_STYLES = {
  trial: 'bg-blue-50 text-blue-600',
  active: 'bg-green-50 text-green-600',
  suspended: 'bg-red-50 text-red-600'
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

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-gray-900 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage all clients</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = '/login'; }}
            className="text-gray-400 text-sm"
          >
            Sign out
          </button>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{orgs.length}</div>
            <div className="text-gray-400 text-xs">Clients</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{orgs.filter(o => o.status === 'active').length}</div>
            <div className="text-gray-400 text-xs">Active</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{orgs.reduce((s, o) => s + parseInt(o.checkin_count || 0), 0)}</div>
            <div className="text-gray-400 text-xs">Check-ins</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary !bg-gray-900 !py-3">
          + New Client
        </button>

        {showCreate && (
          <form onSubmit={createOrg} className="card space-y-3">
            <h3 className="font-semibold text-gray-900">Create Client Account</h3>
            {error && <div className="p-2 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <input className="input-field" placeholder="Business name" value={form.orgName} onChange={e => setForm({ ...form, orgName: e.target.value })} required />
            <input className="input-field" placeholder="Admin name" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} />
            <input className="input-field" type="email" placeholder="Admin email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} required />
            <input className="input-field" type="password" placeholder="Admin password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
            <button className="btn-primary !py-3">Create Client</button>
          </form>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏢</div>
            <p>No clients yet. Create your first client above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map(o => (
              <div key={o.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{o.name}</h3>
                    <p className="text-gray-400 text-xs">{o.user_count} users · {o.checkin_count} check-ins</p>
                    <p className="text-gray-400 text-xs">Created {new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[o.status]}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {o.status === 'trial' && (
                    <button onClick={() => setActive(o.id)} className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg font-medium">Activate</button>
                  )}
                  <button onClick={() => toggleStatus(o.id, o.status)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${o.status === 'suspended' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                    {o.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button onClick={() => deleteOrg(o.id, o.name)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium ml-auto">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
