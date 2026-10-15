import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes } from '../src/lib/format.js';

test('formatBytes: bytes stay unscaled', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1023), '1023 B');
});

test('formatBytes: scales by 1024 with one decimal', () => {
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(3 * 1024 ** 2), '3.0 MB');
  assert.equal(formatBytes(2 * 1024 ** 4), '2.0 TB');
});

test('formatBytes: rejects invalid input', () => {
  assert.throws(() => formatBytes(-1), RangeError);
  assert.throws(() => formatBytes(1.5), RangeError);
  assert.throws(() => formatBytes(Number.NaN), RangeError);
});
