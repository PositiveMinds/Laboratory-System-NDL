import type { ReceiptData } from '../types';
import { fmtUGX } from '../lib/currency';

interface Props {
  data: ReceiptData;
}

export default function PrintReceipt({ data }: Props) {
  const date = new Date(data.payment_date).toLocaleString();

  return (
    <div className="receipt-print">
      <div className="receipt-header">
        <img src="/ndl.png" alt="NDL" style={{ height: 64, marginBottom: 6, objectFit: 'contain' }} />
        <h2>Noble Diagnostic Laboratory</h2>
        <p>Professionalism Is Part Of Us</p>
        <p>P.O BOX Kitooro — Entebbe, Maina House</p>
        <p>Plot: 31A Kiwafu Road</p>
        <p>Tel: +256 706947101 / +256 782087828</p>
        <p>Email: mas884@yahoo.com</p>
        <p style={{ marginTop: 6, fontWeight: 700 }}>RECEIPT</p>
      </div>

      <div className="receipt-section">
        <div className="receipt-row">
          <span>Receipt No:</span>
          <strong>{data.receipt_number}</strong>
        </div>
        <div className="receipt-row">
          <span>Order No:</span>
          <strong>{data.order_number}</strong>
        </div>
        <div className="receipt-row">
          <span>Date:</span>
          <span>{date}</span>
        </div>
        <div className="receipt-row">
          <span>Cashier:</span>
          <span>{data.cashier_name}</span>
        </div>
        <div className="receipt-row">
          <span>Payment:</span>
          <span style={{ textTransform: 'capitalize' }}>{data.payment_method}</span>
        </div>
      </div>

      <div className="receipt-section">
        <div className="receipt-section-title">Patient Info</div>
        <div className="receipt-row">
          <span>Name:</span>
          <span>{data.patient_name}</span>
        </div>
        <div className="receipt-row">
          <span>ID:</span>
          <span>{data.patient_ref}</span>
        </div>
        {data.patient_gender && (
          <div className="receipt-row">
            <span>Gender:</span>
            <span>{data.patient_gender}</span>
          </div>
        )}
        {data.patient_age && (
          <div className="receipt-row">
            <span>Age:</span>
            <span>{data.patient_age} yrs</span>
          </div>
        )}
      </div>

      <div className="receipt-section">
        <div className="receipt-section-title">Tests Ordered</div>
        {data.items.map((item, i) => (
          <div key={i} className="receipt-row">
            <span>{item.test_name}</span>
            <span>{fmtUGX(item.price)}</span>
          </div>
        ))}
      </div>

      <div className="receipt-total">
        <div className="receipt-row bold">
          <span>SUBTOTAL:</span>
          <span>{fmtUGX(data.total_amount)}</span>
        </div>
        {data.discount_amount > 0 && (
          <div className="receipt-row bold" style={{ color: '#f59e0b' }}>
            <span>DISCOUNT:</span>
            <span>- {fmtUGX(data.discount_amount)}</span>
          </div>
        )}
        <div className="receipt-row bold">
          <span>PAID:</span>
          <span>{fmtUGX(data.amount_paid)}</span>
        </div>
        {data.balance > 0.01 && (
          <div className="receipt-row bold" style={{ color: '#c82909' }}>
            <span>BALANCE:</span>
            <span>{fmtUGX(data.balance)}</span>
          </div>
        )}
      </div>

      {data.notes && (
        <div className="receipt-section">
          <div className="receipt-section-title">Notes</div>
          <p style={{ fontSize: 10 }}>{data.notes}</p>
        </div>
      )}

      <div className="receipt-footer">
        <p>Thank you for choosing Noble Diagnostic Laboratory</p>
        <p style={{ marginTop: 16 }}>___________________________</p>
        <p>Authorized Signature</p>
      </div>
    </div>
  );
}
