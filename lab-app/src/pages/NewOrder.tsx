import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Check, Loader2, X } from 'lucide-react';
import { getPatients, getTests, createOrder } from '../lib/api';
import type { Patient, TestItem } from '../types';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { fmtUGX } from '../lib/currency';

interface SelectedTest { testId: number; price: number; }

function groupByCategory(tests: TestItem[]) {
  return tests.reduce((acc, t) => {
    if (!acc[t.category_name]) acc[t.category_name] = [];
    acc[t.category_name].push(t);
    return acc;
  }, {} as Record<string, TestItem[]>);
}

export default function NewOrder() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, SelectedTest>>({});
  const [notes, setNotes] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [specimenType, setSpecimenType] = useState('');
  const [specimenId, setSpecimenId] = useState('');
  const [collectedAt, setCollectedAt] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatients(''), getTests()]).then(([ps, ts]) => {
      setPatients(ps);
      setTests(ts);
    }).finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => groupByCategory(tests), [tests]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      p.patient_id.toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  }, [patients, patientSearch]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const toggleTest = (test: TestItem) => {
    setSelected(prev => {
      if (prev[test.id]) {
        const next = { ...prev };
        delete next[test.id];
        return next;
      }
      return { ...prev, [test.id]: { testId: test.id, price: test.price } };
    });
  };

  const updatePrice = (testId: number, price: number) => {
    setSelected(prev => ({ ...prev, [testId]: { ...prev[testId], price } }));
  };

  const selectedTests = tests.filter(t => selected[t.id]);
  const total = selectedTests.reduce((s, t) => s + (selected[t.id]?.price || 0), 0);

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      Swal.fire({ icon: 'warning', title: 'No Patient', text: 'Please select a patient.', confirmButtonColor: '#f54927' });
      return;
    }
    if (selectedTests.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Tests', text: 'Please select at least one test.', confirmButtonColor: '#f54927' });
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        patient_id: selectedPatientId,
        items: selectedTests.map(t => ({ test_id: t.id, price: selected[t.id].price })),
        notes: notes.trim() || undefined,
        referred_by: referredBy.trim() || undefined,
        specimen_type: specimenType.trim() || undefined,
        specimen_id: specimenId.trim() || undefined,
        collected_at: collectedAt || undefined,
      });
      await Swal.fire({
        icon: 'success',
        title: 'Order Created',
        html: `Order <strong>${order.order_number}</strong> created for ${order.patient_name}.<br/>Total: <strong>${fmtUGX(total)}</strong>`,
        confirmButtonColor: '#f54927',
        confirmButtonText: 'View Order',
      });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading order form..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Test Order</h1>
          <p>Select patient and tests to create an order</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/orders')}>
          <X size={14} /> Cancel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Patient Selection */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-title">1. Select Patient</div>
            </div>
            <div className="search-wrapper" style={{ maxWidth: '100%', marginBottom: 12 }}>
              <Search size={16} />
              <input className="search-input" placeholder="Search patient by name, ID or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
              {filteredPatients.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No patients found</div>
              ) : filteredPatients.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    background: selectedPatientId === p.id ? 'rgba(245,73,39,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.full_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {p.patient_id} {p.age ? `• ${p.age} yrs` : ''} {p.gender ? `• ${p.gender}` : ''}
                    </div>
                  </div>
                  {selectedPatientId === p.id && <Check size={16} style={{ color: 'var(--primary-color)' }} />}
                </div>
              ))}
            </div>
            {selectedPatient && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,73,39,0.06)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                Selected: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.patient_id})
              </div>
            )}
          </div>

          {/* Test Selection */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title">2. Select Tests</div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedTests.length} test(s) selected</span>
            </div>
            <div className="test-categories-grid">
              {Object.entries(grouped).map(([catName, catTests]) => (
                <div key={catName} className="test-category-card">
                  <div className="test-category-header">{catName}</div>
                  <div className="test-list">
                    {catTests.map(test => (
                      <div key={test.id} className="test-item">
                        <div className="test-item-left">
                          <input type="checkbox" className="test-checkbox" id={`test-${test.id}`} checked={!!selected[test.id]} onChange={() => toggleTest(test)} />
                          <label className="test-name" htmlFor={`test-${test.id}`}>{test.name}</label>
                        </div>
                        <input
                          type="number"
                          className="price-input"
                          value={selected[test.id]?.price ?? test.price}
                          min={0}
                          step={1}
                          onChange={e => { const v = parseInt(e.target.value) || 0; if (selected[test.id]) updatePrice(test.id, v); }}
                          disabled={!selected[test.id]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, marginBottom: 10 }}>Clinical Information (optional)</div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Referring Doctor</label>
                  <input className="form-control" placeholder="e.g. Dr. Okello James" value={referredBy} onChange={e => setReferredBy(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Specimen Type</label>
                  <input className="form-control" placeholder="e.g. Blood, Urine, Stool" value={specimenType} onChange={e => setSpecimenType(e.target.value)} />
                </div>
              </div>
              <div className="form-row mt-16">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Specimen ID / Lab No.</label>
                  <input className="form-control" placeholder="e.g. SPEC-001" value={specimenId} onChange={e => setSpecimenId(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Collection Date/Time</label>
                  <input className="form-control" type="datetime-local" value={collectedAt} onChange={e => setCollectedAt(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group mt-16">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-control" rows={2} placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="order-summary-panel">
          <h4>Order Summary</h4>
          {selectedPatient && (
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPatient.full_name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{selectedPatient.patient_id}</div>
            </div>
          )}
          {selectedTests.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '12px 0' }}>No tests selected yet</p>
          ) : selectedTests.map(t => (
            <div key={t.id} className="summary-item">
              <span className="test-n">{t.name}</span>
              <span className="price">{fmtUGX(selected[t.id]?.price || 0)}</span>
            </div>
          ))}
          <div className="summary-total">
            <span>Total</span>
            <span style={{ color: 'var(--primary-color)' }}>{fmtUGX(total)}</span>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={handleSubmit}
            disabled={submitting || !selectedPatientId || selectedTests.length === 0}
          >
            {submitting ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Creating...</> : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
