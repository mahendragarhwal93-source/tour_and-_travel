import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import { useToast } from '../components/Toasts.jsx';
import { Spinner } from '../components/Guards.jsx';

export const StatusBadge = ({ status }) => {
  const cls = { planned: 'text-bg-secondary', booked: 'text-bg-success', cancelled: 'text-bg-danger', confirmed: 'text-bg-success' }[status] || 'text-bg-light';
  return <span className={`badge ${cls} text-capitalize`}>{status}</span>;
};

export default function Trips() {
  const toast = useToast();
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [form, setForm] = useState({ title: '', start_date: '', end_date: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api('/trips').then(setTrips).catch((e) => toast.error(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const t = await api('/trips', { method: 'POST', body: form });
      toast.success('Trip created. Now add some destinations!');
      navigate(`/trips/${t.id}`);
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    try { await api(`/trips/${t.id}`, { method: 'DELETE' }); toast.success('Trip deleted.'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), className: `form-control ${errors[k] ? 'is-invalid' : ''}` });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container py-4">
      <h1 className="fw-bold mb-4">My Trips</h1>
      <div className="row g-4">
        <div className="col-lg-4">
          <form className="panel" onSubmit={create} noValidate>
            <h5 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2 text-brand" />Plan a new trip</h5>
            <div className="mb-3"><label className="form-label">Title</label><input placeholder="e.g. Family holiday" {...f('title')} />{errors.title && <div className="invalid-feedback">{errors.title}</div>}</div>
            <div className="row g-2 mb-3">
              <div className="col-6"><label className="form-label">Start</label><input type="date" min={today} {...f('start_date')} />{errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}</div>
              <div className="col-6"><label className="form-label">End</label><input type="date" min={form.start_date || today} {...f('end_date')} />{errors.end_date && <div className="invalid-feedback">{errors.end_date}</div>}</div>
            </div>
            <div className="mb-3"><label className="form-label">Notes (optional)</label><textarea rows="2" {...f('notes')} /></div>
            <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Creating…' : 'Create trip'}</button>
          </form>
        </div>
        <div className="col-lg-8">
          {!trips ? <Spinner /> : trips.length === 0 ? (
            <div className="panel text-center py-5">
              <i className="bi bi-suitcase2 fs-1 text-muted" />
              <h5 className="mt-2">No trips yet</h5>
              <p className="text-muted">Create one on the left or <Link to="/destinations">browse destinations</Link>.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {trips.map((t) => (
                <div className="panel" key={t.id}>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div>
                      <h5 className="fw-bold mb-1"><Link to={`/trips/${t.id}`} className="text-decoration-none">{t.title}</Link> <StatusBadge status={t.status} /></h5>
                      <div className="text-muted small"><i className="bi bi-calendar3 me-1" />{fmtDate(t.start_date)} → {fmtDate(t.end_date)}</div>
                    </div>
                    <div className="text-end">
                      <div className="price">{money(t.cost_per_person)}</div>
                      <div className="small text-muted">per person</div>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-1 my-2">
                    {t.destinations.length ? t.destinations.map((d) => <span key={d.id} className="badge text-bg-light border">{d.name} · {d.days}d</span>) : <span className="small text-muted">No destinations added yet</span>}
                  </div>
                  <div className="d-flex gap-2">
                    <Link className="btn btn-outline-primary btn-sm" to={`/trips/${t.id}`}>{t.status === 'booked' ? 'View' : 'Open'}</Link>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => remove(t)}><i className="bi bi-trash" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
