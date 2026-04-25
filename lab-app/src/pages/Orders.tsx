import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ClipboardX } from 'lucide-react';
import { getOrders } from '../lib/api';
import type { OrderSummary } from '../types';
import { fmtUGX } from '../lib/currency';
import EZSelect from '../components/EZSelect';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';

const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getOrders(statusFilter, search)); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Test Orders</h1>
          <p>{orders.length} order(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/orders/new')}>
          <Plus size={14} /> New Order
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Search order no., patient..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ width: 180 }}>
          <EZSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} searchable={false} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <PageLoader label="Loading orders..." />
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <ClipboardX size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No orders found</h3>
            <p>{search ? 'Try a different search.' : 'Create your first order.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order No.</th><th>Patient</th><th>Date</th><th>Tests</th>
                    <th className="text-right">Total</th><th className="text-right">Paid</th>
                    <th className="text-right">Balance</th><th>Status</th><th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(o => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                      <td><span className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{o.order_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.patient_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.patient_ref}</div>
                      </td>
                      <td>{fmtDate(o.order_date)}</td>
                      <td style={{ textAlign: 'center' }}>{o.item_count}</td>
                      <td className="text-right font-bold">{fmtUGX(o.total_amount)}</td>
                      <td className="text-right" style={{ color: '#10b981' }}>{fmtUGX(o.amount_paid)}</td>
                      <td className="text-right" style={{ color: o.balance > 0 ? 'var(--danger-color)' : '#10b981', fontWeight: 600 }}>
                        {fmtUGX(o.balance)}
                      </td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                      <td><span className={`badge badge-${o.payment_status}`}>{o.payment_status}</span></td>
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
  );
}
