# Vonfluence Wiki Markdown Chalks

A zero-dependency browser app for previewing **Confluence wiki markup** with live rendering, Mermaid diagram support, and PDF export.

## Features

### Confluence Wiki Parsing
- Headings: `h1.` – `h6.`
- Tables: `||header||` / `|cell|` syntax
- Nested ordered and unordered lists (`*`, `#`)
- Horizontal rules (`----`)
- Inline formatting: `*bold*`, `_italic_`, `{{monospace}}`, `^superscript^`, `~subscript~`, `-strikethrough-`
- Hyperlinks: `[label|url]` and bare `[url]`
- Line breaks: `\\`
- Colored text: `{color:red}text{color}`

### Block Macros
| Macro | Description |
|-------|-------------|
| `{code:language=js}...{code}` | Syntax-highlighted code block |
| `{noformat}...{noformat}` | Preformatted text |
| `{mermaid}...{/mermaid}` | Mermaid diagram |
| `{info}...{info}` | Info panel |
| `{tip}...{tip}` | Tip panel |
| `{warning}...{warning}` | Warning panel |
| `{note}...{note}` | Note panel |
| `{panel:title=X}...{panel}` | Titled panel |
| `{quote}...{quote}` | Block quote |

### Mermaid Diagrams
- Renders diagrams from `{mermaid}` macros and fenced code blocks
- Switch between versions **10.8**, **11.2**, **11.4**, or **latest** without reloading the page
- Shows a per-diagram error block if a diagram fails to parse

### File Input
- Upload `.wiki` or `.txt` files via the **Upload** button
- **Drag and drop** a file anywhere on the preview pane
- Paste or type wiki markup directly in the **Toggle Raw** text area with 120 ms debounced live preview

### UI / Export
- **Light / dark theme** toggle (CSS variable-based)
- **Download PDF** — triggers browser print dialog (use "Save as PDF")
- Processing spinner that appears only after 120 ms to avoid flicker on fast renders
- DOMPurify sanitization on all rendered HTML

## Setup

No build step and no `npm install` required. All libraries are loaded from CDN at runtime.

### Option 1 — Open directly

Double-click `index.html`. Works for basic use; some browsers restrict ES module imports from `file://` URLs.

### Option 2 — Local static server (recommended)

```bash
# Python
python -m http.server 8000

# Node
npx http-server

# Bun
bunx http-server
```

Then open `http://localhost:8000` in your browser.

## File Structure

```
index.html          Entry point — toolbar, drop zone, preview pane, raw textarea
app.js              Core logic — file upload, drag-drop, render pipeline, UI controls
confluenceParser.js Confluence wiki → HTML (3-pass: block extraction → lines → inline)
mermaidLoader.js    Dynamic CDN loading of Mermaid, version switching, SVG rendering
styles.css          Theme variables (light/dark), layout, panel and Mermaid styling
exportService.js    PDF / DOCX helpers (not wired to UI, kept for reference)
```

## Rendering Pipeline

```
File / paste input
      │
      ▼
confluenceParser.js  →  raw HTML
      │
      ▼
DOMPurify.sanitize   →  safe HTML
      │
      ▼
preview pane innerHTML
      │
      ▼
mermaidLoader.js     →  replace <code.language-mermaid> blocks with SVGs
```

## Browser Support

Any modern browser with ES module support (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+).
