import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPreviewable } from '../src/lib/preview.js';

test('isPreviewable: PNG, JPEG, GIF and WebP', () => {
  assert.equal(isPreviewable('image/png'), true);
  assert.equal(isPreviewable('image/jpeg'), true);
  assert.equal(isPreviewable('image/gif'), true);
  assert.equal(isPreviewable('image/webp'), true);
});

test('isPreviewable: ignores case', () => {
  assert.equal(isPreviewable('IMAGE/PNG'), true);
  assert.equal(isPreviewable('Image/JPEG'), true);
  assert.equal(isPreviewable('image/WebP'), true);
});

test('isPreviewable: ignores parameters and surrounding whitespace', () => {
  assert.equal(isPreviewable(' image/gif '), true);
  assert.equal(isPreviewable('image/png; charset=binary'), true);
});

test('isPreviewable: empty or missing type', () => {
  assert.equal(isPreviewable(''), false);
  assert.equal(isPreviewable('   '), false);
  assert.equal(isPreviewable(undefined), false);
});

test('isPreviewable: out-of-scope and non-image types', () => {
  for (const type of ['image/svg+xml', 'image/heic', 'image/bmp', 'text/plain', 'application/pdf', 'image/', 'png']) {
    assert.equal(isPreviewable(type), false, type);
  }
});
