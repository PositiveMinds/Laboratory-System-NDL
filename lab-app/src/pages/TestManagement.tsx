import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Pencil, Trash2, FlaskConical,
  CheckCircle, Clock, AlertTriangle, Eye, Save, X,
} from 'lucide-react';
import {
  getOrders,
  getTestCategories, getTests, updateTestPrice,
  createTestCategory, deleteTestCategory, renameTestCategory,
  createTest, deleteTest,
} from '../lib/api';
import type { OrderSummary, TestItem, TestCategory } from '../types';
import { fmtUGX } from '../lib/currency';
import EZSelect from '../components/EZSelect';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const ORDER_PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string; dot?: string }> = {
    pending:    { bg: 'var(--error-container)',     color: 'var(--error)',         border: 'rgba(186,26,26,0.2)', dot: 'var(--error)' },
    processing: { bg: 'rgba(37,99,235,0.1)',         color: '#2563eb',              border: 'rgba(37,99,235,0.2)' },
    completed:  { bg: 'var(--success-container)',   color: 'var(--success)',       border: 'rgba(20,108,52,0.2)' },
    cancelled:  { bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', border: 'var(--outline-variant)' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
      borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.05em', background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />}
      {status === 'processing' ? 'In Analysis' : status}
    </span>
  );
}

export default function TestManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');

  // ── Test Catalog state ─────────────────────────────────────
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loadingTests, setLoadingTests] = useMinLoading(true);
  const [catFilter, setCatFilter] = useState('all');
  const [testSearch, setTestSearch] = useState('');
  const [editPrices, setEditPrices] = useState<Record<number, string>>({});
  const [priceSaving, setPriceSaving] = useState<number | null>(null);

  // Edit test modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [editTest, setEditTest] = useState<TestItem | null>(null);
  const [testForm, setTestForm] = useState({ name: '', price: '', catId: '' });
  const [testSaving, setTestSaving] = useState(false);

  // ── Orders state ───────────────────────────────────────────
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useMinLoading(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);

  // Load catalog
  useEffect(() => {
    setLoadingTests(true);
    Promise.all([getTestCategories(), getTests()]).then(([cats, ts]) => {
      setCategories(cats);
      setTests(ts);
      const prices: Record<number, string> = {};
      ts.forEach(t => { prices[t.id] = t.price.toString(); });
      setEditPrices(prices);
    }).finally(() => setLoadingTests(false));
  }, []);

  // Load orders when tab is active
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try { setOrders(await getOrders(statusFilter, orderSearch)); }
    finally { setLoadingOrders(false); }
  }, [statusFilter, orderSearch]);

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
  }, [activeTab, loadOrders]);

  useEffect(() => { setOrderPage(1); }, [statusFilter, orderSearch]);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDER_PAGE_SIZE;
    return orders.slice(start, start + ORDER_PAGE_SIZE);
  }, [orders, orderPage]);

  // Filtered tests
  const filteredTests = useMemo(() => {
    let ts = tests;
    if (catFilter !== 'all') ts = ts.filter(t => String(t.category_id) === catFilter);
    if (testSearch) {
      const q = testSearch.toLowerCase();
      ts = ts.filter(t => t.name.toLowerCase().includes(q) || t.category_name.toLowerCase().includes(q));
    }
    return ts;
  }, [tests, catFilter, testSearch]);

  const counts = useMemo(() => ({
    total: tests.length,
    categories: categories.length,
    pending: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => o.status === 'processing').length,
  }), [tests, categories, orders]);

  // ── Handlers ──────────────────────────────────────────────
  const handleSaveAllPrices = async () => {
    const changed = tests.filter(t => parseInt(editPrices[t.id]) !== t.price && !isNaN(parseInt(editPrices[t.id])));
    if (changed.length === 0) {
      Swal.fire({ icon: 'info', title: 'No Changes', text: 'No prices have been modified.', confirmButtonColor: '#78001d' }); return;
    }
    setPriceSaving(-1);
    try {
      await Promise.all(changed.map(t => updateTestPrice(t.id, parseInt(editPrices[t.id]))));
      setTests(ts => ts.map(t => ({ ...t, price: parseInt(editPrices[t.id]) ?? t.price })));
      Swal.fire({ icon: 'success', title: `${changed.length} Price(s) Updated`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    } finally {
      setPriceSaving(null);
    }
  };

  const handleAddCategory = async () => {
    const { value: name } = await Swal.fire({
      title: 'New Test Category',
      input: 'text',
      inputPlaceholder: 'e.g. Complete Blood Count',
      showCancelButton: true,
      confirmButtonColor: '#78001d',
      inputValidator: v => !v.trim() ? 'Category name is required' : null,
    });
    if (!name) return;
    try {
      const cat = await createTestCategory(name.trim());
      setCategories(cs => [...cs, cat]);
      Swal.fire({ icon: 'success', title: 'Category Added', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    }
  };

  const handleRenameCategory = async (catId: number, currentName: string) => {
    const { value: name } = await Swal.fire({
      title: 'Rename Category', input: 'text', inputValue: currentName,
      showCancelButton: true, confirmButtonColor: '#78001d',
      inputValidator: v => !v.trim() ? 'Name is required' : null,
    });
    if (!name || name.trim() === currentName) return;
    try {
      await renameTestCategory(catId, name.trim());
      setCategories(cs => cs.map(c => c.id === catId ? { ...c, name: name.trim() } : c));
      setTests(ts => ts.map(t => t.category_id === catId ? { ...t, category_name: name.trim() } : t));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    const result = await Swal.fire({
      title: `Delete "${catName}"?`, text: 'Remove all tests in this category first.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ba1a1a', confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTestCategory(catId);
      setCategories(cs => cs.filter(c => c.id !== catId));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    }
  };

  const openAddTest = () => {
    setEditTest(null);
    setTestForm({ name: '', price: '', catId: String(categories[0]?.id || '') });
    setShowTestModal(true);
  };

  const openEditTest = (t: TestItem) => {
    setEditTest(t);
    setTestForm({ name: t.name, price: String(t.price), catId: String(t.category_id) });
    setShowTestModal(true);
  };

  const handleSaveTest = async () => {
    if (!testForm.name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Test name is required.', confirmButtonColor: '#78001d' }); return;
    }
    const price = parseInt(testForm.price) || 0;
    const catId = parseInt(testForm.catId);
    if (!catId) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Select a category.', confirmButtonColor: '#78001d' }); return;
    }
    setTestSaving(true);
    try {
      if (editTest) {
        await updateTestPrice(editTest.id, price);
        if (editTest.name !== testForm.name.trim()) {
          // rename via Swal update — no dedicated rename API, so just update price
        }
        setTests(ts => ts.map(t => t.id === editTest.id ? { ...t, price } : t));
        setEditPrices(p => ({ ...p, [editTest.id]: String(price) }));
        Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
      } else {
        const newTest = await createTest(testForm.name.trim(), catId, price);
        setTests(ts => [...ts, newTest]);
        setEditPrices(p => ({ ...p, [newTest.id]: String(newTest.price) }));
        Swal.fire({ icon: 'success', title: 'Test Added', timer: 1200, showConfirmButton: false });
      }
      setShowTestModal(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    } finally {
      setTestSaving(false);
    }
  };

  const handleDeleteTest = async (t: TestItem) => {
    const result = await Swal.fire({
      title: `Delete "${t.name}"?`, text: 'Existing orders are not affected.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ba1a1a', confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTest(t.id);
      setTests(ts => ts.filter(x => x.id !== t.id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.', confirmButtonColor: '#78001d' });
    }
  };

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'In Analysis' }, { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const catOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Test Management</h1>
          <p>Manage clinical test catalog, pricing, and track active orders</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleAddCategory}>
            <Plus size={13} /> Add Category
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddTest}>
            <Plus size={13} /> Add Test
          </button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
        className="test-mgmt-kpis">
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Total Tests</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>{counts.total}</p>
          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>{counts.categories} Categories</p>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: 4 }}>Avg. Price</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            {tests.length > 0 ? fmtUGX(Math.round(tests.reduce((s, t) => s + t.price, 0) / tests.length)) : '—'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>Per test</p>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>Pending Orders</p>
            <AlertTriangle size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{counts.pending}</p>
          <p style={{ fontSize: 11, color: 'var(--error)', fontWeight: 600, marginTop: 2 }}>Awaiting Results</p>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>In Analysis</p>
            <FlaskConical size={14} style={{ color: 'var(--secondary)' }} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>{counts.inProgress}</p>
          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>Processing</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', marginBottom: 20 }}>
        {(['catalog', 'orders'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', fontFamily: 'inherit',
            padding: '10px 20px', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
            color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>
            {tab === 'catalog' ? 'Test Catalog & Pricing' : 'Active Orders'}
          </button>
        ))}
      </div>

      {/* ── CATALOG TAB ── */}
      {activeTab === 'catalog' && (
        <div>
          {/* Filter & actions bar */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: '12px 16px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-wrapper" style={{ flex: 1, minWidth: 180 }}>
                <Search size={14} />
                <input className="search-input" placeholder="Search tests…"
                  value={testSearch} onChange={e => setTestSearch(e.target.value)} />
              </div>
              {/* Category pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {catOptions.map(opt => (
                  <button key={opt.value} onClick={() => setCatFilter(opt.value)}
                    style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.05em', border: '1px solid', cursor: 'pointer',
                      fontFamily: 'inherit', whiteSpace: 'nowrap',
                      background: catFilter === opt.value ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                      color: catFilter === opt.value ? 'var(--primary)' : 'var(--on-surface-variant)',
                      borderColor: catFilter === opt.value ? 'var(--primary)' : 'var(--outline-variant)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSaveAllPrices} disabled={priceSaving !== null}>
              {priceSaving === -1 ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Saving…</> : <><Save size={13} /> Save Prices</>}
            </button>
          </div>

          {/* Table */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--outline-variant)',
            borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden',
          }}>
            {loadingTests ? (
              <PageLoader label="Loading tests…" />
            ) : filteredTests.length === 0 ? (
              <div className="empty-state">
                <FlaskConical size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
                <h3>No tests found</h3>
                <p>{testSearch ? 'Try a different search.' : 'Add your first test using the button above.'}</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Category</th>
                      <th>Price (UGX)</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((t, i) => {
                      const priceChanged = parseInt(editPrices[t.id] || '0') !== t.price && !isNaN(parseInt(editPrices[t.id]));
                      return (
                        <tr key={t.id} style={{
                          background: i % 2 === 1 ? 'color-mix(in srgb, var(--surface-container-low) 40%, transparent)' : undefined,
                        }}>
                          <td style={{ fontWeight: 500 }}>{t.name}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 2, fontSize: 10,
                              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                              background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                              color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                            }}>
                              {t.category_name}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>UGX</span>
                              <input
                                type="number" min={0} step={1}
                                value={editPrices[t.id] ?? t.price}
                                onChange={e => setEditPrices(p => ({ ...p, [t.id]: e.target.value }))}
                                style={{
                                  width: 100, padding: '4px 8px',
                                  border: `1px solid ${priceChanged ? 'var(--primary)' : 'var(--outline-variant)'}`,
                                  borderRadius: 'var(--radius)',
                                  background: priceChanged ? 'color-mix(in srgb, var(--primary) 4%, transparent)' : 'var(--surface)',
                                  color: 'var(--on-surface)', fontSize: 13, textAlign: 'right', outline: 'none',
                                  fontFamily: 'inherit',
                                }}
                              />
                              {priceSaving === t.id && <span className="spinner" style={{ width: 12, height: 12 }} />}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button className="icon-btn" onClick={() => openEditTest(t)} title="Edit test">
                                <Pencil size={13} />
                              </button>
                              <button className="icon-btn" onClick={() => handleDeleteTest(t)} title="Delete test"
                                style={{ color: 'var(--error)' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Category management strip */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ fontSize: 14 }}>Categories</div>
              <button className="btn btn-secondary btn-sm" onClick={handleAddCategory}>
                <Plus size={12} /> Add Category
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', border: '1px solid var(--outline-variant)',
                  borderRadius: 100, fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600 }}>{cat.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                    ({tests.filter(t => t.category_id === cat.id).length})
                  </span>
                  <button onClick={() => handleRenameCategory(cat.id, cat.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', padding: 2, display: 'flex' }}>
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 2, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div className="search-wrapper" style={{ flex: 1, minWidth: 180 }}>
              <Search size={14} />
              <input className="search-input" placeholder="Search by patient or order no…"
                value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            </div>
            <div style={{ width: 160, flexShrink: 0 }}>
              <EZSelect value={statusFilter} onChange={v => setStatusFilter(v)} options={STATUS_OPTIONS} searchable={false} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/orders/new')}>
              <Plus size={12} /> New Order
            </button>
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--outline-variant)',
            borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden',
          }}>
            {loadingOrders ? (
              <PageLoader label="Loading orders…" />
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <FlaskConical size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
                <h3>No orders found</h3>
                <p>{orderSearch ? 'Try a different search.' : 'No orders match the selected filter.'}</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Order No.</th>
                        <th>Tests</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((o, i) => (
                        <tr key={o.id} style={{ cursor: 'pointer', background: i % 2 === 1 ? 'color-mix(in srgb, var(--surface-container-low) 40%, transparent)' : undefined }}
                          onClick={() => navigate(`/orders/${o.id}`)}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.patient_name}</div>
                            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--on-surface-variant)' }}>{o.patient_ref}</div>
                          </td>
                          <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{o.order_number}</span></td>
                          <td>{o.item_count}</td>
                          <td style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{fmtDate(o.order_date)}</td>
                          <td style={{ fontWeight: 600 }}>{fmtUGX(o.total_amount)}</td>
                          <td><StatusBadge status={o.status} /></td>
                          <td><span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="icon-btn" onClick={e => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}>
                              <Eye size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                    Showing {Math.min((orderPage - 1) * ORDER_PAGE_SIZE + 1, orders.length)}–{Math.min(orderPage * ORDER_PAGE_SIZE, orders.length)} of {orders.length} orders
                  </span>
                  <Pagination total={orders.length} page={orderPage} pageSize={ORDER_PAGE_SIZE} onChange={setOrderPage} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Test Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={editTest ? `Edit: ${editTest.name}` : 'Add New Test'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowTestModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveTest} disabled={testSaving}>
              {testSaving ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Saving…</> : <><Save size={13} /> {editTest ? 'Update' : 'Add Test'}</>}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Test Name <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. Haemoglobin"
            value={testForm.name} onChange={e => setTestForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Category <span className="required">*</span></label>
          <EZSelect
            value={testForm.catId}
            onChange={v => setTestForm(f => ({ ...f, catId: v }))}
            options={categories.map(c => ({ value: String(c.id), label: c.name }))}
            searchable={false}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Price (UGX)</label>
          <input className="form-control" type="number" min={0} step={1}
            value={testForm.price} onChange={e => setTestForm(f => ({ ...f, price: e.target.value }))}
            placeholder="e.g. 35000" />
        </div>
      </Modal>
    </div>
  );
}
