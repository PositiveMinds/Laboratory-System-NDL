import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, FlaskConical } from 'lucide-react';

interface QA {
  q: string;
  a: string | React.ReactNode;
}

interface Section {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  items: QA[];
}

const SECTIONS: Section[] = [
  {
    id: 'overview',
    icon: '🏥',
    title: 'System Overview',
    subtitle: 'What is NDL Lab and how it works',
    items: [
      {
        q: 'What is the NDL Lab Management System?',
        a: 'The NDL Lab System is a complete desktop laboratory information management system (LIMS) built specifically for Noble Diagnostic Laboratory. It manages the full patient-to-report workflow: registering patients, creating test orders, entering lab results, generating clinical reports, and processing payments — all from a single offline desktop application.',
      },
      {
        q: 'Does the system require an internet connection?',
        a: 'No. The system runs entirely offline. All data is stored in a local SQLite database on your computer. An internet connection is only required for sending emails (results, receipts, password resets) via your configured SMTP server.',
      },
      {
        q: 'What are the default login credentials?',
        a: (<>Default credentials: <strong>Username:</strong> <code>admin</code> &nbsp;|&nbsp; <strong>Password:</strong> <code>Admin@123</code>. Change these immediately after first login via <strong>Settings → Profile → Change Password</strong>.</>),
      },
      {
        q: 'What user roles are available?',
        a: (<>
          <strong>Admin</strong> — Full access: manages users, tests, pricing, reference ranges, email config, backups, and audit logs.<br />
          <strong>Lab Technician</strong> — Can register patients, create orders, enter results, process payments, and print reports. Cannot manage system settings.
        </>),
      },
      {
        q: 'How do I switch between light and dark mode?',
        a: 'Click the moon/sun icon in the top-right header. The theme preference persists until you toggle it again.',
      },
    ],
  },
  {
    id: 'patients',
    icon: '👤',
    title: 'Patient Management',
    subtitle: 'Registering and managing patients',
    items: [
      {
        q: 'How do I register a new patient?',
        a: (<>Go to <strong>Patients</strong> in the sidebar → click <strong>New Patient</strong>. Fill in the patient's full name (required), age, gender, phone, email, and address. The system automatically assigns a unique Patient ID (e.g., NDL-0001).</>),
      },
      {
        q: 'Can I search for a patient?',
        a: 'Yes. On the Patients page, type in the search bar to filter by name, Patient ID, or phone number. You can also use the global search bar in the header to search across all patients and orders.',
      },
      {
        q: 'How do I edit a patient\'s information?',
        a: 'On the Patients page, click the Edit (pencil) button on the patient row. Update the desired fields and click Update.',
      },
      {
        q: 'What is the patient\'s email used for?',
        a: 'If the patient has a registered email address, the system will show an Email button on the Billing page to send them a payment receipt directly. It can also be used to email lab results.',
      },
      {
        q: 'Can I view a patient\'s full history?',
        a: 'Patient billing history and result trends are accessible through the Results page — select any order linked to the patient. Use the trend icon (📈) next to any test result to view that test\'s historical values for the same patient.',
      },
    ],
  },
  {
    id: 'orders',
    icon: '📋',
    title: 'Test Orders',
    subtitle: 'Creating and managing test orders',
    items: [
      {
        q: 'How do I create a new test order?',
        a: (<>Click <strong>New Order</strong> (top-right header or Test Orders page). Step 1: Search and select the patient. Step 2: Tick the tests to include — prices are editable per order. Step 3: Optionally add referring doctor, specimen type, and collection date. Click <strong>Create Order</strong>.</>),
      },
      {
        q: 'Can I add tests to an order after it has been created?',
        a: (<>Yes. Open the order (Test Orders → click the order), then click <strong>Add Tests</strong>. Select additional tests and confirm. The order total updates automatically.</>),
      },
      {
        q: 'What are the order statuses?',
        a: (<>
          <strong>Pending</strong> — Order created, awaiting results entry.<br />
          <strong>Processing</strong> — Results are being entered.<br />
          <strong>Completed</strong> — All results entered and order marked complete.<br />
          <strong>Cancelled</strong> — Order has been cancelled.
        </>),
      },
      {
        q: 'How do I change an order\'s status?',
        a: 'Open the order detail page and use the status dropdown at the top-right of the Order Information card. Changing to Completed can also be done from the Lab Results page using the "Mark Complete" button.',
      },
      {
        q: 'How do I delete an order?',
        a: 'Only Admins can delete orders. Open the order and click the red Delete button. This permanently removes the order and all its test items. This cannot be undone.',
      },
      {
        q: 'What is the order number format?',
        a: 'Orders are numbered sequentially as ORD-YYYYMMDD-XXXX (e.g., ORD-20241024-0001). This number appears on receipts and reports.',
      },
      {
        q: 'Can I print a specimen label?',
        a: 'Yes. From the order detail page, click Print Label. This prints a compact label with the patient name, ID, order number, and date — ideal for specimen tubes.',
      },
    ],
  },
  {
    id: 'results',
    icon: '🔬',
    title: 'Lab Results Entry',
    subtitle: 'Entering and validating test results',
    items: [
      {
        q: 'How do I enter test results?',
        a: (<>Go to <strong>Lab Results</strong> in the sidebar. Select an order from the left panel. The right panel shows all tests in that order. Type the result value, unit, and reference range for each test, then select the appropriate flag (Normal/High/Low/Critical). Click <strong>Save Results</strong>.</>),
      },
      {
        q: 'What do the result flags mean?',
        a: (<>
          <strong>N (Normal)</strong> — Result is within the reference range.<br />
          <strong>H (High)</strong> — Result is above the upper limit — shown in red.<br />
          <strong>L (Low)</strong> — Result is below the lower limit — shown in blue.<br />
          <strong>C (Critical)</strong> — Critically abnormal value requiring immediate clinical attention — triggers an alert.
        </>),
      },
      {
        q: 'Are reference ranges auto-filled?',
        a: 'Yes. When you open an order for results entry, the system auto-fills unit and reference range from the Reference Ranges database (configured under Settings → Reference Ranges). It selects the best match based on the patient\'s gender and age.',
      },
      {
        q: 'How do I print the results report?',
        a: (<>From the Lab Results page, click <strong>Print Report</strong> after entering results. Alternatively, from the Order Detail page, click <strong>Print Results</strong>. The report includes the lab header (with your logo if uploaded), patient demographics, test results grouped by category, and the pathologist signature block.</>),
      },
      {
        q: 'What is result verification?',
        a: 'Verification stamps the report with the verifying scientist\'s name and timestamp. From the Order Detail page, click Verify when results are confirmed. Once verified, the report shows "Electronically Verified".',
      },
      {
        q: 'Can I view a patient\'s previous results for a test?',
        a: 'Yes — click the trend icon (📈) next to any test in the results entry form. A modal appears showing a trend chart and table of all previous results for that test for the same patient.',
      },
      {
        q: 'Can I email results to the patient?',
        a: (<>Yes. From the Lab Results page, click <strong>Email Results</strong> and enter the patient\'s email. The system sends a beautifully formatted HTML report via your configured SMTP server (Settings → Email).</>),
      },
    ],
  },
  {
    id: 'reports',
    icon: '🧾',
    title: 'Lab Report Formats',
    subtitle: 'How different tests are displayed on reports',
    items: [
      {
        q: 'How are test results displayed on the printed report?',
        a: 'The system automatically detects the test category and renders a specialized clinical format. Standard biochemistry tests (RFT, LFT, Lipid, Thyroid) use a full table with Test / Result / Unit / Reference Range / Status columns.',
      },
      {
        q: 'What is the special format for Urinalysis?',
        a: (<>Urinalysis reports are split into three sections:<br />
          <strong>1. Physical Examination</strong> — Colour, Appearance, pH, Specific Gravity.<br />
          <strong>2. Chemical Examination</strong> — Glucose, Protein, Ketones, Bilirubin, Blood, Nitrites, Leucocytes, Urobilinogen.<br />
          <strong>3. Microscopic Examination</strong> — Pus Cells, RBCs, Epithelial Cells, Casts, Crystals, Bacteria, Yeast.
        </>),
      },
      {
        q: 'What is the format for Semen Analysis?',
        a: (<>Semen Analysis reports have two sections:<br />
          <strong>Macroscopic Examination</strong> — Volume, Colour, Liquefaction, Viscosity, pH.<br />
          <strong>Microscopic Examination</strong> — Total Sperm Count, Concentration, Motility (Progressive & Total), Normal Morphology, Pus Cells, Agglutination, Impressions.
        </>),
      },
      {
        q: 'What is the format for WIDAL/Typhoid?',
        a: 'WIDAL results display as a titer table with columns: Antigen | Titre | Cut-off | Result. Each antigen (S. Typhi O/H, S. Paratyphi A/B) is automatically classified as REACTIVE or NON-REACTIVE based on the entered titre value.',
      },
      {
        q: 'How does the Malaria report look?',
        a: 'Malaria reports show the Blood Slide (BS) and RDT results prominently as large result banners, with Plasmodium Species, Parasite Density, and Stage below in a detail table.',
      },
      {
        q: 'What is the format for CBC / Full Blood Count?',
        a: (<>CBC reports have two sections under Hematology:<br />
          <strong>Complete Blood Count (CBC)</strong> — Haemoglobin, Haematocrit/PCV, RBC, MCV, MCH, MCHC, WBC, Platelets.<br />
          <strong>Differential Leucocyte Count</strong> — Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils.
        </>),
      },
      {
        q: 'What is the format for Stool Analysis?',
        a: (<>Stool Analysis reports have two sections:<br />
          <strong>Macroscopic Examination</strong> — Colour, Consistency, Mucus, Blood.<br />
          <strong>Microscopic Examination</strong> — Pus Cells, RBCs, Ova/Cysts, Occult Blood.
        </>),
      },
    ],
  },
  {
    id: 'billing',
    icon: '💰',
    title: 'Billing & Payments',
    subtitle: 'Processing payments and receipts',
    items: [
      {
        q: 'How do I record a payment?',
        a: (<>Go to <strong>Billing</strong> or the <strong>Order Detail</strong> page. Click <strong>Add Payment</strong>. Enter the amount paid, select the payment method (Cash, Card, Mobile Money, Bank Transfer, Insurance), and optionally add a note. The system automatically calculates the balance.</>),
      },
      {
        q: 'What payment methods are supported?',
        a: 'Cash, Card, Mobile Money, Bank Transfer, and Insurance. These are label-only — the system doesn\'t process any electronic payments. They are recorded for record-keeping purposes.',
      },
      {
        q: 'Can I apply a discount?',
        a: 'Yes. From the Order Detail page, click the discount button (only visible to Admins). Enter the discount amount (UGX) and an optional reason (e.g., "Staff Discount"). The balance and payment status update automatically.',
      },
      {
        q: 'How do I print a payment receipt?',
        a: (<>From the Billing page or Order Detail, click <strong>Print Receipt</strong>. The receipt includes your lab logo (if uploaded), lab address, patient info, list of tests with prices, totals, discount (if any), amount paid, and balance. It uses the Clinical Precision branded layout.</>),
      },
      {
        q: 'Can I email a receipt to the patient?',
        a: 'Yes — but only if the patient has an email address registered. The Email button appears on the Billing page when the patient has paid and has an email. The system sends an HTML-formatted receipt via your SMTP server.',
      },
      {
        q: 'What is the payment status shown on orders?',
        a: (<>
          <strong>Unpaid</strong> — No payment has been made.<br />
          <strong>Partial</strong> — Some payment made, balance remaining.<br />
          <strong>Paid</strong> — Full balance has been settled (amount paid ≥ discounted total).
        </>),
      },
      {
        q: 'How do I filter billing records by date or payment status?',
        a: 'On the Billing page, use the date range picker and the payment status dropdown (All / Paid / Unpaid / Partial) to filter records.',
      },
    ],
  },
  {
    id: 'test-management',
    icon: '⚗️',
    title: 'Test Management',
    subtitle: 'Managing the test catalog and prices',
    items: [
      {
        q: 'How do I add a new test?',
        a: (<>Go to <strong>Test Management</strong> in the sidebar → <strong>Test Catalog & Pricing</strong> tab → click <strong>Add Test</strong>. Enter the test name, select a category, and set the price. The test immediately becomes available when creating new orders.</>),
      },
      {
        q: 'How do I update test prices?',
        a: (<>On the Test Management page (Catalog & Pricing tab), edit the price directly in the price field next to each test. Changed prices are highlighted. Click <strong>Save Prices</strong> to commit all changes at once, or save individually from the edit modal.</>),
      },
      {
        q: 'How do I add a test category?',
        a: 'Click Add Category (on Test Management or Settings → Test Prices). Enter the category name. You can also rename or delete categories — but you must remove all tests from a category before deleting it.',
      },
      {
        q: 'How do I delete a test?',
        a: 'Click the trash icon next to the test on the Test Management page. This removes the test from the catalog. Existing orders that already contain this test are not affected.',
      },
      {
        q: 'What are the pre-loaded test categories?',
        a: (<>The system comes with: Hematology, Renal Function Test, Liver Function Test, Lipid Profile, Thyroid Profile, Serological Test, Microbiological Tests, Other Biochemistry Tests, Fertility Hormones, Urinalysis & Microscopy, Semen Analysis, Widal & Typhoid Serology, Malaria Diagnosis, and Stool Analysis.</>),
      },
      {
        q: 'What is the Active Orders tab in Test Management?',
        a: 'The Active Orders tab shows all test orders with their current status — useful for tracking which orders are pending, in analysis, or completed. You can search, filter by status, and navigate directly to any order.',
      },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings & Configuration',
    subtitle: 'Profile, users, email, and system settings',
    items: [
      {
        q: 'How do I change my name or contact details?',
        a: (<>Go to <strong>Settings → Profile</strong>. Update your Full Name, Title, Phone, and Email, then click <strong>Save Changes</strong>. Your username cannot be changed.</>),
      },
      {
        q: 'How do I change my password?',
        a: (<>Go to <strong>Settings → Profile → Change Password</strong>. Enter your current password, then your new password twice. Click <strong>Update Password</strong>. Passwords must be at least 6 characters.</>),
      },
      {
        q: 'How do I upload a profile photo?',
        a: (<>Go to <strong>Settings → Profile → Profile Photo</strong>. Drag and drop your photo or click to browse. The system accepts PNG (transparency preserved) and JPEG. Maximum size after compression: <strong>100 KB</strong>. The photo appears in the header, sidebar, and your profile card.</>),
      },
      {
        q: 'How do I upload the lab logo?',
        a: (<>Go to <strong>Settings → Branding → Laboratory Logo</strong>. Drag and drop the logo or click to browse. PNG logos with transparent backgrounds are fully supported. Maximum size after compression: <strong>50 KB</strong>. The logo appears on all printed reports and receipts.</>),
      },
      {
        q: 'How do I configure email (SMTP)?',
        a: (<>Go to <strong>Settings → Email</strong>. Enter your SMTP host, port, username, and password. For Gmail, use <code>smtp.gmail.com</code> port <code>465</code> with TLS enabled, and an <strong>App Password</strong> (not your Gmail password). Set your From Name and From Email, then click Save. Use the test button to verify the configuration.</>),
      },
      {
        q: 'How does password reset work?',
        a: 'On the login screen, click "Forgot Password?". Enter your username or email. If SMTP is configured and the user has an email, a 6-digit code is sent. If not, the code is shown in a dialog. Enter the code and set a new password.',
      },
      {
        q: 'How do I add a new system user?',
        a: (<>Admin only: <strong>Settings → User Management → Add User</strong>. Enter the full name, username, email, password, and role (Admin or Lab Technician). The user can immediately log in with these credentials.</>),
      },
      {
        q: 'How do I unlock a locked account?',
        a: 'Accounts lock after 5 failed login attempts for 15 minutes. An Admin can unlock it immediately: Settings → User Management → click Unlock next to the locked user.',
      },
      {
        q: 'How do I set reference ranges for tests?',
        a: (<>Admin only: <strong>Settings → Reference Ranges</strong>. Select a test from the dropdown. Click <strong>Add Range</strong> to set values for unit, reference range, and optionally filter by gender or age group. Multiple ranges can exist for one test (e.g., different ranges for males vs. females).</>),
      },
      {
        q: 'How do I configure receipt printing?',
        a: (<>Go to <strong>Settings → Printing</strong>. Choose paper size (80mm standard, 58mm mini, or A4 full page). You can also enable <strong>Auto-print</strong> to automatically open the print dialog when a payment is recorded.</>),
      },
      {
        q: 'How do I create a database backup?',
        a: (<>Admin only: <strong>Settings → Backup & Restore → Create Backup Now</strong>. A timestamped copy of the database is saved to <code>%APPDATA%\com.ndl.labsystem\backups\</code>. Copy these files to an external drive or cloud storage for safety.</>),
      },
      {
        q: 'How do I restore from a backup?',
        a: (<>Admin only: <strong>Settings → Backup & Restore → Restore from File</strong>. Select a <code>.db</code> backup file. <strong>Warning:</strong> this replaces ALL current data. After staging a restore, restart the application for it to take effect.</>),
      },
      {
        q: 'What is the Audit Log?',
        a: 'The Audit Log (Admin only) records every significant action in the system: logins, order creation, result entries, payments, user changes, etc. Each entry shows the time, user, action type, and entity affected. View it under Settings → Audit Log.',
      },
    ],
  },
  {
    id: 'reports-analytics',
    icon: '📊',
    title: 'Reports & Analytics',
    subtitle: 'Operational reports and performance metrics',
    items: [
      {
        q: 'What reports are available in the system?',
        a: (<>Go to <strong>Reports</strong> in the sidebar. Five report types are available:<br />
          <strong>Pending Results</strong> — Orders awaiting result entry with a progress bar.<br />
          <strong>Workload</strong> — Orders and tests per staff member by date range.<br />
          <strong>Financial</strong> — Revenue, collected amounts, discounts, and outstanding balances.<br />
          <strong>Turnaround Time (TAT)</strong> — Average time from order to results per order.<br />
          <strong>Critical Values</strong> — All flagged critical results in a date range.
        </>),
      },
      {
        q: 'How do I run a report?',
        a: 'Click the report tab (e.g., Financial), set the date range using the date picker, select a grouping period if applicable (Day/Week/Month), then click Run Report. A chart and table appear below.',
      },
      {
        q: 'What is the Dashboard showing?',
        a: (<>The Dashboard shows real-time stats: Total Patients, Total Orders, Pending Orders, Completed Orders, Today\'s Revenue, and Outstanding Balance. Below are a revenue trend chart (filterable by period), a top tests bar chart, and the 10 most recent orders.</>),
      },
    ],
  },
  {
    id: 'troubleshooting',
    icon: '🛠',
    title: 'Troubleshooting',
    subtitle: 'Common issues and solutions',
    items: [
      {
        q: 'The print dialog opens but the report is blank.',
        a: 'In your browser/system print dialog, enable "Background Graphics" or "Print backgrounds and colours". This ensures the coloured sections (category headers, status badges) print correctly.',
      },
      {
        q: 'Email sending fails with an authentication error.',
        a: (<>For Gmail: ensure you are using an <strong>App Password</strong> (not your regular Gmail password). Create one at Google Account → Security → App Passwords. Also verify that 2-Step Verification is enabled on the Google account. For port 465 use TLS; for port 587 use STARTTLS (uncheck "Use TLS").</>),
      },
      {
        q: 'Reference ranges are not auto-filling when I enter results.',
        a: (<>Ensure reference ranges are configured for that specific test under <strong>Settings → Reference Ranges</strong>. The auto-fill only works when the test has at least one reference range entry. If multiple ranges exist, the system picks the best match based on the patient\'s gender and age.</>),
      },
      {
        q: 'I cannot log in — my account says it is locked.',
        a: 'Accounts lock for 15 minutes after 5 failed login attempts. Wait for the lockout period to expire, or ask an Admin to unlock the account immediately via Settings → User Management.',
      },
      {
        q: 'A test order is missing from the orders list.',
        a: 'Check the status filter on the Test Orders page — it may be set to a specific status. Set it to "All Status" to see all orders. Also check if the order was accidentally deleted (check the Audit Log under Settings).',
      },
      {
        q: 'The app is running slowly.',
        a: 'The first launch each session may be slow as the database is being initialised. Subsequent operations are fast. If the app remains slow, consider running a database backup and checking available disk space. The database grows over time as more records are added.',
      },
      {
        q: 'I accidentally deleted something important.',
        a: 'Restore from the most recent backup: Settings → Backup & Restore → Restore from File. Select the latest .db backup file. Note: this will restore the entire database to that point in time, so any changes made after that backup will be lost.',
      },
    ],
  },
];

function FAQItem({ item, isOpen, onToggle }: { item: QA; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{
      border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      marginBottom: 6,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: isOpen ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--surface)',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          gap: 12, transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? 'var(--primary)' : 'var(--on-surface)', lineHeight: 1.4 }}>
          {item.q}
        </span>
        {isOpen
          ? <ChevronDown size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          : <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />}
      </button>
      {isOpen && (
        <div style={{
          padding: '12px 16px 14px',
          borderTop: '1px solid var(--outline-variant)',
          background: 'var(--surface-container-lowest)',
          fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.7,
        }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

interface FAQSectionProps {
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQSection({ section, isOpen, onToggle }: FAQSectionProps) {
  const allIndices = section.items.map((_, i) => i);
  // When the section opens, all items are expanded by default
  const [openItems, setOpenItems] = useState<Set<number>>(new Set(allIndices));

  // Sync open items whenever isOpen changes to true
  const prevOpen = useState(isOpen)[0];
  if (!prevOpen && isOpen) {
    // Reset to all-open when section opens
  }

  const toggleItem = (i: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const allItemsOpen = openItems.size === section.items.length;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Section header button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          marginBottom: isOpen ? 8 : 0,
          background: isOpen ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--surface)',
          border: `1px solid ${isOpen ? 'color-mix(in srgb, var(--primary) 35%, var(--outline-variant))' : 'var(--outline-variant)'}`,
          borderRadius: isOpen ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 22, flexShrink: 0 }}>{section.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isOpen ? 'var(--primary)' : 'var(--on-surface)' }}>
            {section.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 1 }}>{section.subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: isOpen ? 'var(--on-primary)' : 'var(--on-surface-variant)',
            background: isOpen ? 'var(--primary)' : 'var(--surface-container-high)',
            padding: '2px 8px', borderRadius: 10,
          }}>
            {section.items.length} articles
          </span>
          {isOpen
            ? <ChevronDown size={16} style={{ color: 'var(--primary)' }} />
            : <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)' }} />}
        </div>
      </button>

      {/* Articles panel */}
      {isOpen && (
        <div style={{
          border: '1px solid color-mix(in srgb, var(--primary) 35%, var(--outline-variant))',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--surface-container-lowest)',
        }}>
          {/* Collapse/Expand all row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 16px', borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-low)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
              {section.items.length} question{section.items.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setOpenItems(allItemsOpen ? new Set() : new Set(allIndices))}
              style={{
                background: 'none', border: 'none', fontSize: 11,
                color: 'var(--primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              {allItemsOpen ? '− Collapse All' : '+ Expand All'}
            </button>
          </div>

          {/* FAQ items */}
          <div style={{ padding: '8px 12px' }}>
            {section.items.map((item, i) => (
              <FAQItem key={i} item={item} isOpen={openItems.has(i)} onToggle={() => toggleItem(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResult({ section, item }: { section: Section; item: QA }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 4 }}>
        {section.icon} {section.title}
      </div>
      <FAQItem item={item} isOpen={open} onToggle={() => setOpen(v => !v)} />
    </div>
  );
}

export default function FAQ() {
  const [search, setSearch] = useState('');
  // Only one section open at a time; start with 'overview' open
  const [openSectionId, setOpenSectionId] = useState<string | null>('overview');

  const handleSectionToggle = (id: string) => {
    setOpenSectionId(prev => prev === id ? null : id);
  };

  const filtered = search.trim().length < 2
    ? null
    : SECTIONS.flatMap(s =>
        s.items
          .filter(item => item.q.toLowerCase().includes(search.toLowerCase()) || String(item.a).toLowerCase().includes(search.toLowerCase()))
          .map(item => ({ section: s, item }))
      );

  const totalArticles = SECTIONS.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <div>
      {/* Hero header */}
      <div style={{
        background: 'var(--primary)', borderRadius: 'var(--radius-lg)',
        padding: '32px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: -20, opacity: 0.06,
        }}>
          <FlaskConical size={180} color="white" />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <FlaskConical size={22} color="white" />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.75)' }}>
              NDL Lab Help Centre
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 20 }}>
            {SECTIONS.length} topics · {totalArticles} articles covering everything about the NDL Lab system
          </p>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', borderRadius: 'var(--radius)',
            padding: '0 14px', height: 40, maxWidth: 480,
          }}>
            <Search size={16} style={{ color: '#78001d', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help articles…"
              style={{
                border: 'none', outline: 'none', fontSize: 13, flex: 1,
                background: 'transparent', fontFamily: 'inherit', color: '#161c27',
              }}
            />
          </div>
        </div>
      </div>

      {/* Search results */}
      {filtered !== null ? (
        <div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Search size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
              <h3>No results found</h3>
              <p>Try different keywords or browse the sections below.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setSearch('')}>
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 12, fontWeight: 600 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
              </div>
              {filtered.map(({ section, item }, i) => (
                <SearchResult key={i} section={section} item={item} />
              ))}
            </>
          )}
        </div>
      ) : (
        /* Section accordion */
        <div>
          {SECTIONS.map(section => (
            <FAQSection
              key={section.id}
              section={section}
              isOpen={openSectionId === section.id}
              onToggle={() => handleSectionToggle(section.id)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--surface)', border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 4 }}>
          Still have questions?
        </p>
        <p style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
          Contact NDL Lab support: <strong>+256 706947101</strong> · <strong>mas884@yahoo.com</strong>
        </p>
      </div>
    </div>
  );
}
