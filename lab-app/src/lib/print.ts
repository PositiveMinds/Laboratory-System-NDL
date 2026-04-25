export function triggerPrint() {
  const size = localStorage.getItem('printer_paper_size') || '80mm';
  let existing = document.getElementById('ndl-print-page-style') as HTMLStyleElement | null;
  if (!existing) {
    existing = document.createElement('style');
    existing.id = 'ndl-print-page-style';
    document.head.appendChild(existing);
  }
  existing.innerHTML = size === 'A4'
    ? '@page { size: A4 portrait; margin: 10mm; }'
    : `@page { size: ${size} auto; margin: 3mm; }`;
  window.print();
}

export const autoPrintEnabled = () => localStorage.getItem('printer_auto_print') === 'true';
