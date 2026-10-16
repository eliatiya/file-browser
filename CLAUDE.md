# File Explorer

Browser-only, read-only file explorer: pick a folder, browse it as a tree,
see file metadata, image dimensions and a preview.

## Forbidden
- DOM, browser globals or src/ui imports in src/lib/, because lib must run
  under node --test and stay framework-free. Details: .claude/rules/lib-purity.md
- Network calls of any kind, because file data must never leave the machine.
- localStorage, sessionStorage, IndexedDB, because the spec promises nothing persists.
- File writes or "readwrite" mode, because a bug must never damage the user's files.
  Details: .claude/rules/no-network-storage.md
- Colors or `--custom-property:` definitions outside src/styles/tokens.css,
  because theming lives in one place.
- Naming a banned API in src/ even in a comment, because tests/rules.test.js
  scans comments and turns the check red.
- Hex-looking ids or fragments in CSS/HTML (#fade, #bad), because the rules
  test reads them as colors.
- New dependencies, because the app runs with zero deps and no build step.
- Committing with a red `npm run check`, because green is the only proof a feature works.

## Conventions
- src/ui/ converts handles and File objects into plain data, then calls src/lib/.
- Every exported lib function has tests in tests/<name>.test.js.
- Parsers return null on unknown or broken input; they never throw.
- Revoke blob URLs when the selection changes, so files don't stay in memory.
- Commits: `feat(area): …` for features, `chore: …` / `fix: …` otherwise.
  Finish features with the ship-feature skill.

## Stack
Vanilla JS ES modules, no framework, no bundler. Types via JSDoc, checked by
tsc (checkJs, strict). eslint. node --test. Node is for tooling only.
Folder access via showDirectoryPicker, so Chromium (Chrome/Edge) on localhost.

## Commands
- `npm run check` — tsc + eslint + all tests. Run before saying a task is done.
- `node --test tests/<name>.test.js` — run one test file.
- `python -m http.server 8000` (repo root) — then open http://localhost:8000

## Open questions (ask, don't guess)
- Firefox/Safari: add a webkitdirectory fallback, or stay Chromium-only?
- EXIF: which fields to show, and should orientation rotate the preview?
- Very large folders (thousands of entries): is a virtualized tree needed?
