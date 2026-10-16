# Tests conventions

- Use `node:test` and `node:assert/strict` only; no test libraries.
- One file per lib module: tests/<module-name>.test.js.
- Build test images as small inline byte arrays (Uint8Array), not real files,
  so tests stay fast and self-explanatory.
- For every parser, test at least: a valid input, a truncated input and an
  unrelated input. The last two must return null, never throw.
- Test names say the behavior: "returns null for truncated PNG", not "test 3".
- Test the lib directly; tests never touch the DOM or browser APIs.
- tests/rules.test.js enforces the project rules. If it fails, fix the source,
  never weaken the test.
