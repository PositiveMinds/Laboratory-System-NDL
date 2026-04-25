import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, BarChart2, DollarSign, FlaskConical } from 'lucide-react';
import {
  getPendingResultsReport, getWorkloadReport, getFinancialReport,
  getTATReport, getCriticalValuesReport,
} from '../lib/api';
import type { PendingOrder, WorkloadStat, FinancialStat, TATItem, CriticalItem } from '../types';
import PageLoader from '../components/PageLoader';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const fmtNum = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Tab = 'pending' | 'workload' | 'financial' | 'tat' | 'critical';

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'pending',   label: 'Pending Results', Icon: FlaskConical },
  { id: 'workload',  label: 'Workload',         Icon: BarChart2 },
  { id: 'financial', label: 'Financial',        Icon: DollarSign },
  { id: 'tat',       label: 'Turnaround Time',  Icon: Clock },
  { id: 'critical',  label: 'Critical Values',  Icon: AlertTriangle },
];

const today = new Date().toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

export default function Reports() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo] = useState(today);
  const [period, setPeriod] = useState('day');

  const [pendingData, setPendingData] = useState<PendingOrder[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadStat[]>([]);
  const [financialData, setFinancialData] = useState<FinancialStat[]>([]);
  const [tatData, setTatData] = useState<TATItem[]>([]);
  const [criticalData, setCriticalData] = useState<CriticalItem[]>([]);
  const [loaded, setLoaded] = useState<Tab | null>(null);

  const runReport = async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        setPendingData(await getPendingResultsReport());
      } else if (tab === 'workload') {
        setWorkloadData(await getWorkloadReport(dateFrom, dateTo));
      } else if (tab === 'financial') {
        setFinancialData(await getFinancialReport(period, dateFrom, dateTo));
      } else if (tab === 'tat') {
        setTatData(await getTATReport(dateFrom, dateTo));
      } else if (tab === 'critical') {
        setCriticalData(await getCriticalValuesReport(dateFrom, dateTo));
      }
      setLoaded(tab);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Reports</h1><p>Lab analytics and operational reports</p></div>
      </div>

      {/* Tab bar */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: tab === id ? 700 : 400,
                color: tab === id ? 'var(--primary-color)' : 'var(--text-secondary)',
                borderBottom: tab === id ? '2px solid var(--primary-color)' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {tab !== 'pending' && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" className="form-control" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" className="form-control" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </>
          )}
          {tab === 'financial' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Group By</label>
              <select className="form-control" style={{ width: 120 }} value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={runReport} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Running…</> : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <PageLoader label="Generating report…" />
        ) : loaded !== tab ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <BarChart2 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>Click "Run Report" to generate data.</p>
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
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No pending orders found.</p></div>;
  return (
    <table className="data-table">
      <thead><tr>
        <th>Order #</th><th>Patient</th><th>Date</th><th>Days Pending</th><th>Progress</th>
      </tr></thead>
      <tbody>
        {data.map(r => (
          <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.id)}>
            <td><span className="font-mono" style={{ color: 'var(--primary-color)' }}>{r.order_number}</span></td>
            <td><strong>{r.patient_name}</strong><br /><small style={{ color: 'var(--text-secondary)' }}>{r.patient_ref}</small></td>
            <td>{fmtDate(r.order_date)}</td>
            <td>
              <span style={{ fontWeight: 700, color: r.days_pending > 3 ? '#ef4444' : r.days_pending > 1 ? '#f59e0b' : '#10b981' }}>
                {r.days_pending}d
              </span>
            </td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 4 }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'var(--primary-color)', width: r.test_count > 0 ? `${(r.results_entered / r.test_count) * 100}%` : '0%' }} />
                </div>
                <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{r.results_entered}/{r.test_count}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WorkloadTable({ data }: { data: WorkloadStat[] }) {
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  return (
    <table className="data-table">
      <thead><tr><th>Date</th><th>Staff</th><th>Orders</th><th>Tests</th><th>Completed</th></tr></thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i}>
            <td>{r.date}</td>
            <td><strong>{r.user_name}</strong></td>
            <td>{r.orders_count}</td>
            <td>{r.tests_count}</td>
            <td><span style={{ color: '#10b981', fontWeight: 600 }}>{r.completed_count}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FinancialTable({ data }: { data: FinancialStat[] }) {
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  const totals = data.reduce((acc, r) => ({
    billed: acc.billed + r.total_billed,
    collected: acc.collected + r.total_collected,
    discount: acc.discount + r.discount_total,
    outstanding: acc.outstanding + r.outstanding,
    orders: acc.orders + r.order_count,
  }), { billed: 0, collected: 0, discount: 0, outstanding: 0, orders: 0 });
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16 }}>
        {[
          { label: 'Total Billed', value: `UGX ${fmtNum(totals.billed)}`, color: 'var(--primary-color)' },
          { label: 'Total Collected', value: `UGX ${fmtNum(totals.collected)}`, color: '#10b981' },
          { label: 'Discounts', value: `UGX ${fmtNum(totals.discount)}`, color: '#f59e0b' },
          { label: 'Outstanding', value: `UGX ${fmtNum(totals.outstanding)}`, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <table className="data-table">
        <thead><tr><th>Period</th><th>Orders</th><th>Billed</th><th>Collected</th><th>Discount</th><th>Outstanding</th></tr></thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td><strong>{r.period}</strong></td>
              <td>{r.order_count}</td>
              <td>UGX {fmtNum(r.total_billed)}</td>
              <td style={{ color: '#10b981' }}>UGX {fmtNum(r.total_collected)}</td>
              <td style={{ color: '#f59e0b' }}>UGX {fmtNum(r.discount_total)}</td>
              <td style={{ color: r.outstanding > 0 ? '#ef4444' : 'var(--text-secondary)' }}>UGX {fmtNum(r.outstanding)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TATTable({ data, onNavigate }: { data: TATItem[]; onNavigate: (id: number) => void }) {
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No data found for selected period.</p></div>;
  const withResult = data.filter(r => r.tat_hours != null);
  const avg = withResult.length > 0 ? withResult.reduce((s, r) => s + (r.tat_hours ?? 0), 0) / withResult.length : 0;
  return (
    <div>
      {withResult.length > 0 && (
        <div style={{ padding: 12, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
          <strong>Average TAT:</strong> {avg.toFixed(1)} hours &nbsp;|&nbsp;
          <strong>With results:</strong> {withResult.length}/{data.length} orders
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Order #</th><th>Patient</th><th>Ordered</th><th>Result Date</th><th>TAT (hrs)</th><th>Status</th></tr></thead>
        <tbody>
          {data.map(r => (
            <tr key={r.order_id} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.order_id)}>
              <td><span className="font-mono" style={{ color: 'var(--primary-color)' }}>{r.order_number}</span></td>
              <td>{r.patient_name}</td>
              <td>{fmtDate(r.order_date)}</td>
              <td>{r.result_date ? fmtDate(r.result_date) : '—'}</td>
              <td>
                {r.tat_hours != null ? (
                  <span style={{ fontWeight: 700, color: r.tat_hours > 48 ? '#ef4444' : r.tat_hours > 24 ? '#f59e0b' : '#10b981' }}>
                    {r.tat_hours.toFixed(1)}h
                  </span>
                ) : '—'}
              </td>
              <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CriticalTable({ data, onNavigate }: { data: CriticalItem[]; onNavigate: (id: number) => void }) {
  if (!data.length) return <div className="empty-state" style={{ padding: 32 }}><p>No critical values found for selected period.</p></div>;
  return (
    <table className="data-table">
      <thead><tr><th>Order #</th><th>Patient</th><th>Test</th><th>Result</th><th>Date</th></tr></thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onNavigate(r.order_id)}>
            <td><span className="font-mono" style={{ color: 'var(--primary-color)' }}>{r.order_number}</span></td>
            <td><strong>{r.patient_name}</strong><br /><small style={{ color: 'var(--text-secondary)' }}>{r.patient_ref}</small></td>
            <td>{r.test_name}</td>
            <td>
              <strong style={{ color: '#ef4444' }}>{r.result_value}</strong>
              {r.unit && <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{r.unit}</span>}
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '1px 5px', borderRadius: 4 }}>C</span>
            </td>
            <td>{fmtDate(r.result_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
