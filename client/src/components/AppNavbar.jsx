import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/destinations${q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ''}`);
    setQ('');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/"><i className="bi bi-compass-fill me-1" />Tour&Travel</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><NavLink className="nav-link" to="/" end>Home</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/destinations">Destinations</NavLink></li>
            {user && <li className="nav-item"><NavLink className="nav-link" to="/trips">My Trips</NavLink></li>}
            {user && <li className="nav-item"><NavLink className="nav-link" to="/dashboard">Dashboard</NavLink></li>}
            {user?.role === 'admin' && <li className="nav-item"><NavLink className="nav-link" to="/admin">Admin</NavLink></li>}
          </ul>
          <form className="d-flex me-lg-3 mb-2 mb-lg-0" role="search" onSubmit={onSearch}>
            <div className="input-group">
              <input className="form-control" type="search" placeholder="Search destinations" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn btn-primary" type="submit" aria-label="Search"><i className="bi bi-search" /></button>
            </div>
          </form>
          {user ? (
            <div className="d-flex align-items-center gap-2">
              <span className="text-light small"><i className="bi bi-person-circle me-1" />{user.name.split(' ')[0]}</span>
              <button className="btn btn-outline-light btn-sm" onClick={() => { logout(); navigate('/'); }}>Logout</button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link className="btn btn-outline-light btn-sm" to="/login">Login</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
