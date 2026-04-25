import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/orders': 'Test Orders',
  '/orders/new': 'New Order',
  '/billing': 'Billing',
  '/results': 'Lab Results',
  '/settings': 'Settings',
};

export default function Layout() {
  const location = useLocation();
  const title =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/orders/') ? 'Order Details' : 'Noble Diagnostic Laboratory');

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
