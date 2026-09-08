export function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQuantity(quantity: number, unit?: string): string {
  if (quantity == null) return '0';
  // Number() automatically removes meaningless trailing zeros (e.g., 25.000 -> 25, 1.500 -> 1.5)
  // toFixed(3) ensures we don't get floating point anomalies like 1.50000000001
  return String(Number(Number(quantity).toFixed(3)));
}

/**
 * Discounts are stored as amounts on the API but shown to users as a
 * percentage of the bill subtotal.
 */
export function toDiscountPercent(
  discountAmount: number,
  subtotal: number)
  : number {
  if (!Number.isFinite(discountAmount) || !Number.isFinite(subtotal)) return 0;
  if (subtotal <= 0 || discountAmount <= 0) return 0;
  return discountAmount / subtotal * 100;
}

/** Trims trailing zeros so 10 renders as "10" and 12.5 as "12.5". */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Number(value.toFixed(2)));
}

const MEDIA_BASE_URL = 'https://storage.googleapis.com/utdposcs/media/';

export function getPhotoUrl(
  path: string | null | undefined)
  : string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_BASE_URL}${path}`;
}