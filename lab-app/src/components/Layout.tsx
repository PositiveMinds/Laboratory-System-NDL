import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function TopProgressBar() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setVisible(true);
    setKey(k => k + 1);
    const t = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div key={key} style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 3, zIndex: 9999, pointerEvents: 'none',
    }}>
      <div style={{
        height: '100%',
        background: 'linear-gradient(90deg, var(--primary) 0%, #e63946 60%, color-mix(in srgb, var(--primary) 40%, transparent) 100%)',
        animation: 'topBarProgress 1.0s cubic-bezier(0.4,0,0.2,1) forwards',
        borderRadius: '0 3px 3px 0',
        boxShadow: '0 0 8px color-mix(in srgb, var(--primary) 60%, transparent)',
      }} />
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <TopProgressBar />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Header onMenuClick={() => setSidebarOpen(v => !v)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
