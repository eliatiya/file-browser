/**
 * @typedef {object} ImageSize
 * @property {'png' | 'jpeg' | 'gif'} format
 * @property {number} width Pixels, always > 0.
 * @property {number} height Pixels, always > 0.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = [0x49, 0x48, 0x44, 0x52];
const GIF87A = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89A = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

/** JPEG Start-of-Frame markers: C0–CF except C4 (DHT), C8 (JPG) and CC (DAC). */
const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPEG_SOS = 0xda;
const JPEG_EOI = 0xd9;

/**
 * Reads the pixel dimensions from the header of a PNG, JPEG or GIF file.
 * Never throws: unknown, truncated or corrupt input returns null.
 *
 * @param {Uint8Array} bytes The start of the file; the header must be inside it.
 * @returns {ImageSize | null}
 */
export function getImageSize(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (startsWith(bytes, PNG_SIGNATURE)) return pngSize(bytes);
  if (startsWith(bytes, GIF87A) || startsWith(bytes, GIF89A)) return gifSize(bytes);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
  return null;
}

/**
 * The IHDR chunk must come first: length 13 at bytes 8–11, "IHDR" at 12–15, then
 * width and height as 32-bit big-endian.
 *
 * @param {Uint8Array} bytes
 * @returns {ImageSize | null}
 */
function pngSize(bytes) {
  if (bytes.length < 24 || readU32BE(bytes, 8) !== 13 || !startsWith(bytes, IHDR, 12)) return null;
  const width = readU32BE(bytes, 16);
  const height = readU32BE(bytes, 20);
  // The PNG spec caps both at 2^31 - 1; anything larger is corrupt.
  if (width > 0x7fffffff || height > 0x7fffffff) return null;
  return result('png', width, height);
}

/**
 * Logical screen size: width at bytes 6–7, height at 8–9, both 16-bit little-endian.
 *
 * @param {Uint8Array} bytes
 * @returns {ImageSize | null}
 */
function gifSize(bytes) {
  if (bytes.length < 10) return null;
  return result('gif', bytes[6] | (bytes[7] << 8), bytes[8] | (bytes[9] << 8));
}

/**
 * Walks the marker segments after SOI until a Start-of-Frame. Segments are walked rather than
 * searched for, because EXIF/APP data before the frame can contain any byte sequence.
 *
 * @param {Uint8Array} bytes
 * @returns {ImageSize | null}
 */
function jpegSize(bytes) {
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    while (i < bytes.length && bytes[i] === 0xff) i += 1; // fill bytes
    if (i >= bytes.length) return null;
    const marker = bytes[i];
    i += 1;

    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) continue; // no length
    // 00 is not a marker; SOS starts entropy-coded data and EOI ends the image, so a frame
    // header can no longer follow either.
    if (marker === 0x00 || marker === JPEG_SOS || marker === JPEG_EOI) return null;

    if (i + 2 > bytes.length) return null;
    const length = (bytes[i] << 8) | bytes[i + 1];
    if (length < 2) return null;

    if (JPEG_SOF.has(marker)) {
      // Payload: precision (1 byte), height (2 bytes BE), width (2 bytes BE).
      if (length < 7 || i + 7 > bytes.length) return null;
      const height = (bytes[i + 3] << 8) | bytes[i + 4];
      const width = (bytes[i + 5] << 8) | bytes[i + 6];
      return result('jpeg', width, height);
    }
    i += length;
  }
  return null;
}

/**
 * @param {ImageSize['format']} format
 * @param {number} width
 * @param {number} height
 * @returns {ImageSize | null} null when either side is 0
 */
function result(format, width, height) {
  return width > 0 && height > 0 ? { format, width, height } : null;
}

/**
 * @param {Uint8Array} bytes
 * @param {readonly number[]} prefix
 * @param {number} [offset]
 */
function startsWith(bytes, prefix, offset = 0) {
  if (bytes.length < offset + prefix.length) return false;
  return prefix.every((b, k) => bytes[offset + k] === b);
}

/**
 * Unsigned 32-bit big-endian. Caller checks bounds.
 *
 * @param {Uint8Array} bytes
 * @param {number} offset
 */
function readU32BE(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}
