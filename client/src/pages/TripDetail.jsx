import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money, fmtDate, FALLBACK_IMG } from '../api.js';
import { useToast } from '../components/Toasts.jsx';
import { Spinner } from '../components/Guards.jsx';
import Modal from '../components/Modal.jsx';
import { StatusBadge } from './Trips.jsx';

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [trip, setTrip] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [booking, setBooking] = useState({ travelers: 1, payment_method: 'card' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api(`/trips/${id}`).then(setTrip).catch((e) => { if (e.status === 404 || e.status === 403) setNotFound(true); else toast.error(e.message); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (notFound) return <div className="container py-5 text-center"><h3>Trip not found</h3><Link to="/trips" className="btn btn-primary mt-2">Back to my trips</Link></div>;
  if (!trip) return <Spinner />;

  const locked = trip.status === 'booked';
  const nights = Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) + 1);
  const travelers = Math.max(1, Number(booking.travelers) || 1);
  const total = trip.cost_per_person * travelers;

  const changeDays = async (d, days) => {
    if (days < 1) return;
    try { setTrip(await api(`/trips/${id}/destinations/${d.id}`, { method: 'PUT', body: { days } })); }
    catch (err) { toast.error(err.message); }
  };
  const removeDest = async (d) => {
    try { setTrip(await api(`/trips/${id}/destinations/${d.id}`, { method: 'DELETE' })); toast.info(`${d.name} removed.`); }
    catch (err) { toast.error(err.message); }
  };

  const book = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const b = await api('/bookings', { method: 'POST', body: { trip_id: trip.id, ...booking, travelers } });
      toast.success(`Booking confirmed! Reference ${b.booking_ref}`);
      setShowBook(false);
      load();
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    try { await api(`/bookings/${trip.booking.id}/cancel`, { method: 'PUT' }); toast.success('Booking cancelled. The trip is editable again.'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb"><ol className="breadcrumb"><li className="breadcrumb-item"><Link to="/trips">My Trips</Link></li><li className="breadcrumb-item active">{trip.title}</li></ol></nav>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="fw-bold mb-1">{trip.title} <StatusBadge status={trip.status} /></h1>
          <div className="text-muted"><i className="bi bi-calendar3 me-1" />{fmtDate(trip.start_date)} → {fmtDate(trip.end_date)} ({nights} day{nights > 1 ? 's' : ''})</div>
          {trip.notes && <div className="small mt-1"><i className="bi bi-journal-text me-1" />{trip.notes}</div>}
        </div>
        <Link to="/destinations" className="btn btn-outline-primary"><i className="bi bi-plus-lg me-1" />Add destinations</Link>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="panel">
            <h5 className="fw-bold mb-3">Itinerary</h5>
            {trip.destinations.length === 0 ? (
              <div className="text-center py-4 text-muted"><i className="bi bi-map fs-1" /><p className="mb-0 mt-2">No destinations yet. <Link to="/destinations">Browse destinations</Link> to add some.</p></div>
            ) : (
              <ul className="list-group list-group-flush">
                {trip.destinations.map((d, i) => (
                  <li className="list-group-item px-0 d-flex flex-wrap align-items-center gap-3" key={d.id}>
                    <span className="badge rounded-pill bg-brand">{i + 1}</span>
                    <img className="trip-img" src={d.image} alt={d.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{d.name}, {d.country}</div>
                      <div className="small text-muted">{money(d.price_per_day)} / person / day</div>
                    </div>
                    <div className="input-group input-group-sm" style={{ width: 130 }}>
                      <button className="btn btn-outline-secondary" disabled={locked || d.days <= 1} onClick={() => changeDays(d, d.days - 1)} aria-label="Fewer days">−</button>
                      <span className="form-control text-center">{d.days}d</span>
                      <button className="btn btn-outline-secondary" disabled={locked || d.days >= 30} onClick={() => changeDays(d, d.days + 1)} aria-label="More days">+</button>
                    </div>
                    <div className="fw-bold text-end" style={{ minWidth: 90 }}>{money(d.subtotal)}</div>
                    <button className="btn btn-outline-danger btn-sm" disabled={locked} onClick={() => removeDest(d)} aria-label={`Remove ${d.name}`}><i className="bi bi-x-lg" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="panel">
            <h5 className="fw-bold mb-3">Cost summary</h5>
            <div className="d-flex justify-content-between"><span>Per person</span><strong>{money(trip.cost_per_person)}</strong></div>
            {!locked && (
              <div className="my-3">
                <label className="form-label small fw-semibold" htmlFor="trav">Travelers</label>
                <input id="trav" type="number" min="1" max="20" className="form-control" value={booking.travelers} onChange={(e) => setBooking({ ...booking, travelers: e.target.value })} />
              </div>
            )}
            <hr />
            {locked ? (
              <>
                <div className="d-flex justify-content-between"><span>{trip.booking.travelers} traveler(s)</span><span className="price fs-5">{money(trip.booking.total_price)}</span></div>
                <div className="alert alert-success mt-3 mb-2 small">
                  <i className="bi bi-patch-check-fill me-1" />Confirmed · Ref <strong>{trip.booking.booking_ref}</strong><br />Paid via {trip.booking.payment_method.toUpperCase()}
                </div>
                <button className="btn btn-outline-danger w-100" onClick={cancel}>Cancel booking</button>
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center"><span>Total</span><span className="price fs-4">{money(total)}</span></div>
                <button className="btn btn-primary w-100 mt-3" disabled={!trip.destinations.length} onClick={() => setShowBook(true)}>Book this trip</button>
                {!trip.destinations.length && <div className="small text-muted mt-2">Add a destination to enable booking.</div>}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal show={showBook} title="Confirm booking" onClose={() => setShowBook(false)} size="md">
        <form className="p-4" onSubmit={book} noValidate>
          <ul className="list-unstyled small">
            <li><strong>Trip:</strong> {trip.title}</li>
            <li><strong>Dates:</strong> {fmtDate(trip.start_date)} → {fmtDate(trip.end_date)}</li>
            <li><strong>Destinations:</strong> {trip.destinations.map((d) => d.name).join(', ')}</li>
            <li><strong>Travelers:</strong> {travelers}</li>
          </ul>
          <div className="mb-3">
            <label className="form-label fw-semibold">Payment method</label>
            <select className={`form-select ${errors.payment_method ? 'is-invalid' : ''}`} value={booking.payment_method} onChange={(e) => setBooking({ ...booking, payment_method: e.target.value })}>
              <option value="card">Credit / Debit card</option><option value="upi">UPI</option><option value="netbanking">Net banking</option><option value="cash">Pay at agency (cash)</option>
            </select>
            {errors.payment_method && <div className="invalid-feedback">{errors.payment_method}</div>}
            {errors.travelers && <div className="text-danger small mt-1">{errors.travelers}</div>}
          </div>
          <div className="d-flex justify-content-between mb-3"><span>Amount payable</span><span className="price fs-5">{money(total)}</span></div>
          <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Booking…' : 'Confirm & book'}</button>
          <div className="small text-muted text-center mt-2">Demo project: no real payment is processed.</div>
        </form>
      </Modal>
    </div>
  );
}
