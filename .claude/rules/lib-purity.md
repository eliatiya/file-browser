---
paths:
  - "src/lib/**"
---

# src/lib is a pure core

- Pure functions only: no document, window, navigator, File, Blob or
  FileSystemHandle. Take plain data (objects, Uint8Array) as input.
- Never import from src/ui/ or any UI library.
- Every exported function gets a test in tests/<name>.test.js (runs under node --test).
- Parsers never throw on bad input; return null instead.

Enforced twice: tests/rules.test.js scans src/lib for document/window and
src/ui imports, and eslint flags browser globals in src/lib.
