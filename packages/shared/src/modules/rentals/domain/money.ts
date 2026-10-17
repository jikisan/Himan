const MAX_CENTAVOS = 2_000_000_000;

export function parsePesos(input: string): number {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Enter an amount like 10,000 or 1,500.50');
  const [whole, fraction = ''] = cleaned.split('.');
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos > MAX_CENTAVOS) throw new Error('Amount is too large');
  return centavos;
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const formatPesos = (centavos: number): string => peso.format(centavos / 100);
export const centavosToInput = (centavos: number): string => (centavos ? (centavos / 100).toFixed(2) : '');

export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
}
