// Enforces the hard rules from CLAUDE.md by scanning source text.
// Scanning is plain text, comments included: a comment that names a banned API fails too.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const LIB = join(SRC, 'lib');
const UI = join(SRC, 'ui');
const TOKENS = join(SRC, 'styles', 'tokens.css');
const SOURCE_EXTS = new Set(['.js', '.css', '.html']);

/** @type {Array<{ name: string, re: RegExp }>} */
const DOM_GLOBALS = [
  { name: 'document', re: /\bdocument\b/ },
  { name: 'window', re: /\bwindow\b/ },
];

/** @type {Array<{ name: string, re: RegExp }>} */
const NETWORK_AND_STORAGE = [
  { name: 'fetch', re: /\bfetch\b/ },
  { name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { name: 'WebSocket', re: /\bWebSocket\b/ },
  { name: 'EventSource', re: /\bEventSource\b/ },
  { name: 'sendBeacon', re: /\bsendBeacon\b/ },
  { name: 'localStorage', re: /\blocalStorage\b/ },
  { name: 'sessionStorage', re: /\bsessionStorage\b/ },
  { name: 'indexedDB', re: /\bindexedDB\b/i },
  { name: 'http(s) URL', re: /https?:\/\//i },
];

/** @type {Array<{ name: string, re: RegExp }>} */
const FILE_WRITES = [
  { name: 'showSaveFilePicker', re: /\bshowSaveFilePicker\b/ },
  { name: 'createWritable', re: /\bcreateWritable\b/ },
  { name: "'readwrite' mode", re: /\breadwrite\b/i },
];

/** @type {Array<{ name: string, re: RegExp }>} */
const STYLE_OUTSIDE_TOKENS = [
  // Strict: any #hex token counts, so avoid ids/fragments that look like hex (e.g. #fade).
  { name: 'hex color', re: /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i },
  { name: 'color function', re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i },
  { name: 'custom property definition', re: /(?<![\w-])--[\w-]+\s*:/ },
];

/**
 * @param {string} dir
 * @returns {string[]} absolute paths of source files under dir
 */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return SOURCE_EXTS.has(extname(entry.name)) ? [path] : [];
  });
}

/**
 * @param {string} path
 * @param {string} base
 */
function isInside(path, base) {
  return path === base || path.startsWith(base + sep);
}

/** @param {string} path */
function rel(path) {
  return relative(ROOT, path);
}

/**
 * @param {string} text
 * @param {Array<{ name: string, re: RegExp }>} rules
 * @returns {Array<{ line: number, name: string }>}
 */
function scan(text, rules) {
  /** @type {Array<{ line: number, name: string }>} */
  const hits = [];
  text.split('\n').forEach((lineText, i) => {
    for (const { name, re } of rules) {
      if (re.test(lineText)) hits.push({ line: i + 1, name });
    }
  });
  return hits;
}

/**
 * @param {string[]} files
 * @param {Array<{ name: string, re: RegExp }>} rules
 * @returns {string[]} "file:line name" messages
 */
function scanFiles(files, rules) {
  return files.flatMap((file) =>
    scan(readFileSync(file, 'utf8'), rules).map(({ line, name }) => `${rel(file)}:${line} ${name}`),
  );
}

/**
 * @param {string} text
 * @returns {string[]} module specifiers from static imports, re-exports and dynamic import()
 */
function importSpecifiers(text) {
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
  return [...text.matchAll(re)].map((m) => m[1]);
}

/**
 * @param {string} file
 * @returns {string[]} specifiers in file that resolve into src/ui
 */
function uiImports(file) {
  return importSpecifiers(readFileSync(file, 'utf8')).filter(
    (spec) => spec.startsWith('.') && isInside(resolve(dirname(file), spec), UI),
  );
}

const sourceFiles = [...walk(SRC), join(ROOT, 'index.html')];
const libFiles = sourceFiles.filter((f) => isInside(f, LIB) && f.endsWith('.js'));
const styleFiles = sourceFiles.filter((f) => /\.(css|html)$/.test(f) && f !== TOKENS);

test('scanner finds files in every category (guards against a vacuous pass)', () => {
  assert.ok(libFiles.length > 0, 'no src/lib/*.js files found');
  assert.ok(sourceFiles.some((f) => isInside(f, UI)), 'no src/ui files found');
  assert.ok(sourceFiles.includes(TOKENS), 'src/styles/tokens.css not found');
  assert.ok(styleFiles.some((f) => f.endsWith('.css')), 'no CSS files besides tokens.css found');
  assert.ok(styleFiles.some((f) => f.endsWith('.html')), 'no HTML files found');
});

test('rule 1: src/lib does not use document or window', () => {
  assert.deepEqual(scanFiles(libFiles, DOM_GLOBALS), []);
});

test('rule 1: src/lib does not import from src/ui', () => {
  const offenders = libFiles.flatMap((f) => uiImports(f).map((spec) => `${rel(f)} imports ${spec}`));
  assert.deepEqual(offenders, []);
});

test('rule 2: no network calls, URLs or browser storage in source files', () => {
  assert.deepEqual(scanFiles(sourceFiles, NETWORK_AND_STORAGE), []);
});

test('rule 2: no file-write APIs in source files', () => {
  assert.deepEqual(scanFiles(sourceFiles, FILE_WRITES), []);
});

test('rule 3: no literal colors or custom-property definitions outside tokens.css', () => {
  assert.deepEqual(scanFiles(styleFiles, STYLE_OUTSIDE_TOKENS), []);
});

test('detectors flag known-bad snippets', () => {
  /**
   * @param {string} text
   * @param {Array<{ name: string, re: RegExp }>} rules
   */
  const names = (text, rules) => scan(text, rules).map((h) => h.name);

  assert.deepEqual(names('const t = document.title;', DOM_GLOBALS), ['document']);
  assert.deepEqual(names('window.addEventListener("x", f);', DOM_GLOBALS), ['window']);
  assert.deepEqual(names('const documented = 1;', DOM_GLOBALS), []);

  assert.deepEqual(names('await fetch(url);', NETWORK_AND_STORAGE), ['fetch']);
  assert.deepEqual(names('new XMLHttpRequest()', NETWORK_AND_STORAGE), ['XMLHttpRequest']);
  assert.deepEqual(names('localStorage.setItem(k, v)', NETWORK_AND_STORAGE), ['localStorage']);
  assert.deepEqual(names('sessionStorage.clear()', NETWORK_AND_STORAGE), ['sessionStorage']);
  assert.deepEqual(names('indexedDB.open("db")', NETWORK_AND_STORAGE), ['indexedDB']);
  assert.deepEqual(names('<img src="https://example.com/a.png">', NETWORK_AND_STORAGE), ['http(s) URL']);

  assert.deepEqual(names('await handle.createWritable()', FILE_WRITES), ['createWritable']);
  assert.deepEqual(names('showDirectoryPicker({ mode: "readwrite" })', FILE_WRITES), ["'readwrite' mode"]);

  assert.deepEqual(names('color: #fff;', STYLE_OUTSIDE_TOKENS), ['hex color']);
  assert.deepEqual(names('<p style="color:#A1B2C3">', STYLE_OUTSIDE_TOKENS), ['hex color']);
  assert.deepEqual(names('background: rgb(0 0 0);', STYLE_OUTSIDE_TOKENS), ['color function']);
  assert.deepEqual(names('  --accent: red;', STYLE_OUTSIDE_TOKENS), ['custom property definition']);
  assert.deepEqual(names('color: var(--color-text);', STYLE_OUTSIDE_TOKENS), []);
  assert.deepEqual(names('#app { margin: 0; }', STYLE_OUTSIDE_TOKENS), []);

  assert.deepEqual(importSpecifiers('import { a } from "../ui/x.js";\nconst m = import(\'./y.js\');'), [
    '../ui/x.js',
    './y.js',
  ]);
});
