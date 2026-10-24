import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../api.js';
import DestinationCard from '../components/DestinationCard.jsx';
import DestinationModal from '../components/DestinationModal.jsx';
import AddToTripModal from '../components/AddToTripModal.jsx';
import { useToast } from '../components/Toasts.jsx';

export default function Destinations() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [meta, setMeta] = useState({ categories: [], countries: [], maxPrice: 20000 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null);
  const [adding, setAdding] = useState(null);

  const filters = {
    search: params.get('search') || '',
    category: params.get('category') || 'all',
    country: params.get('country') || 'all',
    maxPrice: params.get('maxPrice') || '',
    sort: params.get('sort') || 'popular',
  };
  const [searchText, setSearchText] = useState(filters.search);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  useEffect(() => { api('/destinations/meta/filters').then(setMeta).catch((e) => toast.error(e.message)); /* eslint-disable-next-line */ }, []);

  // keep input in sync when the navbar search changes the URL
  useEffect(() => { setSearchText(filters.search); }, [filters.search]);

  // debounce text search
  useEffect(() => {
    const t = setTimeout(() => { if (searchText !== filters.search) setFilter('search', searchText.trim()); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [searchText]);

  useEffect(() => {
    setLoading(true);
    api('/destinations', { params: filters })
      .then(setItems)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [params.toString()]);

  const reset = () => { setSearchText(''); setParams({}, { replace: true }); };
  const hasFilters = [...params.keys()].length > 0;
  const maxVal = filters.maxPrice || meta.maxPrice;

  return (
    <div className="container py-4">
      <h1 className="fw-bold mb-1">Destinations</h1>
      <p className="text-muted">Find the perfect place for your next trip.</p>

      <div className="panel filter-bar mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label small fw-semibold" htmlFor="f-search">Search</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search" /></span>
              <input id="f-search" className="form-control" placeholder="Name, country or keyword" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold" htmlFor="f-cat">Category</label>
            <select id="f-cat" className="form-select" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="all">All</option>
              {meta.categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold" htmlFor="f-country">Country</label>
            <select id="f-country" className="form-select" value={filters.country} onChange={(e) => setFilter('country', e.target.value)}>
              <option value="all">All</option>
              {meta.countries.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold" htmlFor="f-price">Max price: {money(maxVal)}</label>
            <input id="f-price" type="range" className="form-range" min="1000" max={meta.maxPrice || 20000} step="500" value={maxVal} onChange={(e) => setFilter('maxPrice', e.target.value)} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small fw-semibold" htmlFor="f-sort">Sort by</label>
            <select id="f-sort" className="form-select" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="popular">Top rated</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
        {hasFilters && <button className="btn btn-link btn-sm px-0 mt-2" onClick={reset}><i className="bi bi-x-circle me-1" />Clear filters</button>}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" role="status" /></div>
      ) : items.length === 0 ? (
        <div className="panel text-center py-5">
          <i className="bi bi-emoji-frown fs-1 text-muted" />
          <h5 className="mt-2">No destinations match your filters</h5>
          <button className="btn btn-primary mt-2" onClick={reset}>Reset filters</button>
        </div>
      ) : (
        <>
          <p className="text-muted small">{items.length} destination{items.length > 1 ? 's' : ''} found</p>
          <div className="row g-4">
            {items.map((d) => (
              <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={d.id}><DestinationCard dest={d} onView={setView} onAdd={setAdding} /></div>
            ))}
          </div>
        </>
      )}

      <DestinationModal dest={view} onClose={() => setView(null)} onAdd={setAdding} />
      <AddToTripModal dest={adding} onClose={() => setAdding(null)} />
    </div>
  );
}
