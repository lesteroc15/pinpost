import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Icon } from '../components/Icons';

export default function Team() {
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
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
    setError('');
    try {
      const { data } = await api.post('/admin/team/invite', {});
      setInviteLink(data.link);
      setCopied(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate invite link. Please try again.');
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeMember(id) {
    await api.delete(`/admin/team/${id}`);
    setMembers(members.map(m => m.id === id ? { ...m, is_active: false } : m));
  }

  return (
    <div className="app-shell-wide pb-8">
      <header className="topbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon.Users className="w-6 h-6 text-white/90" />
            <div>
              <h1 className="topbar-title">Team</h1>
              <p className="topbar-sub">{members.filter(m => m.is_active).length} active · {members.length} total</p>
            </div>
          </div>
          <Link to="/dashboard" className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1">
            <Icon.ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {error && !showAdd && (
          <div className="banner banner-error">
            <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn btn-md bg-brand-600 text-white hover:bg-brand-700">
            <Icon.Plus className="w-4 h-4" />
            Add Worker
          </button>
          <button onClick={generateInvite} className="btn btn-md bg-white text-ink-700 border border-ink-200 hover:bg-ink-50">
            <Icon.Link className="w-4 h-4" />
            Invite Link
          </button>
        </div>

        {inviteLink && (
          <div className="card card-pad">
            <p className="label !mb-2">Share with your worker</p>
            <div className="bg-ink-50 border border-ink-100 rounded-xl p-3 break-all text-xs text-ink-700 font-mono">{inviteLink}</div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={copyInvite} className="btn-ghost text-sm">
                {copied ? <><Icon.Check className="w-4 h-4" /> Copied!</> : <><Icon.Copy className="w-4 h-4" /> Copy link</>}
              </button>
              <span className="text-xs text-ink-400">Expires in 7 days</span>
            </div>
          </div>
        )}

        {showAdd && (
          <form onSubmit={addMember} className="card card-pad space-y-3">
            <h3 className="h2">Add Worker</h3>
            {error && (
              <div className="banner banner-error">
                <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <input className="input-field" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
            <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="input-field" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add Worker'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="card card-pad flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {(m.name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink-900 text-sm truncate">{m.name}</p>
                <p className="text-ink-500 text-xs truncate">
                  {m.email} · <span className="capitalize">{m.role.replace('_', ' ')}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!m.is_active && <span className="pill pill-neutral">Deactivated</span>}
                {m.is_active && m.role === 'worker' && (
                  <button onClick={() => removeMember(m.id)} className="btn-danger">
                    <Icon.Trash className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
