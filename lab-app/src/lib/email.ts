import type { ResultsReportData, ReceiptData } from '../types';
import { fmtUGX } from './currency';
import { sendEmailSmtp, getSmtpConfig } from './api';

export async function isEmailConfigured(): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    return config !== null && Boolean(config.host) && Boolean(config.from_email);
  } catch {
    return false;
  }
}

// ── Shared design tokens ─────────────────────────────────────────
const C = {
  primary:    '#78001d',
  primaryBg:  '#ffdad9',
  surface:    '#f9f9ff',
  surfaceLow: '#f1f3ff',
  border:     '#e0bfbf',
  text:       '#161c27',
  muted:      '#584141',
  dim:        '#8c7071',
  success:    '#146c34',
  successBg:  '#d2f4da',
  error:      '#ba1a1a',
  errorBg:    '#ffdad6',
  warning:    '#b47800',
  warningBg:  '#fff3cd',
  blue:       '#2563eb',
  blueBg:     'rgba(37,99,235,0.08)',
};

// ── Shared layout helpers ────────────────────────────────────────
function emailShell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>NDL Lab</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f3ff;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f3ff;min-height:100vh;">
    <tr><td align="center" style="padding:32px 16px;">
      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(120,0,29,0.08);">
        <!-- Top accent bar -->
        <tr><td style="background:linear-gradient(135deg,${C.primary} 0%,#9b1b30 100%);height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${body}
        <!-- Footer -->
        <tr><td style="background:#f9f9ff;border-top:1px solid ${C.border};padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:11px;color:${C.dim};line-height:1.6;">
                <strong style="color:${C.primary};">Noble Diagnostic Laboratory</strong><br/>
                Maina House, Plot 31A Kiwafu Road, Kitooro — Entebbe, Uganda<br/>
                Tel: +256 706947101 / +256 782087828 &nbsp;·&nbsp; mas884@yahoo.com
              </td>
              <td align="right" style="vertical-align:top;">
                <div style="display:inline-block;background:${C.primary};color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:6px 10px;border-radius:4px;">NDL</div>
              </td>
            </tr>
            <tr><td colspan="2" style="padding-top:12px;border-top:1px solid ${C.border};margin-top:12px;font-size:10px;color:${C.dim};text-align:center;">
              This email was sent by NDL Lab System. Please do not reply directly to this email.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailHeader(icon: string, title: string, subtitle: string, logo?: string | null): string {
  const logoHtml = logo
    ? `<img src="${logo}" alt="NDL Lab" style="height:40px;max-width:140px;object-fit:contain;display:block;" />`
    : `<div style="background:rgba(255,255,255,0.15);border-radius:6px;padding:10px 14px;font-size:11px;font-weight:800;color:#fff;letter-spacing:1.5px;white-space:nowrap;">NDL LAB</div>`;
  return `
  <tr><td style="background:${C.primary};padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <div style="font-size:28px;line-height:1;">${icon}</div>
          <h1 style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">${title}</h1>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.78);">${subtitle}</p>
        </td>
        <td align="right" style="vertical-align:top;">
          ${logoHtml}
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.muted};background:${C.surfaceLow};border-right:1px solid ${C.border};width:36%;white-space:nowrap;">${label}</td>
    <td style="padding:8px 16px;font-size:13px;color:${C.text};">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:6px;overflow:hidden;margin-bottom:20px;">${rows}</table>`;
}

function statusBadge(label: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${color};background:${bg};">${label}</span>`;
}

function divider(): string {
  return `<tr><td style="padding:4px 0;"><div style="height:1px;background:${C.border};"></div></td></tr>`;
}

function ctaButton(text: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <span style="display:inline-block;background:${C.primary};color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.05em;padding:12px 28px;border-radius:4px;text-transform:uppercase;">${text}</span>
  </div>`;
}

// ── Results HTML table ───────────────────────────────────────────
function buildResultsHtml(data: ResultsReportData): string {
  let html = '';
  for (const cat of data.categories) {
    html += `
      <div style="margin:20px 0 8px;padding:7px 14px;background:${C.surfaceLow};border-left:4px solid ${C.primary};border-radius:0 3px 3px 0;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${C.primary};">${cat.name}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:${C.surfaceLow};">
            <th style="text-align:left;padding:8px 10px;border:1px solid ${C.border};color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Test</th>
            <th style="text-align:left;padding:8px 10px;border:1px solid ${C.border};color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Result</th>
            <th style="text-align:left;padding:8px 10px;border:1px solid ${C.border};color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Unit</th>
            <th style="text-align:left;padding:8px 10px;border:1px solid ${C.border};color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Ref. Range</th>
            <th style="text-align:center;padding:8px 10px;border:1px solid ${C.border};color:${C.muted};font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">Status</th>
          </tr>
        </thead>
        <tbody>`;
    for (const item of cat.items) {
      const isAbnormal = item.flag && item.flag !== 'N';
      const flagColor = item.flag === 'H' || item.flag === 'C' ? C.error : item.flag === 'L' ? C.blue : C.success;
      const flagBg = item.flag === 'H' || item.flag === 'C' ? C.errorBg : item.flag === 'L' ? C.blueBg : C.successBg;
      const flagLabel = item.flag === 'H' ? 'High' : item.flag === 'L' ? 'Low' : item.flag === 'C' ? 'Critical' : 'Normal';
      html += `
          <tr style="background:${isAbnormal ? '#fff8f8' : '#fff'};">
            <td style="padding:7px 10px;border:1px solid ${C.border};font-weight:500;font-size:13px;">${item.test_name}</td>
            <td style="padding:7px 10px;border:1px solid ${C.border};font-weight:${isAbnormal ? '700' : '400'};color:${isAbnormal ? C.error : C.text};font-size:13px;">${item.result_value || '—'}</td>
            <td style="padding:7px 10px;border:1px solid ${C.border};color:${C.muted};font-size:12px;">${item.unit || '—'}</td>
            <td style="padding:7px 10px;border:1px solid ${C.border};color:${C.muted};font-size:12px;">${item.reference_range || '—'}</td>
            <td style="padding:7px 10px;border:1px solid ${C.border};text-align:center;">
              ${item.flag ? `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;background:${flagBg};color:${flagColor};">${flagLabel}</span>` : '—'}
            </td>
          </tr>`;
    }
    html += `</tbody></table>`;
  }
  return html;
}

// ──────────────────────────────────────────────────────────────────
// 1. LAB RESULTS REPORT
// ──────────────────────────────────────────────────────────────────
export async function sendResultsEmail(data: ResultsReportData, toEmail: string, logo?: string | null): Promise<void> {
  const hasAbnormal = data.categories.some(c => c.items.some(i => i.flag && i.flag !== 'N'));
  const hasCritical = data.categories.some(c => c.items.some(i => i.flag === 'C'));

  const alertBanner = hasCritical ? `
    <tr><td style="padding:0 32px 4px;">
      <div style="background:${C.errorBg};border:1px solid ${C.error};border-radius:6px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">⚠️</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:${C.error};">Critical Values Detected</div>
          <div style="font-size:12px;color:${C.error};opacity:0.85;margin-top:2px;">Please consult your physician immediately regarding these results.</div>
        </div>
      </div>
    </td></tr>` : hasAbnormal ? `
    <tr><td style="padding:0 32px 4px;">
      <div style="background:${C.warningBg};border:1px solid #e0c060;border-radius:6px;padding:12px 16px;">
        <span style="font-size:13px;font-weight:700;color:${C.warning};">⚠ Some results are outside the normal range.</span>
        <span style="font-size:12px;color:${C.warning};"> Please discuss with your physician.</span>
      </div>
    </td></tr>` : `
    <tr><td style="padding:0 32px 4px;">
      <div style="background:${C.successBg};border:1px solid #a0d8b4;border-radius:6px;padding:12px 16px;">
        <span style="font-size:13px;font-weight:700;color:${C.success};">✓ All results are within normal range.</span>
      </div>
    </td></tr>`;

  const body = emailShell(
    `Your lab results for ${data.order_number} are ready.`,
    `
    ${emailHeader('🔬', 'Your Lab Results Are Ready', `Order ${data.order_number} · ${new Date(data.result_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, logo)}
    <!-- Patient info -->
    <tr><td style="padding:28px 32px 12px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Dear <strong>${data.patient_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.6;">Your laboratory results are now available. Please find your complete report below. We recommend consulting your physician for clinical interpretation.</p>
      ${infoTable(
        infoRow('Patient', `<strong>${data.patient_name}</strong>`) +
        infoRow('Patient ID', `<span style="font-family:monospace;">${data.patient_ref}</span>`) +
        infoRow('Order No.', `<span style="font-family:monospace;color:${C.primary};font-weight:700;">${data.order_number}</span>`) +
        infoRow('Collected', new Date(data.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })) +
        infoRow('Reported', new Date(data.result_date).toLocaleString('en-GB')) +
        (data.referred_by ? infoRow('Referred By', data.referred_by) : '')
      )}
    </td></tr>
    ${alertBanner}
    <!-- Results -->
    <tr><td style="padding:16px 32px 8px;">
      <h2 style="margin:0 0 4px;font-size:16px;font-weight:700;color:${C.text};">Test Results</h2>
      <p style="margin:0 0 16px;font-size:12px;color:${C.muted};">Abnormal values are highlighted in red. Normal values are in green.</p>
      ${buildResultsHtml(data)}
    </td></tr>
    <!-- Disclaimer -->
    <tr><td style="padding:8px 32px 28px;">
      <div style="background:${C.surfaceLow};border-radius:6px;padding:14px 16px;border:1px solid ${C.border};">
        <p style="margin:0;font-size:11px;color:${C.dim};line-height:1.6;font-style:italic;">
          This report is confidential and intended solely for the named patient and their healthcare provider.
          Results should be interpreted in the context of your clinical history.
          Noble Diagnostic Laboratory is not responsible for medical decisions made solely on the basis of this report.
        </p>
      </div>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Lab Results Ready — ${data.patient_name} (${data.order_number})`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 2. PAYMENT RECEIPT
// ──────────────────────────────────────────────────────────────────
export async function sendReceiptEmail(data: ReceiptData, toEmail: string, logo?: string | null): Promise<void> {
  const itemRows = data.items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : C.surfaceLow};">
      <td style="padding:9px 14px;border:1px solid ${C.border};font-size:13px;color:${C.text};">${item.test_name}</td>
      <td style="padding:9px 14px;border:1px solid ${C.border};font-size:13px;text-align:right;font-weight:600;color:${C.text};">${fmtUGX(item.price)}</td>
    </tr>`).join('');

  const body = emailShell(
    `Payment receipt for ${data.order_number} — ${fmtUGX(data.amount_paid)} received.`,
    `
    ${emailHeader('🧾', 'Payment Receipt', `Receipt ${data.receipt_number} · ${new Date(data.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, logo)}
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Dear <strong>${data.patient_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.6;">Thank you for your payment. Please find your official receipt below. Keep this for your records.</p>
      <!-- Status badge -->
      <div style="text-align:center;margin-bottom:24px;">
        ${data.balance <= 0.01
          ? `<div style="display:inline-block;background:${C.successBg};border:2px solid ${C.success};border-radius:8px;padding:12px 24px;"><span style="font-size:20px;">✅</span><br/><span style="font-size:14px;font-weight:800;color:${C.success};letter-spacing:0.05em;text-transform:uppercase;">Fully Paid</span></div>`
          : `<div style="display:inline-block;background:${C.warningBg};border:2px solid #e0c060;border-radius:8px;padding:12px 24px;"><span style="font-size:20px;">💳</span><br/><span style="font-size:14px;font-weight:800;color:${C.warning};letter-spacing:0.05em;text-transform:uppercase;">Partial Payment</span></div>`
        }
      </div>
      <!-- Receipt details -->
      ${infoTable(
        infoRow('Receipt No.', `<strong style="font-family:monospace;">${data.receipt_number}</strong>`) +
        infoRow('Order No.', `<span style="font-family:monospace;color:${C.primary};font-weight:700;">${data.order_number}</span>`) +
        infoRow('Patient', data.patient_name) +
        infoRow('Date', new Date(data.payment_date).toLocaleString('en-GB')) +
        infoRow('Payment Method', `<span style="text-transform:capitalize;">${data.payment_method}</span>`) +
        infoRow('Cashier', data.cashier_name)
      )}
      <!-- Tests -->
      <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.muted};">Tests Ordered</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:${C.primary};">
            <th style="text-align:left;padding:9px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Test Description</th>
            <th style="text-align:right;padding:9px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Amount (UGX)</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
        <tr><td style="padding:8px 14px;font-size:13px;color:${C.muted};">Subtotal</td><td style="padding:8px 14px;text-align:right;font-size:13px;">${fmtUGX(data.total_amount)}</td></tr>
        ${data.discount_amount > 0 ? `<tr style="background:#fff8f0;"><td style="padding:8px 14px;font-size:13px;color:${C.warning};">Discount</td><td style="padding:8px 14px;text-align:right;font-size:13px;color:${C.warning};">− ${fmtUGX(data.discount_amount)}</td></tr>` : ''}
        <tr style="background:${C.surfaceLow};"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.06em;">Amount Paid</td><td style="padding:10px 14px;text-align:right;font-size:16px;font-weight:800;color:${C.success};">${fmtUGX(data.amount_paid)}</td></tr>
        ${data.balance > 0.01 ? `<tr style="background:${C.errorBg};"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:${C.error};text-transform:uppercase;letter-spacing:0.06em;">Balance Due</td><td style="padding:10px 14px;text-align:right;font-size:16px;font-weight:800;color:${C.error};">${fmtUGX(data.balance)}</td></tr>` : ''}
      </table>
      ${data.balance > 0.01 ? `<p style="margin:12px 0 0;font-size:12px;color:${C.warning};text-align:center;">Please settle the outstanding balance at your earliest convenience.</p>` : ''}
      <p style="margin:28px 0 0;font-size:14px;font-weight:700;color:${C.primary};text-align:center;font-style:italic;">"Thank you for choosing Noble Diagnostic Laboratory"</p>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Payment Receipt — ${data.patient_name} (${data.receipt_number})`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 3. WELCOME — NEW PATIENT REGISTRATION
// ──────────────────────────────────────────────────────────────────
export interface WelcomeEmailData {
  patient_name: string;
  patient_id: string;
  gender?: string;
  age?: number;
  phone?: string;
  registered_at: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData, toEmail: string): Promise<void> {
  const body = emailShell(
    `Welcome to Noble Diagnostic Laboratory, ${data.patient_name}! Your Patient ID is ${data.patient_id}.`,
    `
    ${emailHeader('👋', `Welcome, ${data.patient_name.split(' ')[0]}!`, 'You are now registered with Noble Diagnostic Laboratory')}
    <tr><td style="padding:32px 32px 20px;">
      <p style="margin:0 0 20px;font-size:15px;color:${C.text};line-height:1.6;">
        We're pleased to welcome you to <strong>Noble Diagnostic Laboratory</strong>. Your patient profile has been created and you are now part of our care system.
      </p>
      <!-- Patient ID highlight -->
      <div style="background:linear-gradient(135deg,${C.primary} 0%,#9b1b30 100%);border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.75);">Your Patient ID</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:4px;font-family:monospace;">${data.patient_id}</p>
        <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.65);">Keep this ID for all future visits</p>
      </div>
      <!-- Details -->
      ${infoTable(
        infoRow('Full Name', `<strong>${data.patient_name}</strong>`) +
        infoRow('Patient ID', `<span style="font-family:monospace;color:${C.primary};font-weight:700;">${data.patient_id}</span>`) +
        (data.gender ? infoRow('Gender', data.gender) : '') +
        (data.age ? infoRow('Age', `${data.age} years`) : '') +
        (data.phone ? infoRow('Phone', data.phone) : '') +
        infoRow('Registered', new Date(data.registered_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))
      )}
      <!-- What to expect -->
      <div style="background:${C.surfaceLow};border-radius:6px;padding:16px 20px;border:1px solid ${C.border};margin-bottom:24px;">
        <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.08em;">What to Expect</h3>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${[
            ['🔬', 'Accurate Results', 'State-of-the-art equipment and qualified professionals'],
            ['⚡', 'Fast Turnaround', 'Most results available within 24–48 hours'],
            ['📧', 'Digital Reports', 'Receive results and receipts directly in your email'],
            ['🔒', 'Confidential', 'Your health data is protected and never shared'],
          ].map(([icon, title, desc]) => `
          <tr>
            <td style="padding:6px 8px 6px 0;width:28px;font-size:18px;vertical-align:top;">${icon}</td>
            <td style="padding:6px 0;">
              <div style="font-size:13px;font-weight:700;color:${C.text};">${title}</div>
              <div style="font-size:12px;color:${C.muted};margin-top:1px;">${desc}</div>
            </td>
          </tr>`).join('')}
        </table>
      </div>
      <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.7;">
        Should you have any questions, please contact us at <a href="tel:+256706947101" style="color:${C.primary};font-weight:600;">+256 706947101</a> or visit us at <strong>Maina House, Plot 31A Kiwafu Road, Kitooro — Entebbe</strong>.
      </p>
      <p style="margin:20px 0 0;font-size:14px;font-weight:700;color:${C.primary};text-align:center;font-style:italic;">"Professionalism Is Part Of Us"</p>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Welcome to NDL Lab — Your Patient ID is ${data.patient_id}`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 4. ORDER CONFIRMATION
// ──────────────────────────────────────────────────────────────────
export interface OrderConfirmationData {
  patient_name: string;
  patient_ref: string;
  order_number: string;
  order_date: string;
  tests: Array<{ name: string; price: number }>;
  total_amount: number;
  referred_by?: string;
  specimen_type?: string;
  notes?: string;
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData, toEmail: string): Promise<void> {
  const testRows = data.tests.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : C.surfaceLow};">
      <td style="padding:9px 14px;border:1px solid ${C.border};font-size:13px;color:${C.text};">${t.name}</td>
      <td style="padding:9px 14px;border:1px solid ${C.border};font-size:13px;text-align:right;font-weight:600;color:${C.text};">${fmtUGX(t.price)}</td>
    </tr>`).join('');

  const body = emailShell(
    `Your test order ${data.order_number} has been created at Noble Diagnostic Laboratory.`,
    `
    ${emailHeader('📋', 'Order Confirmed', `Order ${data.order_number} · ${new Date(data.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`)}
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Dear <strong>${data.patient_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.6;">
        Your laboratory test order has been successfully created. Our team will process your samples and notify you when your results are ready.
      </p>
      <!-- Order number highlight -->
      <div style="border:2px dashed ${C.border};border-radius:8px;padding:16px 24px;margin-bottom:24px;text-align:center;background:${C.surfaceLow};">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${C.muted};">Order Number</p>
        <p style="margin:0;font-size:24px;font-weight:800;color:${C.primary};letter-spacing:3px;font-family:monospace;">${data.order_number}</p>
        <p style="margin:6px 0 0;font-size:11px;color:${C.dim};">Quote this number for any enquiries</p>
      </div>
      <!-- Order details -->
      ${infoTable(
        infoRow('Patient', `<strong>${data.patient_name}</strong>`) +
        infoRow('Patient ID', `<span style="font-family:monospace;">${data.patient_ref}</span>`) +
        infoRow('Order Date', new Date(data.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })) +
        (data.referred_by ? infoRow('Referred By', data.referred_by) : '') +
        (data.specimen_type ? infoRow('Specimen Type', data.specimen_type) : '') +
        (data.notes ? infoRow('Notes', `<em style="color:${C.muted};">${data.notes}</em>`) : '')
      )}
      <!-- Tests ordered -->
      <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${C.muted};">Tests Ordered (${data.tests.length})</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:${C.primary};">
            <th style="text-align:left;padding:9px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Test</th>
            <th style="text-align:right;padding:9px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Price (UGX)</th>
          </tr>
        </thead>
        <tbody>${testRows}</tbody>
        <tfoot>
          <tr style="background:${C.surfaceLow};">
            <td style="padding:10px 14px;font-size:14px;font-weight:800;color:${C.text};text-transform:uppercase;letter-spacing:0.06em;">Total</td>
            <td style="padding:10px 14px;text-align:right;font-size:18px;font-weight:800;color:${C.primary};">${fmtUGX(data.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
      <!-- Timeline -->
      <div style="background:${C.surfaceLow};border-radius:6px;padding:16px 20px;border:1px solid ${C.border};margin-bottom:8px;">
        <h3 style="margin:0 0 14px;font-size:13px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.08em;">What Happens Next</h3>
        ${[
          ['1', C.primary, '#fff', 'Sample Collection', 'Your specimens are collected and logged.'],
          ['2', C.surfaceLow, C.primary, 'Analysis', 'Samples are analysed in our certified laboratory.'],
          ['3', C.surfaceLow, C.primary, 'Results', 'You\'ll receive an email when results are ready.'],
        ].map(([num, bg, color, title, desc]) => `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
          <tr>
            <td style="width:28px;vertical-align:top;">
              <div style="width:24px;height:24px;border-radius:50%;background:${bg};color:${color};font-size:11px;font-weight:800;text-align:center;line-height:24px;border:2px solid ${C.border};">${num}</div>
            </td>
            <td style="padding-left:10px;">
              <div style="font-size:13px;font-weight:700;color:${C.text};">${title}</div>
              <div style="font-size:12px;color:${C.muted};margin-top:1px;">${desc}</div>
            </td>
          </tr>
        </table>`).join('')}
      </div>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Order Confirmed — ${data.order_number} (${data.tests.length} test${data.tests.length !== 1 ? 's' : ''})`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 5. RESULTS READY NOTIFICATION (brief alert)
// ──────────────────────────────────────────────────────────────────
export interface ResultsReadyData {
  patient_name: string;
  patient_ref: string;
  order_number: string;
  result_date: string;
  test_count: number;
  has_abnormal: boolean;
  has_critical: boolean;
}

export async function sendResultsReadyEmail(data: ResultsReadyData, toEmail: string): Promise<void> {
  const statusBlock = data.has_critical
    ? `<div style="background:${C.errorBg};border-left:4px solid ${C.error};border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:${C.error};">⚠️ Critical Values — Immediate Attention Required</p>
        <p style="margin:4px 0 0;font-size:13px;color:${C.error};opacity:0.85;">One or more results require urgent medical attention. Please contact your physician immediately.</p>
      </div>`
    : data.has_abnormal
    ? `<div style="background:${C.warningBg};border-left:4px solid #e0c060;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:${C.warning};">⚠ Some results are outside the normal range.</p>
        <p style="margin:4px 0 0;font-size:13px;color:${C.warning};opacity:0.85;">Please review with your doctor for clinical interpretation.</p>
      </div>`
    : `<div style="background:${C.successBg};border-left:4px solid ${C.success};border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:${C.success};">✓ All results are within the normal range.</p>
      </div>`;

  const body = emailShell(
    `Your lab results for order ${data.order_number} are now ready.`,
    `
    ${emailHeader('✅', 'Results Are Ready', `${data.test_count} test${data.test_count !== 1 ? 's' : ''} completed · ${new Date(data.result_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`)}
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Dear <strong>${data.patient_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.6;">
        Your laboratory test results for order <strong style="color:${C.primary};font-family:monospace;">${data.order_number}</strong> have been verified and are now available.
      </p>
      ${statusBlock}
      ${infoTable(
        infoRow('Patient', `<strong>${data.patient_name}</strong>`) +
        infoRow('Patient ID', `<span style="font-family:monospace;">${data.patient_ref}</span>`) +
        infoRow('Order No.', `<span style="font-family:monospace;color:${C.primary};font-weight:700;">${data.order_number}</span>`) +
        infoRow('Tests', `${data.test_count} test${data.test_count !== 1 ? 's' : ''}`) +
        infoRow('Reported', new Date(data.result_date).toLocaleString('en-GB'))
      )}
      <!-- CTA -->
      <div style="background:${C.surfaceLow};border-radius:8px;padding:20px;text-align:center;border:1px solid ${C.border};margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:13px;color:${C.muted};">Visit the lab or contact us to obtain your full printed report.</p>
        <p style="margin:0;font-size:16px;font-weight:800;color:${C.primary};">📞 +256 706947101</p>
        <p style="margin:4px 0 0;font-size:12px;color:${C.dim};">Maina House, Plot 31A Kiwafu Road, Kitooro — Entebbe</p>
      </div>
      <p style="margin:0;font-size:11px;color:${C.dim};line-height:1.6;font-style:italic;text-align:center;">
        A detailed report has also been sent separately. Clinical interpretation by a qualified physician is recommended.
      </p>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Results Ready — ${data.order_number} (${data.test_count} test${data.test_count !== 1 ? 's' : ''})`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 6. PASSWORD RESET OTP
// ──────────────────────────────────────────────────────────────────
export async function sendOTPEmail(toEmail: string, identifier: string, token: string, expiryMinutes = 30): Promise<void> {
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const digits = token.split('').map(d =>
    `<span style="display:inline-block;width:36px;height:48px;line-height:48px;text-align:center;font-size:26px;font-weight:900;color:${C.primary};background:#fff;border:2px solid ${C.border};border-radius:6px;margin:0 3px;font-family:monospace;">${d}</span>`
  ).join('');

  const body = emailShell(
    `Your NDL Lab password reset code is ${token}. Expires in ${expiryMinutes} minutes.`,
    `
    ${emailHeader('🔐', 'Password Reset Request', 'Secure verification code for Noble Diagnostic Laboratory')}
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Hello <strong>${identifier}</strong>,</p>
      <p style="margin:0 0 24px;font-size:13px;color:${C.muted};line-height:1.6;">
        We received a request to reset your password. Use the one-time code below to proceed. If you did not request this, you can safely ignore this email — your password will not change.
      </p>
      <!-- OTP display -->
      <div style="background:${C.surfaceLow};border:2px dashed ${C.border};border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:20px;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${C.muted};">Your Verification Code</p>
        <div style="margin-bottom:16px;">${digits}</div>
        <p style="margin:0;font-size:12px;color:${C.muted};">Enter this code in the app to reset your password</p>
      </div>
      <!-- Expiry warning -->
      <div style="background:${C.warningBg};border:1px solid #e0c060;border-radius:6px;padding:12px 16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${C.warning};">
          ⏱ This code expires in <strong>${expiryMinutes} minutes</strong> at ${expiresAt}
        </p>
      </div>
      <!-- Security notice -->
      <div style="background:${C.surfaceLow};border-radius:6px;padding:14px 18px;border-left:4px solid ${C.primary};">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${C.primary};">🔒 Security Notice</p>
        <ul style="margin:0;padding-left:16px;font-size:12px;color:${C.muted};line-height:1.8;">
          <li>Never share this code with anyone, including NDL Lab staff</li>
          <li>This code can only be used once</li>
          <li>If you didn't request this, your account may be at risk — contact us immediately</li>
        </ul>
      </div>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `NDL Lab — Your Password Reset Code: ${token}`,
    body,
  );
}

// ──────────────────────────────────────────────────────────────────
// 7. OUTSTANDING BALANCE REMINDER
// ──────────────────────────────────────────────────────────────────
export interface BalanceReminderData {
  patient_name: string;
  patient_ref: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  days_outstanding: number;
  tests: string[];
}

export async function sendBalanceReminderEmail(data: BalanceReminderData, toEmail: string): Promise<void> {
  const urgency = data.days_outstanding > 30
    ? { color: C.error, bg: C.errorBg, label: 'OVERDUE', icon: '🔴' }
    : data.days_outstanding > 14
    ? { color: C.warning, bg: C.warningBg, label: 'PAYMENT DUE', icon: '🟡' }
    : { color: C.blue, bg: C.blueBg, label: 'REMINDER', icon: '🔵' };

  const body = emailShell(
    `Friendly reminder: Outstanding balance of ${fmtUGX(data.balance)} for order ${data.order_number}.`,
    `
    ${emailHeader('💳', 'Outstanding Balance', `Order ${data.order_number} · ${data.days_outstanding} day${data.days_outstanding !== 1 ? 's' : ''} outstanding`)}
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 16px;font-size:15px;color:${C.text};">Dear <strong>${data.patient_name}</strong>,</p>
      <p style="margin:0 0 20px;font-size:13px;color:${C.muted};line-height:1.6;">
        We hope you are well. This is a friendly reminder that you have an outstanding balance on your laboratory account.
      </p>
      <!-- Balance highlight -->
      <div style="background:linear-gradient(135deg,${urgency.color} 0%,#9b1b30 100%);border-radius:8px;padding:24px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.75);">Outstanding Balance</p>
        <p style="margin:0;font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px;">${fmtUGX(data.balance)}</p>
        <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:20px;padding:4px 14px;margin-top:8px;">
          <span style="font-size:11px;font-weight:800;color:#fff;letter-spacing:0.1em;">${urgency.icon} ${urgency.label} — ${data.days_outstanding} days</span>
        </div>
      </div>
      <!-- Order summary -->
      ${infoTable(
        infoRow('Patient', `<strong>${data.patient_name}</strong>`) +
        infoRow('Patient ID', `<span style="font-family:monospace;">${data.patient_ref}</span>`) +
        infoRow('Order No.', `<span style="font-family:monospace;color:${C.primary};font-weight:700;">${data.order_number}</span>`) +
        infoRow('Order Date', new Date(data.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })) +
        infoRow('Tests', data.tests.slice(0, 3).join(', ') + (data.tests.length > 3 ? ` +${data.tests.length - 3} more` : ''))
      )}
      <!-- Payment breakdown -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.border};border-radius:6px;overflow:hidden;margin-bottom:20px;">
        <tr style="background:${C.surfaceLow};"><td style="padding:9px 14px;font-size:13px;color:${C.muted};">Total Billed</td><td style="padding:9px 14px;text-align:right;font-size:13px;font-weight:600;">${fmtUGX(data.total_amount)}</td></tr>
        <tr style="background:${C.successBg};"><td style="padding:9px 14px;font-size:13px;color:${C.success};">Amount Paid</td><td style="padding:9px 14px;text-align:right;font-size:13px;font-weight:600;color:${C.success};">− ${fmtUGX(data.amount_paid)}</td></tr>
        <tr style="background:${urgency.bg};"><td style="padding:12px 14px;font-size:14px;font-weight:800;color:${urgency.color};text-transform:uppercase;letter-spacing:0.06em;">Balance Due</td><td style="padding:12px 14px;text-align:right;font-size:20px;font-weight:900;color:${urgency.color};">${fmtUGX(data.balance)}</td></tr>
      </table>
      <!-- Payment instructions -->
      <div style="background:${C.surfaceLow};border-radius:6px;padding:16px 20px;border:1px solid ${C.border};margin-bottom:20px;">
        <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:0.08em;">How to Pay</h3>
        ${[
          ['💵', 'Cash', 'Visit us at Maina House, Plot 31A Kiwafu Road, Entebbe'],
          ['📱', 'Mobile Money', 'Contact us for our mobile money details: +256 706947101'],
          ['🏦', 'Bank Transfer', 'Contact us for bank account details'],
        ].map(([icon, method, detail]) => `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr>
            <td style="width:28px;font-size:18px;vertical-align:top;">${icon}</td>
            <td style="padding-left:8px;"><strong style="font-size:13px;color:${C.text};">${method}</strong><br/><span style="font-size:12px;color:${C.muted};">${detail}</span></td>
          </tr>
        </table>`).join('')}
      </div>
      <p style="margin:0;font-size:12px;color:${C.dim};line-height:1.6;">
        If you have already made this payment, please disregard this message. For any queries, contact us at <strong>+256 706947101</strong>. We value your continued trust in our services.
      </p>
    </td></tr>`
  );

  await sendEmailSmtp(
    toEmail,
    `Payment Reminder — ${fmtUGX(data.balance)} Outstanding (${data.order_number})`,
    body,
  );
}
