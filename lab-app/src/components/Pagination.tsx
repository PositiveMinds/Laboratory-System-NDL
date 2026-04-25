import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ total, page, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary)' }}>
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', minWidth: 0 }}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                padding: '4px 9px',
                border: '1.5px solid',
                borderColor: p === page ? 'var(--primary-color)' : 'var(--border-color)',
                borderRadius: 5,
                background: p === page ? 'var(--primary-color)' : 'transparent',
                color: p === page ? '#fff' : 'var(--text-color)',
                fontWeight: p === page ? 700 : 400,
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1.4,
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', minWidth: 0 }}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
