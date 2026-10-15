import { getNode, toggleExpanded, visibleRows } from './tree.js';

/** @typedef {import('./tree.js').Tree} Tree */

/** @typedef {'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Enter'} NavKey */

/**
 * @typedef {object} NavResult
 * @property {string} focusedId the row that should hold focus afterwards
 * @property {Tree} tree the same tree, or a new one when a folder was expanded or collapsed
 * @property {boolean} activate true when the focused row should be selected (Enter)
 */

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']);

/**
 * @param {string} key a KeyboardEvent key value
 * @returns {key is NavKey} whether the tree handles this key
 */
export function isNavKey(key) {
  return NAV_KEYS.has(key);
}

/**
 * The visible row that should hold focus: id itself if visible, otherwise its nearest visible
 * ancestor (e.g. after an ancestor was collapsed), otherwise the root.
 *
 * @param {Tree} tree
 * @param {string | null} id
 * @returns {string}
 */
export function resolveFocus(tree, id) {
  const visible = new Set(visibleRows(tree).map((row) => row.id));
  let current = id === null ? undefined : tree.nodes.get(id);
  while (current) {
    if (visible.has(current.id)) return current.id;
    current = current.parentId === null ? undefined : tree.nodes.get(current.parentId);
  }
  return tree.rootId;
}

/**
 * Tree keyboard navigation (WAI-ARIA tree pattern, arrows and Enter only).
 *
 * - ArrowUp / ArrowDown: previous / next visible row; stays put at either end.
 * - ArrowRight: expands a collapsed folder; on an expanded folder moves to its first child.
 * - ArrowLeft: collapses an expanded folder; on a file or collapsed folder moves to its parent.
 * - Enter: asks the caller to select the focused row.
 *
 * @param {Tree} tree
 * @param {string | null} focusedId resolved with resolveFocus first, so a stale id is safe
 * @param {NavKey} key
 * @returns {NavResult}
 */
export function navigate(tree, focusedId, key) {
  const id = resolveFocus(tree, focusedId);
  const node = getNode(tree, id);
  const isFolder = node.kind === 'directory';
  const expanded = tree.expanded.has(id);
  /** @param {string} next @param {Tree} [nextTree] @returns {NavResult} */
  const result = (next, nextTree = tree) => ({ focusedId: next, tree: nextTree, activate: false });

  switch (key) {
    case 'ArrowUp':
    case 'ArrowDown': {
      const rows = visibleRows(tree);
      const index = rows.findIndex((row) => row.id === id);
      const nextIndex = key === 'ArrowUp' ? Math.max(0, index - 1) : Math.min(rows.length - 1, index + 1);
      return result(rows[nextIndex].id);
    }
    case 'ArrowRight': {
      if (!isFolder) return result(id);
      if (!expanded) return result(id, toggleExpanded(tree, id, true));
      // Expanded but not loaded yet, or empty: nothing to move to.
      const first = tree.children.get(id)?.[0];
      return result(first ?? id);
    }
    case 'ArrowLeft': {
      if (isFolder && expanded) return result(id, toggleExpanded(tree, id, false));
      return result(node.parentId ?? id);
    }
    case 'Enter':
      return { focusedId: id, tree, activate: true };
  }
}
