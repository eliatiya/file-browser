import { getNode, visibleRows } from '../lib/tree.js';

/** @typedef {import('../lib/tree.js').Tree} Tree */

/**
 * Re-renders the visible rows of the tree. Only the focused row is in the tab order (roving
 * tabindex); if focus was inside the tree before the re-render, it moves to the new focused row.
 *
 * @param {HTMLElement} container
 * @param {Tree} tree
 * @param {{ selectedId: string | null, focusedId: string, loading: ReadonlySet<string> }} state
 */
export function renderTree(container, tree, { selectedId, focusedId, loading }) {
  const hadFocus = container.contains(document.activeElement);
  const rows = visibleRows(tree).map(({ id, depth }) => {
    const node = getNode(tree, id);
    const isFolder = node.kind === 'directory';
    const expanded = tree.expanded.has(id);

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.dataset.id = id;
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-level', String(depth + 1));
    row.setAttribute('aria-selected', String(id === selectedId));
    if (isFolder) row.setAttribute('aria-expanded', String(expanded));
    row.tabIndex = id === focusedId ? 0 : -1;
    row.style.paddingInlineStart = `calc(var(--space-2) + ${depth} * var(--space-4))`;

    const twisty = document.createElement('span');
    twisty.className = 'tree-twisty';
    twisty.setAttribute('aria-hidden', 'true');
    twisty.textContent = isFolder ? (expanded ? '▾' : '▸') : '';

    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name;

    row.append(twisty, name);
    if (loading.has(id)) {
      const note = document.createElement('span');
      note.className = 'tree-note';
      note.textContent = 'Loading…';
      row.append(note);
    }
    return row;
  });
  container.replaceChildren(...rows);
  if (hadFocus) rows.find((row) => row.tabIndex === 0)?.focus();
}

/**
 * @param {HTMLElement} container
 * @param {Array<{ label: string, value: string }> | null} rows null when nothing is selected
 * @param {string} [error]
 */
export function renderDetails(container, rows, error) {
  if (error || !rows) {
    const p = document.createElement('p');
    p.className = error ? 'details-error' : 'details-empty';
    p.textContent = error ?? 'Select a file or folder to see its details.';
    container.replaceChildren(p);
    return;
  }
  const list = document.createElement('dl');
  list.className = 'details-list';
  for (const { label, value } of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  container.replaceChildren(list);
}
