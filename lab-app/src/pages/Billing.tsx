import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, CheckCircle, AlertTriangle, CreditCard,
  Printer, ReceiptText, Mail,
} from 'lucide-react';
import { getBilling, addPayment, getReceiptData } from '../lib/api';
import { triggerPrint, autoPrintEnabled } from '../lib/print';
import { sendReceiptEmail, isEmailConfigured } from '../lib/email';
import type { OrderSummary, ReceiptData } from '../types';
import Modal from '../components/Modal';
import PrintReceipt from '../components/PrintReceipt';
import EZSelect from '../components/EZSelect';
import EZDatePicker from '../components/EZDatePicker';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { fmtUGX } from '../lib/currency';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const PAGE_SIZE = 10;

const PAY_FILTER_OPTIONS = [
  { value: 'all',     label: 'All Payments' },
  { value: 'paid',    label: 'Paid' },
  { value: 'unpaid',  label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
];

const PAY_METHOD_OPTIONS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'mobile_money',  label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'insurance',     label: 'Insurance' },
];

export default function Billing() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [payFilter, setPayFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getBilling(payFilter, dateFrom, dateTo)); }
    finally { setLoading(false); }
  }, [payFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [payFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  const totals = orders.reduce(
    (acc, o) => ({ total: acc.total + o.total_amount, paid: acc.paid + o.amount_paid, balance: acc.balance + o.balance }),
    { total: 0, paid: 0, balance: 0 }
  );

  const openPayModal = (order: OrderSummary) => {
    setSelectedOrder(order);
    setPayAmount(String(Math.round(order.balance)));
    setCashReceived('');
    setPayNotes('');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedOrder) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Enter a valid amount.', confirmButtonColor: '#f54927' });
      return;
    }
    setPaying(true);
    try {
      await addPayment({ order_id: selectedOrder.id, amount, payment_method: payMethod, notes: payNotes || undefined });
      setShowPayModal(false);
      await load();
      if (autoPrintEnabled()) {
        await handlePrintReceipt(selectedOrder.id);
      } else {
        Swal.fire({ icon: 'success', title: 'Payment Recorded', timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setPaying(false);
    }
  };

  const handleEmailReceipt = async (orderId: number) => {
    if (!isEmailConfigured()) {
      Swal.fire({ icon: 'warning', title: 'Email Not Configured', text: 'Go to Settings → Email to set up EmailJS first.', confirmButtonColor: '#f54927' });
      return;
    }
    const { value: toEmail } = await Swal.fire({
      title: 'Email Receipt',
      input: 'email',
      inputLabel: 'Patient email address',
      inputPlaceholder: 'patient@example.com',
      showCancelButton: true,
      confirmButtonColor: '#f54927',
      confirmButtonText: 'Send',
    });
    if (!toEmail) return;
    try {
      const data = await getReceiptData(orderId);
      await sendReceiptEmail(data, toEmail);
      Swal.fire({ icon: 'success', title: 'Receipt Sent', text: `Receipt emailed to ${toEmail}`, timer: 2500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed to Send', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handlePrintReceipt = async (orderId: number) => {
    try {
      const data = await getReceiptData(orderId);
      flushSync(() => setReceipt(data));
      triggerPrint();
      window.addEventListener('afterprint', () => setReceipt(null), { once: true });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  return (
    <div>
      {receipt && <div className="print-container"><PrintReceipt data={receipt} /></div>}

      <div className="no-print">
        <div className="page-header">
          <div>
            <h1>Billing</h1>
            <p>{orders.length} order(s) — Total: {fmtUGX(totals.total)} | Paid: {fmtUGX(totals.paid)} | Outstanding: {fmtUGX(totals.balance)}</p>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total Billed',      value: fmtUGX(totals.total),   colorClass: 'purple', Icon: ClipboardList },
            { label: 'Total Collected',   value: fmtUGX(totals.paid),    colorClass: 'green',  Icon: CheckCircle },
            { label: 'Outstanding Balance', value: fmtUGX(totals.balance), colorClass: 'red',  Icon: AlertTriangle },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className={`stat-icon ${c.colorClass}`}><c.Icon size={22} /></div>
              <div className="stat-data"><h3>{c.value}</h3><p>{c.label}</p></div>
            </div>
          ))}
        </div>

        <div className="filters-bar">
          <div style={{ width: 180 }}>
            <EZSelect value={payFilter} onChange={setPayFilter} options={PAY_FILTER_OPTIONS} searchable={false} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>From:</label>
            <div style={{ width: 150 }}>
              <EZDatePicker
                value={dateFrom}
                onChange={v => { setDateFrom(v); }}
                placeholder="Start date"
                className="form-control"
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>To:</label>
            <div style={{ width: 150 }}>
              <EZDatePicker
                value={dateTo}
                onChange={v => { setDateTo(v); }}
                placeholder="End date"
                className="form-control"
              />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</button>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <PageLoader label="Loading billing records..." />
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <ReceiptText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No billing records</h3>
              <p>No orders match the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Order No.</th><th>Patient</th><th>Date</th><th>Tests</th>
                      <th className="text-right">Total</th><th className="text-right">Paid</th>
                      <th className="text-right">Balance</th><th>Payment</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(o => (
                      <tr key={o.id}>
                        <td>
                          <span className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                            {o.order_number}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{o.patient_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.patient_ref}</div>
                        </td>
                        <td>{fmtDate(o.order_date)}</td>
                        <td className="text-center">{o.item_count}</td>
                        <td className="text-right font-bold">{fmtUGX(o.total_amount)}</td>
                        <td className="text-right" style={{ color: '#10b981' }}>{fmtUGX(o.amount_paid)}</td>
                        <td className="text-right" style={{ color: o.balance > 0 ? 'var(--danger-color)' : '#10b981', fontWeight: 600 }}>
                          {fmtUGX(o.balance)}
                        </td>
                        <td><span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {o.payment_status !== 'paid' && (
                              <button className="btn btn-primary btn-sm" onClick={() => openPayModal(o)}>
                                <CreditCard size={12} /> Pay
                              </button>
                            )}
                            {o.amount_paid > 0 && (
                              <>
                                <button className="btn btn-secondary btn-sm" onClick={() => handlePrintReceipt(o.id)}>
                                  <Printer size={12} /> Receipt
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleEmailReceipt(o.id)}>
                                  <Mail size={12} /> Email
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={orders.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Payment — ${selectedOrder?.order_number}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePay} disabled={paying}>
              {paying ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Processing...</> : 'Record Payment'}
            </button>
          </>
        }
      >
        {selectedOrder && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(245,73,39,0.06)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <div><strong>{selectedOrder.patient_name}</strong> ({selectedOrder.patient_ref})</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 16 }}>
              <span>Total: <strong>{fmtUGX(selectedOrder.total_amount)}</strong></span>
              <span>Balance: <strong style={{ color: 'var(--danger-color)' }}>{fmtUGX(selectedOrder.balance)}</strong></span>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Amount Paying <span className="required">*</span></label>
          <input className="form-control" type="number" min={1} step={1} placeholder="0"
            value={payAmount} onChange={e => { setPayAmount(e.target.value); setCashReceived(''); }} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <EZSelect value={payMethod} onChange={v => { setPayMethod(v); setCashReceived(''); }} options={PAY_METHOD_OPTIONS} searchable={false} />
        </div>
        {payMethod === 'cash' && (
          <div className="form-group">
            <label className="form-label">Cash Received</label>
            <input className="form-control" type="number" min={0} step={1} placeholder="Amount handed by patient"
              value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
            {(() => {
              const received = parseFloat(cashReceived);
              const paying = parseFloat(payAmount);
              if (!cashReceived || isNaN(received) || isNaN(paying)) return null;
              const change = received - paying;
              return (
                <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius)', background: change >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(200,41,9,0.08)', border: `1.5px solid ${change >= 0 ? '#10b981' : 'var(--danger-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: change >= 0 ? '#10b981' : 'var(--danger-color)' }}>
                    {change >= 0 ? 'Change to return:' : 'Insufficient cash:'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: change >= 0 ? '#10b981' : 'var(--danger-color)' }}>
                    {fmtUGX(Math.abs(change))}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <input className="form-control" placeholder="Notes..." value={payNotes} onChange={e => setPayNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
