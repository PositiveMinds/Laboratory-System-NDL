import { useState, useEffect, useRef, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, Printer, FlaskConical, Trash2,
  ChevronDown, Loader2, PlusCircle, Check, ShieldCheck,
} from 'lucide-react';
import {
  getOrder, updateOrderStatus, deleteOrder, getReceiptData, addPayment,
  getOrderPayments, getResultsReport, getTests, addTestsToOrder, verifyOrder,
  setDiscount, getLogo, getLabInfo, getErrorMessage,
} from '../lib/api';
import { triggerPrint, autoPrintEnabled } from '../lib/print';
import type { OrderDetail as OD, Payment, ReceiptData, ResultsReportData, TestItem, LabInfo } from '../types';
import PrintReceipt from '../components/PrintReceipt';
import PrintResults from '../components/PrintResults';
import PrintLabel, { type LabelSize } from '../components/PrintLabel';
import Modal from '../components/Modal';
import EZSelect from '../components/EZSelect';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { useAssets } from '../contexts/AssetsContext';
import { fmtUGX } from '../lib/currency';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const fmtDateTime = (s: string) => new Date(s).toLocaleString();

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const PAY_METHOD_OPTIONS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'mobile_money',  label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'insurance',     label: 'Insurance' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logo, setLogo } = useAssets();
  const orderId = Number(id);

  const [order, setOrder] = useState<OD | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [reportData, setReportData] = useState<ResultsReportData | null>(null);
  const [showLabel, setShowLabel] = useState(false);
  const [labelCopies, setLabelCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [labInfo, setLabInfo] = useState<LabInfo | null>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Add tests modal
  const [showAddTestsModal, setShowAddTestsModal] = useState(false);
  const [allTests, setAllTests] = useState<TestItem[]>([]);
  const [selectedAddTests, setSelectedAddTests] = useState<Record<number, { price: number }>>({});
  const [addingTests, setAddingTests] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [o, pays, info] = await Promise.all([getOrder(orderId), getOrderPayments(orderId), getLabInfo().catch(() => null)]);
      setOrder(o);
      setPayments(pays);
      if (info) setLabInfo(info);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    const result = await Swal.fire({ title: 'Update Status', text: `Change order status to "${newStatus}"?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#78001d' });
    if (!result.isConfirmed) return;
    try {
      await updateOrderStatus(orderId, newStatus);
      await load();
      Swal.fire({ icon: 'success', title: 'Updated', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({ title: 'Delete Order?', text: 'This cannot be undone. All test items will also be deleted.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c82909', confirmButtonText: 'Delete' });
    if (!result.isConfirmed) return;
    try {
      await deleteOrder(orderId);
      navigate('/orders');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Enter a valid payment amount.', confirmButtonColor: '#78001d' });
      return;
    }
    setPaying(true);
    try {
      await addPayment({ order_id: orderId, amount, payment_method: payMethod, notes: payNotes || undefined });
      setShowPayModal(false);
      setPayAmount('');
      setPayNotes('');
      await load();
      if (autoPrintEnabled()) {
        await handlePrintReceipt();
      } else {
        Swal.fire({ icon: 'success', title: 'Payment Recorded', timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    } finally {
      setPaying(false);
    }
  };

  const handlePrintReceipt = async () => {
    try {
      const [data, freshLogo] = await Promise.all([getReceiptData(orderId), getLogo().catch(() => null)]);
      if (freshLogo && freshLogo !== logo) setLogo(freshLogo);
      flushSync(() => setReceipt(data));
      setTimeout(() => {
        triggerPrint();
        window.addEventListener('afterprint', () => setReceipt(null), { once: true });
      }, 300);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handleVerify = async () => {
    const result = await Swal.fire({ title: 'Verify Results?', text: 'This marks you as the verifying scientist for this order.', icon: 'question', showCancelButton: true, confirmButtonColor: '#78001d' });
    if (!result.isConfirmed) return;
    try {
      await verifyOrder(orderId);
      await load();
      Swal.fire({ icon: 'success', title: 'Verified', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handlePrintResults = async () => {
    try {
      const [data, freshLogo] = await Promise.all([getResultsReport(orderId), getLogo().catch(() => null)]);
      if (freshLogo && freshLogo !== logo) setLogo(freshLogo);
      flushSync(() => setReportData(data));
      setTimeout(() => {
        triggerPrint();
        window.addEventListener('afterprint', () => setReportData(null), { once: true });
      }, 300);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handleDiscount = async () => {
    if (!order) return;
    const { value: input } = await Swal.fire({
      title: 'Apply Discount',
      html: `<div style="text-align:left">
        <label style="font-size:12px;font-weight:600">Discount Amount (UGX)</label>
        <input id="disc-amount" class="swal2-input" type="number" min="0" max="${order.total_amount}" step="1000" placeholder="0" value="${order.discount_amount || 0}" style="margin:8px 0 0">
        <label style="font-size:12px;font-weight:600;display:block;margin-top:10px">Reason (optional)</label>
        <input id="disc-reason" class="swal2-input" placeholder="e.g. Staff discount" style="margin-top:4px">
      </div>`,
      showCancelButton: true,
      confirmButtonColor: '#78001d',
      confirmButtonText: 'Apply',
      preConfirm: () => {
        const amt = parseFloat((document.getElementById('disc-amount') as HTMLInputElement)?.value || '0');
        const reason = (document.getElementById('disc-reason') as HTMLInputElement)?.value || undefined;
        if (isNaN(amt) || amt < 0) { Swal.showValidationMessage('Enter a valid amount'); return false; }
        if (amt > order.total_amount) { Swal.showValidationMessage(`Discount cannot exceed total of ${fmtUGX(order.total_amount)}`); return false; }
        if (amt >= order.total_amount) { Swal.showValidationMessage('Discount cannot be equal to or exceed the full total'); return false; }
        return { amt, reason };
      },
    });
    if (!input) return;
    try {
      await setDiscount(order.id, input.amt, input.reason);
      await load();
      Swal.fire({ icon: 'success', title: 'Discount Applied', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const openAddTestsModal = async () => {
    const tests = await getTests();
    setAllTests(tests);
    setSelectedAddTests({});
    setShowAddTestsModal(true);
  };

  const toggleAddTest = (test: TestItem) => {
    setSelectedAddTests(prev => {
      if (prev[test.id]) { const next = { ...prev }; delete next[test.id]; return next; }
      return { ...prev, [test.id]: { price: test.price } };
    });
  };

  const handleAddTests = async () => {
    const items = Object.entries(selectedAddTests).map(([id, v]) => ({ test_id: Number(id), price: v.price }));
    if (items.length === 0) return;
    setAddingTests(true);
    try {
      const updated = await addTestsToOrder(orderId, items);
      setOrder(updated);
      setShowAddTestsModal(false);
      Swal.fire({ icon: 'success', title: `${items.length} test(s) added`, timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    } finally {
      setAddingTests(false);
    }
  };

  const addTestsTotal = useMemo(() =>
    Object.values(selectedAddTests).reduce((s, v) => s + v.price, 0),
    [selectedAddTests]
  );

  // Group allTests by category (excluding already ordered tests)
  const existingTestIds = useMemo(() => new Set(order?.items.map(i => i.test_id) || []), [order]);
  const groupedAvailable = useMemo(() => {
    return allTests.reduce((acc, t) => {
      if (existingTestIds.has(t.id)) return acc;
      if (!acc[t.category_name]) acc[t.category_name] = [];
      acc[t.category_name].push(t);
      return acc;
    }, {} as Record<string, TestItem[]>);
  }, [allTests, existingTestIds]);

  if (loading) return <div className="card" style={{ margin: 20 }}><PageLoader label="Loading order..." /></div>;
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const grouped: Record<string, typeof order.items> = {};
  for (const item of order.items) {
    if (!grouped[item.category_name]) grouped[item.category_name] = [];
    grouped[item.category_name].push(item);
  }

  return (
    <div>
      {receipt && <div className="print-container" ref={printRef}><PrintReceipt data={receipt} logo={logo} labInfo={labInfo} /></div>}
      {reportData && <div className="print-container"><PrintResults data={reportData} logo={logo} labInfo={labInfo} /></div>}
      {showLabel && order && (
        <div className="print-container">
          <PrintLabel orderNumber={order.order_number} patientName={order.patient_name} patientRef={order.patient_ref} orderDate={order.order_date} copies={labelCopies} size={labelSize} />
        </div>
      )}

      <div className="no-print">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}><ArrowLeft size={14} /> Back</button>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {order.order_number}
                <span className={`badge badge-${order.status}`}>{order.status}</span>
              </h1>
              <p>Patient: <strong>{order.patient_name}</strong> ({order.patient_ref})</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {order.payment_status !== 'paid' && (
              <button className="btn btn-primary btn-sm" onClick={() => { setPayAmount(String(Math.round(order.balance))); setCashReceived(''); setShowPayModal(true); }}>
                <CreditCard size={13} /> Add Payment
              </button>
            )}
            {order.amount_paid > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handlePrintReceipt}>
                <Printer size={13} /> Print Receipt
              </button>
            )}
            {order.items.some(i => i.has_result) && (
              <button className="btn btn-secondary btn-sm" onClick={handlePrintResults}>
                <FlaskConical size={13} /> Print Results
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/results?order=${orderId}`)}>
              <FlaskConical size={13} /> Enter Results
            </button>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              const { value: opts } = await Swal.fire({
                title: 'Print Label',
                html: `
                  <div style="text-align:left;display:grid;gap:14px">
                    <div>
                      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">Number of labels</label>
                      <input id="lbl-copies" type="number" min="1" max="50" value="1" class="swal2-input" style="margin:0;width:100%;box-sizing:border-box" />
                    </div>
                    <div>
                      <label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">Label size</label>
                      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
                        ${[
                          { val: 'small',  title: 'Small',  desc: '3 per row · tube labels' },
                          { val: 'medium', title: 'Medium', desc: '2 per row · standard' },
                          { val: 'large',  title: 'Large',  desc: '1 per row · vial labels' },
                        ].map(o => `
                          <label style="cursor:pointer;border:2px solid #e0bfbf;border-radius:6px;padding:8px;text-align:center;transition:.15s" id="lbl-opt-${o.val}">
                            <input type="radio" name="lbl-size" value="${o.val}" ${o.val === 'medium' ? 'checked' : ''} style="display:none" />
                            <div style="font-weight:700;font-size:13px">${o.title}</div>
                            <div style="font-size:10px;color:#584141;margin-top:2px">${o.desc}</div>
                          </label>`).join('')}
                      </div>
                    </div>
                  </div>`,
                showCancelButton: true,
                confirmButtonColor: '#78001d',
                confirmButtonText: 'Print',
                didOpen: () => {
                  const radios = document.querySelectorAll<HTMLInputElement>('input[name="lbl-size"]');
                  const highlight = () => radios.forEach(r => {
                    const lbl = document.getElementById(`lbl-opt-${r.value}`);
                    if (lbl) lbl.style.borderColor = r.checked ? '#78001d' : '#e0bfbf';
                  });
                  highlight();
                  radios.forEach(r => r.addEventListener('change', highlight));
                },
                preConfirm: () => {
                  const n = parseInt((document.getElementById('lbl-copies') as HTMLInputElement)?.value || '1');
                  const s = (document.querySelector<HTMLInputElement>('input[name="lbl-size"]:checked')?.value || 'medium') as LabelSize;
                  if (!n || n < 1) { Swal.showValidationMessage('Enter at least 1 label'); return false; }
                  return { copies: Math.min(n, 50), size: s };
                },
              });
              if (!opts) return;
              setLabelCopies(opts.copies);
              setLabelSize(opts.size);
              setShowLabel(true);
              setTimeout(() => {
                triggerPrint();
                window.addEventListener('afterprint', () => setShowLabel(false), { once: true });
              }, 300);
            }}>
              Print Label
            </button>
            {!order.verified_at && order.items.some(i => i.has_result) && (
              <button className="btn btn-secondary btn-sm" onClick={handleVerify} style={{ color: '#10b981', borderColor: '#10b981' }}>
                <ShieldCheck size={13} /> Verify
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={openAddTestsModal}>
              <PlusCircle size={13} /> Add Tests
            </button>
            {user?.role === 'admin' && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="order-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div className="card-title">Order Information</div>
                <div style={{ width: 180 }}>
                  <EZSelect
                    value={order.status}
                    onChange={handleStatusChange}
                    options={STATUS_OPTIONS}
                    searchable={false}
                  />
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item"><label>Order No.</label><span className="font-mono">{order.order_number}</span></div>
                <div className="detail-item"><label>Date</label><span>{fmtDate(order.order_date)}</span></div>
                <div className="detail-item"><label>Patient</label><span>{order.patient_name}</span></div>
                <div className="detail-item"><label>Patient ID</label><span className="font-mono">{order.patient_ref}</span></div>
                {order.patient_age && <div className="detail-item"><label>Age</label><span>{order.patient_age} yrs</span></div>}
                {order.patient_gender && <div className="detail-item"><label>Gender</label><span>{order.patient_gender}</span></div>}
                {order.patient_phone && <div className="detail-item"><label>Phone</label><span>{order.patient_phone}</span></div>}
                <div className="detail-item"><label>Ordered By</label><span>{order.ordered_by_name}</span></div>
                {order.referred_by && <div className="detail-item"><label>Referred By</label><span>{order.referred_by}</span></div>}
                {order.specimen_type && <div className="detail-item"><label>Specimen</label><span>{order.specimen_type}{order.specimen_id ? ` — ${order.specimen_id}` : ''}</span></div>}
                {order.collected_at && <div className="detail-item"><label>Collected</label><span>{new Date(order.collected_at).toLocaleString()}</span></div>}
                {order.verified_at && <div className="detail-item"><label>Verified By</label><span style={{ color: '#10b981', fontWeight: 600 }}>{order.verified_by_name} — {new Date(order.verified_at).toLocaleString()}</span></div>}
                {order.notes && <div className="detail-item" style={{ gridColumn: '1/-1' }}><label>Notes</label><span>{order.notes}</span></div>}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">Tests Ordered ({order.items.length})</div></div>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 6, letterSpacing: '0.05em', borderLeft: '4px solid var(--primary)', paddingLeft: 8, background: 'var(--surface-container-low)', padding: '5px 10px 5px 8px' }}>{cat}</div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Test</th><th className="text-right">Price</th><th>Result</th><th>Flag</th><th>Reported</th></tr></thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id}>
                            <td>{item.test_name}</td>
                            <td className="text-right">{fmtUGX(item.price)}</td>
                            <td>
                              {item.result_value
                                ? <span style={{ fontWeight: 600 }}>{item.result_value} {item.unit && <span className="text-muted" style={{ fontSize: 11 }}>{item.unit}</span>}</span>
                                : <span className="text-muted">Pending</span>}
                              {item.reference_range && <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Ref: {item.reference_range}</div>}
                            </td>
                            <td>{item.flag && <span className={`badge ${item.flag === 'H' ? 'badge-cancelled' : item.flag === 'L' ? 'badge-processing' : 'badge-completed'}`}>{item.flag}</span>}</td>
                            <td style={{ fontSize: 11 }}>{item.result_date ? fmtDateTime(item.result_date) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {payments.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">Payment History</div></div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Receipt No.</th><th>Date</th><th>Method</th><th>Cashier</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {payments.map(pay => (
                        <tr key={pay.id}>
                          <td className="font-mono">{pay.receipt_number}</td>
                          <td>{fmtDateTime(pay.payment_date)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{pay.payment_method}</td>
                          <td>{pay.processed_by_name}</td>
                          <td className="text-right font-bold" style={{ color: 'var(--success)' }}>{fmtUGX(pay.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="order-summary-panel">
            <h4>Billing Summary</h4>
            <div className="summary-item"><span>Subtotal</span><span className="price">{fmtUGX(order.total_amount)}</span></div>
            {order.discount_amount > 0 && (
              <>
                <div className="summary-item">
                  <span style={{ color: 'var(--warning-color)' }}>Discount</span>
                  <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>− {fmtUGX(order.discount_amount)}</span>
                </div>
                <div className="summary-item" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>Net Total</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmtUGX(order.total_amount - order.discount_amount)}</span>
                </div>
              </>
            )}
            <div className="summary-item"><span>Amount Paid</span><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtUGX(order.amount_paid)}</span></div>
            <div className="summary-total" style={{ color: order.balance > 0 ? 'var(--error)' : 'var(--success)' }}>
              <span>Balance Due</span><span>{fmtUGX(order.balance)}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className={`badge badge-${order.payment_status}`} style={{ fontSize: 13, padding: '4px 14px' }}>
                {order.payment_status === 'paid' ? 'Fully Paid' : order.payment_status === 'partial' ? 'Partially Paid' : 'Unpaid'}
              </span>
            </div>
            {order.payment_status !== 'paid' && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => { setPayAmount(String(Math.round(order.balance))); setCashReceived(''); setShowPayModal(true); }}>
                <CreditCard size={14} /> Add Payment
              </button>
            )}
            {order.amount_paid > 0 && (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handlePrintReceipt}>
                <Printer size={14} /> Print Receipt
              </button>
            )}
            {user?.role === 'admin' && (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleDiscount}>
                Apply Discount
              </button>
            )}
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={openAddTestsModal}>
              <PlusCircle size={14} /> Add More Tests
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Add Payment"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddPayment} disabled={paying}>
            {paying ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Processing...</> : 'Record Payment'}
          </button>
        </>}
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(245,73,39,0.06)', borderRadius: 'var(--radius)', fontSize: 13 }}>
          Balance due: <strong style={{ color: 'var(--danger-color)' }}>{fmtUGX(order.balance)}</strong>
        </div>
        <div className="form-group">
          <label className="form-label">Amount Paying <span className="required">*</span></label>
          <input className="form-control" type="number" min={1} step={1} placeholder="0" value={payAmount} onChange={e => { setPayAmount(e.target.value); setCashReceived(''); }} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <EZSelect value={payMethod} onChange={v => { setPayMethod(v); setCashReceived(''); }} options={PAY_METHOD_OPTIONS} searchable={false} />
        </div>
        {payMethod === 'cash' && (
          <div className="form-group">
            <label className="form-label">Cash Received</label>
            <input className="form-control" type="number" min={0} step={1} placeholder="Amount handed by patient" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
            {(() => {
              const received = parseFloat(cashReceived);
              const paying = parseFloat(payAmount);
              if (!cashReceived || isNaN(received) || isNaN(paying)) return null;
              const change = received - paying;
              return (
                <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius)', background: change >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(200,41,9,0.08)', border: `1.5px solid ${change >= 0 ? '#10b981' : 'var(--danger-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: change >= 0 ? '#10b981' : 'var(--danger-color)' }}>{change >= 0 ? 'Change to return:' : 'Insufficient cash:'}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: change >= 0 ? '#10b981' : 'var(--danger-color)' }}>{fmtUGX(Math.abs(change))}</span>
                </div>
              );
            })()}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <input className="form-control" placeholder="Payment notes..." value={payNotes} onChange={e => setPayNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Add Tests Modal */}
      <Modal
        open={showAddTestsModal}
        onClose={() => setShowAddTestsModal(false)}
        title="Add More Tests"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowAddTestsModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddTests} disabled={addingTests || Object.keys(selectedAddTests).length === 0}>
            {addingTests ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Adding...</> : `Add ${Object.keys(selectedAddTests).length} Test(s) — ${fmtUGX(addTestsTotal)}`}
          </button>
        </>}
      >
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {Object.keys(groupedAvailable).length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>All available tests are already in this order.</div>
          ) : Object.entries(groupedAvailable).map(([cat, tests]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: 0.5, marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border-color)' }}>{cat}</div>
              {tests.map(test => (
                <div key={test.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => toggleAddTest(test)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid', borderColor: selectedAddTests[test.id] ? 'var(--primary-color)' : 'var(--border-color)', background: selectedAddTests[test.id] ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selectedAddTests[test.id] && <Check size={11} style={{ color: '#fff' }} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{test.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedAddTests[test.id] && (
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: 90, padding: '3px 8px', fontSize: 12 }}
                        value={selectedAddTests[test.id].price}
                        min={0}
                        step={1}
                        onChange={e => {
                          e.stopPropagation();
                          setSelectedAddTests(prev => ({ ...prev, [test.id]: { price: Number(e.target.value) || 0 } }));
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80, textAlign: 'right' }}>{fmtUGX(test.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
