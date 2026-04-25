import type { ResultsReportData } from '../types';

interface Props {
  data: ResultsReportData;
}

export default function PrintResults({ data }: Props) {
  const orderDate = new Date(data.order_date).toLocaleDateString();
  const resultDate = new Date(data.result_date).toLocaleString();

  return (
    <div className="results-report">
      <div className="report-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/ndl.png" alt="NDL" style={{ height: 60, objectFit: 'contain' }} />
          <div>
            <div className="report-lab-name" style={{ whiteSpace: 'nowrap' }}>Noble Diagnostic Laboratory</div>
            <div className="report-lab-sub">Professionalism Is Part Of Us</div>
            <div className="report-lab-sub">P.O BOX Kitooro — Entebbe, Maina House, Plot: 31A Kiwafu Road</div>
            <div className="report-lab-sub">Tel: +256 706947101 / +256 782087828 &nbsp;|&nbsp; Email: mas884@yahoo.com</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div><strong>Order No:</strong> {data.order_number}</div>
          <div><strong>Date Collected:</strong> {orderDate}</div>
          <div><strong>Date Reported:</strong> {resultDate}</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
          Laboratory Results Report
        </strong>
      </div>

      <div className="report-patient-info">
        <div className="report-info-row">
          <span className="report-info-label">Patient Name:</span>
          <strong>{data.patient_name}</strong>
        </div>
        <div className="report-info-row">
          <span className="report-info-label">Patient ID:</span>
          <span>{data.patient_ref}</span>
        </div>
        {data.patient_age && (
          <div className="report-info-row">
            <span className="report-info-label">Age:</span>
            <span>{data.patient_age} years</span>
          </div>
        )}
        {data.patient_gender && (
          <div className="report-info-row">
            <span className="report-info-label">Gender:</span>
            <span>{data.patient_gender}</span>
          </div>
        )}
        {data.patient_phone && (
          <div className="report-info-row">
            <span className="report-info-label">Phone:</span>
            <span>{data.patient_phone}</span>
          </div>
        )}
        <div className="report-info-row">
          <span className="report-info-label">Requested By:</span>
          <span>{data.requested_by}</span>
        </div>
        {data.referred_by && (
          <div className="report-info-row">
            <span className="report-info-label">Referred By:</span>
            <span>{data.referred_by}</span>
          </div>
        )}
        {data.specimen_type && (
          <div className="report-info-row">
            <span className="report-info-label">Specimen:</span>
            <span>{data.specimen_type}{data.specimen_id ? ` (${data.specimen_id})` : ''}</span>
          </div>
        )}
      </div>

      {data.categories.map(cat => (
        <div key={cat.name}>
          <div className="report-cat-title">{cat.name}</div>
          <table className="report-results-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {cat.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.test_name}</td>
                  <td style={{ fontWeight: item.flag && item.flag !== 'N' ? 700 : 400 }}>
                    {item.result_value || '—'}
                  </td>
                  <td>{item.unit || '—'}</td>
                  <td>{item.reference_range || '—'}</td>
                  <td className={item.flag ? `flag-${item.flag}` : ''}>
                    {item.flag || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="report-footer">
        <div className="signature-block">
          <div style={{ height: 40 }} />
          <div>___________________________</div>
          <div style={{ marginTop: 4 }}>
            {data.verified_by ? `${data.verified_by}` : 'Pathologist / Lab Scientist'}
          </div>
          {data.verified_at && (
            <div style={{ fontSize: 10, color: '#555' }}>Verified: {new Date(data.verified_at).toLocaleString()}</div>
          )}
          <div>Noble Diagnostic Laboratory</div>
        </div>
      </div>

      <div style={{ fontSize: 10, marginTop: 16, textAlign: 'center', color: '#888' }}>
        This report is confidential and intended solely for the use of the patient and their physician.
      </div>
    </div>
  );
}
