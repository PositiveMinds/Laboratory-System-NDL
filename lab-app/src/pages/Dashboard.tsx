import { useState, useEffect, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { useNavigate } from 'react-router-dom';
import {
  Users, ClipboardList, Clock, CheckCircle,
  DollarSign, AlertTriangle, Plus, TrendingUp, FlaskConical,
  ArrowUpRight, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { getDashboardStats, getRevenueStats, getTopTests } from '../lib/api';
import type { DashboardStats, RevenueStat, TopTest } from '../types';
import { fmtUGX } from '../lib/currency';
import PageLoader from '../components/PageLoader';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

type Period = 'today' | '7d' | '30d' | 'month' | 'year';

function getDateRange(period: Period) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const to = fmt(today);
  if (period === 'today') return { from: to, to, groupBy: 'day' };
  if (period === '7d')    return { from: fmt(new Date(Date.now() - 6 * 86400000)), to, groupBy: 'day' };
  if (period === '30d')   return { from: fmt(new Date(Date.now() - 29 * 86400000)), to, groupBy: 'day' };
  if (period === 'month') return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to, groupBy: 'day' };
  return { from: fmt(new Date(today.getFullYear(), 0, 1)), to, groupBy: 'month' };
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today', '7d': '7 Days', '30d': '30 Days', month: 'Month', year: 'Year',
};

function fmtYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: RevenueStat }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--outline-variant)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>{fmtUGX(d.revenue)}</div>
      <div style={{ color: 'var(--on-surface-variant)', marginTop: 2 }}>{d.order_count} order{d.order_count !== 1 ? 's' : ''}</div>
    </div>
  );
}

const STATUS_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  pending:    { bg: 'rgba(180,120,0,0.1)',  color: '#b47800', border: 'rgba(180,120,0,0.2)' },
  completed:  { bg: 'var(--success-container)', color: 'var(--success)', border: 'rgba(20,108,52,0.2)' },
  processing: { bg: 'rgba(37,99,235,0.1)',  color: '#2563eb', border: 'rgba(37,99,235,0.2)' },
  cancelled:  { bg: 'var(--error-container)', color: 'var(--error)', border: 'rgba(186,26,26,0.2)' },
};

const PAYMENT_BADGE: Record<string, { bg: string; color: string }> = {
  paid:    { bg: 'var(--success-container)', color: 'var(--success)' },
  unpaid:  { bg: 'var(--error-container)',   color: 'var(--error)' },
  partial: { bg: 'rgba(180,120,0,0.1)',       color: '#b47800' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueStat[]>([]);
  const [topTests, setTopTests] = useState<TopTest[]>([]);
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useMinLoading(true);
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

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (!stats) return null;

  const KPI_CARDS = [
    { label: 'Total Patients',  value: stats.total_patients.toLocaleString(),  Icon: Users,          colorClass: 'blue',   trend: null },
    { label: 'Total Orders',    value: stats.total_orders.toLocaleString(),     Icon: ClipboardList,  colorClass: 'purple', trend: null },
    { label: 'Pending',         value: stats.pending_orders.toLocaleString(),   Icon: Clock,          colorClass: 'amber',  trend: null },
    { label: 'Completed',       value: stats.completed_orders.toLocaleString(), Icon: CheckCircle,    colorClass: 'green',  trend: null },
    { label: "Today's Revenue", value: fmtUGX(stats.today_revenue),             Icon: DollarSign,     colorClass: 'orange', trend: '+0%' },
    { label: 'Outstanding',     value: fmtUGX(stats.total_outstanding),         Icon: AlertTriangle,  colorClass: 'red',    trend: null },
  ];

  const chartData = revenueData.map(d => ({
    ...d, label: d.period.length === 10 ? d.period.slice(5) : d.period,
  }));

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Lab Management Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 2 }}>
            Central Command for Clinical Operations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reports')}>
            <ArrowUpRight size={13} /> Export Report
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/orders/new')}>
            <Plus size={13} /> New Test Order
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="stats-grid">
        {KPI_CARDS.map(c => (
          <div key={c.label} className="stat-card"
            style={c.colorClass === 'red' ? { borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' } : {}}>
            <div className={`stat-icon ${c.colorClass}`}>
              <c.Icon size={20} />
            </div>
            <div className="stat-data">
              <h3>{c.value}</h3>
              <p>{c.label}</p>
              {c.trend && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                  <TrendingUp size={11} /> {c.trend}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart + top tests */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}
          className="dashboard-chart-row">
          {/* Revenue chart */}
          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={15} /> Revenue Overview
                </div>
                <div className="card-subtitle">
                  {PERIOD_LABELS[period]}:&nbsp;
                  <strong style={{ color: 'var(--primary)' }}>{fmtUGX(totalChartRevenue)}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} style={{
                    padding: '3px 10px', fontSize: 11, fontWeight: 600,
                    borderRadius: 'var(--radius)',
                    border: '1px solid',
                    borderColor: period === p ? 'var(--primary)' : 'var(--outline-variant)',
                    background: period === p ? 'var(--primary)' : 'transparent',
                    color: period === p ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 200 }}>
              {revenueData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
                  No revenue data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#78001d" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#78001d" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} tickLine={false} axisLine={false}
                      interval={chartData.length <= 14 ? 0 : Math.floor(chartData.length / 6)} />
                    <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 2' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#78001d" strokeWidth={2}
                      fill="url(#revenueGrad)" dot={false}
                      activeDot={{ r: 4, fill: '#78001d', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top tests */}
          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={15} /> Top Tests
              </div>
            </div>
            {topTests.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13, padding: '16px 0' }}>No data yet</div>
            ) : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTests.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="test_name" tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} tickLine={false} axisLine={false} width={90}
                      tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                    <Tooltip
                      formatter={(v) => [String(v) + ' orders', 'Orders']}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: 4, fontSize: 12 }} />
                    <Bar dataKey="order_count" fill="#78001d" radius={[0, 2, 2, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Test Orders</div>
            <div className="card-subtitle">Latest 10 orders</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/orders')}>View All</button>
        </div>
        {stats.recent_orders.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
            <h3>No orders yet</h3>
            <p>Create your first test order to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Patient / ID</th>
                  <th>Date</th>
                  <th>Tests</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_orders.map(o => {
                  const sb = STATUS_BADGE[o.status] || STATUS_BADGE.pending;
                  const pb = PAYMENT_BADGE[o.payment_status] || PAYMENT_BADGE.unpaid;
                  return (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--on-surface-variant)' }}>{o.order_number}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.patient_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{o.patient_ref}</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{fmtDate(o.order_date)}</td>
                      <td style={{ fontSize: 13 }}>{o.item_count}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{fmtUGX(o.total_amount)}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid',
                          background: sb.bg, color: sb.color, borderColor: sb.border,
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          background: pb.bg, color: pb.color,
                        }}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="icon-btn" onClick={e => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
