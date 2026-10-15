<!-- Exercise 3 — seven techniques. Effort for this run: high (set via effortLevel, not in the prompt) -->

<!-- [Data first] reference data goes at the top, the request at the end -->
<format_reference>
PNG: bytes 0–7 are the signature 89 50 4E 47 0D 0A 1A 0A. The IHDR chunk
follows: bytes 12–15 = "IHDR", width = bytes 16–19, height = bytes 20–23,
both 32-bit big-endian.

GIF: bytes 0–5 are "GIF87a" or "GIF89a". Width = bytes 6–7, height =
bytes 8–9, both 16-bit little-endian.

JPEG: starts with FF D8. Then a sequence of segments: FF <marker>
<2-byte big-endian length that includes itself> <payload>. Skip FF fill bytes.
Markers D0–D7 and 01 have no length. A Start-of-Frame marker (C0–C3, C5–C7,
C9–CB, CD–CF) has payload: 1 byte precision, height (2 bytes BE),
width (2 bytes BE). EXIF (APP1, E1) usually comes before SOF, so walk segments,
don't search for bytes.
</format_reference>

<project_context>
Browser-only, read-only file explorer: plain HTML/CSS/vanilla JS ES modules,
no build step. src/lib/ is pure (no DOM, no browser file APIs); src/ui/
reads files and renders. The detail pane currently shows name, size, type,
last modified. Rules are in CLAUDE.md.
</project_context>

<!-- [Give a role] -->
<role>
You are a JavaScript developer who writes binary-format parsers that are
small, well-tested and fail safely on bad input.
</role>

<!-- [Brief once] the whole brief is in this one message: what, where, limits, proof, report -->
<!-- [XML structure] each part of the brief in its own tag -->
<task>
<!-- [Be specific] exact names, formats, file locations, display string -->
When a PNG, JPEG or GIF file is selected, show a "Dimensions" row in the
detail pane, formatted as "1920 × 1080 px" (× is U+00D7).

- src/lib/image-size.js exports getImageSize(bytes: Uint8Array) returning
  { format: "png" | "jpeg" | "gif", width: number, height: number } or null.
  It never throws: unknown, truncated or corrupt input returns null.
- src/ui/ reads at most the first 256 KB of the file
  (file.slice(0, 262144).arrayBuffer()) and passes it in as a Uint8Array.
- If the result is null, the Dimensions row is not shown at all.
- Folders and non-image files behave exactly as today.
</task>

<constraints>
- No new dependencies, no network, no storage, no writes.
- Styling only through CSS variables in src/styles/tokens.css.
- Out of scope: EXIF fields, image preview, WebP, SVG, HEIC.
- If you notice other bugs, list them in your report; don't fix them.
</constraints>

<!-- [Multishot] several input → output pairs, including failure cases -->
<examples>
<example>
input (PNG): 89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52 00 00 07 80 00 00 04 38
output: { format: "png", width: 1920, height: 1080 } → "1920 × 1080 px"
</example>
<example>
input (GIF): 47 49 46 38 39 61 0A 00 05 00
output: { format: "gif", width: 10, height: 5 } → "10 × 5 px"
</example>
<example>
input (JPEG, APP0 then SOF0): FF D8 FF E0 00 10 <14 bytes of APP0 payload>
FF C0 00 11 08 01 E0 02 80 ...
output: { format: "jpeg", width: 640, height: 480 } → "640 × 480 px"
</example>
<example>
input (truncated PNG): 89 50 4E 47 0D 0A 1A 0A 00 00 00 0D
output: null → no Dimensions row
</example>
<example>
input (text file): 68 65 6C 6C 6F
output: null → no Dimensions row
</example>
</examples>

<done_when>
- tests/image-size.test.js covers every example above, plus a JPEG whose
  SOF comes after an APP1 (EXIF) segment and a JPEG with no SOF.
- `npm run check` is green.
- Commit everything, including prompts/ex03-image-dimensions.md, with message
  "feat(detail): image dimensions for PNG, JPEG, GIF".
</done_when>

<report_format>
Reply with: files changed (one line each), check output summary, 3 steps for
me to verify in the browser, other bugs noticed (or "none").
</report_format>
