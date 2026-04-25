use std::sync::Mutex;
use tauri::Manager;
use rusqlite::{Connection, params, OptionalExtension};
use serde::{Deserialize, Serialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use chrono::Local;

// ─── App State ────────────────────────────────────────────────────────────────

pub struct AppState {
    pub db: Mutex<Connection>,
    pub session: Mutex<Option<SessionUser>>,
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionUser {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub id: i64,
    pub patient_id: String,
    pub full_name: String,
    pub age: Option<i64>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestCategory {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestItem {
    pub id: i64,
    pub name: String,
    pub category_id: i64,
    pub category_name: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderSummary {
    pub id: i64,
    pub order_number: String,
    pub patient_id: i64,
    pub patient_name: String,
    pub patient_ref: String,
    pub ordered_by_name: String,
    pub order_date: String,
    pub status: String,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub amount_paid: f64,
    pub balance: f64,
    pub payment_status: String,
    pub notes: Option<String>,
    pub item_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderDetail {
    pub id: i64,
    pub order_number: String,
    pub patient_id: i64,
    pub patient_name: String,
    pub patient_ref: String,
    pub patient_age: Option<i64>,
    pub patient_gender: Option<String>,
    pub patient_phone: Option<String>,
    pub ordered_by_id: i64,
    pub ordered_by_name: String,
    pub order_date: String,
    pub status: String,
    pub total_amount: f64,
    pub amount_paid: f64,
    pub balance: f64,
    pub payment_status: String,
    pub discount_amount: f64,
    pub notes: Option<String>,
    pub referred_by: Option<String>,
    pub specimen_type: Option<String>,
    pub specimen_id: Option<String>,
    pub collected_at: Option<String>,
    pub verified_by_name: Option<String>,
    pub verified_at: Option<String>,
    pub items: Vec<OrderItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderItem {
    pub id: i64,
    pub order_id: i64,
    pub test_id: i64,
    pub test_name: String,
    pub category_name: String,
    pub price: f64,
    pub result_value: Option<String>,
    pub unit: Option<String>,
    pub reference_range: Option<String>,
    pub flag: Option<String>,
    pub result_date: Option<String>,
    pub has_result: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Payment {
    pub id: i64,
    pub order_id: i64,
    pub order_number: String,
    pub amount: f64,
    pub payment_date: String,
    pub payment_method: String,
    pub receipt_number: String,
    pub processed_by_name: String,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceiptData {
    pub receipt_number: String,
    pub payment_date: String,
    pub order_number: String,
    pub patient_name: String,
    pub patient_ref: String,
    pub patient_age: Option<i64>,
    pub patient_gender: Option<String>,
    pub cashier_name: String,
    pub payment_method: String,
    pub items: Vec<ReceiptItem>,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub amount_paid: f64,
    pub balance: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceiptItem {
    pub test_name: String,
    pub category_name: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResultsReportData {
    pub order_number: String,
    pub order_date: String,
    pub result_date: String,
    pub patient_name: String,
    pub patient_ref: String,
    pub patient_age: Option<i64>,
    pub patient_gender: Option<String>,
    pub patient_phone: Option<String>,
    pub requested_by: String,
    pub referred_by: Option<String>,
    pub specimen_type: Option<String>,
    pub specimen_id: Option<String>,
    pub verified_by: Option<String>,
    pub verified_at: Option<String>,
    pub categories: Vec<ResultCategory>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResultCategory {
    pub name: String,
    pub items: Vec<ResultItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResultItem {
    pub test_name: String,
    pub result_value: Option<String>,
    pub unit: Option<String>,
    pub reference_range: Option<String>,
    pub flag: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_patients: i64,
    pub total_orders: i64,
    pub pending_orders: i64,
    pub completed_orders: i64,
    pub today_revenue: f64,
    pub total_revenue: f64,
    pub total_outstanding: f64,
    pub recent_orders: Vec<OrderSummary>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RevenueStat {
    pub period: String,
    pub revenue: f64,
    pub order_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopTest {
    pub test_name: String,
    pub order_count: i64,
    pub revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String,
    pub email: Option<String>,
    pub failed_attempts: i64,
    pub locked_until: Option<String>,
    pub created_at: String,
}

// ─── New LIS Types ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ReferenceRange {
    pub id: i64,
    pub test_id: i64,
    pub test_name: String,
    pub gender: Option<String>,
    pub age_min: Option<i64>,
    pub age_max: Option<i64>,
    pub unit: String,
    pub reference_range: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AutoFillData {
    pub unit: String,
    pub reference_range: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PendingOrder {
    pub id: i64,
    pub order_number: String,
    pub patient_name: String,
    pub patient_ref: String,
    pub order_date: String,
    pub days_pending: i64,
    pub test_count: i64,
    pub results_entered: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkloadStat {
    pub date: String,
    pub user_name: String,
    pub orders_count: i64,
    pub tests_count: i64,
    pub completed_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FinancialStat {
    pub period: String,
    pub total_billed: f64,
    pub total_collected: f64,
    pub discount_total: f64,
    pub outstanding: f64,
    pub order_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TATItem {
    pub order_number: String,
    pub patient_name: String,
    pub order_date: String,
    pub result_date: Option<String>,
    pub tat_hours: Option<f64>,
    pub status: String,
    pub order_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CriticalItem {
    pub order_id: i64,
    pub order_number: String,
    pub patient_name: String,
    pub patient_ref: String,
    pub test_name: String,
    pub result_value: String,
    pub unit: Option<String>,
    pub result_date: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: i64,
    pub user_name: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<i64>,
    pub details: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub kind: String,
    pub id: i64,
    pub title: String,
    pub subtitle: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResultHistory {
    pub result_date: String,
    pub result_value: String,
    pub order_number: String,
    pub order_id: i64,
}

// ─── SMTP Config ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub from_name: String,
    pub from_email: String,
    pub use_tls: bool,
}

// ─── Input Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreatePatientInput {
    pub full_name: String,
    pub age: Option<i64>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OrderItemInput {
    pub test_id: i64,
    pub price: f64,
}

#[derive(Debug, Deserialize)]
pub struct CreateOrderInput {
    pub patient_id: i64,
    pub items: Vec<OrderItemInput>,
    pub notes: Option<String>,
    pub referred_by: Option<String>,
    pub specimen_type: Option<String>,
    pub specimen_id: Option<String>,
    pub collected_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddPaymentInput {
    pub order_id: i64,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateResultInput {
    pub item_id: i64,
    pub result_value: String,
    pub unit: Option<String>,
    pub reference_range: Option<String>,
    pub flag: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub full_name: String,
    pub password: String,
    pub role: String,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveReferenceRangeInput {
    pub id: Option<i64>,
    pub test_id: i64,
    pub gender: Option<String>,
    pub age_min: Option<i64>,
    pub age_max: Option<i64>,
    pub unit: String,
    pub reference_range: String,
}

// ─── Database Init ────────────────────────────────────────────────────────────

fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'lab_tech',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS test_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            price REAL NOT NULL DEFAULT 0.0,
            FOREIGN KEY (category_id) REFERENCES test_categories(id)
        );
        CREATE TABLE IF NOT EXISTS test_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            patient_id INTEGER NOT NULL,
            ordered_by INTEGER NOT NULL,
            order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'pending',
            total_amount REAL NOT NULL DEFAULT 0.0,
            amount_paid REAL NOT NULL DEFAULT 0.0,
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id),
            FOREIGN KEY (ordered_by) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS test_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            test_id INTEGER NOT NULL,
            price REAL NOT NULL,
            result_value TEXT,
            unit TEXT,
            reference_range TEXT,
            flag TEXT,
            result_date DATETIME,
            FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (test_id) REFERENCES tests(id)
        );
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_method TEXT NOT NULL DEFAULT 'cash',
            receipt_number TEXT NOT NULL UNIQUE,
            processed_by INTEGER NOT NULL,
            notes TEXT,
            FOREIGN KEY (order_id) REFERENCES test_orders(id),
            FOREIGN KEY (processed_by) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS test_reference_ranges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_id INTEGER NOT NULL,
            gender TEXT,
            age_min INTEGER,
            age_max INTEGER,
            unit TEXT NOT NULL DEFAULT '',
            reference_range TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    ")?;
    // Migrations: ignore errors if columns already exist
    let _ = conn.execute("ALTER TABLE users ADD COLUMN email TEXT", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE users ADD COLUMN locked_until TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0.0", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN discount_reason TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN referred_by TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN specimen_type TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN specimen_id TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN collected_at TEXT", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN verified_by INTEGER REFERENCES users(id)", []);
    let _ = conn.execute("ALTER TABLE test_orders ADD COLUMN verified_at TEXT", []);
    Ok(())
}

fn seed_data(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM test_categories", [], |r| r.get(0))?;
    if count > 0 { return Ok(()); }

    let categories: &[(&str, &[(&str, f64)], i32)] = &[
        ("Liver Function Test", &[
            ("ALT", 25.0), ("AST", 25.0), ("Bilirubin Total", 20.0),
            ("Bilirubin Direct", 20.0), ("Albumin", 20.0), ("Total Protein", 20.0),
        ], 1),
        ("Renal Function Test", &[
            ("Creatinine", 20.0), ("Urea", 20.0), ("Potassium", 20.0),
            ("Sodium", 20.0), ("Chloride", 20.0),
        ], 2),
        ("Lipid Profile", &[
            ("Total Cholesterol", 25.0), ("HDL", 25.0), ("LDL", 25.0),
            ("Triglycerides", 25.0),
        ], 3),
        ("Thyroid Profile", &[("TSH", 35.0), ("T4", 35.0), ("T3", 35.0)], 4),
        ("Fertility Hormones", &[
            ("Prolactin", 40.0), ("LH", 40.0), ("Progesterone", 40.0), ("FSH", 40.0),
        ], 5),
        ("Other Biochemistry Tests", &[
            ("CRP", 30.0), ("PSA (Prostate Cancer)", 45.0), ("TOXO TITREES", 35.0),
            ("SERUM CRAG", 35.0), ("Oral GTT / FBS / RBS", 25.0),
        ], 6),
        ("Hematology", &[
            ("CBC / FBC", 30.0), ("Sickle Cell Test", 25.0), ("Film Comment", 20.0),
            ("Blood & Rhesus Grouping", 20.0), ("Bleeding Time", 15.0),
            ("Clotting Time", 15.0), ("B/S & RDT for Malaria", 20.0),
        ], 7),
        ("Serological Test", &[
            ("Typhoid IgG/IgM & WIDAL Titres", 35.0), ("BAT (Brucella)", 35.0),
            ("TPHA (Syphilis) VDRL", 35.0), ("H. Pylori Antibody & Antigen in Stool", 35.0),
            ("Urine/Serum HCG (Pregnancy)", 20.0),
            ("Hepatitis B (HBs Ag), Hep A & HCV", 45.0),
            ("HIV 1/2 Complete Screen", 40.0),
            ("Hepatitis B Core Antibody & Envelope", 50.0),
            ("Hepatitis B Viro Load", 120.0), ("TB LAM Test", 40.0),
        ], 8),
        ("Microbiological Tests", &[
            ("Blood Culture & Sensitivity", 60.0), ("Sputum for Genexpert & ZN", 55.0),
            ("Stool Analysis, Culture & Sensitivity", 50.0),
            ("Faecal Occult Blood", 30.0), ("Stool for Modified ZN", 35.0),
            ("Pus Swab for Culture & Sensitivity", 50.0),
            ("Urinalysis Complete, C&S", 40.0),
        ], 9),
    ];

    for (cat_name, tests, sort) in categories {
        conn.execute("INSERT INTO test_categories (name, sort_order) VALUES (?1, ?2)", params![cat_name, sort])?;
        let cat_id = conn.last_insert_rowid();
        for (test_name, price) in tests.iter() {
            conn.execute("INSERT INTO tests (name, category_id, price) VALUES (?1, ?2, ?3)", params![test_name, cat_id, price])?;
        }
    }

    let pw = hash("Admin@123", DEFAULT_COST).expect("bcrypt failed");
    conn.execute(
        "INSERT OR IGNORE INTO users (username, full_name, password_hash, role) VALUES (?1, ?2, ?3, ?4)",
        params!["admin", "System Administrator", pw, "admin"],
    )?;
    Ok(())
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn log_action(db: &Connection, user_id: i64, user_name: &str, action: &str, entity_type: Option<&str>, entity_id: Option<i64>, details: Option<&str>) {
    let _ = db.execute(
        "INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details) VALUES (?1,?2,?3,?4,?5,?6)",
        params![user_id, user_name, action, entity_type, entity_id, details],
    );
}

fn payment_status(total: f64, paid: f64) -> String {
    if paid <= 0.0 { "unpaid".into() }
    else if paid >= total { "paid".into() }
    else { "partial".into() }
}

fn require_session(session: &Mutex<Option<SessionUser>>) -> Result<SessionUser, String> {
    session.lock().map_err(|_| "Lock error".to_string())?
        .clone().ok_or_else(|| "Not authenticated".to_string())
}

fn row_to_summary(r: &rusqlite::Row) -> rusqlite::Result<OrderSummary> {
    let total: f64 = r.get(7)?;
    let paid: f64 = r.get(8)?;
    let discount: f64 = r.get(12)?;
    let effective = total - discount;
    Ok(OrderSummary {
        id: r.get(0)?, order_number: r.get(1)?, patient_id: r.get(2)?,
        patient_name: r.get(3)?, patient_ref: r.get(4)?, ordered_by_name: r.get(5)?,
        order_date: r.get(6)?, total_amount: total, discount_amount: discount, amount_paid: paid,
        balance: effective - paid, status: r.get(9)?, notes: r.get(10)?,
        item_count: r.get(11)?, payment_status: payment_status(effective, paid),
    })
}

fn db_get_orders(db: &Connection, status_filter: &str, search: &str) -> Result<Vec<OrderSummary>, String> {
    let like = format!("%{}%", search);
    let allowed = ["all", "", "pending", "processing", "completed", "cancelled"];
    if !allowed.contains(&status_filter) {
        return Err("Invalid status filter".to_string());
    }
    let sql = if status_filter.is_empty() || status_filter == "all" {
        "SELECT o.id, o.order_number, o.patient_id, p.full_name, p.patient_id,
                u.full_name, o.order_date, o.total_amount, o.amount_paid, o.status, o.notes,
                (SELECT COUNT(*) FROM test_order_items WHERE order_id = o.id),
                COALESCE(o.discount_amount, 0.0)
         FROM test_orders o
         JOIN patients p ON o.patient_id = p.id
         JOIN users u ON o.ordered_by = u.id
         WHERE (p.full_name LIKE ?1 OR o.order_number LIKE ?1 OR p.patient_id LIKE ?1)
         ORDER BY o.order_date DESC".to_string()
    } else {
        format!(
            "SELECT o.id, o.order_number, o.patient_id, p.full_name, p.patient_id,
                    u.full_name, o.order_date, o.total_amount, o.amount_paid, o.status, o.notes,
                    (SELECT COUNT(*) FROM test_order_items WHERE order_id = o.id),
                    COALESCE(o.discount_amount, 0.0)
             FROM test_orders o
             JOIN patients p ON o.patient_id = p.id
             JOIN users u ON o.ordered_by = u.id
             WHERE o.status = '{}' AND (p.full_name LIKE ?1 OR o.order_number LIKE ?1 OR p.patient_id LIKE ?1)
             ORDER BY o.order_date DESC",
            status_filter
        )
    };
    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![like], row_to_summary).map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
}

fn db_get_order(db: &Connection, order_id: i64) -> Result<OrderDetail, String> {
    let row = db.query_row(
        "SELECT o.id, o.order_number, o.patient_id, p.full_name, p.patient_id,
                p.age, p.gender, p.phone, o.ordered_by, u.full_name,
                o.order_date, o.status, o.total_amount, o.amount_paid, o.notes,
                o.referred_by, o.specimen_type, o.specimen_id, o.collected_at,
                vu.full_name, o.verified_at, COALESCE(o.discount_amount, 0.0)
         FROM test_orders o
         JOIN patients p ON o.patient_id = p.id
         JOIN users u ON o.ordered_by = u.id
         LEFT JOIN users vu ON o.verified_by = vu.id
         WHERE o.id = ?1",
        params![order_id],
        |r| Ok((
            r.get::<_,i64>(0)?, r.get::<_,String>(1)?, r.get::<_,i64>(2)?,
            r.get::<_,String>(3)?, r.get::<_,String>(4)?, r.get::<_,Option<i64>>(5)?,
            r.get::<_,Option<String>>(6)?, r.get::<_,Option<String>>(7)?,
            r.get::<_,i64>(8)?, r.get::<_,String>(9)?, r.get::<_,String>(10)?,
            r.get::<_,String>(11)?, r.get::<_,f64>(12)?, r.get::<_,f64>(13)?,
            r.get::<_,Option<String>>(14)?,
            r.get::<_,Option<String>>(15)?, r.get::<_,Option<String>>(16)?,
            r.get::<_,Option<String>>(17)?, r.get::<_,Option<String>>(18)?,
            r.get::<_,Option<String>>(19)?, r.get::<_,Option<String>>(20)?,
            r.get::<_,f64>(21)?,
        )),
    ).map_err(|e| e.to_string())?;
    let (id, order_number, patient_id, patient_name, patient_ref, patient_age,
         patient_gender, patient_phone, ordered_by_id, ordered_by_name,
         order_date, status, total_amount, amount_paid, notes,
         referred_by, specimen_type, specimen_id, collected_at,
         verified_by_name, verified_at, discount_amount) = row;

    let mut stmt = db.prepare(
        "SELECT oi.id, oi.order_id, oi.test_id, t.name, tc.name, oi.price,
                oi.result_value, oi.unit, oi.reference_range, oi.flag, oi.result_date
         FROM test_order_items oi
         JOIN tests t ON oi.test_id = t.id
         JOIN test_categories tc ON t.category_id = tc.id
         WHERE oi.order_id = ?1 ORDER BY tc.sort_order, t.id"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map(params![order_id], |r| {
        let rv: Option<String> = r.get(6)?;
        Ok(OrderItem {
            id: r.get(0)?, order_id: r.get(1)?, test_id: r.get(2)?,
            test_name: r.get(3)?, category_name: r.get(4)?, price: r.get(5)?,
            result_value: rv.clone(), unit: r.get(7)?, reference_range: r.get(8)?,
            flag: r.get(9)?, result_date: r.get(10)?,
            has_result: rv.is_some(),
        })
    }).map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())?;

    let effective = total_amount - discount_amount;
    let balance = effective - amount_paid;
    let ps = payment_status(effective, amount_paid);
    Ok(OrderDetail {
        id, order_number, patient_id, patient_name, patient_ref, patient_age,
        patient_gender, patient_phone, ordered_by_id, ordered_by_name,
        order_date, status, total_amount, amount_paid, balance, payment_status: ps,
        discount_amount, notes, referred_by, specimen_type, specimen_id, collected_at,
        verified_by_name, verified_at, items,
    })
}

// ─── Commands Module ──────────────────────────────────────────────────────────

pub mod commands {
    use super::*;
    use tauri::State;

    // Auth
    #[tauri::command]
    pub fn login(username: String, password: String, state: State<AppState>) -> Result<SessionUser, String> {
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute_batch("PRAGMA foreign_keys = ON;").ok();
        let row = db.query_row(
            "SELECT id, username, full_name, password_hash, role, COALESCE(failed_attempts,0), locked_until FROM users WHERE username = ?1",
            params![username],
            |r| Ok((r.get::<_,i64>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
                     r.get::<_,String>(3)?, r.get::<_,String>(4)?,
                     r.get::<_,i64>(5)?, r.get::<_,Option<String>>(6)?)),
        ).optional().map_err(|e| e.to_string())?;
        match row {
            None => Err("Invalid username or password".to_string()),
            Some((id, uname, full_name, hash_str, role, failed_attempts, locked_until)) => {
                let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                if let Some(ref until) = locked_until {
                    if now < *until {
                        return Err(format!("Account locked. Try again after {}.", until));
                    }
                }
                if verify(&password, &hash_str).map_err(|e| e.to_string())? {
                    db.execute("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?1", params![id]).ok();
                    let user = SessionUser { id, username: uname.clone(), full_name: full_name.clone(), role: role.clone() };
                    log_action(&db, id, &full_name, "login", Some("user"), Some(id), None);
                    *state.session.lock().map_err(|_| "Lock error".to_string())? = Some(user.clone());
                    Ok(user)
                } else {
                    let attempts = failed_attempts + 1;
                    if attempts >= 5 {
                        let lock_until = (Local::now() + chrono::Duration::minutes(15))
                            .format("%Y-%m-%d %H:%M:%S").to_string();
                        db.execute("UPDATE users SET failed_attempts = ?1, locked_until = ?2 WHERE id = ?3",
                            params![attempts, lock_until, id]).ok();
                        Err("Too many failed attempts. Account locked for 15 minutes.".to_string())
                    } else {
                        db.execute("UPDATE users SET failed_attempts = ?1 WHERE id = ?2", params![attempts, id]).ok();
                        Err(format!("Invalid username or password. {} attempt(s) left before lockout.", 5 - attempts))
                    }
                }
            }
        }
    }

    #[tauri::command]
    pub fn logout(state: State<AppState>) -> Result<(), String> {
        if let Ok(mut guard) = state.session.lock() {
            if let Some(ref u) = guard.clone() {
                if let Ok(db) = state.db.lock() {
                    log_action(&db, u.id, &u.full_name, "logout", Some("user"), Some(u.id), None);
                }
            }
            *guard = None;
        }
        Ok(())
    }

    #[tauri::command]
    pub fn get_current_user(state: State<AppState>) -> Result<Option<SessionUser>, String> {
        Ok(state.session.lock().map_err(|_| "Lock error".to_string())?.clone())
    }

    #[tauri::command]
    pub fn change_password(old_password: String, new_password: String, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let hash_str: String = db.query_row(
            "SELECT password_hash FROM users WHERE id = ?1", params![user.id], |r| r.get(0)
        ).map_err(|e| e.to_string())?;
        if !verify(&old_password, &hash_str).map_err(|e| e.to_string())? {
            return Err("Current password is incorrect".to_string());
        }
        if new_password.len() < 6 { return Err("New password must be at least 6 characters".to_string()); }
        let new_hash = hash(&new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
        db.execute("UPDATE users SET password_hash = ?1 WHERE id = ?2", params![new_hash, user.id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Users
    #[tauri::command]
    pub fn get_users(state: State<AppState>) -> Result<Vec<UserInfo>, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT id, username, full_name, role, email, COALESCE(failed_attempts,0), locked_until, created_at FROM users ORDER BY created_at"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(UserInfo {
            id: r.get(0)?, username: r.get(1)?, full_name: r.get(2)?,
            role: r.get(3)?, email: r.get(4)?, failed_attempts: r.get(5)?,
            locked_until: r.get(6)?, created_at: r.get(7)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn create_user(input: CreateUserInput, state: State<AppState>) -> Result<UserInfo, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        if input.password.len() < 6 { return Err("Password must be at least 6 characters".to_string()); }
        let pw_hash = hash(&input.password, DEFAULT_COST).map_err(|e| e.to_string())?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute(
            "INSERT INTO users (username, full_name, password_hash, role, email) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![input.username, input.full_name, pw_hash, input.role, input.email],
        ).map_err(|e| if e.to_string().contains("UNIQUE") { "Username already exists".to_string() } else { e.to_string() })?;
        let id = db.last_insert_rowid();
        let created_at: String = db.query_row("SELECT created_at FROM users WHERE id = ?1", params![id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        log_action(&db, user.id, &user.full_name, "create_user", Some("user"), Some(id), Some(&input.username));
        Ok(UserInfo { id, username: input.username, full_name: input.full_name, role: input.role,
            email: input.email, failed_attempts: 0, locked_until: None, created_at })
    }

    #[tauri::command]
    pub fn delete_user(user_id: i64, state: State<AppState>) -> Result<(), String> {
        let session = require_session(&state.session)?;
        if session.role != "admin" { return Err("Unauthorized".to_string()); }
        if session.id == user_id { return Err("Cannot delete your own account".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        log_action(&db, session.id, &session.full_name, "delete_user", Some("user"), Some(user_id), None);
        db.execute("DELETE FROM users WHERE id = ?1", params![user_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn unlock_user(user_id: i64, state: State<AppState>) -> Result<(), String> {
        let session = require_session(&state.session)?;
        if session.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?1", params![user_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn update_user_email(user_id: i64, email: String, state: State<AppState>) -> Result<(), String> {
        let session = require_session(&state.session)?;
        if session.role != "admin" && session.id != user_id { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let val: Option<String> = if email.is_empty() { None } else { Some(email) };
        db.execute("UPDATE users SET email = ?1 WHERE id = ?2", params![val, user_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn request_password_reset(identifier: String, state: State<AppState>) -> Result<String, String> {
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let result = db.query_row(
            "SELECT id, email FROM users WHERE username = ?1 OR email = ?1",
            params![identifier],
            |r| Ok((r.get::<_,i64>(0)?, r.get::<_,Option<String>>(1)?)),
        ).optional().map_err(|e| e.to_string())?;
        match result {
            None => Err("No account found with that username or email.".to_string()),
            Some((user_id, email)) => {
                if email.is_none() {
                    return Err("This account has no email configured. Contact your administrator.".to_string());
                }
                let bytes = Uuid::new_v4().into_bytes();
                let n = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) % 1_000_000;
                let token = format!("{:06}", n);
                let expires_at = (Local::now() + chrono::Duration::minutes(30))
                    .format("%Y-%m-%d %H:%M:%S").to_string();
                db.execute("DELETE FROM password_reset_tokens WHERE user_id = ?1", params![user_id]).ok();
                db.execute(
                    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?1, ?2, ?3)",
                    params![user_id, token.clone(), expires_at],
                ).map_err(|e| e.to_string())?;
                Ok(token)
            }
        }
    }

    #[tauri::command]
    pub fn reset_password(token: String, new_password: String, state: State<AppState>) -> Result<(), String> {
        if new_password.len() < 6 { return Err("Password must be at least 6 characters.".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let result = db.query_row(
            "SELECT id, user_id FROM password_reset_tokens WHERE token = ?1 AND used = 0 AND expires_at > ?2",
            params![token, now],
            |r| Ok((r.get::<_,i64>(0)?, r.get::<_,i64>(1)?)),
        ).optional().map_err(|e| e.to_string())?;
        match result {
            None => Err("Invalid or expired reset code.".to_string()),
            Some((token_id, user_id)) => {
                let new_hash = hash(&new_password, DEFAULT_COST).map_err(|e| e.to_string())?;
                db.execute(
                    "UPDATE users SET password_hash = ?1, failed_attempts = 0, locked_until = NULL WHERE id = ?2",
                    params![new_hash, user_id],
                ).map_err(|e| e.to_string())?;
                db.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?1", params![token_id])
                    .map_err(|e| e.to_string())?;
                Ok(())
            }
        }
    }

    // Patients
    #[tauri::command]
    pub fn get_patients(search: String, state: State<AppState>) -> Result<Vec<Patient>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let like = format!("%{}%", search);
        let mut stmt = db.prepare(
            "SELECT id, patient_id, full_name, age, gender, phone, email, address, created_at
             FROM patients WHERE full_name LIKE ?1 OR patient_id LIKE ?1 OR phone LIKE ?1
             ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![like], |r| Ok(Patient {
            id: r.get(0)?, patient_id: r.get(1)?, full_name: r.get(2)?,
            age: r.get(3)?, gender: r.get(4)?, phone: r.get(5)?,
            email: r.get(6)?, address: r.get(7)?, created_at: r.get(8)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_patient(patient_id: i64, state: State<AppState>) -> Result<Patient, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.query_row(
            "SELECT id, patient_id, full_name, age, gender, phone, email, address, created_at FROM patients WHERE id = ?1",
            params![patient_id],
            |r| Ok(Patient {
                id: r.get(0)?, patient_id: r.get(1)?, full_name: r.get(2)?,
                age: r.get(3)?, gender: r.get(4)?, phone: r.get(5)?,
                email: r.get(6)?, address: r.get(7)?, created_at: r.get(8)?,
            }),
        ).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn create_patient(input: CreatePatientInput, state: State<AppState>) -> Result<Patient, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let pid = {
            let count: i64 = db.query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0)).map_err(|e| e.to_string())?;
            format!("NDL{:05}", count + 1)
        };
        db.execute(
            "INSERT INTO patients (patient_id, full_name, age, gender, phone, email, address) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![pid, input.full_name, input.age, input.gender, input.phone, input.email, input.address],
        ).map_err(|e| e.to_string())?;
        let id = db.last_insert_rowid();
        db.query_row(
            "SELECT id, patient_id, full_name, age, gender, phone, email, address, created_at FROM patients WHERE id = ?1",
            params![id],
            |r| Ok(Patient { id: r.get(0)?, patient_id: r.get(1)?, full_name: r.get(2)?, age: r.get(3)?, gender: r.get(4)?, phone: r.get(5)?, email: r.get(6)?, address: r.get(7)?, created_at: r.get(8)? }),
        ).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn update_patient(patient_id: i64, input: CreatePatientInput, state: State<AppState>) -> Result<Patient, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute(
            "UPDATE patients SET full_name=?1,age=?2,gender=?3,phone=?4,email=?5,address=?6 WHERE id=?7",
            params![input.full_name, input.age, input.gender, input.phone, input.email, input.address, patient_id],
        ).map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT id, patient_id, full_name, age, gender, phone, email, address, created_at FROM patients WHERE id = ?1",
            params![patient_id],
            |r| Ok(Patient { id: r.get(0)?, patient_id: r.get(1)?, full_name: r.get(2)?, age: r.get(3)?, gender: r.get(4)?, phone: r.get(5)?, email: r.get(6)?, address: r.get(7)?, created_at: r.get(8)? }),
        ).map_err(|e| e.to_string())
    }

    // Tests
    #[tauri::command]
    pub fn get_test_categories(state: State<AppState>) -> Result<Vec<TestCategory>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare("SELECT id, name FROM test_categories ORDER BY sort_order").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(TestCategory { id: r.get(0)?, name: r.get(1)? })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_tests(state: State<AppState>) -> Result<Vec<TestItem>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT t.id, t.name, t.category_id, tc.name, t.price FROM tests t JOIN test_categories tc ON t.category_id = tc.id ORDER BY tc.sort_order, t.id"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(TestItem { id: r.get(0)?, name: r.get(1)?, category_id: r.get(2)?, category_name: r.get(3)?, price: r.get(4)? })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn update_test_price(test_id: i64, price: f64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("UPDATE tests SET price = ?1 WHERE id = ?2", params![price, test_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn create_test_category(name: String, state: State<AppState>) -> Result<TestCategory, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let sort_order: i64 = db.query_row(
            "SELECT COALESCE(MAX(sort_order), 0) FROM test_categories", [], |r| r.get(0)
        ).unwrap_or(0) + 1;
        db.execute("INSERT INTO test_categories (name, sort_order) VALUES (?1, ?2)", params![name, sort_order])
            .map_err(|e| if e.to_string().contains("UNIQUE") { "Category already exists".to_string() } else { e.to_string() })?;
        let id = db.last_insert_rowid();
        Ok(TestCategory { id, name })
    }

    #[tauri::command]
    pub fn delete_test_category(category_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let count: i64 = db.query_row(
            "SELECT COUNT(*) FROM tests WHERE category_id = ?1", params![category_id], |r| r.get(0)
        ).unwrap_or(0);
        if count > 0 { return Err(format!("Cannot delete: category has {} test(s). Remove tests first.", count)); }
        db.execute("DELETE FROM test_categories WHERE id = ?1", params![category_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn create_test(name: String, category_id: i64, price: f64, state: State<AppState>) -> Result<TestItem, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let cat_name: String = db.query_row(
            "SELECT name FROM test_categories WHERE id = ?1", params![category_id], |r| r.get(0)
        ).map_err(|_| "Category not found".to_string())?;
        db.execute("INSERT INTO tests (name, category_id, price) VALUES (?1, ?2, ?3)", params![name, category_id, price])
            .map_err(|e| e.to_string())?;
        let id = db.last_insert_rowid();
        Ok(TestItem { id, name, category_id, category_name: cat_name, price })
    }

    #[tauri::command]
    pub fn delete_test(test_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("DELETE FROM tests WHERE id = ?1", params![test_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn rename_test_category(category_id: i64, name: String, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("UPDATE test_categories SET name = ?1 WHERE id = ?2", params![name, category_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Orders
    #[tauri::command]
    pub fn create_order(input: CreateOrderInput, state: State<AppState>) -> Result<OrderDetail, String> {
        let session = require_session(&state.session)?;
        if input.items.is_empty() { return Err("No tests selected".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute_batch("PRAGMA foreign_keys = ON;").ok();
        let order_num = {
            let count: i64 = db.query_row("SELECT COUNT(*) FROM test_orders", [], |r| r.get(0)).map_err(|e| e.to_string())?;
            format!("ORD{:06}", count + 1)
        };
        let total: f64 = input.items.iter().map(|i| i.price).sum();
        db.execute(
            "INSERT INTO test_orders (order_number, patient_id, ordered_by, total_amount, notes, referred_by, specimen_type, specimen_id, collected_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![order_num, input.patient_id, session.id, total, input.notes, input.referred_by, input.specimen_type, input.specimen_id, input.collected_at],
        ).map_err(|e| e.to_string())?;
        let order_id = db.last_insert_rowid();
        for item in &input.items {
            db.execute("INSERT INTO test_order_items (order_id, test_id, price) VALUES (?1, ?2, ?3)", params![order_id, item.test_id, item.price])
                .map_err(|e| e.to_string())?;
        }
        log_action(&db, session.id, &session.full_name, "create_order", Some("order"), Some(order_id), Some(&order_num));
        db_get_order(&db, order_id)
    }

    #[tauri::command]
    pub fn get_orders(status_filter: String, search: String, state: State<AppState>) -> Result<Vec<OrderSummary>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db_get_orders(&db, &status_filter, &search)
    }

    #[tauri::command]
    pub fn get_order(order_id: i64, state: State<AppState>) -> Result<OrderDetail, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db_get_order(&db, order_id)
    }

    #[tauri::command]
    pub fn update_order_status(order_id: i64, new_status: String, state: State<AppState>) -> Result<(), String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("UPDATE test_orders SET status = ?1 WHERE id = ?2", params![new_status, order_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn delete_order(order_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Only admins can delete orders".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute_batch("PRAGMA foreign_keys = ON;").ok();
        log_action(&db, user.id, &user.full_name, "delete_order", Some("order"), Some(order_id), None);
        db.execute("DELETE FROM payments WHERE order_id = ?1", params![order_id]).map_err(|e| e.to_string())?;
        db.execute("DELETE FROM test_orders WHERE id = ?1", params![order_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Billing
    #[tauri::command]
    pub fn get_billing(payment_filter: String, date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<OrderSummary>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut sql = "SELECT o.id, o.order_number, o.patient_id, p.full_name, p.patient_id,
                              u.full_name, o.order_date, o.total_amount, o.amount_paid, o.status, o.notes,
                              (SELECT COUNT(*) FROM test_order_items WHERE order_id = o.id),
                              COALESCE(o.discount_amount, 0.0)
                       FROM test_orders o
                       JOIN patients p ON o.patient_id = p.id
                       JOIN users u ON o.ordered_by = u.id
                       WHERE 1=1".to_string();
        if !date_from.is_empty() { sql.push_str(&format!(" AND date(o.order_date) >= '{}'", date_from.replace('\'', ""))); }
        if !date_to.is_empty() { sql.push_str(&format!(" AND date(o.order_date) <= '{}'", date_to.replace('\'', ""))); }
        match payment_filter.as_str() {
            "paid" => sql.push_str(" AND o.amount_paid >= o.total_amount"),
            "unpaid" => sql.push_str(" AND o.amount_paid = 0"),
            "partial" => sql.push_str(" AND o.amount_paid > 0 AND o.amount_paid < o.total_amount"),
            _ => {}
        }
        sql.push_str(" ORDER BY o.order_date DESC");
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], row_to_summary).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn add_payment(input: AddPaymentInput, state: State<AppState>) -> Result<Payment, String> {
        let session = require_session(&state.session)?;
        if input.amount <= 0.0 { return Err("Amount must be greater than zero".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let (total, paid, discount): (f64, f64, f64) = db.query_row(
            "SELECT total_amount, amount_paid, COALESCE(discount_amount,0.0) FROM test_orders WHERE id = ?1",
            params![input.order_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).map_err(|e| e.to_string())?;
        let effective_total = total - discount;
        let new_paid = paid + input.amount;
        if new_paid > effective_total + 0.001 { return Err(format!("Payment exceeds balance. Max: {:.2}", effective_total - paid)); }
        let receipt_num = format!("RCP{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
        db.execute(
            "INSERT INTO payments (order_id, amount, payment_method, receipt_number, processed_by, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![input.order_id, input.amount, input.payment_method, receipt_num, session.id, input.notes],
        ).map_err(|e| e.to_string())?;
        let pay_id = db.last_insert_rowid();
        db.execute("UPDATE test_orders SET amount_paid = ?1 WHERE id = ?2", params![new_paid, input.order_id])
            .map_err(|e| e.to_string())?;
        log_action(&db, session.id, &session.full_name, "add_payment", Some("order"), Some(input.order_id), Some(&format!("{:.2}", input.amount)));
        let order_number: String = db.query_row("SELECT order_number FROM test_orders WHERE id = ?1", params![input.order_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        let payment_date: String = db.query_row("SELECT payment_date FROM payments WHERE id = ?1", params![pay_id], |r| r.get(0)).map_err(|e| e.to_string())?;
        Ok(Payment {
            id: pay_id, order_id: input.order_id, order_number, amount: input.amount,
            payment_date, payment_method: input.payment_method,
            receipt_number: receipt_num, processed_by_name: session.full_name, notes: input.notes,
        })
    }

    #[tauri::command]
    pub fn get_order_payments(order_id: i64, state: State<AppState>) -> Result<Vec<Payment>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT p.id, p.order_id, o.order_number, p.amount, p.payment_date,
                    p.payment_method, p.receipt_number, u.full_name, p.notes
             FROM payments p JOIN test_orders o ON p.order_id = o.id JOIN users u ON p.processed_by = u.id
             WHERE p.order_id = ?1 ORDER BY p.payment_date"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![order_id], |r| Ok(Payment {
            id: r.get(0)?, order_id: r.get(1)?, order_number: r.get(2)?,
            amount: r.get(3)?, payment_date: r.get(4)?, payment_method: r.get(5)?,
            receipt_number: r.get(6)?, processed_by_name: r.get(7)?, notes: r.get(8)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_receipt_data(order_id: i64, state: State<AppState>) -> Result<ReceiptData, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let (order_number, patient_name, patient_ref, patient_age, patient_gender, ordered_by_name, total_amount, amount_paid, notes, discount_amount) =
            db.query_row(
                "SELECT o.order_number, p.full_name, p.patient_id, p.age, p.gender, u.full_name, o.total_amount, o.amount_paid, o.notes, COALESCE(o.discount_amount,0.0)
                 FROM test_orders o JOIN patients p ON o.patient_id = p.id JOIN users u ON o.ordered_by = u.id WHERE o.id = ?1",
                params![order_id],
                |r| Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
                         r.get::<_,Option<i64>>(3)?, r.get::<_,Option<String>>(4)?,
                         r.get::<_,String>(5)?, r.get::<_,f64>(6)?, r.get::<_,f64>(7)?,
                         r.get::<_,Option<String>>(8)?, r.get::<_,f64>(9)?)),
            ).map_err(|e| e.to_string())?;
        let (receipt_number, payment_date, payment_method, cashier_name): (String, String, String, String) =
            db.query_row(
                "SELECT p.receipt_number, p.payment_date, p.payment_method, u.full_name FROM payments p JOIN users u ON p.processed_by = u.id WHERE p.order_id = ?1 ORDER BY p.payment_date DESC LIMIT 1",
                params![order_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            ).unwrap_or_else(|_| (
                format!("RCP-{}", order_id),
                Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                "cash".to_string(),
                ordered_by_name.clone(),
            ));
        let mut stmt = db.prepare(
            "SELECT t.name, tc.name, oi.price FROM test_order_items oi JOIN tests t ON oi.test_id = t.id JOIN test_categories tc ON t.category_id = tc.id WHERE oi.order_id = ?1 ORDER BY tc.sort_order, t.id"
        ).map_err(|e| e.to_string())?;
        let items = stmt.query_map(params![order_id], |r| Ok(ReceiptItem { test_name: r.get(0)?, category_name: r.get(1)?, price: r.get(2)? }))
            .map_err(|e| e.to_string())?.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())?;
        let effective_total = total_amount - discount_amount;
        Ok(ReceiptData {
            receipt_number, payment_date, order_number, patient_name, patient_ref,
            patient_age, patient_gender, cashier_name, payment_method, items,
            total_amount, discount_amount, amount_paid, balance: effective_total - amount_paid, notes,
        })
    }

    // Results
    #[tauri::command]
    pub fn update_result(input: UpdateResultInput, state: State<AppState>) -> Result<(), String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        db.execute(
            "UPDATE test_order_items SET result_value=?1, unit=?2, reference_range=?3, flag=?4, result_date=?5 WHERE id=?6",
            params![input.result_value, input.unit, input.reference_range, input.flag, now, input.item_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn mark_results_complete(order_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("UPDATE test_orders SET status = 'completed' WHERE id = ?1", params![order_id])
            .map_err(|e| e.to_string())?;
        log_action(&db, user.id, &user.full_name, "mark_complete", Some("order"), Some(order_id), None);
        Ok(())
    }

    #[tauri::command]
    pub fn get_results_report(order_id: i64, state: State<AppState>) -> Result<ResultsReportData, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let (order_number, order_date, patient_name, patient_ref, patient_age, patient_gender, patient_phone, requested_by, referred_by, specimen_type, specimen_id, verified_by, verified_at) =
            db.query_row(
                "SELECT o.order_number, o.order_date, p.full_name, p.patient_id, p.age, p.gender, p.phone, u.full_name, o.referred_by, o.specimen_type, o.specimen_id, vu.full_name, o.verified_at FROM test_orders o JOIN patients p ON o.patient_id = p.id JOIN users u ON o.ordered_by = u.id LEFT JOIN users vu ON o.verified_by = vu.id WHERE o.id = ?1",
                params![order_id],
                |r| Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
                         r.get::<_,String>(3)?, r.get::<_,Option<i64>>(4)?, r.get::<_,Option<String>>(5)?,
                         r.get::<_,Option<String>>(6)?, r.get::<_,String>(7)?,
                         r.get::<_,Option<String>>(8)?, r.get::<_,Option<String>>(9)?,
                         r.get::<_,Option<String>>(10)?, r.get::<_,Option<String>>(11)?,
                         r.get::<_,Option<String>>(12)?)),
            ).map_err(|e| e.to_string())?;
        let mut stmt = db.prepare(
            "SELECT tc.name, t.name, oi.result_value, oi.unit, oi.reference_range, oi.flag, oi.result_date FROM test_order_items oi JOIN tests t ON oi.test_id = t.id JOIN test_categories tc ON t.category_id = tc.id WHERE oi.order_id = ?1 AND oi.result_value IS NOT NULL ORDER BY tc.sort_order, t.id"
        ).map_err(|e| e.to_string())?;
        let mut category_map: Vec<(String, Vec<ResultItem>)> = Vec::new();
        let mut result_date_max: Option<String> = None;
        let rows = stmt.query_map(params![order_id], |r| {
            Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,Option<String>>(2)?,
                r.get::<_,Option<String>>(3)?, r.get::<_,Option<String>>(4)?,
                r.get::<_,Option<String>>(5)?, r.get::<_,Option<String>>(6)?))
        }).map_err(|e| e.to_string())?;
        for row in rows {
            let (cat_name, test_name, result_value, unit, reference_range, flag, rd) = row.map_err(|e| e.to_string())?;
            if let Some(ref rd_val) = rd {
                if result_date_max.as_deref().map_or(true, |x| x < rd_val.as_str()) {
                    result_date_max = Some(rd_val.clone());
                }
            }
            let item = ResultItem { test_name, result_value, unit, reference_range, flag };
            if let Some(cat) = category_map.iter_mut().find(|(n, _)| n == &cat_name) {
                cat.1.push(item);
            } else {
                category_map.push((cat_name, vec![item]));
            }
        }
        let categories = category_map.into_iter().map(|(name, items)| ResultCategory { name, items }).collect();
        Ok(ResultsReportData {
            order_number, order_date,
            result_date: result_date_max.unwrap_or_else(|| Local::now().format("%Y-%m-%d %H:%M:%S").to_string()),
            patient_name, patient_ref, patient_age, patient_gender, patient_phone, requested_by,
            referred_by, specimen_type, specimen_id, verified_by, verified_at, categories,
        })
    }

    // Add tests to existing order
    #[tauri::command]
    pub fn add_tests_to_order(order_id: i64, items: Vec<OrderItemInput>, state: State<AppState>) -> Result<OrderDetail, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        for item in &items {
            db.execute(
                "INSERT INTO test_order_items (order_id, test_id, price) VALUES (?1, ?2, ?3)",
                params![order_id, item.test_id, item.price],
            ).map_err(|e| e.to_string())?;
        }
        let total: f64 = db.query_row(
            "SELECT COALESCE(SUM(price), 0.0) FROM test_order_items WHERE order_id = ?1",
            params![order_id],
            |r| r.get(0),
        ).map_err(|e| e.to_string())?;
        db.execute("UPDATE test_orders SET total_amount = ?1 WHERE id = ?2", params![total, order_id])
            .map_err(|e| e.to_string())?;
        db_get_order(&db, order_id)
    }

    // Revenue statistics for dashboard chart
    #[tauri::command]
    pub fn get_revenue_stats(period: String, date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<RevenueStat>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let fmt = match period.as_str() {
            "month" => "%Y-%m",
            "week"  => "%Y-W%W",
            _       => "%Y-%m-%d",
        };
        let where_clause = match (date_from.is_empty(), date_to.is_empty()) {
            (true,  true)  => "1=1".to_string(),
            (true,  false) => format!("date(payment_date) <= '{}'", date_to),
            (false, true)  => format!("date(payment_date) >= '{}'", date_from),
            (false, false) => format!("date(payment_date) BETWEEN '{}' AND '{}'", date_from, date_to),
        };
        let sql = format!(
            "SELECT strftime('{}', payment_date) as period, COALESCE(SUM(amount),0) as revenue, COUNT(DISTINCT order_id) as order_count FROM payments WHERE {} GROUP BY period ORDER BY period",
            fmt, where_clause
        );
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| {
            Ok(RevenueStat { period: r.get(0)?, revenue: r.get(1)?, order_count: r.get(2)? })
        }).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    // Top tests
    #[tauri::command]
    pub fn get_top_tests(limit: i64, state: State<AppState>) -> Result<Vec<TopTest>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT t.name, COUNT(*) as order_count, COALESCE(SUM(oi.price),0) as revenue FROM test_order_items oi JOIN tests t ON oi.test_id = t.id GROUP BY oi.test_id ORDER BY order_count DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![limit], |r| {
            Ok(TopTest { test_name: r.get(0)?, order_count: r.get(1)?, revenue: r.get(2)? })
        }).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    // Reference Ranges
    #[tauri::command]
    pub fn get_reference_ranges(test_id: i64, state: State<AppState>) -> Result<Vec<ReferenceRange>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT rr.id, rr.test_id, t.name, rr.gender, rr.age_min, rr.age_max, rr.unit, rr.reference_range
             FROM test_reference_ranges rr JOIN tests t ON rr.test_id = t.id
             WHERE rr.test_id = ?1 ORDER BY rr.gender NULLS LAST, rr.age_min NULLS LAST"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![test_id], |r| Ok(ReferenceRange {
            id: r.get(0)?, test_id: r.get(1)?, test_name: r.get(2)?,
            gender: r.get(3)?, age_min: r.get(4)?, age_max: r.get(5)?,
            unit: r.get(6)?, reference_range: r.get(7)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn save_reference_range(input: SaveReferenceRangeInput, state: State<AppState>) -> Result<ReferenceRange, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let test_name: String = db.query_row(
            "SELECT name FROM tests WHERE id = ?1", params![input.test_id], |r| r.get(0)
        ).map_err(|_| "Test not found".to_string())?;
        let id = match input.id {
            Some(existing_id) if existing_id > 0 => {
                db.execute(
                    "UPDATE test_reference_ranges SET gender=?1, age_min=?2, age_max=?3, unit=?4, reference_range=?5 WHERE id=?6",
                    params![input.gender, input.age_min, input.age_max, input.unit, input.reference_range, existing_id],
                ).map_err(|e| e.to_string())?;
                existing_id
            }
            _ => {
                db.execute(
                    "INSERT INTO test_reference_ranges (test_id, gender, age_min, age_max, unit, reference_range) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![input.test_id, input.gender, input.age_min, input.age_max, input.unit, input.reference_range],
                ).map_err(|e| e.to_string())?;
                db.last_insert_rowid()
            }
        };
        Ok(ReferenceRange { id, test_id: input.test_id, test_name, gender: input.gender, age_min: input.age_min, age_max: input.age_max, unit: input.unit, reference_range: input.reference_range })
    }

    #[tauri::command]
    pub fn delete_reference_range(range_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        db.execute("DELETE FROM test_reference_ranges WHERE id = ?1", params![range_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn get_autofill_for_test(test_id: i64, gender: Option<String>, age: Option<i64>, state: State<AppState>) -> Result<Option<AutoFillData>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let gender_val = gender.unwrap_or_default();
        let age_val = age.unwrap_or(-1);
        let result = db.query_row(
            "SELECT unit, reference_range FROM test_reference_ranges
             WHERE test_id = ?1
             AND (gender IS NULL OR gender = ?2)
             AND (age_min IS NULL OR age_min <= ?3)
             AND (age_max IS NULL OR age_max >= ?3)
             ORDER BY
               CASE WHEN gender IS NOT NULL THEN 0 ELSE 1 END,
               CASE WHEN age_min IS NOT NULL THEN 0 ELSE 1 END
             LIMIT 1",
            params![test_id, gender_val, age_val],
            |r| Ok(AutoFillData { unit: r.get(0)?, reference_range: r.get(1)? }),
        ).optional().map_err(|e| e.to_string())?;
        Ok(result)
    }

    #[tauri::command]
    pub fn verify_order(order_id: i64, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        db.execute(
            "UPDATE test_orders SET verified_by = ?1, verified_at = ?2 WHERE id = ?3",
            params![user.id, now, order_id],
        ).map_err(|e| e.to_string())?;
        log_action(&db, user.id, &user.full_name, "verify_order", Some("order"), Some(order_id), None);
        Ok(())
    }

    #[tauri::command]
    pub fn backup_database(app_handle: tauri::AppHandle, state: State<AppState>) -> Result<String, String> {
        require_session(&state.session)?;
        let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let db_path = data_dir.join("ndl_lab.db");
        let backup_dir = data_dir.join("backups");
        std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
        let now = Local::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_path = backup_dir.join(format!("ndl_lab_{}.db", now));
        std::fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
        Ok(backup_path.to_string_lossy().to_string())
    }

    // Discounts
    #[tauri::command]
    pub fn set_discount(order_id: i64, discount_amount: f64, discount_reason: Option<String>, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        if discount_amount < 0.0 { return Err("Discount cannot be negative".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let total: f64 = db.query_row(
            "SELECT total_amount FROM test_orders WHERE id = ?1",
            params![order_id], |r| r.get(0),
        ).map_err(|e| e.to_string())?;
        if discount_amount > total { return Err("Discount cannot exceed total amount".to_string()); }
        db.execute(
            "UPDATE test_orders SET discount_amount = ?1, discount_reason = ?2 WHERE id = ?3",
            params![discount_amount, discount_reason, order_id],
        ).map_err(|e| e.to_string())?;
        log_action(&db, user.id, &user.full_name, "set_discount", Some("order"), Some(order_id), Some(&format!("{:.2}", discount_amount)));
        Ok(())
    }

    // Reports
    #[tauri::command]
    pub fn get_pending_results_report(state: State<AppState>) -> Result<Vec<PendingOrder>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT o.id, o.order_number, p.full_name, p.patient_id, o.order_date,
                    CAST(julianday('now') - julianday(o.order_date) AS INTEGER),
                    COUNT(oi.id),
                    SUM(CASE WHEN oi.result_value IS NOT NULL THEN 1 ELSE 0 END)
             FROM test_orders o
             JOIN patients p ON o.patient_id = p.id
             JOIN test_order_items oi ON oi.order_id = o.id
             WHERE o.status IN ('pending', 'processing')
             GROUP BY o.id ORDER BY 6 DESC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(PendingOrder {
            id: r.get(0)?, order_number: r.get(1)?, patient_name: r.get(2)?,
            patient_ref: r.get(3)?, order_date: r.get(4)?, days_pending: r.get(5)?,
            test_count: r.get(6)?, results_entered: r.get(7)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_workload_report(date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<WorkloadStat>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut sql = "SELECT date(o.order_date), u.full_name,
                              COUNT(DISTINCT o.id),
                              COUNT(oi.id),
                              SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END)
                       FROM test_orders o
                       JOIN users u ON o.ordered_by = u.id
                       JOIN test_order_items oi ON oi.order_id = o.id
                       WHERE 1=1".to_string();
        if !date_from.is_empty() { sql.push_str(&format!(" AND date(o.order_date) >= '{}'", date_from.replace('\'', ""))); }
        if !date_to.is_empty() { sql.push_str(&format!(" AND date(o.order_date) <= '{}'", date_to.replace('\'', ""))); }
        sql.push_str(" GROUP BY date(o.order_date), u.id ORDER BY date(o.order_date) DESC");
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(WorkloadStat {
            date: r.get(0)?, user_name: r.get(1)?,
            orders_count: r.get(2)?, tests_count: r.get(3)?, completed_count: r.get(4)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_financial_report(period: String, date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<FinancialStat>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let fmt = match period.as_str() { "month" => "%Y-%m", "week" => "%Y-W%W", _ => "%Y-%m-%d" };
        let mut sql = format!(
            "SELECT strftime('{}', o.order_date),
                    COALESCE(SUM(o.total_amount),0),
                    COALESCE(SUM(o.amount_paid),0),
                    COALESCE(SUM(o.discount_amount),0),
                    COALESCE(SUM(o.total_amount - COALESCE(o.discount_amount,0) - o.amount_paid),0),
                    COUNT(*)
             FROM test_orders o WHERE 1=1", fmt
        );
        if !date_from.is_empty() { sql.push_str(&format!(" AND date(o.order_date) >= '{}'", date_from.replace('\'', ""))); }
        if !date_to.is_empty() { sql.push_str(&format!(" AND date(o.order_date) <= '{}'", date_to.replace('\'', ""))); }
        sql.push_str(" GROUP BY 1 ORDER BY 1 DESC");
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(FinancialStat {
            period: r.get(0)?, total_billed: r.get(1)?, total_collected: r.get(2)?,
            discount_total: r.get(3)?, outstanding: r.get(4)?, order_count: r.get(5)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_tat_report(date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<TATItem>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut sql = "SELECT o.id, o.order_number, p.full_name, o.order_date,
                              MAX(oi.result_date),
                              CASE WHEN MAX(oi.result_date) IS NOT NULL
                                   THEN (julianday(MAX(oi.result_date)) - julianday(o.order_date)) * 24
                                   ELSE NULL END,
                              o.status
                       FROM test_orders o
                       JOIN patients p ON o.patient_id = p.id
                       JOIN test_order_items oi ON oi.order_id = o.id
                       WHERE 1=1".to_string();
        if !date_from.is_empty() { sql.push_str(&format!(" AND date(o.order_date) >= '{}'", date_from.replace('\'', ""))); }
        if !date_to.is_empty() { sql.push_str(&format!(" AND date(o.order_date) <= '{}'", date_to.replace('\'', ""))); }
        sql.push_str(" GROUP BY o.id ORDER BY o.order_date DESC");
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(TATItem {
            order_id: r.get(0)?, order_number: r.get(1)?, patient_name: r.get(2)?,
            order_date: r.get(3)?, result_date: r.get(4)?, tat_hours: r.get(5)?, status: r.get(6)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn get_critical_values_report(date_from: String, date_to: String, state: State<AppState>) -> Result<Vec<CriticalItem>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut sql = "SELECT o.id, o.order_number, p.full_name, p.patient_id,
                              t.name, oi.result_value, oi.unit, oi.result_date
                       FROM test_order_items oi
                       JOIN test_orders o ON oi.order_id = o.id
                       JOIN patients p ON o.patient_id = p.id
                       JOIN tests t ON oi.test_id = t.id
                       WHERE oi.flag = 'C'".to_string();
        if !date_from.is_empty() { sql.push_str(&format!(" AND date(oi.result_date) >= '{}'", date_from.replace('\'', ""))); }
        if !date_to.is_empty() { sql.push_str(&format!(" AND date(oi.result_date) <= '{}'", date_to.replace('\'', ""))); }
        sql.push_str(" ORDER BY oi.result_date DESC");
        let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(CriticalItem {
            order_id: r.get(0)?, order_number: r.get(1)?, patient_name: r.get(2)?,
            patient_ref: r.get(3)?, test_name: r.get(4)?, result_value: r.get(5)?,
            unit: r.get(6)?, result_date: r.get(7)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    // Global Search
    #[tauri::command]
    pub fn global_search(query: String, state: State<AppState>) -> Result<Vec<SearchResult>, String> {
        require_session(&state.session)?;
        if query.trim().len() < 2 { return Ok(vec![]); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let like = format!("%{}%", query.trim());
        let mut results: Vec<SearchResult> = Vec::new();
        let mut stmt = db.prepare(
            "SELECT id, full_name, patient_id FROM patients WHERE full_name LIKE ?1 OR patient_id LIKE ?1 OR phone LIKE ?1 LIMIT 5"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![like], |r| Ok(SearchResult {
            kind: "patient".to_string(), id: r.get(0)?, title: r.get(1)?, subtitle: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        for r in rows { results.push(r.map_err(|e| e.to_string())?); }
        let mut stmt = db.prepare(
            "SELECT o.id, o.order_number, p.full_name FROM test_orders o JOIN patients p ON o.patient_id = p.id WHERE o.order_number LIKE ?1 OR p.full_name LIKE ?1 LIMIT 5"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![like], |r| Ok(SearchResult {
            kind: "order".to_string(), id: r.get(0)?, title: r.get(1)?, subtitle: r.get(2)?,
        })).map_err(|e| e.to_string())?;
        for r in rows { results.push(r.map_err(|e| e.to_string())?); }
        Ok(results)
    }

    // Audit Log
    #[tauri::command]
    pub fn get_audit_logs(limit: i64, offset: i64, state: State<AppState>) -> Result<Vec<AuditLog>, String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT id, user_name, action, entity_type, entity_id, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![limit, offset], |r| Ok(AuditLog {
            id: r.get(0)?, user_name: r.get(1)?, action: r.get(2)?,
            entity_type: r.get(3)?, entity_id: r.get(4)?, details: r.get(5)?, created_at: r.get(6)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    // Restore Database
    #[tauri::command]
    pub fn restore_database(bytes: Vec<u8>, app_handle: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
        let user = require_session(&state.session)?;
        if user.role != "admin" { return Err("Unauthorized".to_string()); }
        let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let restore_path = data_dir.join("restore_pending.db");
        std::fs::write(&restore_path, &bytes).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Result History / Trending
    #[tauri::command]
    pub fn get_result_history(patient_id: i64, test_id: i64, state: State<AppState>) -> Result<Vec<ResultHistory>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let mut stmt = db.prepare(
            "SELECT oi.result_date, oi.result_value, o.order_number, o.id
             FROM test_order_items oi
             JOIN test_orders o ON oi.order_id = o.id
             WHERE o.patient_id = ?1 AND oi.test_id = ?2
               AND oi.result_value IS NOT NULL AND oi.result_date IS NOT NULL
             ORDER BY oi.result_date ASC"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![patient_id, test_id], |r| Ok(ResultHistory {
            result_date: r.get(0)?, result_value: r.get(1)?,
            order_number: r.get(2)?, order_id: r.get(3)?,
        })).map_err(|e| e.to_string())?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())
    }

    // SMTP
    #[tauri::command]
    pub fn save_smtp_config(input: serde_json::Value, state: State<AppState>) -> Result<(), String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let host = input["host"].as_str().unwrap_or("").to_string();
        let port = input["port"].as_u64().unwrap_or(587) as u16;
        let username = input["username"].as_str().unwrap_or("").to_string();
        let password = input["password"].as_str().unwrap_or("").to_string();
        let from_name = input["from_name"].as_str().unwrap_or("").to_string();
        let from_email = input["from_email"].as_str().unwrap_or("").to_string();
        let use_tls = input["use_tls"].as_bool().unwrap_or(true);
        let port_str = port.to_string();
        let tls_str = if use_tls { "1" } else { "0" };
        let settings: &[(&str, &str)] = &[
            ("smtp_host", &host),
            ("smtp_port", &port_str),
            ("smtp_username", &username),
            ("smtp_password", &password),
            ("smtp_from_name", &from_name),
            ("smtp_from_email", &from_email),
            ("smtp_use_tls", tls_str),
        ];
        for (key, value) in settings {
            db.execute(
                "INSERT INTO app_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            ).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[tauri::command]
    pub fn get_smtp_config(state: State<AppState>) -> Result<Option<SmtpConfig>, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let get = |key: &str| -> String {
            db.query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![key],
                |r| r.get::<_, String>(0),
            ).unwrap_or_default()
        };
        let host = get("smtp_host");
        if host.is_empty() { return Ok(None); }
        Ok(Some(SmtpConfig {
            host,
            port: get("smtp_port").parse().unwrap_or(587),
            username: get("smtp_username"),
            from_name: get("smtp_from_name"),
            from_email: get("smtp_from_email"),
            use_tls: get("smtp_use_tls") == "1",
        }))
    }

    #[tauri::command]
    pub fn send_email_smtp(to_email: String, subject: String, html_body: String, state: State<AppState>) -> Result<(), String> {
        use lettre::message::{header::ContentType, Mailbox};
        use lettre::transport::smtp::authentication::Credentials;
        use lettre::{Message, SmtpTransport, Transport};

        require_session(&state.session)?;
        let (host, port, username, password, from_name, from_email, use_tls) = {
            let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
            let get = |key: &str| -> String {
                db.query_row(
                    "SELECT value FROM app_settings WHERE key = ?1",
                    params![key],
                    |r| r.get::<_, String>(0),
                ).unwrap_or_default()
            };
            (
                get("smtp_host"),
                get("smtp_port").parse::<u16>().unwrap_or(587),
                get("smtp_username"),
                get("smtp_password"),
                get("smtp_from_name"),
                get("smtp_from_email"),
                get("smtp_use_tls") == "1",
            )
        };
        if host.is_empty() {
            return Err("SMTP is not configured. Go to Settings → Email.".to_string());
        }
        let from: Mailbox = format!("{} <{}>", from_name, from_email)
            .parse()
            .map_err(|e: lettre::address::AddressError| format!("Invalid from address: {e}"))?;
        let to: Mailbox = to_email
            .parse()
            .map_err(|e: lettre::address::AddressError| format!("Invalid to address: {e}"))?;
        let email = Message::builder()
            .from(from)
            .to(to)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(html_body)
            .map_err(|e| e.to_string())?;
        let creds = Credentials::new(username, password);
        let transport = if use_tls {
            SmtpTransport::relay(&host)
                .map_err(|e| e.to_string())?
                .port(port)
                .credentials(creds)
                .build()
        } else {
            SmtpTransport::starttls_relay(&host)
                .map_err(|e| e.to_string())?
                .port(port)
                .credentials(creds)
                .build()
        };
        transport.send(&email).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Dashboard
    #[tauri::command]
    pub fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
        require_session(&state.session)?;
        let db = state.db.lock().map_err(|_| "DB lock error".to_string())?;
        let total_patients: i64 = db.query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0)).unwrap_or(0);
        let total_orders: i64 = db.query_row("SELECT COUNT(*) FROM test_orders", [], |r| r.get(0)).unwrap_or(0);
        let pending_orders: i64 = db.query_row("SELECT COUNT(*) FROM test_orders WHERE status = 'pending'", [], |r| r.get(0)).unwrap_or(0);
        let completed_orders: i64 = db.query_row("SELECT COUNT(*) FROM test_orders WHERE status = 'completed'", [], |r| r.get(0)).unwrap_or(0);
        let today_revenue: f64 = db.query_row("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE date(payment_date) = date('now')", [], |r| r.get(0)).unwrap_or(0.0);
        let total_revenue: f64 = db.query_row("SELECT COALESCE(SUM(amount), 0) FROM payments", [], |r| r.get(0)).unwrap_or(0.0);
        let total_outstanding: f64 = db.query_row("SELECT COALESCE(SUM(total_amount - amount_paid), 0) FROM test_orders WHERE amount_paid < total_amount", [], |r| r.get(0)).unwrap_or(0.0);
        let recent_orders = db_get_orders(&db, "all", "")?.into_iter().take(10).collect();
        Ok(DashboardStats {
            total_patients, total_orders, pending_orders, completed_orders,
            today_revenue, total_revenue, total_outstanding, recent_orders,
        })
    }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap());
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("ndl_lab.db");
            // Apply staged restore if present
            let restore_path = data_dir.join("restore_pending.db");
            if restore_path.exists() {
                if std::fs::copy(&restore_path, &db_path).is_ok() {
                    let _ = std::fs::remove_file(&restore_path);
                }
            }
            let conn = Connection::open(&db_path).expect("Failed to open database");
            conn.execute_batch("PRAGMA foreign_keys = ON;").expect("Failed to enable foreign keys");
            init_db(&conn).expect("Failed to initialize database");
            seed_data(&conn).expect("Failed to seed database");
            app.manage(AppState {
                db: Mutex::new(conn),
                session: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::login, commands::logout, commands::get_current_user, commands::change_password,
            commands::get_users, commands::create_user, commands::delete_user,
            commands::unlock_user, commands::update_user_email,
            commands::request_password_reset, commands::reset_password,
            commands::get_patients, commands::get_patient, commands::create_patient, commands::update_patient,
            commands::get_test_categories, commands::get_tests, commands::update_test_price,
            commands::create_test_category, commands::delete_test_category, commands::rename_test_category,
            commands::create_test, commands::delete_test,
            commands::create_order, commands::get_orders, commands::get_order,
            commands::update_order_status, commands::delete_order,
            commands::add_payment, commands::get_billing, commands::get_order_payments, commands::get_receipt_data,
            commands::update_result, commands::mark_results_complete, commands::get_results_report,
            commands::add_tests_to_order,
            commands::get_dashboard_stats, commands::get_revenue_stats, commands::get_top_tests,
            commands::get_reference_ranges, commands::save_reference_range, commands::delete_reference_range,
            commands::get_autofill_for_test, commands::verify_order, commands::backup_database,
            commands::set_discount,
            commands::get_pending_results_report, commands::get_workload_report,
            commands::get_financial_report, commands::get_tat_report,
            commands::get_critical_values_report,
            commands::global_search, commands::get_audit_logs,
            commands::restore_database, commands::get_result_history,
            commands::save_smtp_config, commands::get_smtp_config, commands::send_email_smtp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
