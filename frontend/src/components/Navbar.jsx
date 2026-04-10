import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiUsers, FiLogOut, FiSearch, FiShield } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const isHospital = user?.role === 'hospital';

  const patientNavItems = [
    { path: '/dashboard', icon: <FiGrid />, label: 'Dashboard' },
    { path: '/records', icon: <FiShield />, label: 'Vault' },
    { path: '/medicines', icon: '💊', label: 'Medicines' },
    { path: '/family', icon: <FiUsers />, label: 'Family' },
    { path: '/access', icon: <FiShield />, label: 'Access' },
    { path: '/blockchain', icon: '⛓️', label: 'Ledger' },
  ];

  const hospitalNavItems = [
    { path: '/dashboard', icon: '🏥', label: 'Portal' },
    { path: '/blockchain', icon: '⛓️', label: 'Ledger' },
  ];

  const navItems = isHospital ? hospitalNavItems : patientNavItems;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-logo">
          <span className="logo-icon">💚</span>
          <span className="logo-text">HealthVault</span>
        </Link>

        <div className="navbar-search">
          <FiSearch className="search-icon" />
          <input type="text" placeholder={isHospital ? 'Search patients...' : 'Search records, doctors, insights...'} />
        </div>

        <div className="navbar-links">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}>
              {typeof item.icon === 'string' ? <span>{item.icon}</span> : item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-profile">
          {isHospital && <span style={{ fontSize: '0.75rem', color: 'var(--primary-accent)', fontWeight: 700, marginRight: 8 }}>{user?.labCode}</span>}
          {user?.role === 'doctor' && <span style={{ fontSize: '0.75rem', color: 'var(--primary-accent)', fontWeight: 700, marginRight: 8 }}>{user?.doctorCode}</span>}
          <div className="profile-avatar" onClick={() => navigate('/dashboard')}>{user?.name?.charAt(0) || 'U'}</div>
          <button className="logout-btn" onClick={handleLogout} title="Logout"><FiLogOut /></button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
