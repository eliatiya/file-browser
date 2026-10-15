/** MIME types the detail pane shows a preview for. */
const PREVIEWABLE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/**
 * Whether the detail pane should show an image preview for a file of this MIME type.
 * Case-insensitive; parameters after ";" and surrounding whitespace are ignored.
 *
 * @param {string | undefined} type a File's MIME type; may be empty
 * @returns {boolean}
 */
export function isPreviewable(type) {
  if (typeof type !== 'string') return false;
  return PREVIEWABLE_TYPES.has(type.split(';')[0].trim().toLowerCase());
}
