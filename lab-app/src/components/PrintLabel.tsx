import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  orderNumber: string;
  patientName: string;
  patientRef: string;
  orderDate: string;
  copies?: number;
}

function LabelItem({ orderNumber, patientName, patientRef, orderDate }: Omit<Props, 'copies'>) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, orderNumber, {
        format: 'CODE128',
        width: 1.5,
        height: 32,
        displayValue: false,
        margin: 0,
      });
    }
  }, [orderNumber]);

  return (
    <div className="label-item" style={{
      width: 240, padding: '8px 10px', border: '1px solid #333',
      borderRadius: 4, fontFamily: 'Arial, sans-serif', pageBreakInside: 'avoid',
      display: 'inline-block', margin: 4,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <svg ref={svgRef} style={{ width: '100%', height: 36 }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
        {orderNumber}
      </div>
      <div style={{ fontSize: 10, marginTop: 4, borderTop: '1px solid #ccc', paddingTop: 3 }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {patientName}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
          <span>{patientRef}</span>
          <span>{new Date(orderDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function PrintLabel({ orderNumber, patientName, patientRef, orderDate, copies = 1 }: Props) {
  return (
    <div className="print-container" style={{ textAlign: 'center', padding: 16 }}>
      {Array.from({ length: copies }).map((_, i) => (
        <LabelItem
          key={i}
          orderNumber={orderNumber}
          patientName={patientName}
          patientRef={patientRef}
          orderDate={orderDate}
        />
      ))}
    </div>
  );
}
