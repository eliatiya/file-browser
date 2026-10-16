import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailRows } from '../src/lib/details.js';

const MB = 1024 ** 2;
/** @param {number | undefined} size */
const file = (size) => ({ name: 'a.bin', kind: /** @type {const} */ ('file'), size });
/** @param {number | undefined} size */
const sizeWarning = (size) => detailRows(file(size)).find((row) => row.label === 'Size')?.warning;

test('detailRows: size over 100 MB is flagged as a warning', () => {
  assert.equal(sizeWarning(100 * MB + 1), true);
  assert.equal(sizeWarning(5 * 1024 * MB), true);
});

test('detailRows: size of 100 MB or less, or unknown, is not flagged', () => {
  assert.equal(sizeWarning(100 * MB), undefined);
  assert.equal(sizeWarning(0), undefined);
  assert.equal(sizeWarning(undefined), undefined);
});
