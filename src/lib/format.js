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
  return unit === 0 ? `${value} B` : `${value.toFixed(1)} ${UNITS[unit]}`;
}
