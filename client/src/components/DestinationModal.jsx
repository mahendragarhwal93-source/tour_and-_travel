import Modal from './Modal.jsx';
import { money, FALLBACK_IMG } from '../api.js';

// Item details modal
export default function DestinationModal({ dest, onClose, onAdd }) {
  if (!dest) return null;
  const highlights = dest.highlights ? dest.highlights.split(',') : [];
  return (
    <Modal
      show
      title={`${dest.name}, ${dest.country}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { onAdd(dest); onClose(); }}><i className="bi bi-plus-lg me-1" />Add to a trip</button>
        </>
      }
    >
      <img className="modal-img" src={dest.image} alt={dest.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }} />
      <div className="p-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="badge text-bg-light border">{dest.category}</span>
          <span className="badge text-bg-warning"><i className="bi bi-star-fill me-1" />{dest.rating.toFixed(1)}</span>
          {dest.best_season && <span className="badge text-bg-info"><i className="bi bi-calendar-event me-1" />Best: {dest.best_season}</span>}
        </div>
        <p>{dest.description}</p>
        {highlights.length > 0 && (
          <>
            <h6 className="fw-bold">Highlights</h6>
            <ul className="row list-unstyled g-1 mb-3">
              {highlights.map((h) => <li className="col-6" key={h}><i className="bi bi-check-circle-fill text-brand me-2" />{h}</li>)}
            </ul>
          </>
        )}
        <div className="price fs-4">{money(dest.price_per_day)} <small className="text-muted fs-6 fw-normal">per person / day</small></div>
      </div>
    </Modal>
  );
}
