<!-- Exercise 2 — six-layer development prompt -->

## [1] Role
You are a front-end developer experienced with accessible, keyboard-driven UIs
in vanilla JavaScript (no frameworks).

## [2] Context + the reason
This is a browser-only, read-only file explorer: plain HTML/CSS/vanilla JS
ES modules, no build step. The folder tree is rendered by src/ui/ from a
tree model in src/lib/. Today the tree can only be used with the mouse.
Reason: keyboard users and power users (like Finder users) need to move through
large folders quickly without a mouse, and keyboard support is the basis for
making the tree accessible to screen readers.

## [3] Task
Add keyboard navigation to the folder tree:
- ↑ / ↓ move focus to the previous / next visible item
- → on a collapsed folder expands it; on an expanded folder moves to its first child
- ← on an expanded folder collapses it; on a file or collapsed folder moves to its parent
- Enter selects the focused item and shows it in the detail pane (same as a click)

## [4] Scope & done
In scope:
- Pure navigation logic in src/lib/ (e.g. a function that takes the visible
  tree state + a key and returns the new focused id / expanded set). No DOM there.
- Wiring in src/ui/: keydown handling, focus management (roving tabindex),
  role="tree" / role="treeitem" / aria-expanded / aria-selected.
- Focus styling through existing CSS variables in src/styles/tokens.css
  (add a token there if needed).
Out of scope:
- Home/End, type-ahead search, multi-select, mouse behavior changes.
- No network calls, no localStorage/IndexedDB, no writes, no new dependencies.
- If you notice other bugs, list them in your report — don't fix them.
Done when:
- New unit tests in tests/tree-nav.test.js cover every key, including edges
  (↑ on first item, ↓ on last item, ← on a root-level item, → on a file).
- `npm run check` is green (tsc + eslint + node --test).
- Then commit all changes, including prompts/ex02-keyboard-nav.md, with message:
  "feat(tree): keyboard navigation (↑↓←→ Enter)"

## [5] Format
Edit the files directly. When finished, reply with a short report:
1. Files changed (one line each, what changed)
2. The final `npm run check` output summary
3. How I can verify manually in the browser (3–5 steps)
4. Other bugs noticed (or "none")

## [6] Examples
Given this tree, with "photos" collapsed and focus on "docs":
  ▸ docs/          ← focus
  ▸ photos/
    readme.txt
- ↓        → focus "photos"
- →        → "photos" expands, focus stays on "photos"
- →        → focus moves to the first child, e.g. "photos/beach.jpg"
- ←        → focus returns to "photos" (parent)
- ←        → "photos" collapses
- Enter    → "photos" is selected and the detail pane shows it
