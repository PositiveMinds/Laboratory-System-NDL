import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export type LabelSize = 'small' | 'medium' | 'large';

interface Props {
  orderNumber: string;
  patientName: string;
  patientRef: string;
  orderDate: string;
  copies?: number;
  size?: LabelSize;
}

const SIZE_CONFIG: Record<LabelSize, { cols: number; heightMm: number; fontSize: { order: number; name: number; meta: number }; barcodeHeight: number }> = {
  small:  { cols: 3, heightMm: 28, fontSize: { order: 9,  name: 8,  meta: 7  }, barcodeHeight: 22 },
  medium: { cols: 2, heightMm: 40, fontSize: { order: 11, name: 10, meta: 9  }, barcodeHeight: 30 },
  large:  { cols: 1, heightMm: 55, fontSize: { order: 13, name: 12, meta: 10 }, barcodeHeight: 38 },
};

function LabelItem({ orderNumber, patientName, patientRef, orderDate, size = 'medium' }: Omit<Props, 'copies'>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cfg = SIZE_CONFIG[size];

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, orderNumber, {
        format: 'CODE128',
        width: size === 'small' ? 1.2 : size === 'medium' ? 1.5 : 2,
        height: cfg.barcodeHeight,
        displayValue: false,
        margin: 0,
      });
    }
  }, [orderNumber, size]);

  return (
    <div style={{
      boxSizing: 'border-box',
      padding: size === 'small' ? '3px 5px' : '5px 8px',
      fontFamily: 'Arial, sans-serif',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden',
      height: `${cfg.heightMm}mm`,
      /* dashed cut guide — only right + bottom so borders don't double up */
      borderRight: '1px dashed #999',
      borderBottom: '1px dashed #999',
    }}>
      {/* Barcode */}
      <div style={{ textAlign: 'center', lineHeight: 0 }}>
        <svg ref={svgRef} style={{ width: '100%', height: cfg.barcodeHeight }} />
      </div>
      {/* Order number */}
      <div style={{ textAlign: 'center', fontSize: cfg.fontSize.order, fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 1 }}>
        {orderNumber}
      </div>
      {/* Patient name */}
      <div style={{ fontSize: cfg.fontSize.name, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
        {patientName}
      </div>
      {/* Patient ref + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: cfg.fontSize.meta, color: '#555', marginTop: 1 }}>
        <span>{patientRef}</span>
        <span>{new Date(orderDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default function PrintLabel({ orderNumber, patientName, patientRef, orderDate, copies = 1, size = 'medium' }: Props) {
  const cfg = SIZE_CONFIG[size];

  return (
    <>
      {/* Print-specific page setup injected here so it only applies when this component is mounted */}
      <style>{`
        @media print {
          @page { margin: 8mm; }
        }
      `}</style>

      {/* Outer border + top/left cut guides for the whole sheet */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
        /* top + left border closes the cut-guide box */
        borderTop: '1px dashed #999',
        borderLeft: '1px dashed #999',
        width: '100%',
        boxSizing: 'border-box',
        background: '#fff',
      }}>
        {Array.from({ length: copies }).map((_, i) => (
          <LabelItem
            key={i}
            orderNumber={orderNumber}
            patientName={patientName}
            patientRef={patientRef}
            orderDate={orderDate}
            size={size}
          />
        ))}
      </div>
    </>
  );
}
