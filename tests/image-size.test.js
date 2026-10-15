import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getImageSize } from '../src/lib/image-size.js';
import { formatDimensions } from '../src/lib/format.js';

/**
 * @param {string} hex space-separated hex bytes, e.g. "FF D8"
 * @returns {number[]}
 */
const hex = (hex) => hex.trim().split(/\s+/).map((b) => parseInt(b, 16));

/** @param {...(number[] | string)} parts hex strings or byte arrays, concatenated */
const bytes = (...parts) => Uint8Array.from(parts.flatMap((p) => (typeof p === 'string' ? hex(p) : p)));

/**
 * A JPEG segment with a payload of the given length (filled with fill).
 *
 * @param {number} marker
 * @param {number} payloadLength
 * @param {number} [fill]
 */
const segment = (marker, payloadLength, fill = 0) => {
  const length = payloadLength + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...new Array(payloadLength).fill(fill)];
};

const PNG_1920x1080 = '89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52 00 00 07 80 00 00 04 38';
const SOF0_640x480 = 'FF C0 00 11 08 01 E0 02 80 03 01 22 00 02 11 01 03 11 01';

// The examples from the brief.

test('PNG: reads width and height from IHDR', () => {
  const size = getImageSize(bytes(PNG_1920x1080));
  assert.deepEqual(size, { format: 'png', width: 1920, height: 1080 });
  assert.equal(size && formatDimensions(size.width, size.height), '1920 × 1080 px');
});

test('GIF: reads the 16-bit little-endian logical screen size', () => {
  const size = getImageSize(bytes('47 49 46 38 39 61 0A 00 05 00'));
  assert.deepEqual(size, { format: 'gif', width: 10, height: 5 });
  assert.equal(size && formatDimensions(size.width, size.height), '10 × 5 px');
});

test('JPEG: APP0 then SOF0', () => {
  const size = getImageSize(bytes('FF D8', segment(0xe0, 14), SOF0_640x480));
  assert.deepEqual(size, { format: 'jpeg', width: 640, height: 480 });
  assert.equal(size && formatDimensions(size.width, size.height), '640 × 480 px');
});

test('truncated PNG returns null', () => {
  assert.equal(getImageSize(bytes('89 50 4E 47 0D 0A 1A 0A 00 00 00 0D')), null);
});

test('text file returns null', () => {
  assert.equal(getImageSize(bytes('68 65 6C 6C 6F')), null);
});

// JPEG segment walking.

test('JPEG: SOF after an APP1 (EXIF) segment whose payload contains a fake SOF', () => {
  // The EXIF payload holds bytes that look like an SOF0 for 1×1; a byte search would find it.
  const exif = [...hex('45 78 69 66 00 00'), ...hex('FF C0 00 11 08 00 01 00 01'), ...new Array(200).fill(0xab)];
  const app1 = [0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff, ...exif];
  assert.deepEqual(getImageSize(bytes('FF D8', segment(0xe0, 14), app1, SOF0_640x480)), {
    format: 'jpeg',
    width: 640,
    height: 480,
  });
});

test('JPEG: no SOF before SOS returns null', () => {
  assert.equal(getImageSize(bytes('FF D8', segment(0xe0, 14), segment(0xdb, 65), segment(0xda, 10), '12 34 FF D9')), null);
});

test('JPEG: no SOF before the data runs out returns null', () => {
  assert.equal(getImageSize(bytes('FF D8', segment(0xe0, 14), segment(0xe1, 100))), null);
  assert.equal(getImageSize(bytes('FF D8')), null);
  assert.equal(getImageSize(bytes('FF D8 FF D9')), null);
});

test('JPEG: every SOF variant is recognised; DHT, JPG and DAC are not frames', () => {
  for (const marker of [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]) {
    const sof = [0xff, marker, ...hex(SOF0_640x480).slice(2)];
    assert.deepEqual(getImageSize(bytes('FF D8', sof)), { format: 'jpeg', width: 640, height: 480 }, marker.toString(16));
  }
  for (const marker of [0xc4, 0xc8, 0xcc]) {
    const notSof = [0xff, marker, ...hex(SOF0_640x480).slice(2)];
    assert.equal(getImageSize(bytes('FF D8', notSof)), null, marker.toString(16));
  }
});

test('JPEG: skips fill bytes and standalone markers (RST, TEM)', () => {
  assert.deepEqual(getImageSize(bytes('FF D8 FF FF FF', segment(0xe0, 14).slice(1), 'FF D0 FF 01', SOF0_640x480)), {
    format: 'jpeg',
    width: 640,
    height: 480,
  });
});

test('JPEG: SOF header cut off mid-way returns null', () => {
  const full = bytes('FF D8', SOF0_640x480);
  for (let end = 2; end < 4 + 7; end += 1) assert.equal(getImageSize(full.subarray(0, end)), null, `length ${end}`);
  // Enough of the SOF payload to read height and width is enough.
  assert.deepEqual(getImageSize(full.subarray(0, 4 + 7)), { format: 'jpeg', width: 640, height: 480 });
});

test('JPEG: corrupt structure returns null', () => {
  assert.equal(getImageSize(bytes('FF D8 00 00')), null, 'no marker where one is expected');
  assert.equal(getImageSize(bytes('FF D8 FF E0 00 01 FF C0')), null, 'length below 2');
  assert.equal(getImageSize(bytes('FF D8 FF 00 00 10')), null, '00 is not a marker');
  assert.equal(getImageSize(bytes('FF D8 FF E0 FF FF')), null, 'segment longer than the data');
  assert.equal(getImageSize(bytes('FF D8 FF C0 00 05 08 01 E0')), null, 'SOF too short to hold the size');
  assert.equal(getImageSize(bytes('FF D8 FF C0 00 11 08 00 00 02 80')), null, 'zero height');
});

// PNG and GIF edge cases.

test('PNG: wrong signature, missing IHDR or bad IHDR length returns null', () => {
  /** @param {number} index @param {number} value */
  const pngWith = (index, value) => {
    const png = bytes(PNG_1920x1080);
    png[index] = value;
    return png;
  };
  assert.equal(getImageSize(bytes(PNG_1920x1080).subarray(0, 23)), null, 'one byte short');
  assert.equal(getImageSize(pngWith(1, 0x51)), null, 'signature');
  assert.equal(getImageSize(pngWith(12, 0x69)), null, 'chunk type');
  assert.equal(getImageSize(pngWith(11, 0x0c)), null, 'chunk length');
});

test('PNG: zero or over-2^31 sizes return null; large valid sizes are unsigned', () => {
  const png = hex(PNG_1920x1080);
  assert.equal(getImageSize(Uint8Array.from([...png.slice(0, 16), 0, 0, 0, 0, ...png.slice(20)])), null);
  assert.equal(getImageSize(Uint8Array.from([...png.slice(0, 16), 0x80, 0, 0, 0, ...png.slice(20)])), null);
  assert.deepEqual(getImageSize(Uint8Array.from([...png.slice(0, 16), 0x7f, 0xff, 0xff, 0xff, ...png.slice(20)])), {
    format: 'png',
    width: 0x7fffffff,
    height: 1080,
  });
});

test('GIF: GIF87a works; truncated, zero-sized or wrong version returns null', () => {
  assert.deepEqual(getImageSize(bytes('47 49 46 38 37 61 FF FF 01 01')), { format: 'gif', width: 65535, height: 257 });
  assert.equal(getImageSize(bytes('47 49 46 38 39 61 0A 00 05')), null);
  assert.equal(getImageSize(bytes('47 49 46 38 39 61 00 00 05 00')), null);
  assert.equal(getImageSize(bytes('47 49 46 38 38 61 0A 00 05 00')), null);
});

test('works on a Uint8Array view with a non-zero offset into a larger buffer', () => {
  const buffer = new Uint8Array(100);
  buffer.set(hex('47 49 46 38 39 61 0A 00 05 00'), 40);
  assert.deepEqual(getImageSize(buffer.subarray(40)), { format: 'gif', width: 10, height: 5 });
});

test('never throws: empty, non-array and random input return null', () => {
  assert.equal(getImageSize(new Uint8Array(0)), null);
  for (const bad of [undefined, null, 'GIF89a', [0xff, 0xd8], new ArrayBuffer(10)]) {
    assert.equal(getImageSize(/** @type {Uint8Array} */ (/** @type {unknown} */ (bad))), null);
  }
  // Deterministic pseudo-random bytes behind each signature.
  let seed = 1;
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed >>> 24;
  };
  for (const prefix of ['89 50 4E 47 0D 0A 1A 0A', '47 49 46 38 39 61', 'FF D8', '']) {
    for (let n = 0; n < 300; n += 1) {
      const input = bytes(prefix, Array.from({ length: n % 64 }, rand));
      assert.doesNotThrow(() => getImageSize(input));
    }
  }
});
