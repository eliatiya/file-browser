import { formatBytes, formatDate } from './format.js';

/** @typedef {import('./tree.js').NodeData} NodeData */

/**
 * Label/value pairs for the detail pane. Folders get name and type only.
 *
 * @param {NodeData} data
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
  return [
    { label: 'Name', value: data.name },
    { label: 'Size', value: data.size === undefined ? '—' : formatBytes(data.size) },
    { label: 'Type', value: data.type || 'Unknown' },
    {
      label: 'Last modified',
      value: data.lastModified === undefined ? '—' : formatDate(data.lastModified, dateOptions),
    },
  ];
}
