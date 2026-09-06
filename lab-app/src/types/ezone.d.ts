/* Global declarations for EZone Framework (loaded via public/js script tags) */

declare global {
  interface EZSelectOptions {
    placeholder?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    multiple?: boolean;
    clearable?: boolean;
    closeOnSelect?: boolean;
    selectAll?: boolean;
    maxSelections?: number | null;
    taggable?: boolean;
    maxHeight?: number;
    noResults?: string;
    onChange?: (value: string | string[] | null, item: unknown) => void;
  }

  interface EZSelectInstance {
    getValue(): string | string[] | null;
    setValue(value: string | string[] | null): void;
    clear(): void;
    enable(): void;
    disable(): void;
    refresh(): void;
    destroy(): void;
    open(): void;
    close(): void;
    originalEl: HTMLSelectElement;
  }

  interface EZDateTimePickerOptions {
    mode?: 'date' | 'time' | 'datetime' | 'daterange';
    format?: string | null;
    firstDay?: number;
    minDate?: Date | string | null;
    maxDate?: Date | string | null;
    defaultDate?: Date | string | null;
    showToday?: boolean;
    showClear?: boolean;
    showApply?: boolean;
    closeOnSelect?: boolean;
    hour12?: boolean;
    presets?: { label: string; start: Date; end: Date }[] | null;
    placeholder?: string | null;
    weekNumbers?: boolean;
    locale?: string;
    onOpen?: (() => void) | null;
    onClose?: (() => void) | null;
    onChange?: ((value: unknown) => void) | null;
    onSelect?: ((value: unknown) => void) | null;
  }

  interface EZDateTimePickerInstance {
    getValue(): Date | { start: Date; end: Date } | null;
    getDisplay(): string;
    setDate(value: Date | string): void;
    setRange(start: Date | string, end: Date | string): void;
    clear(): void;
    setMinDate(date: Date | string): void;
    setMaxDate(date: Date | string): void;
    open(): void;
    close(): void;
    toggle(): void;
    destroy(): void;
    _wrap: HTMLElement;
  }

  interface Window {
    EZone: {
      EZSelect: new (el: HTMLSelectElement | string, options?: EZSelectOptions) => EZSelectInstance;
      EZDateTimePicker?: new (el: HTMLInputElement | string, options?: EZDateTimePickerOptions) => EZDateTimePickerInstance;
    };
    EZDateTimePicker: new (el: HTMLInputElement | string, options?: EZDateTimePickerOptions) => EZDateTimePickerInstance;
  }
}

export {};
