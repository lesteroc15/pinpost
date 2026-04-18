import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function CheckIn() {
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [description, setDescription] = useState('');
  const [useSocialDescription, setUseSocialDescription] = useState(false);
  const [socialDescription, setSocialDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  async function getGPS() {
    setGpsLoading(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);

      // Reverse geocode using OpenStreetMap Nominatim
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
      const { data } = await api.post('/checkins/generate-description', { address });
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!address || !description) return setError('Address and description are required');
    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('address', address);
    form.append('description', description);
    if (lat) form.append('lat', lat);
    if (lng) form.append('lng', lng);
    if (useSocialDescription && socialDescription) form.append('socialDescription', socialDescription);
    photos.forEach(p => form.append('photos', p));

    try {
      const { data } = await api.post('/checkins', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/success?id=${data.checkinId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">New Check-in</h1>
            <p className="text-brand-100 text-sm mt-0.5">Post to Google Maps & social</p>
          </div>
          {role === 'admin' && (
            <Link to="/dashboard" className="text-brand-100 text-sm underline">Dashboard</Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        {/* Address */}
        <div className="card space-y-3">
          <label className="text-sm font-semibold text-gray-700">Job Address *</label>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              type="text"
              placeholder="123 Main St, City, State"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={getGPS}
              disabled={gpsLoading}
              className="flex-shrink-0 bg-brand-50 text-brand-600 border border-brand-200 rounded-2xl px-3 py-3 text-xl active:bg-brand-100"
              title="Use GPS"
            >
              {gpsLoading ? '⏳' : '📍'}
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Job Description *</label>
            <button
              type="button"
              onClick={generateAI}
              disabled={aiLoading}
              className="text-xs bg-brand-50 text-brand-600 px-3 py-1.5 rounded-xl font-medium active:bg-brand-100 disabled:opacity-50"
            >
              {aiLoading ? 'Generating...' : '✨ Generate with AI'}
            </button>
          </div>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Describe the work you completed in detail..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />

          {/* Social media alternative — hidden until Meta integration is live */}
        </div>

        {/* Photos */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">
              Photos <span className="text-gray-400 font-normal">(up to 10)</span>
            </label>
            {photos.length >= 2 && (
              <span className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Before/After collage ready</span>
            )}
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={src} className="w-full h-full object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                  {i === 0 && photos.length >= 2 && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">Before</span>
                  )}
                  {i === 1 && (
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">After</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {photos.length < 10 && (
            <button
              type="button"
              onClick={() => fileInput.current.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 text-center text-gray-400 active:border-brand-300 active:text-brand-500"
            >
              <div className="text-3xl mb-1">📷</div>
              <div className="text-sm font-medium">Add Photo</div>
              <div className="text-xs mt-0.5">Select or take a photo</div>
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

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Posting...' : '📤 Post Check-in'}
        </button>

        <button
          type="button"
          onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('role'); window.location.href = '/login'; }}
          className="w-full text-center text-gray-400 text-sm py-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
