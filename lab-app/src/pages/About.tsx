import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Mail, Phone, ArrowLeft, ExternalLink } from 'lucide-react';
import { useAssets } from '../contexts/AssetsContext';

const DEVELOPER = {
  company: 'E-Zone Technologies',
  tagline: 'Building intelligent software for healthcare & business',
  email: 'positiveminds256@gmail.com',
  whatsapp: '+256 775 582 868',
  whatsappLink: 'https://wa.me/256775582868',
  linkedin: 'https://www.linkedin.com/in/bwoye-charles-b86109167/',
  github: 'https://github.com/PositiveMinds',
};

const SYSTEM = {
  name: 'NDL Lab Management System',
  version: '1.0.0',
  build: '2026',
  description: 'A full-featured desktop Laboratory Information Management System (LIMS) built for Noble Diagnostic Laboratory, Entebbe, Uganda.',
};


function ContactCard({
  icon, label, value, href, copyable = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  copyable?: boolean;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary) 40%, var(--outline-variant))')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--outline-variant)')}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius)',
        background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: 'var(--primary)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: 2 }}>
          {label}
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none',
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </a>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{value}</span>
        )}
      </div>
      {copyable && (
        <button onClick={handleCopy} style={{
          background: 'none', border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius)', padding: '4px 10px',
          fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)',
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-high)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          title={`Copy ${label}`}
        >
          Copy
        </button>
      )}
    </div>
  );
}

export default function About() {
  const navigate = useNavigate();
  const { logo } = useAssets(); // uploaded logo from Settings → Branding

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>About</h1>
          <p>System information and developer contact</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={13} /> Back
        </button>
      </div>

      {/* ── System card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          {/* Lab logo — uploaded or fallback */}
          <div style={{
            width: 80, height: 80, borderRadius: 12,
            background: logo ? 'transparent' : 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
            border: logo ? '1px solid var(--outline-variant)' : 'none',
            padding: logo ? 6 : 0,
          }}>
            {logo ? (
              <img
                src={logo}
                alt="Lab Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <img
                src="/ndl.png"
                alt="NDL Lab"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={e => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  // show flask icon fallback
                  (img.parentElement as HTMLElement).innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M13 3v6.6l3.7 6.3a2 2 0 0 1-1.7 3H9a2 2 0 0 1-1.7-3L11 9.6V3"/></svg>';
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {SYSTEM.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 12px', lineHeight: 1.6 }}>
              {SYSTEM.description}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Version', SYSTEM.version],
                ['Build Year', SYSTEM.build],
                ['Platform', 'Windows (Desktop)'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  padding: '3px 10px', borderRadius: 100,
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>{k}: </span>
                  <span style={{ color: 'var(--primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Developer card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--outline-variant)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, #9b1b30 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 800, flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            EZ
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-surface)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>
              {DEVELOPER.company}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: 0 }}>
              {DEVELOPER.tagline}
            </p>
          </div>
        </div>

        {/* Contact grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ContactCard
            icon={<Mail size={18} />}
            label="Email"
            value={DEVELOPER.email}
            href={`mailto:${DEVELOPER.email}`}
            copyable
          />
          <ContactCard
            icon={<Phone size={18} />}
            label="WhatsApp"
            value={`${DEVELOPER.whatsapp} (WhatsApp)`}
            href={DEVELOPER.whatsappLink}
            copyable
          />
          <ContactCard
            icon={<ExternalLink size={18} />}
            label="LinkedIn"
            value="linkedin.com/in/bwoye-charles"
            href={DEVELOPER.linkedin}
          />
          <ContactCard
            icon={<ExternalLink size={18} />}
            label="GitHub"
            value="github.com/PositiveMinds"
            href={DEVELOPER.github}
          />
        </div>
      </div>

      {/* ── Support & Legal ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Support</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[
            {
              title: 'Report a Bug',
              desc: 'Found something wrong? Contact the developer directly on WhatsApp or email with details of the issue.',
              icon: '🐛',
            },
            {
              title: 'Feature Request',
              desc: 'Have an idea for a new feature? Reach out via email and describe what you need.',
              icon: '💡',
            },
            {
              title: 'Data Backup',
              desc: 'Always keep regular backups under Settings → Backup & Restore before any major updates.',
              icon: '🗄️',
            },
            {
              title: 'Training',
              desc: 'Need a walkthrough of any feature? Visit Help & FAQ in the sidebar for comprehensive guides.',
              icon: '📚',
            },
          ].map(({ title, desc, icon }) => (
            <div key={title} style={{
              padding: '14px 16px',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--outline-variant)',
            }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '16px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 4px' }}>
          Built with ❤️ for <strong style={{ color: 'var(--primary)' }}>Noble Diagnostic Laboratory</strong>
        </p>
        <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.7, margin: 0 }}>
          © {SYSTEM.build} {DEVELOPER.company}. All rights reserved.
          &nbsp;·&nbsp; NDL Lab v{SYSTEM.version}
        </p>
      </div>
    </div>
  );
}
