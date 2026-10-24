import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from './Toasts.jsx';

// Pick an existing trip (or create a quick one) and add a destination with number of days
export default function AddToTripModal({ dest, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('new');
  const [days, setDays] = useState(2);
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !dest) return;
    api('/trips').then((all) => {
      const open = all.filter((t) => t.status !== 'booked');
      setTrips(open);
      if (open.length) setTripId(String(open[0].id));
    }).catch(() => {});
  }, [user, dest]);

  if (!dest) return null;

  if (!user) {
    return (
      <Modal show title="Login required" onClose={onClose} size="md">
        <div className="p-4 text-center">
          <i className="bi bi-lock fs-1 text-brand" />
          <p className="mt-2">Please log in to start planning your trip to <strong>{dest.name}</strong>.</p>
          <button className="btn btn-primary" onClick={() => navigate('/login', { state: { from: '/destinations' } })}>Go to login</button>
        </div>
      </Modal>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      let id = tripId;
      if (tripId === 'new') {
        const t = await api('/trips', { method: 'POST', body: { ...form, title: form.title || `Trip to ${dest.name}` } });
        id = t.id;
      }
      await api(`/trips/${id}/destinations`, { method: 'POST', body: { destination_id: dest.id, days: Number(days) } });
      toast.success(`${dest.name} added to your trip.`);
      onClose();
      navigate(`/trips/${id}`);
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm({ ...form, [k]: e.target.value }),
    className: `form-control ${errors[k] ? 'is-invalid' : ''}`,
  });

  return (
    <Modal show title={`Add ${dest.name} to a trip`} onClose={onClose} size="md">
      <form className="p-4" onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label fw-semibold">Trip</label>
          <select className="form-select" value={tripId} onChange={(e) => setTripId(e.target.value)}>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.title} ({fmtDate(t.start_date)})</option>)}
            <option value="new">+ Create a new trip</option>
          </select>
        </div>
        {tripId === 'new' && (
          <div className="row g-2 mb-3">
            <div className="col-12">
              <label className="form-label">Trip title</label>
              <input type="text" placeholder={`Trip to ${dest.name}`} {...f('title')} />
              {errors.title && <div className="invalid-feedback">{errors.title}</div>}
            </div>
            <div className="col-6">
              <label className="form-label">Start date</label>
              <input type="date" min={new Date().toISOString().slice(0, 10)} {...f('start_date')} />
              {errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}
            </div>
            <div className="col-6">
              <label className="form-label">End date</label>
              <input type="date" min={form.start_date} {...f('end_date')} />
              {errors.end_date && <div className="invalid-feedback">{errors.end_date}</div>}
            </div>
          </div>
        )}
        <div className="mb-3">
          <label className="form-label fw-semibold">Days at this destination</label>
          <input type="number" min="1" max="30" className="form-control" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Adding…' : 'Add to trip'}</button>
      </form>
    </Modal>
  );
}
