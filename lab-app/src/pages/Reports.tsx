import { useState } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, BarChart2, DollarSign, FlaskConical, TrendingUp } from 'lucide-react';
import {
  getPendingResultsReport, getWorkloadReport, getFinancialReport,
  getTATReport, getCriticalValuesReport,
} from '../lib/api';
import type { PendingOrder, WorkloadStat, FinancialStat, TATItem, CriticalItem } from '../types';
import PageLoader from '../components/PageLoader';
import Pagination from '../components/Pagination';
import EZSelect from '../components/EZSelect';
import EZDatePicker from '../components/EZDatePicker';
import { fmtUGX } from '../lib/currency';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const RPT_PAGE_SIZE = 10;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type Tab = 'pending' | 'workload' | 'financial' | 'tat' | 'critical';

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'pending',   label: 'Pending Results', Icon: FlaskConical },
  { id: 'workload',  label: 'Workload',         Icon: BarChart2   },
  { id: 'financial', label: 'Financial',        Icon: DollarSign  },
  { id: 'tat',       label: 'Turnaround',       Icon: Clock       },
  { id: 'critical',  label: 'Critical Values',  Icon: AlertTriangle },
];

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useMinLoading(false);
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo] = useState(today);
  const [period, setPeriod] = useState('day');

  const [pendingData, setPendingData] = useState<PendingOrder[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadStat[]>([]);
  const [financialData, setFinancialData] = useState<FinancialStat[]>([]);
  const [tatData, setTatData] = useState<TATItem[]>([]);
  const [criticalData, setCriticalData] = useState<CriticalItem[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set());

  const runReport = async () => {
    setLoading(true);
    try {
      if (tab === 'pending')   setPendingData(await getPendingResultsReport());
      else if (tab === 'workload')  setWorkloadData(await getWorkloadReport(dateFrom, dateTo));
      else if (tab === 'financial') setFinancialData(await getFinancialReport(period, dateFrom, dateTo));
      else if (tab === 'tat')       setTatData(await getTATReport(dateFrom, dateTo));
      else if (tab === 'critical')  setCriticalData(await getCriticalValuesReport(dateFrom, dateTo));
      setLoadedTabs(prev => new Set([...prev, tab]));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Financial summary totals (shown as KPI cards when financial report is loaded)
  const financialTotals = loadedTabs.has('financial') ? financialData.reduce((acc, r) => ({
    billed: acc.billed + r.total_billed,
    collected: acc.collected + r.total_collected,
    discount: acc.discount + r.discount_total,
    outstanding: acc.outstanding + r.outstanding,
    orders: acc.orders + r.order_count,
  }), { billed: 0, collected: 0, discount: 0, outstanding: 0, orders: 0 }) : null;

  const tatAvg = loadedTabs.has('tat') && tatData.length > 0
    ? tatData.filter(r => r.tat_hours != null).reduce((s, r) => s + (r.tat_hours ?? 0), 0) /
      Math.max(1, tatData.filter(r => r.tat_hours != null).length)
    : null;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Analytics &amp; Reports</h1>
          <p>Real-time laboratory performance metrics and operational analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius)',
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
            <span style={{ color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live System</span>
          </div>
        </div>
      </div>

      {/* Financial KPI cards — shown when financial report data is available */}
      {tab === 'financial' && financialTotals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
          className="financial-kpis">
          {[
            { label: 'Total Billed',    value: fmtUGX(financialTotals.billed),      color: 'var(--primary)', Icon: DollarSign },
            { label: 'Collected',       value: fmtUGX(financialTotals.collected),   color: 'var(--success)', Icon: TrendingUp },
            { label: 'Discounts',       value: fmtUGX(financialTotals.discount),    color: '#b47800',        Icon: DollarSign },
            { label: 'Outstanding',     value: fmtUGX(financialTotals.outstanding), color: 'var(--error)',   Icon: AlertTriangle },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>{s.label}</p>
                <s.Icon size={14} style={{ color: s.color }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAT summary card */}
      {tab === 'tat' && tatAvg !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
          className="financial-kpis">
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: 6 }}>Avg Turnaround</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: tatAvg > 48 ? 'var(--error)' : tatAvg > 24 ? '#b47800' : 'var(--success)', letterSpacing: '-0.02em' }}>
              {tatAvg.toFixed(1)}h
            </p>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: 6 }}>Orders with Results</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
              {tatData.filter(r => r.tat_hours != null).length}/{tatData.length}
            </p>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--outline-variant)',
        marginBottom: 16, overflowX: 'auto',
      }}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '10px 18px', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: tab === id ? 'var(--primary)' : 'var(--on-surface-variant)',
            borderBottom: tab === id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: tab !== 'pending' ? 'block' : 'none' }}>
            <label className="form-label">Date Range</label>
            <div style={{ width: 260 }}>
              <EZDatePicker
                value=""
                onChange={() => {}}
                mode="daterange"
                placeholder="Select date range"
                className="form-control"
                onRangeChange={(start, end) => { setDateFrom(start); setDateTo(end); }}
              />
            </div>
          </div>
          <div style={{ display: tab === 'financial' ? 'block' : 'none' }}>
            <label className="form-label">Group By</label>
            <div style={{ width: 130 }}>
              <EZSelect
                value={period} onChange={setPeriod}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
                searchable={false}
              />
            </div>
          </div>
          <button className="btn btn-primary" onClick={runReport} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Running…</> : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Chart — financial area chart */}
      {tab === 'financial' && loadedTabs.has('financial') && financialData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={15} /> Revenue Trend
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={financialData.slice(-30).map(d => ({ period: d.period.length > 10 ? d.period : d.period.slice(5), billed: d.total_billed, collected: d.total_collected }))}>
              <defs>
                <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#78001d" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#78001d" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [fmtUGX(Number(v)), '']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: 4, fontSize: 12 }} />
              <Area type="monotone" dataKey="billed" stroke="#78001d" strokeWidth={2} fill="url(#billedGrad)" dot={false} name="Billed" />
              <Area type="monotone" dataKey="collected" stroke="var(--success)" strokeWidth={1.5} fill="none" dot={false} name="Collected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workload bar chart */}
      {tab === 'workload' && loadedTabs.has('workload') && workloadData.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={15} /> Orders by Period
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={workloadData.slice(-20).map(d => ({ date: d.date.slice(-5), orders: d.orders_count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="orders" fill="#78001d" radius={[2, 2, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <PageLoader label="Generating report…" />
        ) : !loadedTabs.has(tab) ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <BarChart2 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <h3>No data yet</h3>
            <p>Set filters and click <strong>Run Report</strong> to generate data.</p>
          </div>
        ) : tab === 'pending' ? (
          <PendingTable data={pendingData} onNavigate={id => navigate(`/orders/${id}`)} />
        ) : tab === 'workload' ? (
          <WorkloadTable data={workloadData} />
        ) : tab === 'financial' ? (
          <FinancialTable data={financialData} />
        ) : tab === 'tat' ? (
          <TATTable data={tatData} onNavigate={id => navigate(`/orders/${id}`)} />
        ) : (
          <CriticalTable data={criticalData} onNavigate={id => navigate(`/orders/${id}`)} />
        )}
      </div>
    </div>
  );
}

function PendingTable({ data, onNavigate }: { data: PendingOrder[]; onNavigate: (id: number) => void }) {
  const [page, setPage] = useState(1);
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No pending orders found.</p></div>;
  const rows = data.slice((page - 1) * RPT_PAGE_SIZE, page * RPT_PAGE_SIZE);
  return (
    <>
      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table>
          <thead>
            <tr><th>Order #</th><th>Patient</th><th>Date</th><th>Days Pending</th><th>Progress</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.id)}>
                <td><span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>{r.order_number}</span></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.patient_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{r.patient_ref}</div>
                </td>
                <td style={{ fontSize: 12 }}>{fmtDate(r.order_date)}</td>
                <td>
                  <span style={{ fontWeight: 700, fontSize: 13, color: r.days_pending > 3 ? 'var(--error)' : r.days_pending > 1 ? '#b47800' : 'var(--success)' }}>
                    {r.days_pending}d
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'var(--outline-variant)', borderRadius: 3, minWidth: 80 }}>
                      <div style={{
                        height: '100%', borderRadius: 3, background: 'var(--primary)',
                        width: r.test_count > 0 ? `${(r.results_entered / r.test_count) * 100}%` : '0%',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>{r.results_entered}/{r.test_count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)' }}>
        <Pagination total={data.length} page={page} pageSize={RPT_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

function WorkloadTable({ data }: { data: WorkloadStat[] }) {
  const [page, setPage] = useState(1);
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  return (
    <>
      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table>
          <thead><tr><th>Date</th><th>Staff</th><th>Orders</th><th>Tests</th><th>Completed</th></tr></thead>
          <tbody>
            {data.slice((page - 1) * RPT_PAGE_SIZE, page * RPT_PAGE_SIZE).map((r, i) => (
              <tr key={i}>
                <td style={{ fontSize: 12 }}>{r.date}</td>
                <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                <td>{r.orders_count}</td>
                <td>{r.tests_count}</td>
                <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{r.completed_count}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)' }}>
        <Pagination total={data.length} page={page} pageSize={RPT_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

function FinancialTable({ data }: { data: FinancialStat[] }) {
  const [page, setPage] = useState(1);
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  return (
    <>
      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table>
          <thead>
            <tr><th>Period</th><th>Orders</th><th>Billed</th><th>Collected</th><th>Discount</th><th>Outstanding</th></tr>
          </thead>
          <tbody>
            {data.slice((page - 1) * RPT_PAGE_SIZE, page * RPT_PAGE_SIZE).map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.period}</td>
                <td>{r.order_count}</td>
                <td>UGX {fmtNum(r.total_billed)}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>UGX {fmtNum(r.total_collected)}</td>
                <td style={{ color: '#b47800' }}>UGX {fmtNum(r.discount_total)}</td>
                <td style={{ color: r.outstanding > 0 ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: r.outstanding > 0 ? 700 : 400 }}>
                  UGX {fmtNum(r.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)' }}>
        <Pagination total={data.length} page={page} pageSize={RPT_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

function TATTable({ data, onNavigate }: { data: TATItem[]; onNavigate: (id: number) => void }) {
  const [page, setPage] = useState(1);
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  return (
    <>
      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table>
          <thead>
            <tr><th>Order #</th><th>Patient</th><th>Ordered</th><th>Result Date</th><th>TAT</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.slice((page - 1) * RPT_PAGE_SIZE, page * RPT_PAGE_SIZE).map(r => (
              <tr key={r.order_id} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.order_id)}>
                <td><span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>{r.order_number}</span></td>
                <td style={{ fontWeight: 600 }}>{r.patient_name}</td>
                <td style={{ fontSize: 12 }}>{fmtDate(r.order_date)}</td>
                <td style={{ fontSize: 12 }}>{r.result_date ? fmtDate(r.result_date) : '—'}</td>
                <td>
                  {r.tat_hours != null ? (
                    <span style={{ fontWeight: 700, color: r.tat_hours > 48 ? 'var(--error)' : r.tat_hours > 24 ? '#b47800' : 'var(--success)' }}>
                      {r.tat_hours.toFixed(1)}h
                    </span>
                  ) : <span style={{ color: 'var(--on-surface-variant)' }}>—</span>}
                </td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)' }}>
        <Pagination total={data.length} page={page} pageSize={RPT_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

function CriticalTable({ data, onNavigate }: { data: CriticalItem[]; onNavigate: (id: number) => void }) {
  const [page, setPage] = useState(1);
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No critical values found for selected period.</p></div>;
  return (
    <>
      <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table>
          <thead>
            <tr><th>Order #</th><th>Patient</th><th>Test</th><th>Result</th><th>Date</th></tr>
          </thead>
          <tbody>
            {data.slice((page - 1) * RPT_PAGE_SIZE, page * RPT_PAGE_SIZE).map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.order_id)}>
                <td><span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>{r.order_number}</span></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.patient_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{r.patient_ref}</div>
                </td>
                <td>{r.test_name}</td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--error)' }}>{r.result_value}</span>
                  {r.unit && <span style={{ color: 'var(--on-surface-variant)', marginLeft: 4, fontSize: 11 }}>{r.unit}</span>}
                  <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 2, fontSize: 9, fontWeight: 700, background: 'var(--error-container)', color: 'var(--error)', border: '1px solid rgba(186,26,26,0.2)' }}>CRITICAL</span>
                </td>
                <td style={{ fontSize: 12 }}>{fmtDate(r.result_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--outline-variant)' }}>
        <Pagination total={data.length} page={page} pageSize={RPT_PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}
