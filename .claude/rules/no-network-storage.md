# Offline and read-only

- No network calls: fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon,
  or external http(s):// URLs. The explorer runs fully offline.
- No localStorage, sessionStorage or IndexedDB. Nothing persists between visits.
- No file writes: no showSaveFilePicker, createWritable, or "readwrite" mode.
  Folder access is read-only.
- Blob URLs from URL.createObjectURL are fine (local only); revoke them when done.

tests/rules.test.js enforces this by scanning the text of src/** and index.html,
comments included, so don't name a banned API even in a comment.
