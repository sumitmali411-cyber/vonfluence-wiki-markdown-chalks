/**
 * exportService.js
 * PDF, standalone HTML, and raw .wiki export helpers for Vonfluence.
 */

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Open the browser print dialog and suggest a filename by temporarily setting the document title.
 *
 * The previous document title is restored shortly after the dialog is opened (approximately 500ms).
 * @param {string} title - Title to set on the document so the print/save dialog suggests it as the filename.
 */
export function exportAsPdf(title = "Vonfluence Export") {
    const prev = document.title;
    document.title = title;
    window.print();
    // Restore after a tick so the print dialog has already captured the title.
    setTimeout(() => { document.title = prev; }, 500);
}

// ---------------------------------------------------------------------------
// Standalone HTML
// ---------------------------------------------------------------------------

/**
 * Collects all CSS rule texts from same-origin stylesheets in the document; cross-origin sheets are skipped.
 * @returns {string} All collected CSS rules concatenated with newline separators.
 */
function collectStyles() {
    const rules = [];
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            for (const rule of Array.from(sheet.cssRules)) {
                rules.push(rule.cssText);
            }
        } catch {
            // Cross-origin stylesheet — skip.
        }
    }
    return rules.join("\n");
}

/**
 * Download the rendered preview as a self-contained HTML file.
 * Inlines all current page styles so the file is portable (no network needed).
 *
 * @param {HTMLElement} previewEl  The element whose innerHTML is the rendered wiki.
 * @param {string}      title      Used as <title> and the download filename.
 */
export function exportAsHtml(previewEl, title = "Vonfluence Export") {
    const styles = collectStyles();

    // Collect any inline SVGs (Mermaid) — they survive the innerHTML grab intact.
    const bodyContent = previewEl.innerHTML;

    const html =
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px auto; max-width: 960px; color: #222; }
    a { color: #0052cc; }
    ${styles}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

    downloadBlob(html, `${slugify(title)}.html`, "text/html;charset=utf-8");
}

// ---------------------------------------------------------------------------
// Raw .wiki
// ---------------------------------------------------------------------------

/**
 * Create and download a .wiki file containing the provided Confluence wiki markup.
 * @param {string} text - Confluence wiki markup to write into the file.
 * @param {string} [filename="export"] - Base filename (no extension); will be slugified and saved with a `.wiki` extension.
 */
export function exportAsWiki(text, filename = "export") {
    downloadBlob(text, `${slugify(filename)}.wiki`, "text/plain;charset=utf-8");
}

// ---------------------------------------------------------------------------
// Internal helpers
/**
 * Escape the characters &, <, >, and " so a string can be safely inserted into HTML.
 * @param {string} str - Input string to escape.
 * @returns {string} The input with `&`, `<`, `>`, and `"` replaced by their HTML entities.
 */

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Produce a lowercase, filename-safe slug from a string.
 *
 * Converts the input to lowercase, replaces runs of non-alphanumeric characters with
 * single hyphens, trims leading/trailing hyphens, and falls back to `"export"` when
 * the resulting slug would be empty.
 * @param {string} str - Input text to convert into a slug; may be empty or falsy.
 * @returns {string} The slugified string suitable for filenames or URLs, or `"export"` if empty.
 */
function slugify(str) {
    return (str || "export")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "export";
}

/**
 * Trigger a browser download for the provided content as a file.
 * @param {BlobPart|ArrayBuffer|ArrayBufferView|string} content - Data to write into the downloaded file; passed to the Blob constructor.
 * @param {string} filename - Suggested filename for the downloaded file (sets the `download` attribute).
 * @param {string} mimeType - MIME type for the created Blob (e.g., "text/plain;charset=utf-8").
 */
function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the object URL after the download has been triggered.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
