import { formatBytes, formatDate, formatDimensions } from './format.js';

/** @typedef {import('./tree.js').NodeData} NodeData */

/**
 * Label/value pairs for the detail pane. Folders get name and type only; files get a
 * Dimensions row only when dimensions are given.
 *
 * @param {NodeData & { dimensions?: { width: number, height: number } | null }} data
 * @param {{ locale?: string, timeZone?: string }} [dateOptions] passed to formatDate
 * @returns {Array<{ label: string, value: string }>}
 */
export function detailRows(data, dateOptions) {
  if (data.kind === 'directory') {
    return [
      { label: 'Name', value: data.name },
      { label: 'Type', value: 'Folder' },
    ];
  }
  const rows = [
    { label: 'Name', value: data.name },
    { label: 'Size', value: data.size === undefined ? '—' : formatBytes(data.size) },
    { label: 'Type', value: data.type || 'Unknown' },
    {
      label: 'Last modified',
      value: data.lastModified === undefined ? '—' : formatDate(data.lastModified, dateOptions),
    },
  ];
  if (data.dimensions) {
    rows.push({ label: 'Dimensions', value: formatDimensions(data.dimensions.width, data.dimensions.height) });
  }
  return rows;
}
