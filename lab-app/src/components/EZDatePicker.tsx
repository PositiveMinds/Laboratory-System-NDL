import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time' | 'datetime' | 'daterange';
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  onRangeChange?: (start: string, end: string) => void;
}

export default function EZDatePicker({ value, onChange, mode = 'date', placeholder, disabled, id, className, onRangeChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const instanceRef = useRef<EZDateTimePickerInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const onRangeRef = useRef(onRangeChange);
  onChangeRef.current = onChange;
  onRangeRef.current = onRangeChange;

  useEffect(() => {
    if (!inputRef.current) return;

    const init = () => {
      if (typeof window.EZDateTimePicker === 'undefined') {
        setTimeout(init, 30);
        return;
      }
      if (instanceRef.current) return;

      const isRange = mode === 'daterange';
      instanceRef.current = new window.EZDateTimePicker(inputRef.current!, {
        mode,
        format: mode === 'date' ? 'YYYY-MM-DD' : mode === 'daterange' ? 'YYYY-MM-DD' : undefined,
        placeholder: placeholder || (isRange ? 'Start — End' : 'Select date'),
        showToday: true,
        showClear: true,
        showApply: isRange,
        closeOnSelect: !isRange,
        presets: isRange ? [
          { label: 'Today',        start: new Date(), end: new Date() },
          { label: 'Last 7 days',  start: new Date(Date.now() - 6 * 86400000), end: new Date() },
          { label: 'Last 30 days', start: new Date(Date.now() - 29 * 86400000), end: new Date() },
          { label: 'This month',   start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
        ] : null,
        onSelect: (val: unknown) => {
          if (isRange && val && typeof val === 'object' && 'start' in val) {
            const r = val as { start: Date; end: Date };
            const fmt = (d: Date) => d.toISOString().slice(0, 10);
            onRangeRef.current?.(fmt(r.start), fmt(r.end));
          } else if (val instanceof Date) {
            onChangeRef.current(val.toISOString().slice(0, 10));
          }
        },
        onChange: (val: unknown) => {
          if (!isRange && val instanceof Date) {
            onChangeRef.current(val.toISOString().slice(0, 10));
          }
        },
      });
    };

    init();
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  // Sync value to instance
  useEffect(() => {
    if (instanceRef.current && value && mode !== 'daterange') {
      try { instanceRef.current.setDate(value); } catch {}
    }
  }, [value, mode]);

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      className={className}
      placeholder={placeholder || (mode === 'daterange' ? 'Start — End' : 'Select date')}
      readOnly
      disabled={disabled}
    />
  );
}
