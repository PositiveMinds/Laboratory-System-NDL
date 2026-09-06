import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { flushSync } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FlaskConical, Printer, CheckCheck, ExternalLink, Mail, TrendingUp, X, Search } from 'lucide-react';
import { getOrders, getOrder, updateResult, markResultsComplete, getResultsReport, getAutofillForTest, getResultHistory, getLogo, getLabInfo, getErrorMessage } from '../lib/api';
import { triggerPrint } from '../lib/print';
import { sendResultsEmail, isEmailConfigured } from '../lib/email';
import type { OrderSummary, OrderDetail, ResultsReportData, ResultHistory, LabInfo } from '../types';
import PrintResults from '../components/PrintResults';
import { useAssets } from '../contexts/AssetsContext';
import EZSelect from '../components/EZSelect';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const ORDER_PAGE_SIZE = 10;

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
  const [loadingOrders, setLoadingOrders] = useMinLoading(true);
  const [loadingDetail, setLoadingDetail] = useMinLoading(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<ResultsReportData | null>(null);
  const [labInfo, setLabInfo] = useState<LabInfo | null>(null);
  const { logo, setLogo } = useAssets();
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [trendModal, setTrendModal] = useState<{ testId: number; testName: string } | null>(null);
  const [trendData, setTrendData] = useState<ResultHistory[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try { setOrders(await getOrders('all', '')); }
    finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => { getLabInfo().then(setLabInfo).catch(() => {}); }, []);

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return orders;
    const q = orderSearch.toLowerCase();
    return orders.filter(o =>
      o.patient_name.toLowerCase().includes(q) ||
      o.order_number.toLowerCase().includes(q) ||
      o.patient_ref.toLowerCase().includes(q)
    );
  }, [orders, orderSearch]);

  const visibleCount = orderPage * ORDER_PAGE_SIZE;
  const paginatedOrders = useMemo(() => filteredOrders.slice(0, visibleCount), [filteredOrders, visibleCount]);
  const hasMore = visibleCount < filteredOrders.length;

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
      // Auto-fill unit and/or reference range independently for any item missing either field
      const needsFill = o.items.filter(item => !item.unit || !item.reference_range);
      if (needsFill.length > 0) {
        const fills = await Promise.all(
          needsFill.map(item => getAutofillForTest(item.test_id, o.patient_gender, o.patient_age))
        );
        fills.forEach((fill, i) => {
          if (fill) {
            const item = needsFill[i];
            init[item.id] = {
              ...init[item.id],
              unit: item.unit || fill.unit,
              reference_range: item.reference_range || fill.reference_range,
            };
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
          confirmButtonColor: '#78001d',
        });
      } else {
        Swal.fire({ icon: 'success', title: 'Results Saved', timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
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
      confirmButtonColor: '#78001d',
    });
    if (!result.isConfirmed) return;
    try {
      await handleSaveResults();
      await markResultsComplete(selectedOrder.id);
      await Promise.all([selectOrder(selectedOrder.id), loadOrders()]);
      Swal.fire({ icon: 'success', title: 'Order Completed', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    }
  };

  const handleEmailResults = async () => {
    if (!selectedOrder) return;
    if (!await isEmailConfigured()) {
      Swal.fire({ icon: 'warning', title: 'Email Not Configured', text: 'Go to Settings → Email to set up SMTP first.', confirmButtonColor: '#78001d' });
      return;
    }
    const { value: toEmail } = await Swal.fire({
      title: 'Email Results',
      input: 'email',
      inputLabel: 'Patient email address',
      inputPlaceholder: 'patient@example.com',
      inputValue: selectedOrder.patient_email || '',
      showCancelButton: true,
      confirmButtonColor: '#78001d',
      confirmButtonText: 'Send',
    });
    if (!toEmail) return;
    setSaving(true);
    try {
      const [data, freshLogo] = await Promise.all([getResultsReport(selectedOrder.id), getLogo().catch(() => null)]);
      if (!data.categories.length) {
        Swal.fire({ icon: 'warning', title: 'No Results', text: 'Save results first before emailing.', confirmButtonColor: '#78001d' });
        return;
      }
      await sendResultsEmail(data, toEmail, freshLogo);
      Swal.fire({ icon: 'success', title: 'Email Sent', text: `Results sent to ${toEmail}`, timer: 2500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed to Send', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
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
      const [data, freshLogo] = await Promise.all([getResultsReport(selectedOrder.id), getLogo().catch(() => null)]);
      if (freshLogo && freshLogo !== logo) setLogo(freshLogo);
      flushSync(() => setReportData(data));
      setTimeout(() => {
        triggerPrint();
        window.addEventListener('afterprint', () => setReportData(null), { once: true });
      }, 300);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
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
      {reportData && <div className="print-container"><PrintResults data={reportData} logo={logo} labInfo={labInfo} /></div>}

      <div className="no-print">
        <div className="page-header">
          <div><h1>Lab Results</h1><p>Enter and manage test results</p></div>
        </div>

        <div className="results-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'start' }}>
          {/* Order List */}
          <div className="card" style={{ padding: 0 }}>
            {/* Header + search */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--outline-variant)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>
                  Orders
                </span>
                <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                  {filteredOrders.length} of {orders.length}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: 28, fontSize: 12, height: 30 }}
                  placeholder="Search orders…"
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }}
                />
              </div>
            </div>

            {/* Order items */}
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {loadingOrders ? (
                <PageLoader label="Loading orders…" />
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p style={{ fontSize: 13 }}>{orderSearch ? 'No matching orders' : 'No orders found'}</p>
                </div>
              ) : (
                <>
                  {paginatedOrders.map(o => (
                    <div
                      key={o.id}
                      onClick={() => selectOrder(o.id)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                        background: selectedOrder?.id === o.id
                          ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                          : 'transparent',
                        transition: 'background 0.12s',
                        borderLeft: selectedOrder?.id === o.id ? '3px solid var(--primary)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => {
                        if (selectedOrder?.id !== o.id)
                          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-container-low)';
                      }}
                      onMouseLeave={e => {
                        if (selectedOrder?.id !== o.id)
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {o.order_number}
                        </span>
                        <span className={`badge badge-${o.status}`}>{o.status}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 2 }}>
                        {o.patient_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', display: 'flex', gap: 8 }}>
                        <span>{fmtDate(o.order_date)}</span>
                        <span>·</span>
                        <span>{o.item_count} test{o.item_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div style={{ padding: '12px 14px', textAlign: 'center', borderTop: '1px solid var(--outline-variant)' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                        onClick={() => setOrderPage(p => p + 1)}
                      >
                        Load More ({filteredOrders.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
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
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: 6, borderLeft: '4px solid var(--primary)', background: 'var(--surface-container-low)', padding: '6px 12px 6px 8px' }}>
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
