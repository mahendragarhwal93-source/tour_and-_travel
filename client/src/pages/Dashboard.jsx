import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useToast } from '../components/Toasts.jsx';
import { Spinner } from '../components/Guards.jsx';
import { StatusBadge } from './Trips.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [trips, setTrips] = useState(null);
  const [bookings, setBookings] = useState(null);

  const load = () => Promise.all([api('/trips'), api('/bookings')])
    .then(([t, b]) => { setTrips(t); setBookings(b); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.booking_ref}?`)) return;
    try { await api(`/bookings/${b.id}/cancel`, { method: 'PUT' }); toast.success('Booking cancelled.'); load(); }
    catch (err) { toast.error(err.message); }
  };

  if (!trips || !bookings) return <Spinner />;
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const spent = confirmed.reduce((s, b) => s + b.total_price, 0);
  const upcoming = trips.filter((t) => t.status === 'booked').sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const stats = [
    { label: 'Trips planned', value: trips.length, icon: 'bi-map' },
    { label: 'Active bookings', value: confirmed.length, icon: 'bi-ticket-perforated' },
    { label: 'Total spent', value: money(spent), icon: 'bi-wallet2' },
  ];

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="fw-bold mb-0">Hello, {user.name.split(' ')[0]} 👋</h1>
          <div className="text-muted">{user.email}</div>
        </div>
        <Link to="/trips" className="btn btn-primary"><i className="bi bi-plus-lg me-1" />Plan a trip</Link>
      </div>

      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div className="col-12 col-md-4" key={s.label}>
            <div className="stat d-flex justify-content-between align-items-center">
              <div><div className="text-muted small">{s.label}</div><div className="num">{s.value}</div></div>
              <i className={`bi ${s.icon} fs-1 text-brand`} />
            </div>
          </div>
        ))}
      </div>

      {upcoming && (
        <div className="alert alert-info d-flex align-items-center gap-2">
          <i className="bi bi-airplane-fill" /> Next trip: <strong>{upcoming.title}</strong> starting {fmtDate(upcoming.start_date)}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="panel h-100">
            <h5 className="fw-bold mb-3">My trips</h5>
            {trips.length === 0 ? <p className="text-muted mb-0">No trips yet. <Link to="/trips">Create one</Link>.</p> : (
              <ul className="list-group list-group-flush">
                {trips.map((t) => (
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center" key={t.id}>
                    <div>
                      <Link to={`/trips/${t.id}`} className="fw-semibold text-decoration-none">{t.title}</Link>
                      <div className="small text-muted">{fmtDate(t.start_date)} · {t.destinations.length} destination(s)</div>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="panel h-100">
            <h5 className="fw-bold mb-3">My bookings</h5>
            {bookings.length === 0 ? <p className="text-muted mb-0">No bookings yet.</p> : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead><tr><th>Ref</th><th>Trip</th><th>Amount</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="small fw-semibold">{b.booking_ref}</td>
                        <td className="small">{b.trip?.title}<div className="text-muted">{b.travelers} traveler(s)</div></td>
                        <td>{money(b.total_price)}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td>{b.status === 'confirmed' && <button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b)}>Cancel</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
