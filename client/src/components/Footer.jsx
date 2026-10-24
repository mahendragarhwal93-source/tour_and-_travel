import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="py-4 mt-5">
      <div className="container">
        <div className="row gy-3">
          <div className="col-md-5">
            <h5 className="text-white fw-bold"><i className="bi bi-compass-fill text-warning me-1" />Tour&Travel</h5>
            <p className="small mb-0">Discover destinations, plan multi-stop trips and book with confidence.</p>
          </div>
          <div className="col-6 col-md-3">
            <h6 className="text-white">Explore</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/destinations">Destinations</Link></li>
              <li><Link to="/trips">Plan a trip</Link></li>
              <li><Link to="/dashboard">My bookings</Link></li>
            </ul>
          </div>
          <div className="col-6 col-md-4">
            <h6 className="text-white">Contact</h6>
            <ul className="list-unstyled small mb-0">
              <li><i className="bi bi-envelope me-2" />support@Tour&Travel.com</li>
              <li><i className="bi bi-telephone me-2" />+91 98765 43210</li>
            </ul>
          </div>
        </div>
        <hr className="border-secondary" />
        <div className="small text-center">© {new Date().getFullYear()} Tour&Travel. Built with React, Bootstrap, Node.js, Express &amp; SQLite.</div>
      </div>
    </footer>
  );
}
