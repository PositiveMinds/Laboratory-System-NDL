import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Moon, Sun, Plus, Search, ChevronLeft, Menu,
  HelpCircle, AlertTriangle, Clock, CreditCard, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { globalSearch, getNotifications } from '../lib/api';
import type { SearchResult, AppNotification } from '../types';

const TOP_LEVEL = new Set([
  '/dashboard', '/patients', '/orders', '/billing',
  '/results', '/settings', '/reports', '/test-management', '/faq', '/about',
]);

interface Props {
  onMenuClick?: () => void;
}

const KIND_META = {
  critical: { Icon: AlertTriangle, color: 'var(--error)',   bg: 'var(--error-container)',   label: 'Critical' },
  pending:  { Icon: Clock,         color: '#b47800',         bg: 'rgba(180,120,0,0.1)',       label: 'Pending'  },
  unpaid:   { Icon: CreditCard,    color: '#2563eb',         bg: 'rgba(37,99,235,0.1)',       label: 'Unpaid'   },
};

export default function Header({ onMenuClick }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = !TOP_LEVEL.has(location.pathname);

  // ── Search state ────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearchOpen(false); return; }
    setSearching(true);
    try {
      const r = await globalSearch(q);
      setResults(r);
      setSearchOpen(r.length > 0);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, runSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setQuery(''); setSearchOpen(false);
    if (r.kind === 'patient') navigate('/patients');
    else navigate(`/orders/${r.id}`);
  };

  // ── Notifications state ──────────────────────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const n = await getNotifications();
      setNotifications(n);
    } catch { /* not authenticated yet */ }
  }, []);

  // Load on mount and every 2 minutes
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 120_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Reload when navigating back to a page (catches newly created orders etc.)
  useEffect(() => { loadNotifications(); }, [location.pathname, loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const criticalCount = notifications.filter(n => n.kind === 'critical').length;
  const badgeCount = notifications.length;

  const initials = user?.full_name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <header className="top-header">
      {/* Left: hamburger + back + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        {canGoBack && (
          <button className="icon-btn" onClick={() => navigate(-1)} title="Go back">
            <ChevronLeft size={18} />
          </button>
        )}
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          NDL Lab
        </span>
      </div>

      {/* Centre: search — always visible on desktop */}
      <div ref={searchRef} className="header-search-inline"
        style={{ position: 'relative', flex: 1, maxWidth: 340, display: 'flex', alignItems: 'center', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)', padding: '0 12px', gap: 8, height: 32, marginLeft: 12 }}>
        <Search size={13} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
        <input
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--on-surface)', fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 0 }}
          placeholder="Search patients, orders…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setSearchOpen(true)}
        />
        {searching && <div className="spinner" style={{ width: 13, height: 13, flexShrink: 0 }} />}
        {searchOpen && (
          <div className="search-dropdown">
            {results.map((r, i) => (
              <div key={i} className="search-result-item" onClick={() => handleSelect(r)}>
                <span className={`search-result-kind ${r.kind}`}>{r.kind}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{r.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="header-actions" style={{ flexShrink: 0 }}>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/orders/new')}>
          <Plus size={13} /> <span className="new-order-label">New Order</span>
        </button>

        {/* ── Notification Bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            title="Notifications"
            onClick={() => { setNotifOpen(v => !v); if (!notifOpen) loadNotifications(); }}
            style={{ position: 'relative' }}
          >
            {/* Bell icon — use SVG directly so the badge sits on top */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {badgeCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: badgeCount > 9 ? 16 : 14, height: 14,
                borderRadius: 7, fontSize: 9, fontWeight: 800,
                background: criticalCount > 0 ? 'var(--error)' : '#b47800',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, pointerEvents: 'none',
                border: '1.5px solid var(--surface)',
              }}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              width: 340, maxHeight: 480, overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              zIndex: 9000,
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: '1px solid var(--outline-variant)',
                position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
              }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  {badgeCount > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', padding: '1px 6px', borderRadius: 10 }}>
                      {badgeCount}
                    </span>
                  )}
                </div>
                <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setNotifOpen(false)}>
                  <X size={13} />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                  All clear — no pending alerts
                </div>
              ) : (
                <>
                  {/* Group by kind */}
                  {(['critical', 'pending', 'unpaid'] as const).map(kind => {
                    const group = notifications.filter(n => n.kind === kind);
                    if (group.length === 0) return null;
                    const meta = KIND_META[kind];
                    return (
                      <div key={kind}>
                        <div style={{
                          padding: '6px 16px 4px',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: meta.color,
                          background: 'var(--surface-container-low)',
                          borderBottom: '1px solid var(--outline-variant)',
                        }}>
                          {meta.label} ({group.length})
                        </div>
                        {group.map(n => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.order_id) navigate(`/orders/${n.order_id}`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '10px 16px', cursor: n.order_id ? 'pointer' : 'default',
                              borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (n.order_id) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-container-low)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 'var(--radius)',
                              background: meta.bg, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <meta.Icon size={14} style={{ color: meta.color }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.3 }}>
                                {n.title}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {n.subtitle}
                              </div>
                            </div>
                            {n.order_id && (
                              <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0, marginTop: 2, fontWeight: 600 }}>
                                View →
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Footer */}
                  <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid var(--outline-variant)' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
                      onClick={() => { setNotifOpen(false); loadNotifications(); }}
                    >
                      Refresh
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Help */}
        <button className="icon-btn" title="Help" onClick={() => navigate('/faq')}>
          <HelpCircle size={16} />
        </button>

        {/* Avatar */}
        <div
          onClick={() => navigate('/settings')}
          title={user?.full_name}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: user?.photo ? 'transparent' : 'var(--primary)',
            border: '1.5px solid var(--outline-variant)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            cursor: 'pointer', marginLeft: 4, overflow: 'hidden',
          }}
        >
          {user?.photo
            ? <img src={user.photo} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
      </div>
    </header>
  );
}
