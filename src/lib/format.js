const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Formats a byte count for display, using 1024-based units.
 *
 * @param {number} bytes Non-negative integer byte count.
 * @returns {string} e.g. "0 B", "512 B", "1.5 KB", "3.0 MB".
 */
export function formatBytes(bytes) {
  if (!Number.isInteger(bytes) || bytes < 0) {
    throw new RangeError(`formatBytes expects a non-negative integer, got ${bytes}`);
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Rounding can reach 1024 (e.g. 1023.96 KB): show "1.0 MB" instead of "1024.0 KB".
  if (unit > 0 && unit < UNITS.length - 1 && Number(value.toFixed(1)) >= 1024) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${UNITS[unit]}`;
}

/**
 * Formats a timestamp as a local date and time, e.g. "Jan 15, 2024, 1:05 PM".
 *
 * @param {number} ms Milliseconds since the Unix epoch.
 * @param {{ locale?: string, timeZone?: string }} [options] Defaults to the runtime's locale and time zone.
 * @returns {string}
 */
export function formatDate(ms, { locale, timeZone } = {}) {
  if (!Number.isFinite(ms)) {
    throw new RangeError(`formatDate expects a finite number of milliseconds, got ${ms}`);
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(ms);
}
