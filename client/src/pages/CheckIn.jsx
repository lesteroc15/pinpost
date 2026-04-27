import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { Icon } from '../components/Icons';

export default function CheckIn() {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [labelBeforeAfter, setLabelBeforeAfter] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const fileInput = useRef();
  const debounceTimer = useRef(null);
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const org = r.data.org;
      setBusinessName(org?.gbp_location_name || org?.name || '');
    }).catch(() => {});
  }, []);

  function onAddressChange(val) {
    setAddress(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=us&addressdetails=1`
        );
        const data = await r.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch { setSuggestions([]); }
    }, 400);
  }

  function selectSuggestion(s) {
    setAddress(s.display_name);
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  async function getGPS() {
    setGpsLoading(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const data = await r.json();
      setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      setError('Could not get location. Please enter address manually.');
    } finally {
      setGpsLoading(false);
    }
  }

  async function generateAI() {
    if (!address) return setError('Enter an address first');
    setAiLoading(true);
    setError('');
    try {
      const { data } = await api.post('/checkins/generate-description', { address, existingText: description });
      setDescription(data.description);
    } catch {
      setError('Could not generate description. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files);
    const newPhotos = [...photos, ...files].slice(0, 10);
    setPhotos(newPhotos);
    const newPreviews = newPhotos.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
  }

  function removePhoto(idx) {
    const newPhotos = photos.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  }

  function handleReview(e) {
    e.preventDefault();
    if (!address || !description) return setError('Address and description are required');
    setError('');
    setShowPreview(true);
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('address', address);
    form.append('description', description);
    if (lat) form.append('lat', lat);
    if (lng) form.append('lng', lng);
    form.append('labelBeforeAfter', labelBeforeAfter ? 'true' : 'false');
    photos.forEach(p => form.append('photos', p));

    try {
      const { data } = await api.post('/checkins', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/success?id=${data.checkinId}`);
    } catch (err) {
      setShowPreview(false);
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  }

  return (
    <div className="app-shell pb-8">
      <header className="topbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon.PinMark className="w-7 h-7 text-white/90" />
            <div>
              <h1 className="topbar-title">New Check-in</h1>
              <p className="topbar-sub">Posts to your Google Business Profile</p>
            </div>
          </div>
          {(role === 'admin' || role === 'super_admin') && (
            <Link to="/dashboard" className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1">
              <Icon.LayoutList className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <form onSubmit={handleReview} className="p-4 space-y-4">
        {error && (
          <div className="banner banner-error">
            <Icon.AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Address */}
        <section className="card">
          <div className="card-hd">
            <span className="label !mb-0">Job Address</span>
            <span className="text-xs text-ink-400">Required</span>
          </div>
          <div className="card-bd">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="input-field"
                  type="text"
                  placeholder="Start typing an address…"
                  value={address}
                  onChange={e => onAddressChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  required
                  autoComplete="off"
                />
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-ink-200 rounded-xl shadow-card-lg z-50 mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm text-ink-700 hover:bg-brand-50 active:bg-brand-100 border-b border-ink-50 last:border-0"
                        onMouseDown={() => selectSuggestion(s)}
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={getGPS}
                disabled={gpsLoading}
                className="flex-shrink-0 bg-brand-50 text-brand-700 border border-brand-100 rounded-xl w-12 h-12 flex items-center justify-center active:bg-brand-100 disabled:opacity-50"
                aria-label="Use current location"
                title="Use current location"
              >
                {gpsLoading
                  ? <Icon.Loader className="w-5 h-5 animate-spin" />
                  : <Icon.Navigation className="w-5 h-5" />}
              </button>
            </div>
            {(lat && lng) && (
              <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
                <Icon.MapPin className="w-3.5 h-3.5" />
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}
            <p className="text-[11px] text-ink-300 mt-2">
              Address lookups via{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-500">
                © OpenStreetMap contributors
              </a>
            </p>
          </div>
        </section>

        {/* Description */}
        <section className="card">
          <div className="card-hd">
            <span className="label !mb-0">Job Description</span>
            <button
              type="button"
              onClick={generateAI}
              disabled={aiLoading}
              className="btn-chip-brand"
            >
              {aiLoading
                ? <><Icon.Loader className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Icon.Sparkles className="w-3.5 h-3.5" /> AI draft</>}
            </button>
          </div>
          <div className="card-bd">
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Describe the work you completed: what the problem was, what you did, parts used, outcome…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
            <p className="text-xs text-ink-400 mt-2">Tip: specifics like the neighborhood and the fix help your Google ranking.</p>
          </div>
        </section>

        {/* Photos */}
        <section className="card">
          <div className="card-hd">
            <span className="label !mb-0">Photos <span className="text-ink-400 normal-case tracking-normal font-normal">· up to 10</span></span>
            {photos.length >= 2 && (
              <button
                type="button"
                onClick={() => setLabelBeforeAfter(v => !v)}
                className={`pill ${labelBeforeAfter ? 'pill-warn' : 'pill-neutral'} cursor-pointer`}
                title="Adds BEFORE / AFTER labels to the first two photos"
              >
                <Icon.Sparkles className="w-3 h-3" />
                {labelBeforeAfter ? 'Before / After: On' : 'Mark Before / After'}
              </button>
            )}
          </div>
          <div className="card-bd space-y-3">
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={src} className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center active:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <Icon.X className="w-3.5 h-3.5" />
                    </button>
                    {labelBeforeAfter && i === 0 && photos.length >= 2 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Before</span>
                    )}
                    {labelBeforeAfter && i === 1 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">After</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photos.length < 10 && (
              <button
                type="button"
                onClick={() => fileInput.current.click()}
                className="upload-zone"
              >
                <Icon.Camera className="w-7 h-7 mx-auto mb-2 text-ink-400" />
                <div className="text-sm font-semibold text-ink-700">Add Photo</div>
                <div className="text-xs text-ink-400 mt-0.5">Take a new shot or pick from your library</div>
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotos}
              className="hidden"
            />
          </div>
        </section>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? (<><Icon.Loader className="w-5 h-5 animate-spin" /> Posting…</>)
            : (<><Icon.Send className="w-5 h-5" /> Post Check-in</>)}
        </button>

        <button type="button" onClick={signOut} className="w-full text-center text-ink-400 hover:text-ink-600 text-sm py-2 flex items-center justify-center gap-1.5">
          <Icon.LogOut className="w-4 h-4" />
          Sign out
        </button>
      </form>

      {/* Post Preview — the "gotcha moment" */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-card-lg" onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-3">
              <p className="label">Preview — Google Business Profile Post</p>
            </div>

            {/* Simulated GBP post card */}
            <div className="mx-5 rounded-xl border border-ink-200 overflow-hidden mb-4">
              {/* Business header */}
              <div className="flex items-center gap-3 p-3 border-b border-ink-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm">
                  P
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900">{businessName || 'Your business'}</p>
                  <p className="text-xs text-ink-400">Just now</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
              </div>

              {/* Photo */}
              {previews.length > 0 && (
                <img src={previews[0]} className="w-full aspect-video object-cover" alt="" />
              )}

              {/* Post text */}
              <div className="p-3">
                <p className="text-sm text-ink-800 leading-relaxed">{description}</p>
                <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
                  <Icon.MapPin className="w-3 h-3" />
                  {address}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 space-y-2">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
              >
                {loading
                  ? (<><Icon.Loader className="w-5 h-5 animate-spin" /> Posting...</>)
                  : (<><Icon.Send className="w-5 h-5" /> Post to Google Maps</>)}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                disabled={loading}
                className="btn-secondary"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
