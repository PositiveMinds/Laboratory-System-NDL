import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Plus, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { globalSearch } from '../lib/api';
import type { SearchResult } from '../types';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const r = await globalSearch(q);
      setResults(r);
      setOpen(r.length > 0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, runSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setQuery('');
    setOpen(false);
    if (r.kind === 'patient') navigate(`/patients`);
    else navigate(`/orders/${r.id}`);
  };

  return (
    <header className="top-header">
      <div ref={containerRef} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            className="form-control"
            style={{ paddingLeft: 32, paddingRight: 10, fontSize: 13, height: 34 }}
            placeholder="Search patients, orders…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {loading && <div className="spinner" style={{ width: 14, height: 14, position: 'absolute', right: 10 }} />}
        </div>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
            zIndex: 9999,
            overflow: 'hidden',
            maxHeight: 380,
            overflowY: 'auto',
          }}>
            {results.map((r, i) => (
              <div
                key={i}
                onClick={() => handleSelect(r)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10,
                  alignItems: 'center', borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              >
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: r.kind === 'patient' ? '#10b981' : 'var(--primary-color)',
                  background: r.kind === 'patient' ? 'rgba(16,185,129,0.12)' : 'rgba(245,73,39,0.1)',
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                }}>
                  {r.kind}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header-actions">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/orders/new')}>
          <Plus size={14} /> New Order
        </button>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
