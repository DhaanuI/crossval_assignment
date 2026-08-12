import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar({ onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          Orders & Settlements
        </Link>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
          <Link to="/orders/create" className="navbar-link">
            Create Order
          </Link>
          <button onClick={onLogout} className="btn btn-outline navbar-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
