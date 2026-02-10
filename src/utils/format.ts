export function formatPrice(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MEDIA_BASE_URL = 'https://storage.googleapis.com/utdpos/media/';

export function getPhotoUrl(
path: string | null | undefined)
: string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_BASE_URL}${path}`;
}