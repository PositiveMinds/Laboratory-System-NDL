export interface SessionUser {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'lab_tech';
}

export interface Patient {
  id: number;
  patient_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface TestCategory {
  id: number;
  name: string;
}

export interface TestItem {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  price: number;
}

export interface OrderSummary {
  id: number;
  order_number: string;
  patient_id: number;
  patient_name: string;
  patient_ref: string;
  ordered_by_name: string;
  order_date: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  discount_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  item_count: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  test_id: number;
  test_name: string;
  category_name: string;
  price: number;
  result_value?: string;
  unit?: string;
  reference_range?: string;
  flag?: string;
  result_date?: string;
  has_result: boolean;
}

export interface OrderDetail extends OrderSummary {
  patient_age?: number;
  patient_gender?: string;
  patient_phone?: string;
  ordered_by_id: number;
  referred_by?: string;
  specimen_type?: string;
  specimen_id?: string;
  collected_at?: string;
  verified_by_name?: string;
  verified_at?: string;
  items: OrderItem[];
}

export interface Payment {
  id: number;
  order_id: number;
  order_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  processed_by_name: string;
  notes?: string;
}

export interface ReceiptData {
  receipt_number: string;
  payment_date: string;
  order_number: string;
  patient_name: string;
  patient_ref: string;
  patient_age?: number;
  patient_gender?: string;
  cashier_name: string;
  payment_method: string;
  items: { test_name: string; category_name: string; price: number }[];
  total_amount: number;
  discount_amount: number;
  amount_paid: number;
  balance: number;
  notes?: string;
}

export interface ResultsReportData {
  order_number: string;
  order_date: string;
  result_date: string;
  patient_name: string;
  patient_ref: string;
  patient_age?: number;
  patient_gender?: string;
  patient_phone?: string;
  requested_by: string;
  referred_by?: string;
  specimen_type?: string;
  specimen_id?: string;
  verified_by?: string;
  verified_at?: string;
  categories: {
    name: string;
    items: {
      test_name: string;
      result_value?: string;
      unit?: string;
      reference_range?: string;
      flag?: string;
    }[];
  }[];
}

export interface DashboardStats {
  total_patients: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  today_revenue: number;
  total_revenue: number;
  total_outstanding: number;
  recent_orders: OrderSummary[];
}

export interface RevenueStat {
  period: string;
  revenue: number;
  order_count: number;
}

export interface TopTest {
  test_name: string;
  order_count: number;
  revenue: number;
}

export interface UserInfo {
  id: number;
  username: string;
  full_name: string;
  role: string;
  email?: string;
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
}

export interface CreatePatientInput {
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface OrderItemInput {
  test_id: number;
  price: number;
}

export interface CreateOrderInput {
  patient_id: number;
  items: OrderItemInput[];
  notes?: string;
  referred_by?: string;
  specimen_type?: string;
  specimen_id?: string;
  collected_at?: string;
}

export interface ReferenceRange {
  id: number;
  test_id: number;
  test_name: string;
  gender?: string;
  age_min?: number;
  age_max?: number;
  unit: string;
  reference_range: string;
}

export interface AutoFillData {
  unit: string;
  reference_range: string;
}

export interface PendingOrder {
  id: number;
  order_number: string;
  patient_name: string;
  patient_ref: string;
  order_date: string;
  days_pending: number;
  test_count: number;
  results_entered: number;
}

export interface WorkloadStat {
  date: string;
  user_name: string;
  orders_count: number;
  tests_count: number;
  completed_count: number;
}

export interface FinancialStat {
  period: string;
  total_billed: number;
  total_collected: number;
  discount_total: number;
  outstanding: number;
  order_count: number;
}

export interface TATItem {
  order_id: number;
  order_number: string;
  patient_name: string;
  order_date: string;
  result_date?: string;
  tat_hours?: number;
  status: string;
}

export interface CriticalItem {
  order_id: number;
  order_number: string;
  patient_name: string;
  patient_ref: string;
  test_name: string;
  result_value: string;
  unit?: string;
  result_date: string;
}

export interface AuditLog {
  id: number;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export interface SearchResult {
  kind: 'patient' | 'order';
  id: number;
  title: string;
  subtitle: string;
}

export interface ResultHistory {
  result_date: string;
  result_value: string;
  order_number: string;
  order_id: number;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  from_name: string;
  from_email: string;
  use_tls: boolean;
}
