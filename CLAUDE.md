# File Browser

A browser-only, read-only local file explorer. The user picks a local folder and browses it as a
Finder-style tree; a detail pane shows name, size, type and last-modified, and for images also
dimensions, EXIF and a preview.

Plain HTML, CSS and vanilla JavaScript (ES modules). No framework, no bundler, no build step:
the files in this repo are exactly what the browser loads. Types are written as JSDoc and
checked by `tsc`.

## Folder layout

```
index.html              entry page; loads the stylesheets and src/ui/main.js
src/lib/                pure logic: framework-free, DOM-free, pure functions only
src/ui/                 everything that touches the DOM; may import from src/lib
src/styles/tokens.css   the only place design tokens (CSS custom properties) and literal colors live
src/styles/*.css        all other styling, using var(--…) only
tests/                  node:test suites; tests/rules.test.js enforces the rules below
jsconfig.json           tsc settings (checkJs + strict)
eslint.config.js        eslint flat config
```

## Hard rules

1. **Pure core:** `src/lib/` is framework-free and DOM-free; all DOM work goes in
   `src/ui/`. Details: `.claude/rules/lib-purity.md` (loads when working in `src/lib/`).
2. **Offline and read-only:** no network, no storage, no writes.
   Details: `.claude/rules/no-network-storage.md`.
3. **All styling uses CSS variables defined only in `src/styles/tokens.css`.** No hex colors,
   color functions (`rgb()`, `hsl()`, …) or `--custom-property:` definitions in any other CSS or
   HTML file. `tests/rules.test.js` treats any `#hex`-looking token in CSS/HTML as a color, so
   avoid ids or fragments like `#fade` or `#bad`.
4. **`npm run check` must stay green**: `tsc --noEmit` (checkJs + strict, types via JSDoc),
   eslint, and `node --test`.

`tests/rules.test.js` enforces rules 1–3 by scanning the text of `src/**` and `index.html`,
**comments included**, so don't name a banned API even in a comment. It also treats any `#hex`
token in CSS/HTML as a color, so avoid ids or fragments that look like hex (`#fade`, `#bad`).
eslint also flags rule 1 in `src/lib/` (no browser globals there).

## Commands

```sh
npm install        # once
npm run check      # typecheck + lint + tests: the quality gate
npm test           # tests only
npm run serve      # dev server: python3 -m http.server 8000, then open http://localhost:8000
```

ES modules don't load from `file://`; always use the dev server.

## Working agreement

- **Always run `npm run check` before saying a task is done**, and report it if it fails.
- Put new logic in `src/lib/` with a test in `tests/`; keep `src/ui/` thin.
- Never weaken or skip a rule in `tests/rules.test.js` to make the check pass. Fix the code.
