import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, CreditCard,
  FlaskConical, Settings, LogOut, BarChart2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../lib/api';
import Swal from 'sweetalert2';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/patients',  label: 'Patients',    Icon: Users },
  { to: '/orders',    label: 'Test Orders', Icon: ClipboardList },
  { to: '/billing',   label: 'Billing',     Icon: CreditCard },
  { to: '/results',   label: 'Lab Results', Icon: FlaskConical },
  { to: '/reports',   label: 'Reports',     Icon: BarChart2 },
  { to: '/settings',  label: 'Settings',    Icon: Settings },
];

export default function Sidebar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Sign Out',
      text: 'Are you sure you want to sign out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sign Out',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f54927',
    });
    if (result.isConfirmed) {
      await logout();
      setUser(null);
      navigate('/login');
    }
  };

  const initials = user?.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">NDL</div>
        <div className="brand-text">
          <h2>NDL</h2>
          <span>Noble Diagnostic Laboratory</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info-text">
            <strong>{user?.full_name}</strong>
            <small>{user?.role}</small>
          </div>
          <button
            className="icon-btn"
            onClick={handleLogout}
            title="Sign Out"
            style={{ width: 28, height: 28, flexShrink: 0 }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
