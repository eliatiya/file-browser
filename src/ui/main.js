import { childId, createTree, getNode, isLoaded, setChildren, toggleExpanded } from '../lib/tree.js';
import { detailRows } from '../lib/details.js';
import { renderDetails, renderTree } from './render.js';

/** @typedef {import('../lib/tree.js').Tree} Tree */
/** @typedef {import('../lib/tree.js').NodeData} NodeData */
/** @typedef {(options: { mode: 'read' }) => Promise<FileSystemDirectoryHandle>} DirectoryPicker */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} element is missing from index.html`);
  return el;
}

const chooseButton = /** @type {HTMLButtonElement} */ (byId('choose-folder'));
const statusEl = byId('status');
const treeEl = byId('tree');
const detailsEl = byId('details');

/** @type {DirectoryPicker | undefined} */
const showDirectoryPicker = /** @type {{ showDirectoryPicker?: DirectoryPicker }} */ (
  /** @type {unknown} */ (window)
).showDirectoryPicker?.bind(window);

/** @type {Tree | null} */
let tree = null;
/** @type {Map<string, FileSystemHandle>} */
let handles = new Map();
/** @type {Set<string>} folder ids currently being read */
let loading = new Set();
/** @type {string | null} */
let selectedId = null;
/** Bumped on every new folder pick and every selection, so stale async results are dropped. */
let generation = 0;
let selection = 0;

/** @param {string} message */
function setStatus(message) {
  statusEl.textContent = message;
}

function render() {
  if (tree) renderTree(treeEl, tree, { selectedId, loading });
}

async function chooseFolder() {
  if (!showDirectoryPicker) return;
  /** @type {FileSystemDirectoryHandle} */
  let root;
  try {
    root = await showDirectoryPicker({ mode: 'read' });
  } catch (err) {
    // The user closed the picker: not an error.
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setStatus(`Couldn't open the folder: ${errorMessage(err)}`);
    return;
  }

  generation += 1;
  tree = createTree({ name: root.name, kind: 'directory' });
  handles = new Map([[tree.rootId, root]]);
  loading = new Set();
  selectedId = null;
  setStatus('');
  renderDetails(detailsEl, null);
  render();
  await loadChildren(tree.rootId);
}

/**
 * Reads a folder's entries the first time it is expanded.
 *
 * @param {string} id
 */
async function loadChildren(id) {
  const handle = handles.get(id);
  if (!tree || isLoaded(tree, id) || loading.has(id) || !(handle instanceof FileSystemDirectoryHandle)) return;

  const gen = generation;
  loading.add(id);
  render();
  /** @type {NodeData[]} */
  const items = [];
  /** @type {FileSystemHandle[]} */
  const childHandles = [];
  try {
    for await (const child of handle.values()) {
      items.push({ name: child.name, kind: child.kind });
      childHandles.push(child);
    }
  } catch (err) {
    if (gen !== generation || !tree) return;
    loading.delete(id);
    tree = toggleExpanded(tree, id, false);
    setStatus(`Couldn't read "${handle.name}": ${errorMessage(err)}`);
    render();
    return;
  }
  if (gen !== generation || !tree) return;

  loading.delete(id);
  tree = setChildren(tree, id, items);
  for (const child of childHandles) handles.set(childId(id, child.name), child);
  render();
}

/** @param {string} id */
async function select(id) {
  if (!tree) return;
  const node = getNode(tree, id);
  selectedId = id;
  if (node.kind === 'directory') {
    tree = toggleExpanded(tree, id);
    render();
    renderDetails(detailsEl, detailRows(node));
    if (tree.expanded.has(id)) await loadChildren(id);
    return;
  }

  render();
  const handle = handles.get(id);
  if (!(handle instanceof FileSystemFileHandle)) return;
  const token = selection;
  try {
    const file = await handle.getFile();
    if (token !== selection) return;
    renderDetails(
      detailsEl,
      detailRows({ name: file.name, kind: 'file', size: file.size, type: file.type, lastModified: file.lastModified }),
    );
  } catch (err) {
    if (token !== selection) return;
    renderDetails(detailsEl, null, `Couldn't read "${node.name}": ${errorMessage(err)}`);
  }
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

treeEl.addEventListener('click', (event) => {
  const row = event.target instanceof Element ? event.target.closest('[data-id]') : null;
  if (row instanceof HTMLElement && row.dataset.id !== undefined) {
    // Any selection change invalidates an in-flight file read for the previous one.
    selection += 1;
    void select(row.dataset.id);
  }
});

if (showDirectoryPicker) {
  chooseButton.addEventListener('click', () => void chooseFolder());
  renderDetails(detailsEl, null);
} else {
  chooseButton.disabled = true;
  setStatus(
    'This browser can’t open local folders. Use a recent Chrome or Edge, and load the page from localhost or over HTTPS.',
  );
  renderDetails(detailsEl, null);
}
