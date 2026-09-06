import { FlaskConical } from 'lucide-react';

interface Props {
  label?: string;
  fullPage?: boolean;
}

export default function PageLoader({ label = 'Loading…', fullPage = false }: Props) {
  const wrapStyle: React.CSSProperties = fullPage ? {
    position: 'fixed', inset: 0,
    background: 'var(--surface-container-low)',
    zIndex: 9999,
  } : {
    minHeight: 300,
  };

  return (
    <div style={{
      ...wrapStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      animation: 'loaderFadeIn 0.35s ease-out forwards',
    }}>
      {/* Flask animation stack */}
      <div style={{ position: 'relative', width: 88, height: 88 }}>

        {/* Outermost slow ripple */}
        <div style={{
          position: 'absolute', inset: -10,
          borderRadius: '50%',
          border: '1.5px solid var(--primary)',
          opacity: 0,
          animation: 'flaskRipple 2s ease-out 0s infinite',
        }} />
        {/* Middle ripple */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          border: '1.5px solid var(--primary)',
          opacity: 0,
          animation: 'flaskRipple 2s ease-out 0.65s infinite',
        }} />
        {/* Inner ripple */}
        <div style={{
          position: 'absolute', inset: -2,
          borderRadius: '50%',
          border: '1.5px solid var(--primary)',
          opacity: 0,
          animation: 'flaskRipple 2s ease-out 1.3s infinite',
        }} />

        {/* Spinning arc */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: 'var(--primary)',
          borderRightColor: 'color-mix(in srgb, var(--primary) 40%, transparent)',
          animation: 'spin 1s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />

        {/* Background circle */}
        <div style={{
          position: 'absolute', inset: 6,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
        }} />

        {/* Flask icon — bouncing */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'flaskBob 1.4s ease-in-out infinite',
        }}>
          <FlaskConical
            size={34}
            style={{ color: 'var(--primary)' }}
            strokeWidth={1.6}
          />
        </div>
      </div>

      {/* Text section */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Label */}
        <p style={{
          fontSize: 13, fontWeight: 600,
          color: 'var(--on-surface)',
          margin: 0, letterSpacing: '0.02em',
        }}>
          {label}
        </p>

        {/* Animated bar */}
        <div style={{
          width: 120, height: 3,
          background: 'var(--outline-variant)',
          borderRadius: 2, overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '-40%',
            width: '40%', height: '100%',
            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
            borderRadius: 2,
            animation: 'loadingBar 1.4s ease-in-out infinite',
          }} />
        </div>

        {/* Sub-label */}
        <p style={{
          fontSize: 11, color: 'var(--on-surface-variant)',
          margin: 0, opacity: 0.7,
        }}>
          Noble Diagnostic Laboratory
        </p>
      </div>
    </div>
  );
}
