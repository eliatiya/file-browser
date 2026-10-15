import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatDate } from '../src/lib/format.js';

test('formatBytes: bytes stay unscaled', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1), '1 B');
  assert.equal(formatBytes(1023), '1023 B');
});

test('formatBytes: scales by 1024 with one decimal', () => {
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(1024 ** 2 - 1), '1.0 MB');
  assert.equal(formatBytes(Math.round(1.2 * 1024 ** 2)), '1.2 MB');
  assert.equal(formatBytes(3 * 1024 ** 2), '3.0 MB');
  assert.equal(formatBytes(2 * 1024 ** 4), '2.0 TB');
});

test('formatBytes: rejects invalid input', () => {
  assert.throws(() => formatBytes(-1), RangeError);
  assert.throws(() => formatBytes(1.5), RangeError);
  assert.throws(() => formatBytes(Number.NaN), RangeError);
});

test('formatDate: formats in the given locale and time zone', () => {
  const ms = Date.UTC(2024, 0, 15, 13, 5);
  assert.match(formatDate(ms, { locale: 'en-US', timeZone: 'UTC' }), /^Jan 15, 2024, 1:05\sPM$/);
  assert.match(formatDate(ms, { locale: 'en-US', timeZone: 'Asia/Tokyo' }), /^Jan 15, 2024, 10:05\sPM$/);
  assert.match(formatDate(0, { locale: 'en-GB', timeZone: 'UTC' }), /^1 Jan 1970, 00:00$/);
});

test('formatDate: defaults to the local time zone', () => {
  const ms = Date.UTC(2024, 5, 1, 12);
  const local = new Date(ms);
  const expected = formatDate(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes()), {
    timeZone: 'UTC',
  });
  assert.equal(formatDate(ms), expected);
});

test('formatDate: rejects invalid input', () => {
  assert.throws(() => formatDate(Number.NaN), RangeError);
  assert.throws(() => formatDate(Number.POSITIVE_INFINITY), RangeError);
});
