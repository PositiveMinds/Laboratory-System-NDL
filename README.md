# NDL Lab System

**Noble Diagnostic Laboratory Management System** — a full-featured desktop LIS (Laboratory Information System) built with Tauri v2, React, TypeScript, and SQLite.

---

## Features

### Patient & Order Management
- Register patients with demographic details (name, age, gender, phone, address)
- Create test orders with auto-generated order numbers (ORD000001…)
- Track referring doctor, specimen type/ID, and collection time
- Add additional tests to existing orders at any time
- Full order lifecycle: Pending → Processing → Completed / Cancelled

### Lab Results Entry
- Enter results for each test item (value, unit, reference range, flag)
- Auto-fill unit and reference range from configured reference ranges
- Critical value detection — automatic alert dialog when `C` flag is entered
- Mark orders complete directly from the results screen
- Result trending — chart a patient's historical results for any test

### Billing & Payments
- Automatic total calculation from ordered tests
- Add payments with method (cash, card, mobile money, bank transfer, insurance)
- Discount / waiver support (admin-only) with optional reason
- Balance tracking with paid / partial / unpaid status
- Print receipt immediately or on demand

### Printing
- **Receipt printing** — thermal-style receipt with itemized tests, discount line, balance
- **Results report** — formatted multi-category report with lab letterhead, patient details, reference ranges, flags, and verifier signature
- **Barcode labels** — CODE128 barcode labels (2 per order) for specimen tubes

### Reference Ranges
- Configurable per-test reference ranges with gender and age filters
- Auto-populate unit and reference range when entering results for a patient

### Reports
| Report | Description |
|--------|-------------|
| Pending Results | Orders with outstanding results, days pending, progress indicator |
| Workload | Orders and tests per staff member per day |
| Financial | Revenue, collections, discounts, outstanding by day/week/month |
| Turnaround Time (TAT) | TAT in hours per order, average TAT summary |
| Critical Values | All `C`-flagged results with patient and order context |

### Global Search
- Search bar in the header searches patients and orders simultaneously
- Debounced, real-time results with keyboard-accessible dropdown

### Audit Log
- Every significant action (login, create order, payment, verify, delete, discount) is recorded
- Viewable by admins in Settings → Audit Log

### Backup & Restore
- One-click database backup to timestamped `.db` file in the app data folder
- Restore from any `.db` backup file — staged on disk, applied on next app start

### User Management
- Role-based access: `admin` and `lab_tech`
- Admin can create, delete, and manage users
- Account lockout after 5 failed login attempts (15-minute lockout)
- Password reset via email token (requires EmailJS)

### Email
- Send patient results via email using [EmailJS](https://www.emailjs.com/)
- Configurable service ID, template ID, and public key

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 |
| Frontend | React 18, TypeScript, Vite |
| Styling | Custom CSS (light/dark theme) |
| Database | SQLite via `rusqlite` (bundled) |
| Charts | Recharts |
| Barcode | JsBarcode |
| Alerts | SweetAlert2 |
| Icons | Lucide React |
| Auth (backend) | bcrypt via `bcrypt` crate |
| Email | EmailJS (client-side) |

---

## Prerequisites

- **Node.js** 18 or later
- **Rust** 1.77 or later (`rustup install stable`)
- **Tauri CLI v2** (`cargo install tauri-cli`)
- **Windows**: Visual Studio Build Tools with the **Desktop development with C++** workload and Windows SDK (required for the MSVC linker)

### Windows SDK / MSVC linker setup

If you see linker errors on Windows, ensure these environment variables are set (adjust for your VS/SDK version):

```bat
set LIBCLANG_PATH=C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\LLVM\x64\bin
set VCTOOLS_INSTALL_DIR=C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.40.33807
```

---

## Installation & Running

```bash
# 1. Clone the repository
git clone https://github.com/PositiveMinds/Laboratory-System-NDL.git
cd Laboratory-System-NDL/lab-app

# 2. Install Node dependencies
npm install

# 3. Run in development mode (hot-reload)
npm run tauri dev

# 4. Build for production
npm run tauri build
```

The first run seeds the database with default test categories and an admin account:

| Username | Password |
|----------|----------|
| `admin`  | `Admin@123` |

> **Change the admin password immediately after first login.**

---

## Project Structure

```
lab-app/
├── src/                        # React frontend
│   ├── components/             # Shared UI components
│   │   ├── Header.tsx          # Global search + navigation
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── PrintReceipt.tsx    # Receipt print layout
│   │   ├── PrintResults.tsx    # Lab results report layout
│   │   └── PrintLabel.tsx      # Barcode specimen label
│   ├── pages/
│   │   ├── Dashboard.tsx       # Stats + revenue charts
│   │   ├── Patients.tsx        # Patient registry
│   │   ├── NewOrder.tsx        # Create test order
│   │   ├── Orders.tsx          # Order list
│   │   ├── OrderDetail.tsx     # Order detail, payments, discount
│   │   ├── Results.tsx         # Results entry + trending
│   │   ├── Billing.tsx         # Billing overview
│   │   ├── Reports.tsx         # All analytics reports
│   │   └── Settings.tsx        # Users, tests, ranges, backup, audit
│   ├── lib/
│   │   ├── api.ts              # Tauri command wrappers
│   │   ├── email.ts            # EmailJS integration
│   │   ├── print.ts            # Print helpers
│   │   └── currency.ts         # UGX formatter
│   └── types/index.ts          # TypeScript interfaces
└── src-tauri/
    ├── src/lib.rs              # All Rust backend logic
    ├── Cargo.toml
    └── tauri.conf.json
```

---

## Database

The SQLite database is stored at:
- **Windows**: `%APPDATA%\com.ndl.labsystem\ndl_lab.db`
- **macOS**: `~/Library/Application Support/com.ndl.labsystem/ndl_lab.db`

Backups are stored in the `backups/` subdirectory of the same folder.

---

## Default Test Catalogue

The app is pre-seeded with Noble Diagnostic Laboratory's standard test panels:

- Liver Function Test (LFT)
- Renal Function Test (RFT)
- Lipid Profile
- Thyroid Profile
- Fertility Hormones
- Other Biochemistry (CRP, PSA, GTT, etc.)
- Hematology (CBC, Malaria RDT, Blood Group, etc.)
- Serological Tests (HIV, Hepatitis, Typhoid, H. Pylori, etc.)
- Microbiological Tests (Culture & Sensitivity, Urinalysis, etc.)

---

## Email Configuration (Optional)

1. Create a free account at [emailjs.com](https://www.emailjs.com/)
2. Create an Email Service and two templates (one for results, one for receipts)
3. In the app: **Settings → Email (EmailJS)** — enter your service ID, template IDs, and public key

---

## Security Notes

- Passwords are hashed with `bcrypt` (cost factor 12)
- Session is held in Tauri's in-memory `AppState`; it does not persist across restarts
- The audit log records all write operations for accountability
- Account lockout protects against brute-force attacks

---

## License

Proprietary — Noble Diagnostic Laboratory, Uganda. All rights reserved.
