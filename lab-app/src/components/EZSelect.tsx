import { useEffect, useRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export default function EZSelect({ value, onChange, options, placeholder, searchable, disabled, id, className }: Props) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const instanceRef = useRef<EZSelectInstance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!selectRef.current) return;

    const init = () => {
      if (typeof window.EZone?.EZSelect === 'undefined') {
        setTimeout(init, 30);
        return;
      }
      if (instanceRef.current) return;

      instanceRef.current = new window.EZone.EZSelect(selectRef.current!, {
        placeholder: placeholder || 'Select...',
        searchable: searchable !== false && options.length > 5,
        clearable: false,
        closeOnSelect: true,
      });

      selectRef.current!.addEventListener('ez.select.change', (e: Event) => {
        const detail = (e as CustomEvent).detail;
        onChangeRef.current(detail.value ?? '');
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
    if (instanceRef.current) {
      instanceRef.current.setValue(value || null);
    }
  }, [value]);

  // Sync disabled state
  useEffect(() => {
    if (instanceRef.current) {
      disabled ? instanceRef.current.disable() : instanceRef.current.enable();
    }
  }, [disabled]);

  return (
    <select ref={selectRef} id={id} className={className} defaultValue={value} disabled={disabled}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
