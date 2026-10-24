import { money, FALLBACK_IMG } from '../api.js';

export default function DestinationCard({ dest, onView, onAdd }) {
  return (
    <div className="card dest-card">
      <div className="thumb" onClick={() => onView(dest)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onView(dest)}>
        <img src={dest.image} alt={dest.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
        <span className="badge badge-cat">{dest.category}</span>
        <span className="rating"><i className="bi bi-star-fill text-warning me-1" />{dest.rating.toFixed(1)}</span>
      </div>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title mb-0">{dest.name}</h5>
        <div className="text-muted small mb-2"><i className="bi bi-geo-alt-fill me-1" />{dest.country}</div>
        <p className="card-text small text-muted flex-grow-1">{dest.description}</p>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <div><span className="price">{money(dest.price_per_day)}</span><span className="text-muted small"> / day</span></div>
          <div className="btn-group">
            <button className="btn btn-outline-primary btn-sm" onClick={() => onView(dest)}>Details</button>
            <button className="btn btn-primary btn-sm" onClick={() => onAdd(dest)}><i className="bi bi-plus-lg" /> Trip</button>
          </div>
        </div>
      </div>
    </div>
  );
}
