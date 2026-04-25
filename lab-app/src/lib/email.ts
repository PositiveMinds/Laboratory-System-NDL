import emailjs from '@emailjs/browser';
import type { ResultsReportData, ReceiptData } from '../types';
import { fmtUGX } from './currency';
import { sendEmailSmtp } from './api';

function getConfig() {
  return {
    serviceId:  localStorage.getItem('emailjs_service_id')  || '',
    publicKey:  localStorage.getItem('emailjs_public_key')  || '',
    resetTpl:   localStorage.getItem('emailjs_template_id') || '',
    resultsTpl: localStorage.getItem('emailjs_results_template_id') || '',
    receiptTpl: localStorage.getItem('emailjs_receipt_template_id') || '',
  };
}

export function isEmailConfigured(): boolean {
  const { serviceId, publicKey } = getConfig();
  return !!(serviceId && publicKey);
}

function buildResultsHtml(data: ResultsReportData): string {
  let html = '';
  for (const cat of data.categories) {
    html += `
      <h3 style="margin:16px 0 6px;color:#c82909;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">${cat.name}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Test</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Result</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Unit</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Ref. Range</th>
            <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Flag</th>
          </tr>
        </thead>
        <tbody>`;
    for (const item of cat.items) {
      const flagColor = item.flag === 'H' || item.flag === 'C' ? '#c82909' : item.flag === 'L' ? '#2563eb' : '#000';
      html += `
          <tr>
            <td style="padding:6px 8px;border:1px solid #ddd;">${item.test_name}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;font-weight:${item.flag && item.flag !== 'N' ? '700' : '400'};">${item.result_value || '—'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;">${item.unit || '—'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;">${item.reference_range || '—'}</td>
            <td style="padding:6px 8px;border:1px solid #ddd;color:${flagColor};font-weight:600;">${item.flag || '—'}</td>
          </tr>`;
    }
    html += `</tbody></table>`;
  }
  return html;
}

function buildReceiptHtml(data: ReceiptData): string {
  let rows = data.items.map(i =>
    `<tr><td style="padding:4px 8px;border:1px solid #eee;">${i.test_name}</td><td style="padding:4px 8px;border:1px solid #eee;text-align:right;">${fmtUGX(i.price)}</td></tr>`
  ).join('');
  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="text-align:left;padding:6px 8px;border:1px solid #ddd;">Test</th>
          <th style="text-align:right;padding:6px 8px;border:1px solid #ddd;">Price (UGX)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="font-size:13px;margin-top:4px;">
      <tr><td style="padding:2px 8px;font-weight:600;">Total:</td><td style="padding:2px 8px;">${fmtUGX(data.total_amount)}</td></tr>
      <tr><td style="padding:2px 8px;font-weight:600;">Paid:</td><td style="padding:2px 8px;">${fmtUGX(data.amount_paid)}</td></tr>
      <tr><td style="padding:2px 8px;font-weight:600;">Balance:</td><td style="padding:2px 8px;color:${data.balance > 0 ? '#c82909' : '#10b981'};">${fmtUGX(data.balance)}</td></tr>
    </table>`;
}

function buildFullResultsEmail(data: ResultsReportData): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#c82909;color:#fff;padding:16px 20px;border-radius:4px 4px 0 0;">
        <h2 style="margin:0;font-size:18px;">Noble Diagnostic Laboratory</h2>
        <p style="margin:4px 0 0;font-size:12px;">Lab Results Report</p>
      </div>
      <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 4px 4px;">
        <table style="width:100%;font-size:13px;margin-bottom:16px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;width:140px;color:#666;">Patient:</td><td style="font-weight:700;">${data.patient_name}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Patient ID:</td><td>${data.patient_ref}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Order No:</td><td>${data.order_number}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Result Date:</td><td>${new Date(data.result_date).toLocaleString()}</td></tr>
          ${data.referred_by ? `<tr><td style="padding:4px 0;color:#666;">Referred By:</td><td>${data.referred_by}</td></tr>` : ''}
        </table>
        ${buildResultsHtml(data)}
        <p style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">
          Noble Diagnostic Laboratory &nbsp;|&nbsp; Tel: +256 706947101 / +256 782087828
        </p>
      </div>
    </div>`;
}

function buildFullReceiptEmail(data: ReceiptData): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
      <div style="background:#c82909;color:#fff;padding:16px 20px;border-radius:4px 4px 0 0;">
        <h2 style="margin:0;font-size:18px;">Noble Diagnostic Laboratory</h2>
        <p style="margin:4px 0 0;font-size:12px;">Payment Receipt</p>
      </div>
      <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 4px 4px;">
        <table style="width:100%;font-size:13px;margin-bottom:16px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;width:140px;color:#666;">Receipt No:</td><td style="font-weight:700;">${data.receipt_number}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Patient:</td><td>${data.patient_name}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Order No:</td><td>${data.order_number}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Date:</td><td>${data.payment_date}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Method:</td><td>${data.payment_method}</td></tr>
        </table>
        ${buildReceiptHtml(data)}
        <p style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">
          Noble Diagnostic Laboratory &nbsp;|&nbsp; Tel: +256 706947101 / +256 782087828
        </p>
      </div>
    </div>`;
}

export async function sendResultsEmail(data: ResultsReportData, toEmail: string): Promise<void> {
  const cfg = getConfig();
  const ejConfigured = !!(cfg.serviceId && cfg.publicKey);

  if (ejConfigured) {
    const templateId = cfg.resultsTpl || cfg.resetTpl;
    if (templateId) {
      try {
        await emailjs.send(cfg.serviceId, templateId, {
          to_email:     toEmail,
          patient_name: data.patient_name,
          patient_ref:  data.patient_ref,
          order_number: data.order_number,
          result_date:  new Date(data.result_date).toLocaleString(),
          lab_name:     'Noble Diagnostic Laboratory',
          lab_phone:    '+256 706947101 / +256 782087828',
          results_html: buildResultsHtml(data),
        }, { publicKey: cfg.publicKey });
        return;
      } catch {
        // fall through to SMTP fallback
      }
    }
  }

  // SMTP fallback
  const subject = `Lab Results — ${data.patient_name} (${data.order_number})`;
  await sendEmailSmtp(toEmail, subject, buildFullResultsEmail(data));
}

export async function sendReceiptEmail(data: ReceiptData, toEmail: string): Promise<void> {
  const cfg = getConfig();
  const ejConfigured = !!(cfg.serviceId && cfg.publicKey);

  if (ejConfigured) {
    const templateId = cfg.receiptTpl || cfg.resetTpl;
    if (templateId) {
      try {
        await emailjs.send(cfg.serviceId, templateId, {
          to_email:      toEmail,
          patient_name:  data.patient_name,
          order_number:  data.order_number,
          payment_date:  data.payment_date,
          payment_method: data.payment_method,
          lab_name:      'Noble Diagnostic Laboratory',
          receipt_html:  buildReceiptHtml(data),
          total_amount:  fmtUGX(data.total_amount),
          amount_paid:   fmtUGX(data.amount_paid),
          balance:       fmtUGX(data.balance),
        }, { publicKey: cfg.publicKey });
        return;
      } catch {
        // fall through to SMTP fallback
      }
    }
  }

  // SMTP fallback
  const subject = `Payment Receipt — ${data.patient_name} (${data.order_number})`;
  await sendEmailSmtp(toEmail, subject, buildFullReceiptEmail(data));
}
