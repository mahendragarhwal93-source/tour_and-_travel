import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money, FALLBACK_IMG } from '../api.js';
import DestinationCard from '../components/DestinationCard.jsx';
import DestinationModal from '../components/DestinationModal.jsx';
import AddToTripModal from '../components/AddToTripModal.jsx';

const FEATURES = [
  { icon: 'bi-search-heart', title: 'Discover', text: 'Browse curated destinations with filters for budget, category and country.' },
  { icon: 'bi-map', title: 'Plan', text: 'Combine multiple destinations into one trip with dates and day counts.' },
  { icon: 'bi-credit-card-2-front', title: 'Book', text: 'Confirm your trip in seconds and get an instant booking reference.' },
  { icon: 'bi-shield-check', title: 'Secure', text: 'JWT-based authentication keeps your trips and bookings private.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const [adding, setAdding] = useState(null);

  useEffect(() => { api('/destinations', { params: { sort: 'popular' } }).then((d) => setFeatured(d.slice(0, 8))).catch(() => {}); }, []);

  const onSearch = (e) => { e.preventDefault(); navigate(`/destinations${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`); };
  const top = featured.slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container text-center">
          <h1>Plan your next adventure</h1>
          <p className="lead mb-4">Explore destinations, build a multi-stop itinerary and book it, all in one place.</p>
          <form className="hero-search mx-auto d-flex" onSubmit={onSearch} role="search">
            <input className="form-control form-control-lg" placeholder="Where do you want to go?" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search destinations" />
            <button className="btn btn-primary btn-lg px-4"><i className="bi bi-search" /></button>
          </form>
          <div className="mt-4 d-flex flex-wrap justify-content-center gap-2">
            {['Beach', 'Mountain', 'Heritage', 'Adventure', 'City'].map((c) => (
              <Link key={c} className="btn btn-sm btn-light rounded-pill" to={`/destinations?category=${c}`}>{c}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container" style={{ marginTop: '-3rem' }}>
        {top.length > 0 && (
          <div id="offers" className="carousel slide shadow rounded-4 overflow-hidden" data-bs-ride="carousel">
            <div className="carousel-indicators">
              {top.map((_, i) => <button key={i} type="button" data-bs-target="#offers" data-bs-slide-to={i} className={i === 0 ? 'active' : ''} aria-label={`Slide ${i + 1}`} />)}
            </div>
            <div className="carousel-inner">
              {top.map((d, i) => (
                <div key={d.id} className={`carousel-item ${i === 0 ? 'active' : ''}`}>
                  <img src={d.image} className="d-block w-100" alt={d.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
                  <div className="carousel-caption">
                    <h3 className="fw-bold">{d.name}, {d.country}</h3>
                    <p className="mb-2">Top rated · from {money(d.price_per_day)} / day</p>
                    <button className="btn btn-primary" onClick={() => setView(d)}>View details</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#offers" data-bs-slide="prev"><span className="carousel-control-prev-icon" /><span className="visually-hidden">Previous</span></button>
            <button className="carousel-control-next" type="button" data-bs-target="#offers" data-bs-slide="next"><span className="carousel-control-next-icon" /><span className="visually-hidden">Next</span></button>
          </div>
        )}

        <section className="row g-3 my-4">
          {FEATURES.map((f) => (
            <div className="col-6 col-lg-3" key={f.title}>
              <div className="feature panel h-100"><i className={`bi ${f.icon}`} /><h6 className="fw-bold mt-2">{f.title}</h6><p className="small text-muted mb-0">{f.text}</p></div>
            </div>
          ))}
        </section>

        <section className="my-5">
          <div className="d-flex justify-content-between align-items-end mb-3">
            <h2 className="fw-bold mb-0">Popular destinations</h2>
            <Link to="/destinations">View all <i className="bi bi-arrow-right" /></Link>
          </div>
          <div className="row g-4">
            {featured.map((d) => (
              <div className="col-12 col-sm-6 col-lg-3" key={d.id}><DestinationCard dest={d} onView={setView} onAdd={setAdding} /></div>
            ))}
          </div>
        </section>
      </div>

      <DestinationModal dest={view} onClose={() => setView(null)} onAdd={setAdding} />
      <AddToTripModal dest={adding} onClose={() => setAdding(null)} />
    </>
  );
}
