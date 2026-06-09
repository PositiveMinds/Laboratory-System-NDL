import { useRef, useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { compressImage, formatKB } from '../lib/imageUtils';

interface Props {
  value?: string | null;          // current base64 data URL
  onChange: (dataUrl: string | null) => void;
  maxKB: number;                  // 50 for logo, 100 for photo
  label: string;
  hint?: string;
  accept?: string;
  shape?: 'rect' | 'circle';
  previewHeight?: number;
}

export default function ImageUpload({
  value, onChange, maxKB, label, hint,
  accept = 'image/png,image/jpeg,image/jpg,image/webp',
  shape = 'rect',
  previewHeight = 100,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file, maxKB);
      onChange(dataUrl);
    } catch (err) {
      setError(String(err));
    } finally {
      setCompressing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  return (
    <div>
      <label className="form-label">{label}</label>

      {value ? (
        /* Preview */
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: shape === 'circle' ? previewHeight : 'auto',
            height: previewHeight,
            borderRadius: shape === 'circle' ? '50%' : 'var(--radius)',
            overflow: 'hidden',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-low)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={value}
              alt={label}
              style={{
                width: '100%', height: '100%',
                objectFit: shape === 'circle' ? 'cover' : 'contain',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
              {formatKB(value)} • {value.startsWith('data:image/png') ? 'PNG (transparency preserved)' : 'JPEG'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => inputRef.current?.click()}
                disabled={compressing}
              >
                <Upload size={12} /> Change
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onChange(null)}
                style={{ color: 'var(--error)' }}
              >
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: '2px dashed var(--outline-variant)',
            borderRadius: 'var(--radius)',
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--surface-container-low)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--outline-variant)'; }}
        >
          {compressing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="spinner" />
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Compressing…</span>
            </div>
          ) : (
            <>
              <Image size={24} style={{ color: 'var(--on-surface-variant)', marginBottom: 6, opacity: 0.5 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>
                Click to upload or drag & drop
              </div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3 }}>
                PNG (transparency preserved) · JPEG · Max {maxKB} KB after compression
              </div>
              {hint && <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>{hint}</div>}
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 6 }}>{error}</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
