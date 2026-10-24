import { useEffect, useState } from 'react';
import { api, money, fmtDate } from '../api.js';
import { useToast } from '../components/Toasts.jsx';
import { Spinner } from '../components/Guards.jsx';
import Modal from '../components/Modal.jsx';
import { StatusBadge } from './Trips.jsx';

const EMPTY = { name: '', country: '', category: 'Beach', description: '', image: '', price_per_day: '', rating: 4.5, best_season: '', highlights: '' };

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [dests, setDests] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [editing, setEditing] = useState(null); // null | object (id optional)
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api('/bookings/admin/stats'), api('/destinations'), api('/bookings', { params: { all: 1 } })])
    .then(([s, d, b]) => { setStats(s); setDests(d); setBookings(b); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const body = { ...editing, price_per_day: Number(editing.price_per_day), rating: Number(editing.rating) };
      if (editing.id) await api(`/destinations/${editing.id}`, { method: 'PUT', body });
      else await api('/destinations', { method: 'POST', body });
      toast.success(`Destination ${editing.id ? 'updated' : 'created'}.`);
      setEditing(null); load();
    } catch (err) { setErrors(err.fields || {}); toast.error(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}? It will also be removed from any trips.`)) return;
    try { await api(`/destinations/${d.id}`, { method: 'DELETE' }); toast.success('Destination deleted.'); load(); }
    catch (err) { toast.error(err.message); }
  };

  if (!stats || !dests) return <Spinner />;

  const inp = (k, extra = {}) => ({
    value: editing?.[k] ?? '',
    onChange: (e) => setEditing({ ...editing, [k]: e.target.value }),
    className: `form-control ${errors[k] ? 'is-invalid' : ''}`,
    ...extra,
  });
  const Err = ({ k }) => (errors[k] ? <div className="invalid-feedback">{errors[k]}</div> : null);

  const cards = [
    ['Users', stats.users, 'bi-people'], ['Destinations', stats.destinations, 'bi-geo-alt'],
    ['Trips', stats.trips, 'bi-map'], ['Bookings', stats.bookings, 'bi-ticket-perforated'], ['Revenue', money(stats.revenue), 'bi-cash-stack'],
  ];

  return (
    <div className="container py-4">
      <h1 className="fw-bold mb-4">Admin panel</h1>
      <div className="row g-3 mb-4">
        {cards.map(([label, val, icon]) => (
          <div className="col-6 col-lg" key={label}>
            <div className="stat"><i className={`bi ${icon} text-brand`} /><div className="text-muted small">{label}</div><div className="num">{val}</div></div>
          </div>
        ))}
      </div>

      <div className="panel mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Manage destinations</h5>
          <button className="btn btn-primary btn-sm" onClick={() => { setErrors({}); setEditing({ ...EMPTY }); }}><i className="bi bi-plus-lg me-1" />Add destination</button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead><tr><th>Name</th><th>Country</th><th>Category</th><th>Price/day</th><th>Rating</th><th /></tr></thead>
            <tbody>
              {dests.map((d) => (
                <tr key={d.id}>
                  <td className="fw-semibold">{d.name}</td><td>{d.country}</td><td>{d.category}</td><td>{money(d.price_per_day)}</td><td>{d.rating.toFixed(1)}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-outline-primary btn-sm me-1" onClick={() => { setErrors({}); setEditing({ ...d }); }} aria-label={`Edit ${d.name}`}><i className="bi bi-pencil" /></button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(d)} aria-label={`Delete ${d.name}`}><i className="bi bi-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h5 className="fw-bold mb-3">All bookings</h5>
        {bookings.length === 0 ? <p className="text-muted mb-0">No bookings yet.</p> : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr><th>Ref</th><th>Customer</th><th>Trip</th><th>Dates</th><th>Travelers</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="small fw-semibold">{b.booking_ref}</td>
                    <td className="small">{b.user_name}<div className="text-muted">{b.user_email}</div></td>
                    <td className="small">{b.trip?.title}</td>
                    <td className="small">{b.trip && fmtDate(b.trip.start_date)}</td>
                    <td>{b.travelers}</td><td>{money(b.total_price)}</td><td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : 'Add destination'}>
        {editing && (
          <form className="p-4" onSubmit={save} noValidate>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Name</label><input {...inp('name')} /><Err k="name" /></div>
              <div className="col-md-6"><label className="form-label">Country</label><input {...inp('country')} /><Err k="country" /></div>
              <div className="col-md-4"><label className="form-label">Category</label>
                <select {...inp('category')} className={`form-select ${errors.category ? 'is-invalid' : ''}`}>
                  {['Beach', 'Mountain', 'Heritage', 'Adventure', 'City', 'Nature'].map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="col-md-4"><label className="form-label">Price per day (₹)</label><input type="number" min="0" {...inp('price_per_day')} /><Err k="price_per_day" /></div>
              <div className="col-md-4"><label className="form-label">Rating (0-5)</label><input type="number" min="0" max="5" step="0.1" {...inp('rating')} /><Err k="rating" /></div>
              <div className="col-12"><label className="form-label">Image URL</label><input {...inp('image')} /><Err k="image" /></div>
              <div className="col-12"><label className="form-label">Description</label><textarea rows="2" {...inp('description')} /><Err k="description" /></div>
              <div className="col-md-4"><label className="form-label">Best season</label><input {...inp('best_season')} placeholder="Nov - Feb" /></div>
              <div className="col-md-8"><label className="form-label">Highlights (comma separated)</label><input {...inp('highlights')} /></div>
            </div>
            <div className="text-end mt-4">
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
