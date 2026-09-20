/**
 * Currency and string formatting helpers
 */

/**
 * Format Indian Rupee currency with en-IN grouping (e.g. ₹500, ₹1,200)
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Mask an Indian phone number: +91 98•••• 3210
 */
export function maskPhone(phone: string): string {
  if (!phone) return '—';
  // Strip non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const first2 = digits.slice(-10, -8);
    return `+91 ${first2}•••• ${last4}`;
  }
  return phone.replace(/.(?=.{4})/g, '•');
}

/**
 * Clean phone to 10 digits
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}
