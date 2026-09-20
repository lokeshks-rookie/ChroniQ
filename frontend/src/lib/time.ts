// Indian Standard Time (IST is UTC+05:30) helper functions

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Format an ISO string or Date to IST 12-hour time: "10:30 AM"
 */
export function formatTimeIST(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format date to IST: "20 Sep 2026"
 */
export function formatDateIST(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format datetime to IST: "20 Sep 2026, 10:30 AM"
 */
export function formatDateTimeIST(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format relative time: "just now", "2m ago", "1h ago"
 */
export function formatRelativeTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Get current date string in IST calendar format: "YYYY-MM-DD"
 */
export function getTodayDateStringIST(): string {
  const now = new Date();
  const istDate = new Date(now.getTime() + (IST_OFFSET_MS - now.getTimezoneOffset() * 60000));
  return istDate.toISOString().split('T')[0];
}

/**
 * Format seconds to MM:SS elapsed timer display
 */
export function formatElapsedSeconds(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Return a live IST clock string: "10:30:15 AM IST"
 */
export function getLiveClockIST(now: Date = new Date()): string {
  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);
  return `${timeStr} IST`;
}
