import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/team').then(r => setMembers(r.data));
  }, []);

  async function addMember(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/admin/team', { name, email, password });
      setMembers([...members, data]);
      setName(''); setEmail(''); setPassword('');
      setShowAdd(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add');
    } finally {
      setLoading(false);
    }
  }

  async function generateInvite() {
    const { data } = await api.post('/admin/team/invite', {});
    setInviteLink(data.link);
  }

  async function removeMember(id) {
    await api.delete(`/admin/team/${id}`);
    setMembers(members.map(m => m.id === id ? { ...m, is_active: false } : m));
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Team</h1>
          <Link to="/dashboard" className="text-brand-100 text-sm underline">Dashboard</Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex-1 !py-3 text-sm">+ Add Worker</button>
          <button onClick={generateInvite} className="btn-secondary flex-1 !py-3 text-sm">🔗 Invite Link</button>
        </div>

        {inviteLink && (
          <div className="card">
            <p className="text-sm font-medium text-gray-700 mb-2">Share this link with your worker:</p>
            <div className="bg-gray-50 rounded-xl p-3 break-all text-xs text-gray-600">{inviteLink}</div>
            <button onClick={() => { navigator.clipboard.writeText(inviteLink); }} className="text-brand-500 text-sm mt-2 font-medium">Copy link</button>
          </div>
        )}

        {showAdd && (
          <form onSubmit={addMember} className="card space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
            <input className="input-field" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <button className="btn-primary !py-3" disabled={loading}>{loading ? 'Adding...' : 'Add Worker'}</button>
          </form>
        )}

        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                <p className="text-gray-400 text-xs">{m.email} · {m.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {!m.is_active && <span className="text-xs text-red-500">Deactivated</span>}
                {m.is_active && m.role === 'worker' && (
                  <button onClick={() => removeMember(m.id)} className="text-red-400 text-xs">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
