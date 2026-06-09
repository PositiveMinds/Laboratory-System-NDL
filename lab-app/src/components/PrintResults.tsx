import type { ResultsReportData, LabInfo } from '../types';

const DEFAULT_LAB: LabInfo = {
  name: 'Noble Diagnostic Laboratory',
  tagline: 'Professionalism Is Part Of Us',
  address: 'P.O BOX Kitooro — Entebbe, Maina House, Plot: 31A Kiwafu Road',
  phone: '+256 706947101 / +256 782087828',
  email: 'mas884@yahoo.com',
  website: '',
};

interface Props {
  data: ResultsReportData;
  logo?: string | null;
  labInfo?: LabInfo | null;
}

interface Item {
  test_name: string;
  result_value?: string;
  unit?: string;
  reference_range?: string;
  flag?: string;
}

// ── Helpers ─────────────────────────────────────────────────────
const FLAG_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  N: { bg: '#d2f4da', color: '#146c34', border: 'rgba(20,108,52,0.2)' },
  H: { bg: '#ffdad6', color: '#ba1a1a', border: 'rgba(186,26,26,0.25)' },
  L: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'rgba(37,99,235,0.2)' },
  C: { bg: 'rgba(109,40,217,0.1)', color: '#7c3aed', border: 'rgba(109,40,217,0.2)' },
};

function stripPrefix(name: string): string {
  return name.replace(/^\[.*?\]\s*/, '');
}

function getSection(name: string): string {
  const m = name.match(/^\[([^\]]+)\]/);
  return m ? m[1] : '';
}

// ── Standard row in a results table ──────────────────────────────
function ResultRow({ item }: { item: Item }) {
  const flag = item.flag || 'N';
  const fb = FLAG_BADGE[flag] || FLAG_BADGE.N;
  const isAbnormal = flag !== 'N';
  return (
    <tr style={{ background: isAbnormal ? '#fff8f8' : 'transparent' }}>
      <td style={{ padding: '6px 12px', fontWeight: 500 }}>{item.test_name}</td>
      <td style={{ padding: '6px 12px', fontWeight: isAbnormal ? 700 : 400, color: isAbnormal ? '#ba1a1a' : 'inherit' }}>
        {item.result_value || '—'}
      </td>
      <td style={{ padding: '6px 12px', color: '#545f72' }}>{item.unit || '—'}</td>
      <td style={{ padding: '6px 12px', color: '#545f72' }}>{item.reference_range || '—'}</td>
      <td style={{ padding: '6px 12px', textAlign: 'center' }}>
        {item.flag && (
          <span style={{
            padding: '1px 8px', borderRadius: 2, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid',
            background: fb.bg, color: fb.color, borderColor: fb.border,
          }}>
            {flag === 'N' ? 'Normal' : flag === 'H' ? 'High' : flag === 'L' ? 'Low' : 'Critical'}
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Standard table (RFT, LFT, Lipid, Thyroid, etc.) ──────────────
function StandardTable({ items }: { items: Item[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f1f3ff' }}>
          {['Test', 'Result', 'Unit', 'Reference Range', 'Status'].map(h => (
            <th key={h} style={{ padding: '7px 12px', textAlign: h === 'Status' ? 'center' : 'left', border: '1px solid #e0bfbf', color: '#584141', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody style={{ borderBottom: '1px solid #e0bfbf' }}>
        {items.map((item, i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(224,191,191,0.5)', background: item.flag && item.flag !== 'N' ? '#fff8f8' : 'transparent' }}>
            <td style={{ padding: '6px 12px', fontWeight: 500, border: '1px solid #e0bfbf' }}>{item.test_name}</td>
            <td style={{ padding: '6px 12px', fontWeight: item.flag && item.flag !== 'N' ? 700 : 400, color: item.flag && item.flag !== 'N' ? '#ba1a1a' : 'inherit', border: '1px solid #e0bfbf' }}>
              {item.result_value || '—'}
            </td>
            <td style={{ padding: '6px 12px', color: '#545f72', border: '1px solid #e0bfbf' }}>{item.unit || '—'}</td>
            <td style={{ padding: '6px 12px', color: '#545f72', border: '1px solid #e0bfbf' }}>{item.reference_range || '—'}</td>
            <td style={{ padding: '6px 12px', textAlign: 'center', border: '1px solid #e0bfbf' }}>
              {item.flag && (() => {
                const f = item.flag; const fb = FLAG_BADGE[f] || FLAG_BADGE.N;
                return (
                  <span style={{ padding: '1px 8px', borderRadius: 2, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid', background: fb.bg, color: fb.color, borderColor: fb.border }}>
                    {f === 'N' ? 'Normal' : f === 'H' ? 'High' : f === 'L' ? 'Low' : 'Critical'}
                  </span>
                );
              })()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Section header (colored bar + title) ─────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ background: '#f1f3ff', borderLeft: '4px solid #78001d', padding: '5px 10px 5px 8px', marginBottom: 4, marginTop: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78001d' }}>{title}</span>
    </div>
  );
}

// ── Urinalysis: Physical / Chemical / Microscopy sections ─────────
function UrinalysisReport({ items }: { items: Item[] }) {
  const physical = items.filter(i => getSection(i.test_name) === 'Physical');
  const chemical = items.filter(i => getSection(i.test_name) === 'Chemical');
  const microscopy = items.filter(i => getSection(i.test_name) === 'Microscopy');
  const other = items.filter(i => !['Physical','Chemical','Microscopy'].includes(getSection(i.test_name)));

  const Section2Col = ({ sectionItems }: { sectionItems: Item[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e0bfbf', borderBottom: 'none' }}>
      {sectionItems.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e0bfbf', borderRight: i % 2 === 0 ? '1px solid #e0bfbf' : 'none' }}>
          <div style={{ padding: '6px 10px', background: '#f1f3ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#584141' }}>{stripPrefix(item.test_name)}</div>
          <div style={{ padding: '6px 10px', fontSize: 12, fontWeight: item.flag && item.flag !== 'N' ? 700 : 400, color: item.flag && item.flag !== 'N' ? '#ba1a1a' : '#161c27' }}>
            {item.result_value || '—'}
            {item.flag && item.flag !== 'N' && (
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: FLAG_BADGE[item.flag]?.bg, color: FLAG_BADGE[item.flag]?.color, padding: '1px 5px', borderRadius: 2 }}>
                {item.flag === 'H' ? 'ABN' : item.flag === 'L' ? 'ABN' : 'CRIT'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const MicroscopyGrid = ({ sectionItems }: { sectionItems: Item[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e0bfbf', borderBottom: 'none' }}>
      {sectionItems.map((item, i) => (
        <div key={i} style={{ borderBottom: '1px solid #e0bfbf', borderRight: (i + 1) % 3 !== 0 ? '1px solid #e0bfbf' : 'none', padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#545f72', marginBottom: 2 }}>{stripPrefix(item.test_name)}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: item.flag && item.flag !== 'N' ? '#ba1a1a' : '#161c27' }}>{item.result_value || '—'}</span>
            {item.unit && <span style={{ fontSize: 10, color: '#545f72' }}>{item.unit}</span>}
          </div>
          {item.reference_range && <div style={{ fontSize: 9, color: '#545f72', marginTop: 1 }}>Ref: {item.reference_range}</div>}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {physical.length > 0 && (<><SectionHeader title="1. Physical Examination" /><Section2Col sectionItems={physical} /></>)}
      {chemical.length > 0 && (<><SectionHeader title="2. Chemical Examination" /><Section2Col sectionItems={chemical} /></>)}
      {microscopy.length > 0 && (<><SectionHeader title="3. Microscopic Examination" /><MicroscopyGrid sectionItems={microscopy} /></>)}
      {other.length > 0 && (<><SectionHeader title="Other" /><StandardTable items={other} /></>)}
    </>
  );
}

// ── Semen Analysis ────────────────────────────────────────────────
function SemenReport({ items }: { items: Item[] }) {
  const macro = items.filter(i => getSection(i.test_name) === 'Macroscopic');
  const micro = items.filter(i => getSection(i.test_name) === 'Microscopic');
  const other = items.filter(i => !['Macroscopic','Microscopic'].includes(getSection(i.test_name)));

  const TwoColSection = ({ sectionItems }: { sectionItems: Item[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e0bfbf', borderBottom: 'none', fontSize: 12 }}>
      {sectionItems.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #e0bfbf', borderRight: i % 2 === 0 ? '1px solid #e0bfbf' : 'none' }}>
          <div style={{ padding: '5px 8px', background: '#f1f3ff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#584141' }}>{stripPrefix(item.test_name)}</div>
          <div style={{ padding: '5px 8px', fontWeight: item.flag && item.flag !== 'N' ? 700 : 400, color: item.flag && item.flag !== 'N' ? '#ba1a1a' : '#161c27' }}>
            {item.result_value || '—'} {item.unit && <span style={{ color: '#545f72', fontWeight: 400, fontSize: 10 }}>{item.unit}</span>}
          </div>
          <div style={{ padding: '5px 8px', color: '#545f72', fontSize: 10 }}>{item.reference_range || '—'}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {macro.length > 0 && (<><SectionHeader title="Macroscopic Examination" /><TwoColSection sectionItems={macro} /></>)}
      {micro.length > 0 && (<><SectionHeader title="Microscopic Examination" /><TwoColSection sectionItems={micro} /></>)}
      {other.length > 0 && (<><SectionHeader title="Other" /><StandardTable items={other} /></>)}
    </>
  );
}

// ── Widal Titres ──────────────────────────────────────────────────
function WidalReport({ items }: { items: Item[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f1f3ff' }}>
          <th style={{ padding: '7px 12px', border: '1px solid #e0bfbf', color: '#584141', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Antigen</th>
          <th style={{ padding: '7px 12px', border: '1px solid #e0bfbf', color: '#584141', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Titre</th>
          <th style={{ padding: '7px 12px', border: '1px solid #e0bfbf', color: '#584141', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Cut-off</th>
          <th style={{ padding: '7px 12px', border: '1px solid #e0bfbf', color: '#584141', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Result</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => {
          const isReactive = item.result_value && item.result_value !== '—' && item.result_value !== 'Negative' && !item.result_value.toLowerCase().includes('neg');
          return (
            <tr key={i} style={{ borderBottom: '1px solid rgba(224,191,191,0.5)', background: isReactive ? '#fff8f8' : 'transparent' }}>
              <td style={{ padding: '7px 12px', border: '1px solid #e0bfbf', fontWeight: 600 }}>{item.test_name}</td>
              <td style={{ padding: '7px 12px', border: '1px solid #e0bfbf', textAlign: 'center', fontWeight: 700, fontSize: 14, color: isReactive ? '#ba1a1a' : '#161c27' }}>
                {item.result_value || '—'}
              </td>
              <td style={{ padding: '7px 12px', border: '1px solid #e0bfbf', textAlign: 'center', color: '#545f72' }}>
                {item.reference_range || '< 1:80'}
              </td>
              <td style={{ padding: '7px 12px', border: '1px solid #e0bfbf', textAlign: 'center' }}>
                {item.result_value ? (
                  <span style={{ padding: '2px 10px', borderRadius: 2, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: isReactive ? '#ffdad6' : '#d2f4da', color: isReactive ? '#ba1a1a' : '#146c34', border: `1px solid ${isReactive ? 'rgba(186,26,26,0.25)' : 'rgba(20,108,52,0.2)'}` }}>
                    {isReactive ? 'REACTIVE' : 'NON-REACTIVE'}
                  </span>
                ) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Hematology: CBC + Differential ───────────────────────────────
function HematologyReport({ items }: { items: Item[] }) {
  const cbcItems = items.filter(i => getSection(i.test_name) === 'CBC').map(i => ({ ...i, test_name: stripPrefix(i.test_name) }));
  const diffItems = items.filter(i => getSection(i.test_name) === 'Differential').map(i => ({ ...i, test_name: stripPrefix(i.test_name) }));
  const otherItems = items.filter(i => !['CBC','Differential'].includes(getSection(i.test_name)));

  return (
    <>
      {cbcItems.length > 0 && (<><SectionHeader title="Complete Blood Count (CBC)" /><StandardTable items={cbcItems} /></>)}
      {diffItems.length > 0 && (<><SectionHeader title="Differential Leucocyte Count" /><StandardTable items={diffItems} /></>)}
      {otherItems.length > 0 && (<><SectionHeader title="Other Haematology" /><StandardTable items={otherItems} /></>)}
    </>
  );
}

// ── Stool Analysis: Macroscopic / Microscopic ─────────────────────
function StoolReport({ items }: { items: Item[] }) {
  const macro = items.filter(i => getSection(i.test_name) === 'Macroscopic').map(i => ({ ...i, test_name: stripPrefix(i.test_name) }));
  const micro = items.filter(i => getSection(i.test_name) === 'Microscopic').map(i => ({ ...i, test_name: stripPrefix(i.test_name) }));
  const other = items.filter(i => !['Macroscopic','Microscopic'].includes(getSection(i.test_name)));

  return (
    <>
      {macro.length > 0 && (<><SectionHeader title="Macroscopic Examination" /><StandardTable items={macro} /></>)}
      {micro.length > 0 && (<><SectionHeader title="Microscopic Examination" /><StandardTable items={micro} /></>)}
      {other.length > 0 && (<><SectionHeader title="Culture & Sensitivity" /><StandardTable items={other} /></>)}
    </>
  );
}

// ── Malaria quick-report ─────────────────────────────────────────
function MalariaReport({ items }: { items: Item[] }) {
  const mpItem = items.find(i => i.test_name.toLowerCase().includes('parasite') || i.test_name.toLowerCase().includes('bs'));
  const rdtItem = items.find(i => i.test_name.toLowerCase().includes('rdt'));
  const otherItems = items.filter(i => i !== mpItem && i !== rdtItem);
  const isPositive = (v?: string) => v && !['not seen', 'negative', 'absent', '—', ''].includes(v.toLowerCase());

  return (
    <div style={{ border: '1px solid #e0bfbf' }}>
      {/* Main result banner */}
      {(mpItem || rdtItem) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {mpItem && (
            <div style={{ padding: '12px 16px', borderRight: '1px solid #e0bfbf', borderBottom: '1px solid #e0bfbf' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#584141', marginBottom: 4 }}>Blood Slide (BS)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isPositive(mpItem.result_value) ? '#ba1a1a' : '#146c34' }}>
                {mpItem.result_value || 'Not Done'}
              </div>
            </div>
          )}
          {rdtItem && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0bfbf' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#584141', marginBottom: 4 }}>Rapid Diagnostic Test (RDT)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isPositive(rdtItem.result_value) ? '#ba1a1a' : '#146c34' }}>
                {rdtItem.result_value || 'Not Done'}
              </div>
            </div>
          )}
        </div>
      )}
      {otherItems.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {otherItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: i < otherItems.length - 1 ? '1px solid rgba(224,191,191,0.5)' : 'none' }}>
                <td style={{ padding: '6px 12px', background: '#f1f3ff', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#584141', width: '35%', border: '1px solid #e0bfbf' }}>{item.test_name}</td>
                <td style={{ padding: '6px 12px', border: '1px solid #e0bfbf' }}>{item.result_value || '—'}</td>
                <td style={{ padding: '6px 12px', color: '#545f72', border: '1px solid #e0bfbf', fontSize: 11 }}>{item.reference_range || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Category dispatch ─────────────────────────────────────────────
function detectCategoryType(catName: string): string {
  const n = catName.toLowerCase();
  if (n.includes('urin')) return 'urinalysis';
  if (n.includes('semen') || n.includes('sperm') || n.includes('seminal')) return 'semen';
  if (n.includes('widal') || n.includes('typhoid serol')) return 'widal';
  if (n.includes('hematol') || n.includes('haematol')) return 'hematology';
  if (n.includes('stool') || n.includes('faec')) return 'stool';
  if (n.includes('malaria')) return 'malaria';
  return 'standard';
}

// ── Category section wrapper ──────────────────────────────────────
function CategorySection({ catName, items }: { catName: string; items: Item[] }) {
  const type = detectCategoryType(catName);
  const catTitle = catName.toUpperCase();

  return (
    <div style={{ marginBottom: 16, breakInside: 'avoid' }}>
      <div style={{ background: '#78001d', color: '#fff', padding: '5px 12px', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{catTitle}</span>
      </div>
      {type === 'urinalysis' && <UrinalysisReport items={items} />}
      {type === 'semen'      && <SemenReport items={items} />}
      {type === 'widal'      && <WidalReport items={items} />}
      {type === 'hematology' && <HematologyReport items={items} />}
      {type === 'stool'      && <StoolReport items={items} />}
      {type === 'malaria'    && <MalariaReport items={items} />}
      {type === 'standard'   && <StandardTable items={items} />}
    </div>
  );
}

// ── Main PrintResults component ───────────────────────────────────
export default function PrintResults({ data, logo, labInfo }: Props) {
  const lab = { ...DEFAULT_LAB, ...Object.fromEntries(Object.entries(labInfo ?? {}).filter(([, v]) => v)) };
  const orderDate = new Date(data.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const resultDate = new Date(data.result_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="results-report">
      {/* Lab header */}
      <div className="report-header">
        <div className="report-brand">
          {logo ? (
            <img
              src={logo}
              alt="Lab Logo"
              style={{ height: 60, maxWidth: 200, objectFit: 'contain', objectPosition: 'left' }}
            />
          ) : (
            <div className="report-brand-icon">NDL</div>
          )}
          <div>
            <div className="report-lab-name">{lab.name}</div>
            {lab.tagline && <div className="report-lab-sub">{lab.tagline}</div>}
            {lab.address && <div className="report-lab-sub">{lab.address}</div>}
            <div className="report-lab-sub">
              {lab.phone && <>Tel: {lab.phone}</>}
              {lab.phone && lab.email && <> &nbsp;|&nbsp; </>}
              {lab.email && <>Email: {lab.email}</>}
            </div>
          </div>
        </div>
        <div className="report-order-info">
          <div className="title">Laboratory Report</div>
          <div><strong>Order No:</strong> {data.order_number}</div>
          <div><strong>Collected:</strong> {orderDate}</div>
          <div><strong>Reported:</strong> {resultDate}</div>
        </div>
      </div>

      {/* Patient demographics */}
      <div className="report-patient-info">
        <div className="report-info-row"><span className="report-info-label">Patient Name:</span><strong>{data.patient_name}</strong></div>
        <div className="report-info-row"><span className="report-info-label">Patient ID:</span><span>{data.patient_ref}</span></div>
        {data.patient_age && <div className="report-info-row"><span className="report-info-label">Age:</span><span>{data.patient_age} yrs</span></div>}
        {data.patient_gender && <div className="report-info-row"><span className="report-info-label">Gender:</span><span>{data.patient_gender}</span></div>}
        {data.patient_phone && <div className="report-info-row"><span className="report-info-label">Phone:</span><span>{data.patient_phone}</span></div>}
        <div className="report-info-row"><span className="report-info-label">Requested By:</span><span>{data.requested_by}</span></div>
        {data.referred_by && <div className="report-info-row"><span className="report-info-label">Referred By:</span><span>{data.referred_by}</span></div>}
        {data.specimen_type && <div className="report-info-row"><span className="report-info-label">Specimen:</span><span>{data.specimen_type}{data.specimen_id ? ` (${data.specimen_id})` : ''}</span></div>}
      </div>

      {/* Results by category */}
      {data.categories.map(cat => (
        <CategorySection key={cat.name} catName={cat.name} items={cat.items} />
      ))}

      {/* Footer */}
      <div className="report-footer">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: '#545f72', fontStyle: 'italic' }}>
            <span style={{ fontSize: 12 }}>✓</span>
            <span>Electronically verified for clinical accuracy</span>
          </div>
        </div>
        <div className="signature-block">
          <div className="signature-line" />
          <strong>{data.verified_by || 'Pathologist / Lab Scientist'}</strong>
          <p>{lab.name}</p>
          {data.verified_at && <p>Verified: {new Date(data.verified_at).toLocaleString()}</p>}
        </div>
      </div>

      {/* Page footer */}
      <div className="report-page-footer">
        <span>{lab.name}</span>
        <span>Page 1 of 1</span>
        <span>Confidential Medical Record</span>
      </div>

      <div style={{ fontSize: 10, marginTop: 8, textAlign: 'center', color: '#8c7071', fontStyle: 'italic' }}>
        This report is confidential and intended solely for the use of the patient and their physician.
        Clinical interpretation by a qualified medical professional is recommended.
      </div>
    </div>
  );
}
