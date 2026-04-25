import { FlaskConical } from 'lucide-react';

interface Props {
  label?: string;
}

export default function PageLoader({ label = 'Loading...' }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 320,
      gap: 16,
    }}>
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <div className="page-loader-ring" />
        <div style={{
          position: 'absolute', inset: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary-color)',
        }}>
          <FlaskConical size={18} />
        </div>
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
