import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTree, setChildren, toggleExpanded } from '../src/lib/tree.js';
import { isNavKey, navigate, resolveFocus } from '../src/lib/tree-nav.js';

/** @typedef {import('../src/lib/tree.js').Tree} Tree */

/** @param {string} name */
const file = (name) => ({ name, kind: /** @type {const} */ ('file') });
/** @param {string} name */
const dir = (name) => ({ name, kind: /** @type {const} */ ('directory') });

/**
 * root (expanded)
 *   ▸ docs/        (loaded, collapsed, empty)
 *   ▸ photos/      (loaded, collapsed) → beach.jpg, cat.png
 *     readme.txt
 *
 * @returns {Tree}
 */
function sample() {
  let tree = createTree(dir('root'));
  tree = setChildren(tree, 'root', [file('readme.txt'), dir('photos'), dir('docs')]);
  tree = setChildren(tree, 'root/docs', []);
  tree = setChildren(tree, 'root/photos', [file('cat.png'), file('beach.jpg')]);
  return tree;
}

test('isNavKey: only arrows and Enter', () => {
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) assert.ok(isNavKey(key));
  for (const key of ['Home', 'End', 'a', ' ', 'Tab', 'Escape']) assert.ok(!isNavKey(key));
});

test('ArrowDown: moves to the next visible row, skipping collapsed contents', () => {
  const tree = sample();
  assert.equal(navigate(tree, 'root', 'ArrowDown').focusedId, 'root/docs');
  assert.equal(navigate(tree, 'root/docs', 'ArrowDown').focusedId, 'root/photos');
  assert.equal(navigate(tree, 'root/photos', 'ArrowDown').focusedId, 'root/readme.txt');
});

test('ArrowDown: enters an expanded folder', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  assert.equal(navigate(tree, 'root/photos', 'ArrowDown').focusedId, 'root/photos/beach.jpg');
});

test('ArrowDown on the last row stays put', () => {
  const tree = sample();
  const result = navigate(tree, 'root/readme.txt', 'ArrowDown');
  assert.equal(result.focusedId, 'root/readme.txt');
  assert.equal(result.tree, tree);
});

test('ArrowUp: moves to the previous visible row', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  assert.equal(navigate(tree, 'root/readme.txt', 'ArrowUp').focusedId, 'root/photos/cat.png');
  assert.equal(navigate(tree, 'root/photos/beach.jpg', 'ArrowUp').focusedId, 'root/photos');
  assert.equal(navigate(tree, 'root/docs', 'ArrowUp').focusedId, 'root');
});

test('ArrowUp on the first row stays put', () => {
  const tree = sample();
  const result = navigate(tree, 'root', 'ArrowUp');
  assert.equal(result.focusedId, 'root');
  assert.equal(result.tree, tree);
});

test('ArrowRight on a collapsed folder expands it and keeps focus', () => {
  const tree = sample();
  const result = navigate(tree, 'root/photos', 'ArrowRight');
  assert.equal(result.focusedId, 'root/photos');
  assert.ok(result.tree.expanded.has('root/photos'));
  assert.ok(!tree.expanded.has('root/photos'), 'input tree is not mutated');
});

test('ArrowRight on an expanded folder moves to its first child', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  const result = navigate(tree, 'root/photos', 'ArrowRight');
  assert.equal(result.focusedId, 'root/photos/beach.jpg');
  assert.equal(result.tree, tree);
});

test('ArrowRight on an expanded folder that is empty or not loaded yet stays put', () => {
  const empty = toggleExpanded(sample(), 'root/docs', true);
  assert.equal(navigate(empty, 'root/docs', 'ArrowRight').focusedId, 'root/docs');
  const unloaded = createTree(dir('root'));
  assert.equal(navigate(unloaded, 'root', 'ArrowRight').focusedId, 'root');
});

test('ArrowRight on a file does nothing', () => {
  const tree = sample();
  const result = navigate(tree, 'root/readme.txt', 'ArrowRight');
  assert.equal(result.focusedId, 'root/readme.txt');
  assert.equal(result.tree, tree);
});

test('ArrowLeft on an expanded folder collapses it and keeps focus', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  const result = navigate(tree, 'root/photos', 'ArrowLeft');
  assert.equal(result.focusedId, 'root/photos');
  assert.ok(!result.tree.expanded.has('root/photos'));
});

test('ArrowLeft on a file or collapsed folder moves to its parent', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  assert.equal(navigate(tree, 'root/photos/beach.jpg', 'ArrowLeft').focusedId, 'root/photos');
  assert.equal(navigate(tree, 'root/docs', 'ArrowLeft').focusedId, 'root');
  assert.equal(navigate(tree, 'root/readme.txt', 'ArrowLeft').focusedId, 'root');
});

test('ArrowLeft on the root: collapses it when expanded, otherwise stays put', () => {
  const tree = sample();
  const collapsed = navigate(tree, 'root', 'ArrowLeft');
  assert.equal(collapsed.focusedId, 'root');
  assert.ok(!collapsed.tree.expanded.has('root'));
  const again = navigate(collapsed.tree, 'root', 'ArrowLeft');
  assert.equal(again.focusedId, 'root');
  assert.equal(again.tree, collapsed.tree);
});

test('Enter asks to activate the focused row without changing the tree', () => {
  const tree = sample();
  const result = navigate(tree, 'root/photos', 'Enter');
  assert.deepEqual(result, { focusedId: 'root/photos', tree, activate: true });
  assert.equal(navigate(tree, 'root/photos', 'ArrowDown').activate, false);
});

test('walkthrough from the spec example', () => {
  let tree = sample();
  let focus = 'root/docs';
  const press = (/** @type {import('../src/lib/tree-nav.js').NavKey} */ key) => {
    const result = navigate(tree, focus, key);
    tree = result.tree;
    focus = result.focusedId;
    return result;
  };
  press('ArrowDown');
  assert.equal(focus, 'root/photos');
  press('ArrowRight');
  assert.ok(tree.expanded.has('root/photos'));
  assert.equal(focus, 'root/photos');
  press('ArrowRight');
  assert.equal(focus, 'root/photos/beach.jpg');
  press('ArrowLeft');
  assert.equal(focus, 'root/photos');
  press('ArrowLeft');
  assert.ok(!tree.expanded.has('root/photos'));
  assert.equal(press('Enter').activate, true);
  assert.equal(focus, 'root/photos');
});

test('resolveFocus: falls back to the nearest visible ancestor, then the root', () => {
  const tree = toggleExpanded(sample(), 'root/photos', true);
  assert.equal(resolveFocus(tree, 'root/photos/cat.png'), 'root/photos/cat.png');
  const collapsed = toggleExpanded(tree, 'root/photos', false);
  assert.equal(resolveFocus(collapsed, 'root/photos/cat.png'), 'root/photos');
  assert.equal(resolveFocus(collapsed, 'gone/away'), 'root');
  assert.equal(resolveFocus(collapsed, null), 'root');
  // A stale focus id is resolved before navigating.
  assert.equal(navigate(collapsed, 'root/photos/cat.png', 'ArrowDown').focusedId, 'root/readme.txt');
});
