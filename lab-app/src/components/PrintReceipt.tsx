import type { ReceiptData, LabInfo } from '../types';
import { fmtUGX } from '../lib/currency';

interface Props {
  data: ReceiptData;
  logo?: string | null;
  labInfo?: LabInfo | null;
}

const DEFAULT_LAB: LabInfo = {
  name: 'Noble Diagnostic Laboratory',
  tagline: 'Professionalism Is Part Of Us',
  address: 'Maina House, Plot 31A Kiwafu Road, Kitooro — Entebbe, Uganda',
  phone: '+256 706947101 / +256 782087828',
  email: '',
  website: '',
};

export default function PrintReceipt({ data, logo, labInfo }: Props) {
  const lab = { ...DEFAULT_LAB, ...Object.fromEntries(Object.entries(labInfo ?? {}).filter(([, v]) => v)) };

  const date = new Date(data.payment_date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const effectiveTotal = data.total_amount - (data.discount_amount || 0);
  const isPaid = data.balance <= 0.01;

  return (
    <div style={{
      fontFamily: "'Hanken Grotesk', Arial, sans-serif",
      maxWidth: 380,
      width: 380,
      margin: '0 auto',
      background: '#fff',
      color: '#161c27',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* ── Top accent ── */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #78001d 0%, #9b1b30 100%)' }} />

      {/* ── Lab Header ── */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #e0bfbf' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          {/* Logo / brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo ? (
              <img src={logo} alt="Lab Logo"
                style={{ height: 44, maxWidth: 130, objectFit: 'contain', objectPosition: 'left' }} />
            ) : (
              <div style={{
                width: 40, height: 40, background: '#78001d', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 10, letterSpacing: 1, flexShrink: 0,
              }}>NDL</div>
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#78001d', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {lab.name}
              </div>
              <div style={{ fontSize: 9.5, color: '#584141', marginTop: 2, lineHeight: 1.5 }}>
                {lab.address}
              </div>
              {lab.phone && <div style={{ fontSize: 9.5, color: '#584141' }}>{lab.phone}</div>}
              {lab.email && <div style={{ fontSize: 9.5, color: '#584141' }}>{lab.email}</div>}
            </div>
          </div>
          {/* Receipt title */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#78001d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              RECEIPT
            </div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              padding: '2px 10px', borderRadius: 2, fontSize: 9, fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: isPaid ? '#d2f4da' : '#fff3cd',
              color: isPaid ? '#146c34' : '#b47800',
              border: `1px solid ${isPaid ? 'rgba(20,108,52,0.25)' : 'rgba(180,120,0,0.25)'}`,
            }}>
              {isPaid ? '✓ PAID' : 'PARTIAL'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Receipt Meta ── */}
      <div style={{ padding: '10px 20px', background: '#f1f3ff', borderBottom: '1px solid #e0bfbf' }}>
        {[
          ['Receipt No.', data.receipt_number],
          ['Order No.', data.order_number],
          ['Date', date],
          ['Cashier', data.cashier_name],
          ['Method', data.payment_method],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
            <span style={{ color: '#584141', fontWeight: 600 }}>{label}:</span>
            <span style={{ fontWeight: label === 'Receipt No.' || label === 'Order No.' ? 700 : 400, textTransform: label === 'Method' ? 'capitalize' : 'none', fontFamily: label === 'Receipt No.' || label === 'Order No.' ? 'monospace' : 'inherit', color: label === 'Receipt No.' ? '#78001d' : '#161c27' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Patient Info ── */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #e0bfbf' }}>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#584141', marginBottom: 6 }}>
          Patient Information
        </div>
        {[
          ['Name', data.patient_name],
          ['ID', data.patient_ref],
          ...(data.patient_gender ? [['Gender', data.patient_gender]] : []),
          ...(data.patient_age ? [['Age', `${data.patient_age} yrs`]] : []),
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
            <span style={{ color: '#584141' }}>{label}:</span>
            <span style={{ fontWeight: label === 'Name' ? 700 : 400 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Tests Ordered ── */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #e0bfbf' }}>
        <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#584141', marginBottom: 8 }}>
          Tests Ordered ({data.items.length})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '65%' }} />
            <col style={{ width: '35%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid #e0bfbf' }}>
              <th style={{ textAlign: 'left', paddingBottom: 4, color: '#584141', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
              <th style={{ textAlign: 'right', paddingBottom: 4, color: '#584141', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: i < data.items.length - 1 ? '1px solid rgba(224,191,191,0.4)' : 'none' }}>
                <td style={{ padding: '5px 0', lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{item.test_name}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtUGX(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Totals ── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e0bfbf' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: '#584141' }}>Subtotal:</span>
          <span>{fmtUGX(data.total_amount)}</span>
        </div>
        {data.discount_amount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: '#ba1a1a' }}>
            <span>Discount:</span>
            <span>− {fmtUGX(data.discount_amount)}</span>
          </div>
        )}
        <div style={{ borderTop: '2px solid #e0bfbf', margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#584141' }}>Grand Total:</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#78001d' }}>{fmtUGX(effectiveTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#146c34', marginBottom: data.balance > 0.01 ? 4 : 0 }}>
          <span>Amount Paid:</span>
          <span>{fmtUGX(data.amount_paid)}</span>
        </div>
        {data.balance > 0.01 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#ba1a1a', background: '#ffdad6', margin: '6px -20px -12px', padding: '8px 20px' }}>
            <span>Balance Due:</span>
            <span>{fmtUGX(data.balance)}</span>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      {data.notes && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #e0bfbf', background: '#f9f9ff' }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#584141', marginBottom: 4 }}>Notes</div>
          <p style={{ fontSize: 10, color: '#584141', margin: 0, lineHeight: 1.5 }}>{data.notes}</p>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '14px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#78001d', fontStyle: 'italic', margin: '0 0 4px' }}>
          "Thank you for choosing {lab.name}"
        </p>
        {lab.tagline && <p style={{ fontSize: 10, color: '#584141', margin: '0 0 2px' }}>{lab.tagline}</p>}
        {lab.phone && <p style={{ fontSize: 10, color: '#8c7071', margin: 0 }}>{lab.phone}</p>}
        {lab.website && <p style={{ fontSize: 10, color: '#8c7071', margin: 0 }}>{lab.website}</p>}
        <div style={{ marginTop: 20, borderTop: '1px solid #161c27', width: 160, margin: '24px auto 4px' }} />
        <p style={{ fontSize: 10, color: '#584141', margin: 0 }}>Authorized Signature</p>
      </div>
    </div>
  );
}
