import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ClipboardList, Clock, CheckCircle,
  DollarSign, AlertTriangle, Plus, TrendingUp, FlaskConical,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardStats, getRevenueStats, getTopTests } from '../lib/api';
import type { DashboardStats, RevenueStat, TopTest } from '../types';
import { fmtUGX } from '../lib/currency';
import PageLoader from '../components/PageLoader';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();

type Period = 'today' | '7d' | '30d' | 'month' | 'year';

function getDateRange(period: Period): { from: string; to: string; groupBy: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const to = fmt(today);
  if (period === 'today') {
    return { from: to, to, groupBy: 'day' };
  } else if (period === '7d') {
    return { from: fmt(new Date(Date.now() - 6 * 86400000)), to, groupBy: 'day' };
  } else if (period === '30d') {
    return { from: fmt(new Date(Date.now() - 29 * 86400000)), to, groupBy: 'day' };
  } else if (period === 'month') {
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to, groupBy: 'day' };
  } else {
    return { from: fmt(new Date(today.getFullYear(), 0, 1)), to, groupBy: 'month' };
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  month: 'This Month',
  year: 'This Year',
};

function fmtYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: RevenueStat }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ color: 'var(--primary-color)', fontWeight: 700, fontSize: 13 }}>{fmtUGX(d.revenue)}</div>
      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{d.order_count} order{d.order_count !== 1 ? 's' : ''}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueStat[]>([]);
  const [topTests, setTopTests] = useState<TopTest[]>([]);
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).finally(() => setLoading(false));
    getTopTests(8).then(setTopTests);
  }, []);

  useEffect(() => {
    const { from, to, groupBy } = getDateRange(period);
    getRevenueStats(groupBy, from, to).then(setRevenueData);
  }, [period]);

  const totalChartRevenue = useMemo(() => revenueData.reduce((s, d) => s + d.revenue, 0), [revenueData]);
  const maxTestCount = useMemo(() => Math.max(...topTests.map(t => t.order_count), 1), [topTests]);

  if (loading) return <PageLoader label="Loading dashboard..." />;
  if (!stats) return null;

  const STAT_CARDS = [
    { label: 'Total Patients',   value: stats.total_patients.toLocaleString(),   colorClass: 'blue',   Icon: Users },
    { label: 'Total Orders',     value: stats.total_orders.toLocaleString(),      colorClass: 'purple', Icon: ClipboardList },
    { label: 'Pending Orders',   value: stats.pending_orders.toLocaleString(),    colorClass: 'amber',  Icon: Clock },
    { label: 'Completed',        value: stats.completed_orders.toLocaleString(),  colorClass: 'green',  Icon: CheckCircle },
    { label: "Today's Revenue",  value: fmtUGX(stats.today_revenue),              colorClass: 'orange', Icon: DollarSign },
    { label: 'Outstanding',      value: fmtUGX(stats.total_outstanding),          colorClass: 'red',    Icon: AlertTriangle },
  ];

  const chartData = revenueData.map(d => ({
    ...d,
    label: d.period.length === 10 ? d.period.slice(5) : d.period,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of laboratory operations</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}>
          <Plus size={14} /> New Order
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="stat-card">
            <div className={`stat-icon ${c.colorClass}`}><c.Icon size={22} /></div>
            <div className="stat-data"><h3>{c.value}</h3><p>{c.label}</p></div>
          </div>
        ))}
      </div>

      {/* Revenue Chart + Top Tests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} /> Revenue Overview
              </div>
              <div className="card-subtitle">
                {PERIOD_LABELS[period]}:&nbsp;
                <strong style={{ color: 'var(--primary-color)' }}>{fmtUGX(totalChartRevenue)}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: '1.5px solid',
                    borderColor: period === p ? 'var(--primary-color)' : 'var(--border-color)',
                    background: period === p ? 'var(--primary-color)' : 'transparent',
                    color: period === p ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, height: 200 }}>
            {revenueData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f54927" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f54927" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    interval={chartData.length <= 14 ? 0 : Math.floor(chartData.length / 6)}
                  />
                  <YAxis
                    tickFormatter={fmtYAxis}
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary-color)', strokeWidth: 1, strokeDasharray: '4 2' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f54927"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#f54927', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Tests */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={15} /> Top Tests
            </div>
          </div>
          {topTests.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTests.map((t, i) => (
                <div key={t.test_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{t.test_name}</span>
                    <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{t.order_count} orders</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(t.order_count / maxTestCount) * 100}%`,
                      background: `hsl(${15 + i * 22}, 85%, ${55 - i * 3}%)`,
                      borderRadius: 3,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Orders</div>
            <div className="card-subtitle">Latest 10 test orders</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/orders')}>View All</button>
        </div>
        {stats.recent_orders.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No orders yet</h3>
            <p>Create your first test order to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order No.</th><th>Patient</th><th>Date</th>
                  <th>Tests</th><th>Total</th><th>Status</th><th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_orders.map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                    <td><span className="font-mono">{o.order_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.patient_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.patient_ref}</div>
                    </td>
                    <td>{fmtDate(o.order_date)}</td>
                    <td>{o.item_count}</td>
                    <td className="font-bold">{fmtUGX(o.total_amount)}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td><span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
