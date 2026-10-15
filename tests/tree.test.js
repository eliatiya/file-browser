import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  childId,
  compareNodes,
  createNode,
  createTree,
  getNode,
  isLoaded,
  setChildren,
  sortNodes,
  toggleExpanded,
  visibleRows,
} from '../src/lib/tree.js';
import { detailRows } from '../src/lib/details.js';

/** @param {string} name */
const file = (name) => ({ name, kind: /** @type {const} */ ('file') });
/** @param {string} name */
const dir = (name) => ({ name, kind: /** @type {const} */ ('directory') });

test('sortNodes: folders first, then case-insensitive by name', () => {
  const sorted = sortNodes([file('b.txt'), dir('zeta'), file('A.txt'), dir('Alpha'), file('c.txt'), dir('beta')]);
  assert.deepEqual(
    sorted.map((n) => n.name),
    ['Alpha', 'beta', 'zeta', 'A.txt', 'b.txt', 'c.txt'],
  );
});

test('sortNodes: names equal ignoring case get a stable order and input is not mutated', () => {
  const input = [file('readme'), file('README'), file('ReadMe')];
  const sorted = sortNodes(input);
  assert.deepEqual(sortNodes([...input].reverse()), sorted);
  assert.deepEqual(input.map((n) => n.name), ['readme', 'README', 'ReadMe']);
  assert.equal(compareNodes(file('x'), file('x')), 0);
});

test('createNode: builds ids from the parent path and keeps file metadata', () => {
  const root = createNode(dir('root'));
  assert.deepEqual(root, { id: 'root', parentId: null, name: 'root', kind: 'directory' });
  const node = createNode({ name: 'a.png', kind: 'file', size: 10, type: 'image/png', lastModified: 5 }, 'root/pics');
  assert.equal(node.id, childId('root/pics', 'a.png'));
  assert.equal(node.id, 'root/pics/a.png');
  assert.equal(node.size, 10);
  assert.equal(node.type, 'image/png');
  assert.equal(node.lastModified, 5);
});

test('createNode: folders drop file-only fields; invalid data throws', () => {
  assert.equal('size' in createNode({ name: 'd', kind: 'directory', size: 1 }), false);
  assert.throws(() => createNode({ name: '', kind: 'file' }), TypeError);
  assert.throws(() => createNode(/** @type {any} */ ({ name: 'x', kind: 'link' })), TypeError);
  assert.throws(() => createNode(file('a/b'), 'root'), TypeError);
});

test('tree: root starts expanded and unloaded', () => {
  const tree = createTree(dir('root'));
  assert.equal(isLoaded(tree, 'root'), false);
  assert.deepEqual(visibleRows(tree), [{ id: 'root', depth: 0 }]);
  assert.throws(() => createTree(file('x')), TypeError);
});

test('tree: setChildren sorts children and visibleRows follows expansion', () => {
  let tree = createTree(dir('root'));
  tree = setChildren(tree, 'root', [file('b.txt'), dir('src'), file('A.txt')]);
  assert.equal(isLoaded(tree, 'root'), true);
  assert.deepEqual(visibleRows(tree), [
    { id: 'root', depth: 0 },
    { id: 'root/src', depth: 1 },
    { id: 'root/A.txt', depth: 1 },
    { id: 'root/b.txt', depth: 1 },
  ]);

  tree = toggleExpanded(tree, 'root/src');
  // Expanded but not loaded yet: no rows below it.
  assert.equal(visibleRows(tree).length, 4);
  tree = setChildren(tree, 'root/src', [file('main.js')]);
  assert.deepEqual(visibleRows(tree)[2], { id: 'root/src/main.js', depth: 2 });

  tree = toggleExpanded(tree, 'root/src');
  assert.equal(visibleRows(tree).length, 4);
  // Collapsing keeps loaded children for the next expand.
  assert.equal(isLoaded(tree, 'root/src'), true);
});

test('tree: updates are immutable', () => {
  const before = setChildren(createTree(dir('root')), 'root', [dir('a')]);
  const after = toggleExpanded(before, 'root/a');
  assert.equal(before.expanded.has('root/a'), false);
  assert.equal(after.expanded.has('root/a'), true);
  const reloaded = setChildren(before, 'root', []);
  assert.equal(before.nodes.has('root/a'), true);
  assert.equal(reloaded.nodes.has('root/a'), false);
});

test('tree: setChildren replaces old descendants', () => {
  let tree = createTree(dir('root'));
  tree = setChildren(tree, 'root', [dir('a')]);
  tree = setChildren(toggleExpanded(tree, 'root/a'), 'root/a', [file('x')]);
  tree = setChildren(tree, 'root', [file('b')]);
  assert.deepEqual([...tree.nodes.keys()].sort(), ['root', 'root/b']);
  assert.equal(tree.expanded.has('root/a'), false);
  assert.equal(isLoaded(tree, 'root/a'), false);
});

test('tree: toggleExpanded ignores files; bad ids and parents throw', () => {
  const tree = setChildren(createTree(dir('root')), 'root', [file('f'), file('F2')]);
  assert.equal(toggleExpanded(tree, 'root/f'), tree);
  assert.equal(toggleExpanded(tree, 'root', true), tree);
  assert.throws(() => getNode(tree, 'nope'), RangeError);
  assert.throws(() => setChildren(tree, 'root/f', []), TypeError);
  assert.throws(() => setChildren(tree, 'root', [file('x'), file('x')]), RangeError);
});

test('detailRows: folders show name and type only', () => {
  assert.deepEqual(detailRows(dir('Photos')), [
    { label: 'Name', value: 'Photos' },
    { label: 'Type', value: 'Folder' },
  ]);
});

test('detailRows: files show formatted size, MIME type and date', () => {
  const rows = detailRows(
    { name: 'a.pdf', kind: 'file', size: 1536, type: 'application/pdf', lastModified: Date.UTC(2024, 0, 15, 13, 5) },
    { locale: 'en-US', timeZone: 'UTC' },
  );
  assert.deepEqual(rows.slice(0, 3), [
    { label: 'Name', value: 'a.pdf' },
    { label: 'Size', value: '1.5 KB' },
    { label: 'Type', value: 'application/pdf' },
  ]);
  assert.equal(rows[3].label, 'Last modified');
  assert.match(rows[3].value, /^Jan 15, 2024, 1:05\sPM$/);
});

test('detailRows: empty MIME type reads as Unknown', () => {
  const rows = detailRows({ name: 'Makefile', kind: 'file', size: 0, type: '', lastModified: 0 });
  assert.deepEqual(rows.slice(1, 3), [
    { label: 'Size', value: '0 B' },
    { label: 'Type', value: 'Unknown' },
  ]);
});

test('detailRows: files with dimensions get a Dimensions row last', () => {
  const rows = detailRows({ name: 'a.png', kind: 'file', size: 1, type: 'image/png', lastModified: 0, dimensions: { width: 1920, height: 1080 } });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[4], { label: 'Dimensions', value: '1920 × 1080 px' });
});

test('detailRows: no Dimensions row when dimensions are null or absent', () => {
  const base = { name: 'a.txt', kind: /** @type {const} */ ('file'), size: 1, type: 'text/plain', lastModified: 0 };
  assert.equal(detailRows({ ...base, dimensions: null }).length, 4);
  assert.equal(detailRows(base).length, 4);
  assert.equal(detailRows({ ...dir('Photos'), dimensions: { width: 1, height: 1 } }).length, 2);
});
