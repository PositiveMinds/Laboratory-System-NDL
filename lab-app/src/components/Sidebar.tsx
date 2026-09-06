import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, CreditCard,
  FlaskConical, Settings, LogOut, BarChart2, Microscope, HelpCircle, Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../lib/api';
import Swal from 'sweetalert2';

const NAV_ITEMS = [
  { to: '/dashboard',       label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/patients',        label: 'Patients',        Icon: Users },
  { to: '/test-management', label: 'Test Management', Icon: Microscope },
  { to: '/orders',          label: 'Test Orders',     Icon: ClipboardList },
  { to: '/billing',         label: 'Billing',         Icon: CreditCard },
  { to: '/results',         label: 'Lab Results',     Icon: FlaskConical },
  { to: '/reports',         label: 'Reports',         Icon: BarChart2 },
  { to: '/settings',        label: 'Settings',        Icon: Settings },
  { to: '/faq',             label: 'Help & FAQ',      Icon: HelpCircle },
  { to: '/about',           label: 'About',           Icon: Info },
];

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: Props) {
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
      confirmButtonColor: '#78001d',
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
    <>
      {/* Mobile backdrop */}
      {open && <div className="sidebar-backdrop show" onClick={onClose} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">NDL</div>
          <div className="brand-text">
            <h2>NDL Lab</h2>
          </div>
        </div>

        {/* Section header */}
        <div className="sidebar-section-header">
          <p>Core Modules</p>
          <p>Clinical Operations</p>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{ background: user?.photo ? 'transparent' : undefined, overflow: 'hidden', padding: 0 }}>
            {user?.photo
              ? <img src={user.photo} alt={user?.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials}
          </div>
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
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
