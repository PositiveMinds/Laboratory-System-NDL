export const fmtUGX = (n: number): string =>
  'UGX ' + Math.round(n).toLocaleString('en-UG');
