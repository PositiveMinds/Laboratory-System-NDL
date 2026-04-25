import { invoke } from '@tauri-apps/api/core';
import type {
  SessionUser, Patient, TestCategory, TestItem, OrderSummary, OrderDetail,
  Payment, ReceiptData, ResultsReportData, DashboardStats, UserInfo,
  CreatePatientInput, CreateOrderInput, RevenueStat, TopTest,
  ReferenceRange, AutoFillData,
  PendingOrder, WorkloadStat, FinancialStat, TATItem, CriticalItem,
  AuditLog, SearchResult, ResultHistory, SmtpConfig,
} from '../types';

// ─── Auth ──────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  invoke<SessionUser>('login', { username, password });

export const logout = () => invoke<void>('logout');

export const getCurrentUser = () => invoke<SessionUser | null>('get_current_user');

export const changePassword = (oldPassword: string, newPassword: string) =>
  invoke<void>('change_password', { oldPassword, newPassword });

// ─── Users ─────────────────────────────────────────────────────────────────
export const getUsers = () => invoke<UserInfo[]>('get_users');

export const createUser = (input: {
  username: string; full_name: string; password: string; role: string; email?: string;
}) => invoke<UserInfo>('create_user', { input });

export const updateUserEmail = (userId: number, email: string) =>
  invoke<void>('update_user_email', { userId, email });

export const deleteUser = (userId: number) => invoke<void>('delete_user', { userId });

export const unlockUser = (userId: number) => invoke<void>('unlock_user', { userId });

export const requestPasswordReset = (identifier: string) =>
  invoke<string>('request_password_reset', { identifier });

export const resetPassword = (token: string, newPassword: string) =>
  invoke<void>('reset_password', { token, newPassword });

// ─── Patients ──────────────────────────────────────────────────────────────
export const getPatients = (search = '') => invoke<Patient[]>('get_patients', { search });

export const getPatient = (patientId: number) =>
  invoke<Patient>('get_patient', { patientId });

export const createPatient = (input: CreatePatientInput) =>
  invoke<Patient>('create_patient', { input });

export const updatePatient = (patientId: number, input: CreatePatientInput) =>
  invoke<Patient>('update_patient', { patientId, input });

// ─── Tests ─────────────────────────────────────────────────────────────────
export const getTestCategories = () => invoke<TestCategory[]>('get_test_categories');

export const getTests = () => invoke<TestItem[]>('get_tests');

export const updateTestPrice = (testId: number, price: number) =>
  invoke<void>('update_test_price', { testId, price });

export const createTestCategory = (name: string) =>
  invoke<TestCategory>('create_test_category', { name });

export const deleteTestCategory = (categoryId: number) =>
  invoke<void>('delete_test_category', { categoryId });

export const renameTestCategory = (categoryId: number, name: string) =>
  invoke<void>('rename_test_category', { categoryId, name });

export const createTest = (name: string, categoryId: number, price: number) =>
  invoke<TestItem>('create_test', { name, categoryId, price });

export const deleteTest = (testId: number) =>
  invoke<void>('delete_test', { testId });

// ─── Orders ────────────────────────────────────────────────────────────────
export const createOrder = (input: CreateOrderInput) =>
  invoke<OrderDetail>('create_order', { input });

export const getOrders = (statusFilter = 'all', search = '') =>
  invoke<OrderSummary[]>('get_orders', { statusFilter, search });

export const getOrder = (orderId: number) =>
  invoke<OrderDetail>('get_order', { orderId });

export const updateOrderStatus = (orderId: number, newStatus: string) =>
  invoke<void>('update_order_status', { orderId, newStatus });

export const deleteOrder = (orderId: number) =>
  invoke<void>('delete_order', { orderId });

// ─── Billing ───────────────────────────────────────────────────────────────
export const getBilling = (paymentFilter = 'all', dateFrom = '', dateTo = '') =>
  invoke<OrderSummary[]>('get_billing', { paymentFilter, dateFrom, dateTo });

export const addPayment = (input: {
  order_id: number; amount: number; payment_method: string; notes?: string;
}) => invoke<Payment>('add_payment', { input });

export const getOrderPayments = (orderId: number) =>
  invoke<Payment[]>('get_order_payments', { orderId });

export const getReceiptData = (orderId: number) =>
  invoke<ReceiptData>('get_receipt_data', { orderId });

// ─── Results ───────────────────────────────────────────────────────────────
export const updateResult = (input: {
  item_id: number; result_value: string; unit?: string;
  reference_range?: string; flag?: string;
}) => invoke<void>('update_result', { input });

export const markResultsComplete = (orderId: number) =>
  invoke<void>('mark_results_complete', { orderId });

export const getResultsReport = (orderId: number) =>
  invoke<ResultsReportData>('get_results_report', { orderId });

// ─── Orders (extra) ────────────────────────────────────────────────────────────
export const addTestsToOrder = (orderId: number, items: { test_id: number; price: number }[]) =>
  invoke<OrderDetail>('add_tests_to_order', { orderId, items });

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboardStats = () => invoke<DashboardStats>('get_dashboard_stats');
export const getRevenueStats = (period: string, dateFrom: string, dateTo: string) =>
  invoke<RevenueStat[]>('get_revenue_stats', { period, dateFrom, dateTo });
export const getTopTests = (limit = 8) => invoke<TopTest[]>('get_top_tests', { limit });

// ─── Reference Ranges ──────────────────────────────────────────────────────
export const getReferenceRanges = (testId: number) =>
  invoke<ReferenceRange[]>('get_reference_ranges', { testId });

export const saveReferenceRange = (input: {
  id?: number; test_id: number; gender?: string;
  age_min?: number; age_max?: number; unit: string; reference_range: string;
}) => invoke<ReferenceRange>('save_reference_range', { input });

export const deleteReferenceRange = (rangeId: number) =>
  invoke<void>('delete_reference_range', { rangeId });

export const getAutofillForTest = (testId: number, gender?: string, age?: number) =>
  invoke<AutoFillData | null>('get_autofill_for_test', { testId, gender, age });

export const verifyOrder = (orderId: number) =>
  invoke<void>('verify_order', { orderId });

export const backupDatabase = () =>
  invoke<string>('backup_database');

// ─── Discounts ─────────────────────────────────────────────────────────────
export const setDiscount = (orderId: number, discountAmount: number, discountReason?: string) =>
  invoke<void>('set_discount', { orderId, discountAmount, discountReason });

// ─── Reports ───────────────────────────────────────────────────────────────
export const getPendingResultsReport = () =>
  invoke<PendingOrder[]>('get_pending_results_report');

export const getWorkloadReport = (dateFrom: string, dateTo: string) =>
  invoke<WorkloadStat[]>('get_workload_report', { dateFrom, dateTo });

export const getFinancialReport = (period: string, dateFrom: string, dateTo: string) =>
  invoke<FinancialStat[]>('get_financial_report', { period, dateFrom, dateTo });

export const getTATReport = (dateFrom: string, dateTo: string) =>
  invoke<TATItem[]>('get_tat_report', { dateFrom, dateTo });

export const getCriticalValuesReport = (dateFrom: string, dateTo: string) =>
  invoke<CriticalItem[]>('get_critical_values_report', { dateFrom, dateTo });

// ─── Search ────────────────────────────────────────────────────────────────
export const globalSearch = (query: string) =>
  invoke<SearchResult[]>('global_search', { query });

// ─── Audit Log ─────────────────────────────────────────────────────────────
export const getAuditLogs = (limit = 100, offset = 0) =>
  invoke<AuditLog[]>('get_audit_logs', { limit, offset });

// ─── Restore ───────────────────────────────────────────────────────────────
export const restoreDatabase = (bytes: number[]) =>
  invoke<void>('restore_database', { bytes });

// ─── Result History ────────────────────────────────────────────────────────
export const getResultHistory = (patientId: number, testId: number) =>
  invoke<ResultHistory[]>('get_result_history', { patientId, testId });

// ─── SMTP Email ────────────────────────────────────────────────────────────
export const saveSmtpConfig = (input: {
  host: string; port: number; username: string; password: string;
  from_name: string; from_email: string; use_tls: boolean;
}) => invoke<void>('save_smtp_config', { input });

export const getSmtpConfig = () =>
  invoke<SmtpConfig | null>('get_smtp_config');

export const sendEmailSmtp = (toEmail: string, subject: string, htmlBody: string) =>
  invoke<void>('send_email_smtp', { toEmail, subject, htmlBody });
