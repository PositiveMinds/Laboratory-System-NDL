import { useState, useEffect } from 'react';
import { useMinLoading } from '../hooks/useMinLoading';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getUsers, createUser, deleteUser, unlockUser, updateUserEmail,
  getTestCategories, getTests, updateTestPrice,
  createTestCategory, deleteTestCategory, renameTestCategory, createTest, deleteTest,
  changePassword, getReferenceRanges, saveReferenceRange, deleteReferenceRange, backupDatabase,
  getAuditLogs, restoreDatabase, saveSmtpConfig, getSmtpConfig, sendEmailSmtp,
} from '../lib/api';
import type { UserInfo, TestItem, TestCategory, ReferenceRange, AuditLog } from '../types';
import Modal from '../components/Modal';
import EZSelect from '../components/EZSelect';
import PageLoader from '../components/PageLoader';
import Swal from 'sweetalert2';
import { fmtUGX } from '../lib/currency';
import { Lock, Unlock, Plus, Trash2, Pencil, Database, Save } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'tests' | 'email' | 'printing' | 'ranges' | 'backup' | 'audit'>('profile');

  // Profile / Password
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Users
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useMinLoading(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', full_name: '', email: '', password: '', role: 'lab_tech' });
  const [userSaving, setUserSaving] = useState(false);

  // Tests / Prices
  const [categories, setCategories] = useState<TestCategory[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loadingTests, setLoadingTests] = useMinLoading(false);
  const [editPrices, setEditPrices] = useState<Record<number, string>>({});
  const [priceSaving, setPriceSaving] = useState<number | null>(null);

  // EmailJS
  const [ejServiceId, setEjServiceId] = useState(() => localStorage.getItem('emailjs_service_id') || '');
  const [ejTemplateId, setEjTemplateId] = useState(() => localStorage.getItem('emailjs_template_id') || '');
  const [ejResultsTplId, setEjResultsTplId] = useState(() => localStorage.getItem('emailjs_results_template_id') || '');
  const [ejReceiptTplId, setEjReceiptTplId] = useState(() => localStorage.getItem('emailjs_receipt_template_id') || '');
  const [ejPublicKey, setEjPublicKey] = useState(() => localStorage.getItem('emailjs_public_key') || '');

  // SMTP
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Noble Diagnostic Laboratory');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');

  // Printer settings
  const [paperSize, setPaperSize] = useState(() => localStorage.getItem('printer_paper_size') || '80mm');
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('printer_auto_print') === 'true');

  // Reference Ranges
  const [allTestsForRanges, setAllTestsForRanges] = useState<TestItem[]>([]);
  const [selectedRefTestId, setSelectedRefTestId] = useState<string>('');
  const [refRanges, setRefRanges] = useState<ReferenceRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useMinLoading(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [editRange, setEditRange] = useState<ReferenceRange | null>(null);
  const [rangeForm, setRangeForm] = useState({ gender: '', age_min: '', age_max: '', unit: '', reference_range: '' });
  const [rangeSaving, setRangeSaving] = useState(false);

  // Backup / Restore
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackupPath, setLastBackupPath] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useMinLoading(false);

  useEffect(() => {
    if (activeTab === 'users' && user?.role === 'admin') {
      setLoadingUsers(true);
      getUsers().then(setUsers).finally(() => setLoadingUsers(false));
    }
    if (activeTab === 'tests') {
      setLoadingTests(true);
      Promise.all([getTestCategories(), getTests()]).then(([cats, ts]) => {
        setCategories(cats);
        setTests(ts);
        const prices: Record<number, string> = {};
        ts.forEach(t => { prices[t.id] = t.price.toString(); });
        setEditPrices(prices);
      }).finally(() => setLoadingTests(false));
    }
    if (activeTab === 'ranges' && user?.role === 'admin') {
      getTests().then(setAllTestsForRanges);
    }
    if (activeTab === 'audit' && user?.role === 'admin') {
      setLoadingAudit(true);
      getAuditLogs(200, 0).then(setAuditLogs).finally(() => setLoadingAudit(false));
    }
    if (activeTab === 'email' && user?.role === 'admin') {
      getSmtpConfig().then(cfg => {
        if (cfg) {
          setSmtpHost(cfg.host);
          setSmtpPort(String(cfg.port));
          setSmtpUser(cfg.username);
          setSmtpFromName(cfg.from_name);
          setSmtpFromEmail(cfg.from_email);
          setSmtpUseTls(cfg.use_tls);
        }
      }).catch(() => {});
    }
  }, [activeTab, user]);

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'All password fields are required.', confirmButtonColor: '#f54927' }); return;
    }
    if (newPw !== confirmPw) {
      Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'New passwords do not match.', confirmButtonColor: '#f54927' }); return;
    }
    if (newPw.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Too Short', text: 'Password must be at least 6 characters.', confirmButtonColor: '#f54927' }); return;
    }
    setPwSaving(true);
    try {
      await changePassword(oldPw, newPw);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      Swal.fire({ icon: 'success', title: 'Password Changed', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.full_name || !userForm.password) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Name, username, and password are required.', confirmButtonColor: '#f54927' }); return;
    }
    setUserSaving(true);
    try {
      const created = await createUser({
        username: userForm.username,
        full_name: userForm.full_name,
        password: userForm.password,
        role: userForm.role,
        email: userForm.email || undefined,
      });
      setUsers(us => [...us, created]);
      setShowUserModal(false);
      setUserForm({ username: '', full_name: '', email: '', password: '', role: 'lab_tech' });
      Swal.fire({ icon: 'success', title: 'User Created', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (uid: number, uname: string) => {
    const result = await Swal.fire({
      title: `Delete User "${uname}"?`, text: 'This cannot be undone.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#c82909', confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteUser(uid);
      setUsers(us => us.filter(u => u.id !== uid));
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleUnlockUser = async (uid: number, uname: string) => {
    try {
      await unlockUser(uid);
      setUsers(us => us.map(u => u.id === uid ? { ...u, failed_attempts: 0, locked_until: undefined } : u));
      Swal.fire({ icon: 'success', title: `${uname} unlocked`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleUpdateEmail = async (uid: number, currentEmail: string) => {
    const { value: email } = await Swal.fire({
      title: 'Set User Email',
      input: 'email',
      inputValue: currentEmail,
      inputPlaceholder: 'user@example.com',
      showCancelButton: true,
      confirmButtonColor: '#f54927',
    });
    if (email === undefined) return;
    try {
      await updateUserEmail(uid, email);
      setUsers(us => us.map(u => u.id === uid ? { ...u, email: email || undefined } : u));
      Swal.fire({ icon: 'success', title: 'Email Updated', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const isLocked = (u: UserInfo) => {
    if (!u.locked_until) return false;
    return new Date().toISOString().slice(0, 19).replace('T', ' ') < u.locked_until;
  };

  const loadRangesForTest = async (testId: number) => {
    if (!testId) { setRefRanges([]); return; }
    setLoadingRanges(true);
    try { setRefRanges(await getReferenceRanges(testId)); }
    finally { setLoadingRanges(false); }
  };

  const openNewRange = () => {
    setEditRange(null);
    setRangeForm({ gender: '', age_min: '', age_max: '', unit: '', reference_range: '' });
    setShowRangeModal(true);
  };

  const openEditRange = (r: ReferenceRange) => {
    setEditRange(r);
    setRangeForm({ gender: r.gender || '', age_min: r.age_min?.toString() || '', age_max: r.age_max?.toString() || '', unit: r.unit, reference_range: r.reference_range });
    setShowRangeModal(true);
  };

  const handleSaveRange = async () => {
    if (!selectedRefTestId) return;
    if (!rangeForm.unit || !rangeForm.reference_range) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Unit and reference range are required.', confirmButtonColor: '#f54927' }); return;
    }
    setRangeSaving(true);
    try {
      await saveReferenceRange({
        id: editRange?.id,
        test_id: Number(selectedRefTestId),
        gender: rangeForm.gender || undefined,
        age_min: rangeForm.age_min ? Number(rangeForm.age_min) : undefined,
        age_max: rangeForm.age_max ? Number(rangeForm.age_max) : undefined,
        unit: rangeForm.unit,
        reference_range: rangeForm.reference_range,
      });
      setShowRangeModal(false);
      await loadRangesForTest(Number(selectedRefTestId));
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setRangeSaving(false);
    }
  };

  const handleDeleteRange = async (r: ReferenceRange) => {
    const res = await Swal.fire({ title: 'Delete Range?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c82909', confirmButtonText: 'Delete' });
    if (!res.isConfirmed) return;
    try {
      await deleteReferenceRange(r.id);
      setRefRanges(rs => rs.filter(x => x.id !== r.id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const path = await backupDatabase();
      setLastBackupPath(path);
      Swal.fire({ icon: 'success', title: 'Backup Created', html: `<div style="font-size:12px;word-break:break-all;margin-top:8px;">${path}</div>`, confirmButtonColor: '#f54927' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Backup Failed', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const confirmed = await Swal.fire({
        title: 'Restore Database?',
        html: `<p>This will <strong>replace all current data</strong> with the backup file.</p><p style="color:#ef4444">The app will need to restart after restore.</p>`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#c82909', confirmButtonText: 'Restore',
      });
      if (!confirmed.isConfirmed) return;
      setRestoring(true);
      try {
        const buf = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buf));
        await restoreDatabase(bytes);
        Swal.fire({
          icon: 'success', title: 'Restore Staged',
          text: 'The database restore will be applied the next time the app starts. Please restart the app now.',
          confirmButtonColor: '#f54927',
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Restore Failed', text: String(err), confirmButtonColor: '#f54927' });
      } finally {
        setRestoring(false);
      }
    };
    input.click();
  };

  const handleSavePrice = async (testId: number) => {
    const price = parseInt(editPrices[testId]);
    if (isNaN(price) || price < 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Price', confirmButtonColor: '#f54927' }); return;
    }
    setPriceSaving(testId);
    try {
      await updateTestPrice(testId, price);
      setTests(ts => ts.map(t => t.id === testId ? { ...t, price } : t));
      Swal.fire({ icon: 'success', title: 'Price Updated', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setPriceSaving(null);
    }
  };

  const handleSaveAllPrices = async () => {
    const changed = tests.filter(t => parseInt(editPrices[t.id]) !== t.price && !isNaN(parseInt(editPrices[t.id])));
    if (changed.length === 0) {
      Swal.fire({ icon: 'info', title: 'No Changes', text: 'No prices have been modified.', confirmButtonColor: '#f54927' }); return;
    }
    setPriceSaving(-1);
    try {
      await Promise.all(changed.map(t => updateTestPrice(t.id, parseInt(editPrices[t.id]))));
      setTests(ts => ts.map(t => ({ ...t, price: parseInt(editPrices[t.id]) ?? t.price })));
      Swal.fire({ icon: 'success', title: `${changed.length} Price(s) Updated`, timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
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
      confirmButtonColor: '#f54927',
      inputValidator: v => !v.trim() ? 'Category name is required' : null,
    });
    if (!name) return;
    try {
      const cat = await createTestCategory(name.trim());
      setCategories(cs => [...cs, cat]);
      Swal.fire({ icon: 'success', title: 'Category Added', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleRenameCategory = async (catId: number, currentName: string) => {
    const { value: name } = await Swal.fire({
      title: 'Rename Category',
      input: 'text',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonColor: '#f54927',
      inputValidator: v => !v.trim() ? 'Name is required' : null,
    });
    if (!name || name.trim() === currentName) return;
    try {
      await renameTestCategory(catId, name.trim());
      setCategories(cs => cs.map(c => c.id === catId ? { ...c, name: name.trim() } : c));
      setTests(ts => ts.map(t => t.category_id === catId ? { ...t, category_name: name.trim() } : t));
      Swal.fire({ icon: 'success', title: 'Category Renamed', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    const result = await Swal.fire({
      title: `Delete "${catName}"?`, text: 'All tests in this category must be removed first.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#c82909', confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTestCategory(catId);
      setCategories(cs => cs.filter(c => c.id !== catId));
      Swal.fire({ icon: 'success', title: 'Category Deleted', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleAddTest = async (catId: number) => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Test',
      html: `
        <input id="swal-test-name" class="swal2-input" placeholder="Test name e.g. Haemoglobin" />
        <input id="swal-test-price" class="swal2-input" type="number" placeholder="Price (UGX)" min="0" step="1" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#f54927',
      preConfirm: () => {
        const name = (document.getElementById('swal-test-name') as HTMLInputElement).value.trim();
        const price = parseInt((document.getElementById('swal-test-price') as HTMLInputElement).value);
        if (!name) { Swal.showValidationMessage('Test name is required'); return false; }
        if (isNaN(price) || price < 0) { Swal.showValidationMessage('Enter a valid price'); return false; }
        return { name, price };
      },
    });
    if (!formValues) return;
    try {
      const newTest = await createTest(formValues.name, catId, formValues.price);
      setTests(ts => [...ts, newTest]);
      setEditPrices(p => ({ ...p, [newTest.id]: newTest.price.toString() }));
      Swal.fire({ icon: 'success', title: 'Test Added', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleDeleteTest = async (testId: number, testName: string) => {
    const result = await Swal.fire({
      title: `Delete test "${testName}"?`,
      text: 'This will remove it from the test list. Existing orders are not affected.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#c82909', confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteTest(testId);
      setTests(ts => ts.filter(t => t.id !== testId));
      Swal.fire({ icon: 'success', title: 'Test Deleted', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    }
  };

  const handleSaveSmtp = async () => {
    if (!smtpHost) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'SMTP host is required.', confirmButtonColor: '#f54927' }); return;
    }
    setSmtpLoading(true);
    try {
      await saveSmtpConfig({
        host: smtpHost.trim(),
        port: parseInt(smtpPort) || 587,
        username: smtpUser.trim(),
        password: smtpPass,
        from_name: smtpFromName.trim(),
        from_email: smtpFromEmail.trim(),
        use_tls: smtpUseTls,
      });
      setSmtpPass('');
      Swal.fire({ icon: 'success', title: 'SMTP Config Saved', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter a test email address.', confirmButtonColor: '#f54927' }); return;
    }
    setSmtpTesting(true);
    try {
      await sendEmailSmtp(
        smtpTestEmail,
        'NDL Lab System — SMTP Test',
        '<p>This is a test email from <strong>Noble Diagnostic Laboratory</strong> system.</p><p>SMTP is configured correctly.</p>',
      );
      Swal.fire({ icon: 'success', title: 'Test Email Sent', text: `Check ${smtpTestEmail}`, confirmButtonColor: '#f54927' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Send Failed', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setSmtpTesting(false);
    }
  };

  const saveEmailJsConfig = () => {
    localStorage.setItem('emailjs_service_id', ejServiceId.trim());
    localStorage.setItem('emailjs_template_id', ejTemplateId.trim());
    localStorage.setItem('emailjs_results_template_id', ejResultsTplId.trim());
    localStorage.setItem('emailjs_receipt_template_id', ejReceiptTplId.trim());
    localStorage.setItem('emailjs_public_key', ejPublicKey.trim());
    Swal.fire({ icon: 'success', title: 'EmailJS Config Saved', timer: 1500, showConfirmButton: false });
  };

  const savePrinterSettings = () => {
    localStorage.setItem('printer_paper_size', paperSize);
    localStorage.setItem('printer_auto_print', String(autoPrint));
    Swal.fire({ icon: 'success', title: 'Printer Settings Saved', timer: 1500, showConfirmButton: false });
  };

  const groupedTests = tests.reduce((acc, t) => {
    if (!acc[t.category_name]) acc[t.category_name] = [];
    acc[t.category_name].push(t);
    return acc;
  }, {} as Record<string, TestItem[]>);

  const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'printing', label: 'Printing' },
    ...(user?.role === 'admin' ? [
      { key: 'users', label: 'User Management' },
      { key: 'tests', label: 'Test Prices' },
      { key: 'ranges', label: 'Reference Ranges' },
      { key: 'email', label: 'Email' },
      { key: 'backup', label: 'Backup & Restore' },
      { key: 'audit', label: 'Audit Log' },
    ] : []),
  ] as { key: typeof activeTab; label: string }[];

  return (
    <div>
      <div className="page-header"><div><h1>Settings</h1></div></div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border-color)', paddingBottom: 0, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none', border: 'none', padding: '8px 18px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer', fontSize: 13.5, transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Account Information</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: 'var(--primary-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
                {user?.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.full_name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>@{user?.username}</div>
                <span className={`badge badge-${user?.role}`} style={{ marginTop: 4 }}>{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Appearance</div></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Theme</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Currently: {theme === 'dark' ? 'Dark' : 'Light'} mode</div>
              </div>
              <button className="btn btn-secondary" onClick={toggleTheme}>
                {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
              </button>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1/-1', maxWidth: 480 }}>
            <div className="card-header"><div className="card-title">Change Password</div></div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-control" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-control" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : 'Update Password'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'printing' && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Receipt Printer Settings</div></div>
            <div className="form-group">
              <label className="form-label">Paper Size</label>
              <EZSelect
                value={paperSize}
                onChange={setPaperSize}
                options={[
                  { value: '80mm', label: '80mm (standard receipt)' },
                  { value: '58mm', label: '58mm (mini receipt)' },
                  { value: 'A4', label: 'A4 (full page)' },
                ]}
                searchable={false}
              />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Sets the print page width when printing receipts and lab results.
              </div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)}
                  style={{ width: 16, height: 16 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Auto-print after recording payment</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Automatically open the print dialog when a payment is saved.
                  </div>
                </div>
              </label>
            </div>
            <button className="btn btn-primary" onClick={savePrinterSettings}>Save Printer Settings</button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">Print Preview Tips</div></div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
              <li>In the browser print dialog, set <strong>Margins</strong> to None or Minimal.</li>
              <li>Disable <strong>Headers and footers</strong> for cleaner receipts.</li>
              <li>For 80mm/58mm paper, set the <strong>paper size</strong> to match in the OS print dialog.</li>
              <li>Chrome/Edge: use <strong>Save as PDF</strong> first to preview layout.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'users' && user?.role === 'admin' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">System Users</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}>Add User</button>
          </div>
          {loadingUsers ? (
            <PageLoader label="Loading users..." />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Full Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const locked = isLocked(u);
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                        <td>@{u.username}</td>
                        <td style={{ fontSize: 12 }}>
                          <button onClick={() => handleUpdateEmail(u.id, u.email || '')}
                            style={{ background: 'none', border: 'none', color: u.email ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, textDecoration: u.email ? 'none' : 'underline' }}>
                            {u.email || 'Set email'}
                          </button>
                        </td>
                        <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                        <td>
                          {locked ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--danger-color)', fontWeight: 600 }}>
                              <Lock size={12} /> Locked
                            </span>
                          ) : u.failed_attempts > 0 ? (
                            <span style={{ fontSize: 12, color: '#f59e0b' }}>{u.failed_attempts} failed</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#10b981' }}>Active</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {locked && (
                              <button className="btn btn-secondary btn-sm"
                                onClick={() => handleUnlockUser(u.id, u.username)}
                                title="Unlock account"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Unlock size={12} /> Unlock
                              </button>
                            )}
                            {u.id !== user.id && (
                              <button className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(u.id, u.username)}>Delete</button>
                            )}
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
      )}

      {activeTab === 'tests' && user?.role === 'admin' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              All prices in <strong>Ugandan Shillings (UGX)</strong>. Add, edit, or remove tests and categories.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleAddCategory} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus size={13} /> Add Category
              </button>
              <button className="btn btn-primary" onClick={handleSaveAllPrices}
                disabled={priceSaving !== null} style={{ minWidth: 110 }}>
                {priceSaving === -1 ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : 'Save All Prices'}
              </button>
            </div>
          </div>
          {loadingTests ? (
            <PageLoader label="Loading tests..." />
          ) : categories.map(cat => {
            const catTests = groupedTests[cat.name] || [];
            return (
              <div key={cat.id} className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div className="card-title" style={{ color: 'var(--primary-color)' }}>{cat.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleAddTest(cat.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Plus size={12} /> Add Test
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRenameCategory(cat.id, cat.name)}
                      title="Rename category" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Pencil size={12} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Delete category" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--danger-color)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {catTests.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>No tests yet. Click "Add Test" to add one.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
                    {catTests.map(t => {
                      const changed = parseInt(editPrices[t.id]) !== t.price;
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderRadius: 6, background: changed ? 'rgba(245,73,39,0.05)' : 'transparent' }}>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: changed ? 600 : 400 }}>{t.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>UGX</span>
                          <input type="number" min={0} step={1}
                            value={editPrices[t.id] ?? t.price}
                            onChange={e => setEditPrices(p => ({ ...p, [t.id]: e.target.value }))}
                            style={{ width: 90, padding: '4px 8px', border: `1.5px solid ${changed ? 'var(--primary-color)' : 'var(--border-color)'}`, borderRadius: 'var(--radius)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, textAlign: 'right', outline: 'none' }} />
                          <button className="btn btn-primary btn-sm"
                            onClick={() => handleSavePrice(t.id)}
                            disabled={priceSaving !== null} style={{ minWidth: 50 }}>
                            {priceSaving === t.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Save'}
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteTest(t.id, t.name)}
                            title="Delete test"
                            style={{ color: 'var(--danger-color)', padding: '4px 6px' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'email' && user?.role === 'admin' && (
        <div style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">EmailJS Configuration</div>
                <div className="card-subtitle">Powers password reset, lab results, and receipt emails. Get credentials at emailjs.com.</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Service ID</label>
                <input className="form-control" placeholder="e.g. service_abc123"
                  value={ejServiceId} onChange={e => setEjServiceId(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Public Key</label>
                <input className="form-control" placeholder="e.g. user_xxxxxxxx"
                  value={ejPublicKey} onChange={e => setEjPublicKey(e.target.value)} />
              </div>
            </div>
            <div className="form-group mt-16">
              <label className="form-label">Password Reset Template ID</label>
              <input className="form-control" placeholder="e.g. template_reset123"
                value={ejTemplateId} onChange={e => setEjTemplateId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Lab Results Template ID</label>
              <input className="form-control" placeholder="e.g. template_results456"
                value={ejResultsTplId} onChange={e => setEjResultsTplId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Template ID</label>
              <input className="form-control" placeholder="e.g. template_receipt789"
                value={ejReceiptTplId} onChange={e => setEjReceiptTplId(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={saveEmailJsConfig}>Save EmailJS Config</button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">SMTP Configuration (Fallback)</div>
                <div className="card-subtitle">Used automatically when EmailJS is not configured or fails. Works with Gmail, Outlook, or any SMTP server.</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SMTP Host</label>
                <input className="form-control" placeholder="e.g. smtp.gmail.com"
                  value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Port</label>
                <input className="form-control" type="number" placeholder="587"
                  value={smtpPort} onChange={e => setSmtpPort(e.target.value)} style={{ maxWidth: 90 }} />
              </div>
            </div>
            <div className="form-row mt-16">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username / Email</label>
                <input className="form-control" placeholder="your@gmail.com"
                  value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password / App Password</label>
                <input className="form-control" type="password" placeholder="Leave blank to keep existing"
                  value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
              </div>
            </div>
            <div className="form-row mt-16">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From Name</label>
                <input className="form-control" placeholder="Noble Diagnostic Laboratory"
                  value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From Email</label>
                <input className="form-control" placeholder="noreply@ndl.ug"
                  value={smtpFromEmail} onChange={e => setSmtpFromEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-group mt-16">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={smtpUseTls} onChange={e => setSmtpUseTls(e.target.checked)}
                  style={{ width: 16, height: 16 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Use TLS (port 465)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Uncheck for STARTTLS (port 587). Gmail requires port 465 with TLS.</div>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleSaveSmtp} disabled={smtpLoading}>
                {smtpLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : 'Save SMTP Config'}
              </button>
              <input className="form-control" placeholder="test@example.com"
                value={smtpTestEmail} onChange={e => setSmtpTestEmail(e.target.value)}
                style={{ maxWidth: 220 }} />
              <button className="btn btn-secondary" onClick={handleTestSmtp} disabled={smtpTesting}>
                {smtpTesting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending...</> : 'Send Test Email'}
              </button>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong>Gmail tip:</strong> Use an App Password (not your regular password). Enable 2FA in your Google account, then go to Google Account → Security → App Passwords.
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">Template Variables Reference</div></div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Use these variables inside your EmailJS templates. Each template only needs its own set.
            </p>

            {[
              {
                title: 'Password Reset',
                vars: [
                  ['{{to_email}}', 'Recipient email'],
                  ['{{identifier}}', 'Username or email entered'],
                  ['{{reset_code}}', '6-digit reset code'],
                ],
              },
              {
                title: 'Lab Results',
                vars: [
                  ['{{to_email}}', 'Recipient email'],
                  ['{{patient_name}}', 'Full name of patient'],
                  ['{{patient_ref}}', 'Patient ID (e.g. NDL-0001)'],
                  ['{{order_number}}', 'Order number'],
                  ['{{result_date}}', 'Date results were recorded'],
                  ['{{results_html}}', 'HTML table of all test results'],
                  ['{{lab_name}}', 'Noble Diagnostic Laboratory'],
                  ['{{lab_phone}}', 'Lab phone numbers'],
                ],
              },
              {
                title: 'Receipt / Invoice',
                vars: [
                  ['{{to_email}}', 'Recipient email'],
                  ['{{patient_name}}', 'Full name of patient'],
                  ['{{order_number}}', 'Order number'],
                  ['{{payment_date}}', 'Date of payment'],
                  ['{{payment_method}}', 'e.g. Cash, Mobile Money'],
                  ['{{receipt_html}}', 'HTML table of tests + totals'],
                  ['{{total_amount}}', 'Total billed amount'],
                  ['{{amount_paid}}', 'Amount paid'],
                  ['{{balance}}', 'Remaining balance'],
                ],
              },
            ].map(section => (
              <div key={section.title} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)', letterSpacing: 0.5, marginBottom: 6 }}>
                  {section.title}
                </div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    {section.vars.map(([v, d]) => (
                      <tr key={v}>
                        <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: 'var(--primary-color)', whiteSpace: 'nowrap', width: 1 }}>{v}</td>
                        <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ranges' && user?.role === 'admin' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
              <EZSelect
                key={`ranges-test-${allTestsForRanges.length}`}
                value={selectedRefTestId}
                onChange={v => { setSelectedRefTestId(v); loadRangesForTest(Number(v)); }}
                options={[{ value: '', label: '— Select a test —' }, ...allTestsForRanges.map(t => ({ value: String(t.id), label: `${t.category_name} › ${t.name}` }))]}
                searchable={true}
              />
            </div>
            {selectedRefTestId && (
              <button className="btn btn-primary btn-sm" onClick={openNewRange}>
                <Plus size={13} /> Add Range
              </button>
            )}
          </div>

          {!selectedRefTestId ? (
            <div className="card">
              <div className="empty-state">
                <p style={{ color: 'var(--text-secondary)' }}>Select a test above to manage its reference ranges.</p>
              </div>
            </div>
          ) : loadingRanges ? (
            <div className="card"><PageLoader label="Loading ranges..." /></div>
          ) : refRanges.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p>No reference ranges configured for this test.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={openNewRange}><Plus size={13} /> Add First Range</button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)' }}>
                Reference ranges for: <strong>{allTestsForRanges.find(t => String(t.id) === selectedRefTestId)?.name}</strong>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Gender</th><th>Age Min</th><th>Age Max</th><th>Unit</th><th>Reference Range</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {refRanges.map(r => (
                      <tr key={r.id}>
                        <td>{r.gender || <span style={{ color: 'var(--text-secondary)' }}>All</span>}</td>
                        <td>{r.age_min ?? <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                        <td>{r.age_max ?? <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                        <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.unit}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.reference_range}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditRange(r)}><Pencil size={12} /> Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => handleDeleteRange(r)}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">How Reference Ranges Work</div></div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.9, margin: 0 }}>
              <li>Ranges can be gender-specific (Male/Female) or apply to all patients.</li>
              <li>Age Min/Max filter by patient age in years. Leave blank for all ages.</li>
              <li>When entering results, unit and reference range are auto-filled from the best matching range.</li>
              <li>Gender-specific and age-specific entries take priority over general ones.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'backup' && user?.role === 'admin' && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Database Backup</div>
                <div className="card-subtitle">Creates a timestamped copy of the SQLite database in the app data folder.</div>
              </div>
            </div>
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(245,73,39,0.06)', borderRadius: 'var(--radius)', fontSize: 13 }}>
              Backups are saved automatically to: <br />
              <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                %APPDATA%\com.ndl.labsystem\backups\
              </span>
            </div>
            {lastBackupPath && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius)', border: '1px solid #10b981', fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Last backup created:</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>{lastBackupPath}</div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {backingUp
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating Backup...</>
                : <><Database size={14} /> Create Backup Now</>}
            </button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Restore from Backup</div>
                <div className="card-subtitle">Select a .db backup file to restore. The app must restart after restore.</div>
              </div>
            </div>
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius)', fontSize: 13, color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              <strong>Warning:</strong> Restoring will overwrite all current data. This cannot be undone.
            </div>
            <button className="btn btn-secondary" onClick={handleRestore} disabled={restoring} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderColor: '#ef4444', color: '#ef4444' }}>
              {restoring
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Staging Restore...</>
                : <><Database size={14} /> Restore from File</>}
            </button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">Backup Guidelines</div></div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.9, margin: 0 }}>
              <li>Run a backup before any major updates or data migrations.</li>
              <li>Recommended: daily backup for active labs.</li>
              <li>Copy backup files to an external drive or cloud storage for safety.</li>
              <li>After staging a restore, close and reopen the app for the restore to take effect.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'audit' && user?.role === 'admin' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Showing last 200 audit log entries</div>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setLoadingAudit(true);
              getAuditLogs(200, 0).then(setAuditLogs).finally(() => setLoadingAudit(false));
            }}>Refresh</button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {loadingAudit ? (
              <PageLoader label="Loading audit log…" />
            ) : auditLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><p>No audit log entries yet.</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td><strong>{log.user_name || '—'}</strong></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{log.action}</span></td>
                      <td style={{ fontSize: 11 }}>{log.entity_type ? `${log.entity_type} #${log.entity_id ?? ''}` : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={showRangeModal} onClose={() => setShowRangeModal(false)} title={editRange ? 'Edit Reference Range' : 'Add Reference Range'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowRangeModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveRange} disabled={rangeSaving}>
            {rangeSaving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={13} /> Save Range</>}
          </button>
        </>}
      >
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Test: <strong>{allTestsForRanges.find(t => String(t.id) === selectedRefTestId)?.name}</strong>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Gender (leave blank for all)</label>
            <EZSelect value={rangeForm.gender} onChange={v => setRangeForm(f => ({ ...f, gender: v }))}
              options={[{ value: '', label: 'All genders' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
              searchable={false} />
          </div>
        </div>
        <div className="form-row mt-16">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Age Min (yrs)</label>
            <input className="form-control" type="number" min={0} placeholder="e.g. 18" value={rangeForm.age_min} onChange={e => setRangeForm(f => ({ ...f, age_min: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Age Max (yrs)</label>
            <input className="form-control" type="number" min={0} placeholder="e.g. 65" value={rangeForm.age_max} onChange={e => setRangeForm(f => ({ ...f, age_max: e.target.value }))} />
          </div>
        </div>
        <div className="form-group mt-16">
          <label className="form-label">Unit <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. g/dL, mmol/L, IU/L" value={rangeForm.unit} onChange={e => setRangeForm(f => ({ ...f, unit: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference Range <span className="required">*</span></label>
          <input className="form-control" placeholder="e.g. 12.0 – 16.0  or  < 5.0" value={rangeForm.reference_range} onChange={e => setRangeForm(f => ({ ...f, reference_range: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Add New User"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateUser} disabled={userSaving}>
              {userSaving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : 'Create User'}
            </button>
          </>
        }>
        <div className="form-group">
          <label className="form-label">Full Name <span className="required">*</span></label>
          <input className="form-control" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Username <span className="required">*</span></label>
          <input className="form-control" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-control" type="email" placeholder="user@example.com"
            value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Password <span className="required">*</span></label>
          <input className="form-control" type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <EZSelect
            value={userForm.role}
            onChange={v => setUserForm(f => ({ ...f, role: v }))}
            options={[
              { value: 'lab_tech', label: 'Lab Technician' },
              { value: 'admin', label: 'Administrator' },
            ]}
            searchable={false}
          />
        </div>
      </Modal>
    </div>
  );
}
