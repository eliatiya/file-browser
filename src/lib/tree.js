/**
 * @typedef {'file' | 'directory'} NodeKind
 *
 * @typedef {object} NodeData Plain description of a file or folder, free of browser handles.
 * @property {string} name
 * @property {NodeKind} kind
 * @property {number} [size] Bytes; files only.
 * @property {string} [type] MIME type; files only, may be empty.
 * @property {number} [lastModified] Milliseconds since the Unix epoch; files only.
 *
 * @typedef {NodeData & { id: string, parentId: string | null }} TreeNode
 *
 * @typedef {object} Tree Immutable tree state; every update returns a new Tree.
 * @property {string} rootId
 * @property {ReadonlyMap<string, TreeNode>} nodes
 * @property {ReadonlyMap<string, readonly string[]>} children Sorted child ids; a folder is absent until loaded.
 * @property {ReadonlySet<string>} expanded
 *
 * @typedef {{ id: string, depth: number }} Row
 */

/**
 * @param {string} parentId
 * @param {string} name
 * @returns {string} the id of the child called name inside parentId
 */
export function childId(parentId, name) {
  return `${parentId}/${name}`;
}

/**
 * Builds a tree node from plain data. Ids are paths from the root, so they are unique.
 *
 * @param {NodeData} data
 * @param {string | null} [parentId] null for the root.
 * @returns {TreeNode}
 */
export function createNode(data, parentId = null) {
  const { name, kind, size, type, lastModified } = data;
  if (typeof name !== 'string' || name === '') {
    throw new TypeError('createNode: name must be a non-empty string');
  }
  if (parentId !== null && name.includes('/')) {
    throw new TypeError(`createNode: name must not contain "/", got ${name}`);
  }
  if (kind !== 'file' && kind !== 'directory') {
    throw new TypeError(`createNode: kind must be "file" or "directory", got ${kind}`);
  }
  /** @type {TreeNode} */
  const node = { id: parentId === null ? name : childId(parentId, name), parentId, name, kind };
  if (kind === 'file') {
    if (size !== undefined) node.size = size;
    if (type !== undefined) node.type = type;
    if (lastModified !== undefined) node.lastModified = lastModified;
  }
  return node;
}

/**
 * Finder order: folders before files, then by name, ignoring case.
 *
 * @param {Pick<NodeData, 'name' | 'kind'>} a
 * @param {Pick<NodeData, 'name' | 'kind'>} b
 * @returns {number}
 */
export function compareNodes(a, b) {
  if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) return byName;
  // Names equal ignoring case: fall back to a fixed order so sorting is deterministic.
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * @template {Pick<NodeData, 'name' | 'kind'>} T
 * @param {readonly T[]} nodes
 * @returns {T[]} a sorted copy
 */
export function sortNodes(nodes) {
  return [...nodes].sort(compareNodes);
}

/**
 * Creates a tree holding only the root folder, expanded but not yet loaded.
 *
 * @param {NodeData} rootData
 * @returns {Tree}
 */
export function createTree(rootData) {
  const root = createNode(rootData);
  if (root.kind !== 'directory') throw new TypeError('createTree: root must be a directory');
  return {
    rootId: root.id,
    nodes: new Map([[root.id, root]]),
    children: new Map(),
    expanded: new Set([root.id]),
  };
}

/**
 * @param {Tree} tree
 * @param {string} id
 * @returns {TreeNode}
 */
export function getNode(tree, id) {
  const node = tree.nodes.get(id);
  if (!node) throw new RangeError(`unknown node id: ${id}`);
  return node;
}

/**
 * @param {Tree} tree
 * @param {string} id
 * @returns {boolean} whether the folder's children have been loaded
 */
export function isLoaded(tree, id) {
  return tree.children.has(id);
}

/**
 * Sets a folder's children, replacing (and dropping the descendants of) any previous ones.
 *
 * @param {Tree} tree
 * @param {string} parentId
 * @param {readonly NodeData[]} items
 * @returns {Tree}
 */
export function setChildren(tree, parentId, items) {
  const parent = getNode(tree, parentId);
  if (parent.kind !== 'directory') throw new TypeError(`setChildren: ${parentId} is not a directory`);

  const nodes = new Map(tree.nodes);
  const children = new Map(tree.children);
  const expanded = new Set(tree.expanded);
  for (const id of descendantIds(tree, parentId)) {
    nodes.delete(id);
    children.delete(id);
    expanded.delete(id);
  }

  const kids = sortNodes(items.map((item) => createNode(item, parentId)));
  for (const kid of kids) {
    if (nodes.has(kid.id)) throw new RangeError(`setChildren: duplicate name ${kid.name}`);
    nodes.set(kid.id, kid);
  }
  children.set(parentId, kids.map((kid) => kid.id));
  return { ...tree, nodes, children, expanded };
}

/**
 * @param {Tree} tree
 * @param {string} id
 * @param {boolean} [open] Defaults to the opposite of the current state.
 * @returns {Tree} unchanged for files or when the state already matches
 */
export function toggleExpanded(tree, id, open = !tree.expanded.has(id)) {
  if (getNode(tree, id).kind !== 'directory' || tree.expanded.has(id) === open) return tree;
  const expanded = new Set(tree.expanded);
  if (open) expanded.add(id);
  else expanded.delete(id);
  return { ...tree, expanded };
}

/**
 * Rows in display order: the root, then the loaded children of every expanded folder.
 *
 * @param {Tree} tree
 * @returns {Row[]}
 */
export function visibleRows(tree) {
  /** @type {Row[]} */
  const rows = [];
  /** @param {string} id @param {number} depth */
  const visit = (id, depth) => {
    rows.push({ id, depth });
    if (!tree.expanded.has(id)) return;
    for (const kid of tree.children.get(id) ?? []) visit(kid, depth + 1);
  };
  visit(tree.rootId, 0);
  return rows;
}

/**
 * @param {Tree} tree
 * @param {string} id
 * @returns {string[]} ids of every loaded node below id
 */
function descendantIds(tree, id) {
  return (tree.children.get(id) ?? []).flatMap((kid) => [kid, ...descendantIds(tree, kid)]);
}
