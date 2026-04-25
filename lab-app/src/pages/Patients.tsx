import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Loader2, UserX, Pencil } from 'lucide-react';
import { getPatients, createPatient, updatePatient } from '../lib/api';
import type { Patient, CreatePatientInput } from '../types';
import Modal from '../components/Modal';
import EZSelect from '../components/EZSelect';
import Pagination from '../components/Pagination';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';

const emptyForm = (): CreatePatientInput => ({ full_name: '', age: undefined, gender: '', phone: '', email: '', address: '' });
const fmtDate = (s: string) => new Date(s).toLocaleDateString();
const PAGE_SIZE = 20;

const GENDER_OPTIONS = [
  { value: '', label: '— Select Gender —' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Patient | null>(null);
  const [form, setForm] = useState<CreatePatientInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPatients(await getPatients(search)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return patients.slice(start, start + PAGE_SIZE);
  }, [patients, page]);

  const openNew = () => { setEditTarget(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (p: Patient) => {
    setEditTarget(p);
    setForm({ full_name: p.full_name, age: p.age, gender: p.gender || '', phone: p.phone || '', email: p.email || '', address: p.address || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Patient full name is required.', confirmButtonColor: '#f54927' });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updatePatient(editTarget.id, form);
        setPatients(ps => ps.map(p => p.id === updated.id ? updated : p));
        Swal.fire({ icon: 'success', title: 'Updated', timer: 2000, showConfirmButton: false });
      } else {
        const created = await createPatient(form);
        setPatients(ps => [created, ...ps]);
        Swal.fire({ icon: 'success', title: 'Registered', text: `Patient registered as ${created.patient_id}`, confirmButtonColor: '#f54927', timer: 2500, showConfirmButton: false });
      }
      setShowModal(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof CreatePatientInput, v: string | number | undefined) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <p>{patients.length} patient(s) registered</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> New Patient</button>
      </div>

      <div className="filters-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Search by name, ID or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <PageLoader label="Loading patients..." />
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <UserX size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3>No patients found</h3>
            <p>{search ? 'Try a different search term.' : 'Register the first patient to get started.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient ID</th><th>Full Name</th><th>Age</th>
                    <th>Gender</th><th>Phone</th><th>Registered</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(p => (
                    <tr key={p.id}>
                      <td><span className="font-mono" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{p.patient_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                      <td>{p.age ? `${p.age} yrs` : '—'}</td>
                      <td>{p.gender || '—'}</td>
                      <td>{p.phone || '—'}</td>
                      <td>{fmtDate(p.created_at)}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                          <Pencil size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={patients.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Edit Patient' : 'Register New Patient'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Saving...</> : editTarget ? 'Update' : 'Register'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Full Name <span className="required">*</span></label>
          <input className="form-control" placeholder="Patient full name" value={form.full_name} onChange={e => f('full_name', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Age</label>
            <input className="form-control" type="number" min={0} max={150} placeholder="Age in years" value={form.age ?? ''} onChange={e => f('age', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Gender</label>
            <EZSelect value={form.gender || ''} onChange={v => f('gender', v)} options={GENDER_OPTIONS} searchable={false} />
          </div>
        </div>
        <div className="form-group mt-16">
          <label className="form-label">Phone Number</label>
          <input className="form-control" placeholder="e.g. +256 706 947 101" value={form.phone || ''} onChange={e => f('phone', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" placeholder="Email address (optional)" value={form.email || ''} onChange={e => f('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-control" rows={2} placeholder="Physical address" value={form.address || ''} onChange={e => f('address', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </Modal>
    </div>
  );
}
