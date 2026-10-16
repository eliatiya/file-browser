import { formatBytes, formatDate, formatDimensions } from './format.js';

/** @typedef {import('./tree.js').NodeData} NodeData */

/** Files larger than this (100 MB, binary units like formatBytes) get a warning on their size. */
const LARGE_FILE_BYTES = 100 * 1024 ** 2;

/**
 * Label/value pairs for the detail pane. Folders get name and type only; files get a
 * Dimensions row only when dimensions are given. The Size row is flagged `warning` for files
 * over 100 MB.
 *
 * @param {NodeData & { dimensions?: { width: number, height: number } | null }} data
 * @param {{ locale?: string, timeZone?: string }} [dateOptions] passed to formatDate
 * @returns {Array<{ label: string, value: string, warning?: boolean }>}
 */
export function detailRows(data, dateOptions) {
  if (data.kind === 'directory') {
    return [
      { label: 'Name', value: data.name },
      { label: 'Type', value: 'Folder' },
    ];
  }
  /** @type {Array<{ label: string, value: string, warning?: boolean }>} */
  const rows = [
    { label: 'Name', value: data.name },
    { label: 'Size', value: data.size === undefined ? '—' : formatBytes(data.size) },
    { label: 'Type', value: data.type || 'Unknown' },
    {
      label: 'Last modified',
      value: data.lastModified === undefined ? '—' : formatDate(data.lastModified, dateOptions),
    },
  ];
  if (data.size !== undefined && data.size > LARGE_FILE_BYTES) rows[1].warning = true;
  if (data.dimensions) {
    rows.push({ label: 'Dimensions', value: formatDimensions(data.dimensions.width, data.dimensions.height) });
  }
  return rows;
}
