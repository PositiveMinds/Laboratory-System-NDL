import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Printer, CheckCheck, ExternalLink, Mail, TrendingUp, X } from 'lucide-react';
import { getOrders, getOrder, updateResult, markResultsComplete, getResultsReport, getAutofillForTest, getResultHistory } from '../lib/api';
import { triggerPrint } from '../lib/print';
import { sendResultsEmail, isEmailConfigured } from '../lib/email';
import type { OrderSummary, OrderDetail, ResultsReportData, ResultHistory } from '../types';
import PrintResults from '../components/PrintResults';
import EZSelect from '../components/EZSelect';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const ORDER_PAGE_SIZE = 15;

interface ResultEntry {
  result_value: string;
  unit: string;
  reference_range: string;
  flag: string;
}

const FLAG_OPTIONS = [
  { value: 'N', label: 'Normal' },
  { value: 'H', label: 'H ↑  High' },
  { value: 'L', label: 'L ↓  Low' },
  { value: 'C', label: 'Critical' },
];

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedOrderId = searchParams.get('order') ? Number(searchParams.get('order')) : null;

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [results, setResults] = useState<Record<number, ResultEntry>>({});
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<ResultsReportData | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [trendModal, setTrendModal] = useState<{ testId: number; testName: string } | null>(null);
  const [trendData, setTrendData] = useState<ResultHistory[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try { setOrders(await getOrders('all', '')); }
    finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDER_PAGE_SIZE;
    return orders.slice(start, start + ORDER_PAGE_SIZE);
  }, [orders, orderPage]);

  const selectOrder = useCallback(async (orderId: number) => {
    setLoadingDetail(true);
    try {
      const o = await getOrder(orderId);
      setSelectedOrder(o);
      const init: Record<number, ResultEntry> = {};
      for (const item of o.items) {
        init[item.id] = {
          result_value: item.result_value || '',
          unit: item.unit || '',
          reference_range: item.reference_range || '',
          flag: item.flag || 'N',
        };
      }
      // Auto-fill unit and reference range from reference ranges for items with no saved values
      const emptyItems = o.items.filter(item => !item.unit && !item.reference_range);
      if (emptyItems.length > 0) {
        const fills = await Promise.all(
          emptyItems.map(item => getAutofillForTest(item.test_id, o.patient_gender, o.patient_age))
        );
        fills.forEach((fill, i) => {
          if (fill) {
            const item = emptyItems[i];
            init[item.id] = { ...init[item.id], unit: fill.unit, reference_range: fill.reference_range };
          }
        });
      }
      setResults(init);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (preselectedOrderId) selectOrder(preselectedOrderId);
  }, [preselectedOrderId, selectOrder]);

  const updateEntry = (itemId: number, key: keyof ResultEntry, value: string) => {
    setResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], [key]: value } }));
  };

  const handleSaveResults = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      for (const item of selectedOrder.items) {
        const entry = results[item.id];
        if (entry?.result_value) {
          await updateResult({
            item_id: item.id,
            result_value: entry.result_value,
            unit: entry.unit || undefined,
            reference_range: entry.reference_range || undefined,
            flag: entry.flag || undefined,
          });
        }
      }
      await selectOrder(selectedOrder.id);
      // Alert for any critical values
      const criticals = selectedOrder.items.filter(i => results[i.id]?.flag === 'C' && results[i.id]?.result_value);
      if (criticals.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: `⚠ Critical Value${criticals.length > 1 ? 's' : ''} Detected`,
          html: criticals.map(i => `<strong>${i.test_name}</strong>: ${results[i.id].result_value} ${results[i.id].unit || ''}`).join('<br/>'),
          confirmButtonColor: '#f54927',
        });
      } else {
        Swal.fire({ icon: 'success', title: 'Results Saved', timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSaving(false);
    }
  };

  const handleShowTrend = async (testId: number, testName: string) => {
    if (!selectedOrder) return;
    setTrendModal({ testId, testName });
    setLoadingTrend(true);
    try {
      const history = await getResultHistory(selectedOrder.patient_id, testId);
      setTrendData(history);
    } finally {
      setLoadingTrend(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedOrder) return;
    const result = await Swal.fire({
      title: 'Mark as Completed?',
      text: 'This will change the order status to completed.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f54927',
    });
    if (!result.isConfirmed) return;
    try {
      await handleSaveResults();
      await markResultsComplete(selectedOrder.id);
      await Promise.all([selectOrder(selectedOrder.id), loadOrders()]);
      Swal.fire({ icon: 'success', title: 'Order Completed', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleEmailResults = async () => {
    if (!selectedOrder) return;
    if (!isEmailConfigured()) {
      Swal.fire({ icon: 'warning', title: 'Email Not Configured', text: 'Go to Settings → Email to set up EmailJS first.', confirmButtonColor: '#f54927' });
      return;
    }
    const { value: toEmail } = await Swal.fire({
      title: 'Email Results',
      input: 'email',
      inputLabel: 'Patient email address',
      inputPlaceholder: 'patient@example.com',
      showCancelButton: true,
      confirmButtonColor: '#f54927',
      confirmButtonText: 'Send',
    });
    if (!toEmail) return;
    setSaving(true);
    try {
      const data = await getResultsReport(selectedOrder.id);
      if (!data.categories.length) {
        Swal.fire({ icon: 'warning', title: 'No Results', text: 'Save results first before emailing.', confirmButtonColor: '#f54927' });
        return;
      }
      await sendResultsEmail(data, toEmail);
      Swal.fire({ icon: 'success', title: 'Email Sent', text: `Results sent to ${toEmail}`, timer: 2500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed to Send', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintResults = async () => {
    if (!selectedOrder) return;
    try {
      setSaving(true);
      for (const item of selectedOrder.items) {
        const entry = results[item.id];
        if (entry?.result_value) {
          await updateResult({
            item_id: item.id,
            result_value: entry.result_value,
            unit: entry.unit || undefined,
            reference_range: entry.reference_range || undefined,
            flag: entry.flag || undefined,
          });
        }
      }
      const data = await getResultsReport(selectedOrder.id);
      flushSync(() => setReportData(data));
      triggerPrint();
      window.addEventListener('afterprint', () => setReportData(null), { once: true });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSaving(false);
    }
  };

  const grouped = selectedOrder ? selectedOrder.items.reduce((acc, item) => {
    if (!acc[item.category_name]) acc[item.category_name] = [];
    acc[item.category_name].push(item);
    return acc;
  }, {} as Record<string, typeof selectedOrder.items>) : {};

  const completedCount = selectedOrder ? selectedOrder.items.filter(i => results[i.id]?.result_value).length : 0;
  const totalCount = selectedOrder?.items.length || 0;

  return (
    <div>
      {reportData && <div className="print-container"><PrintResults data={reportData} /></div>}

      <div className="no-print">
        <div className="page-header">
          <div><h1>Lab Results</h1><p>Enter and manage test results</p></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Order List */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 13 }}>
              Orders ({orders.length})
            </div>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {loadingOrders ? (
                <PageLoader label="Loading orders..." />
              ) : orders.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>No orders</p></div>
              ) : paginatedOrders.map(o => (
                <div
                  key={o.id}
                  onClick={() => selectOrder(o.id)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    background: selectedOrder?.id === o.id ? 'rgba(245,73,39,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-color)' }}>{o.order_number}</span>
                    <span className={`badge badge-${o.status}`} style={{ fontSize: 10 }}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.patient_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(o.order_date)} · {o.item_count} tests</div>
                </div>
              ))}
            </div>
            <Pagination total={orders.length} page={orderPage} pageSize={ORDER_PAGE_SIZE} onChange={setOrderPage} />
          </div>

          {/* Results Entry */}
          <div>
            {!selectedOrder ? (
              <div className="card">
                <div className="empty-state">
                  <FlaskConical size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <h3>Select an Order</h3>
                  <p>Click an order from the list to enter results.</p>
                </div>
              </div>
            ) : loadingDetail ? (
              <div className="card"><PageLoader label="Loading order..." /></div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {selectedOrder.order_number}
                      <span className={`badge badge-${selectedOrder.status}`}>{selectedOrder.status}</span>
                    </div>
                    <div className="card-subtitle">
                      {selectedOrder.patient_name} · {completedCount}/{totalCount} results entered
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleEmailResults} disabled={saving}>
                      <Mail size={13} /> Email Results
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handlePrintResults} disabled={saving}>
                      <Printer size={13} /> Print Report
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleMarkComplete} disabled={saving}>
                      <CheckCheck size={13} /> Mark Complete
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16, background: 'var(--border-color)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary-color)', width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%', transition: 'width 0.3s', borderRadius: 4 }} />
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 120px 28px', gap: 8, padding: '4px 0 8px', borderBottom: '2px solid var(--border-color)', marginBottom: 4 }}>
                  {['Test', 'Result', 'Unit', 'Ref. Range', 'Flag', ''].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.3 }}>{h}</span>
                  ))}
                </div>

                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: 0.5, marginBottom: 6, paddingBottom: 4, borderBottom: '2px solid rgba(245,73,39,0.2)' }}>
                      {cat}
                    </div>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr 120px 28px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.test_name}</div>
                          {item.has_result && <div style={{ fontSize: 10, color: '#10b981' }}>✓ Saved</div>}
                        </div>
                        <input className="form-control" style={{ padding: '5px 8px', fontSize: 13 }} placeholder="Value" value={results[item.id]?.result_value || ''} onChange={e => updateEntry(item.id, 'result_value', e.target.value)} />
                        <input className="form-control" style={{ padding: '5px 8px', fontSize: 13 }} placeholder="Unit" value={results[item.id]?.unit || ''} onChange={e => updateEntry(item.id, 'unit', e.target.value)} />
                        <input className="form-control" style={{ padding: '5px 8px', fontSize: 13 }} placeholder="e.g. 0–5" value={results[item.id]?.reference_range || ''} onChange={e => updateEntry(item.id, 'reference_range', e.target.value)} />
                        <EZSelect
                          value={results[item.id]?.flag || 'N'}
                          onChange={v => updateEntry(item.id, 'flag', v)}
                          options={FLAG_OPTIONS}
                          searchable={false}
                        />
                        <button
                          className="icon-btn"
                          title="Result History"
                          style={{ width: 24, height: 24 }}
                          onClick={() => handleShowTrend(item.test_id, item.test_name)}
                        >
                          <TrendingUp size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-secondary" onClick={() => navigate(`/orders/${selectedOrder.id}`)}>
                    <ExternalLink size={13} /> View Order
                  </button>
                  <button className="btn btn-primary" onClick={handleSaveResults} disabled={saving}>
                    {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : 'Save Results'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Trend Modal */}
      {trendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 560, maxWidth: '90vw', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: 15 }}>{trendModal.testName} — Result History</strong>
              <button className="icon-btn" onClick={() => { setTrendModal(null); setTrendData([]); }}><X size={16} /></button>
            </div>
            {loadingTrend ? (
              <PageLoader label="Loading history…" />
            ) : trendData.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><p>No prior results for this patient.</p></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData.map(d => ({ date: d.result_date.slice(0, 10), value: parseFloat(d.result_value) || 0, label: d.result_value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(_v: unknown, _n: unknown, p: { payload?: { label?: string } }) => [p?.payload?.label ?? '', 'Result']} />
                    <Line type="monotone" dataKey="value" stroke="var(--primary-color)" strokeWidth={2} dot={{ fill: 'var(--primary-color)', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
                <table className="data-table" style={{ marginTop: 12 }}>
                  <thead><tr><th>Date</th><th>Result</th><th>Order</th></tr></thead>
                  <tbody>
                    {trendData.map((d, i) => (
                      <tr key={i}>
                        <td>{new Date(d.result_date).toLocaleString()}</td>
                        <td><strong>{d.result_value}</strong></td>
                        <td><span className="font-mono" style={{ color: 'var(--primary-color)' }}>{d.order_number}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
