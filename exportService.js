/**
 * exportService.js
 * PDF, standalone HTML, and raw .wiki export helpers for Vonfluence.
 */

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Open the browser print dialog and set the document title to influence the suggested PDF filename.
 *
 * The original document title is restored shortly after the print dialog is invoked.
 * @param {string} title - Title to use while printing; used as the suggested filename. Defaults to "Vonfluence Export".
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
 * Collects all accessible CSS rules from in-page stylesheets.
 *
 * Skips stylesheets that are inaccessible due to cross-origin restrictions.
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
 * Export the rendered preview element as a standalone HTML file with inlined styles.
 *
 * Embeds the current page's CSS and the element's innerHTML into a complete HTML document, sets the document title from `title`, and starts a download using a slugified filename.
 *
 * @param {HTMLElement} previewEl - Element whose innerHTML will be used as the document body (inline SVGs are preserved).
 * @param {string} title - Document title and base for the downloaded filename (defaults to "Vonfluence Export").
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
 * Download given Confluence wiki markup as a .wiki file.
 *
 * @param {string} text - Confluence wiki markup content to save.
 * @param {string} [filename="export"] - Base filename to use (will be slugified); the `.wiki` extension is appended.
 */
export function exportAsWiki(text, filename = "export") {
    downloadBlob(text, `${slugify(filename)}.wiki`, "text/plain;charset=utf-8");
}

// ---------------------------------------------------------------------------
// Internal helpers
/**
 * Escape special HTML characters in a string.
 * @param {string} str - The input text to escape.
 * @returns {string} The input with `&`, `<`, `>`, and `"` replaced by `&amp;`, `&lt;`, `&gt;`, and `&quot;` respectively.
 */

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Create a URL-friendly slug from a string.
 *
 * Converts the input to lowercase, replaces sequences of non-alphanumeric characters with
 * single hyphens, trims leading and trailing hyphens, and falls back to `"export"` for
 * falsy input or an empty result.
 *
 * @param {string} str - The input string to slugify.
 * @returns {string} The resulting slug (lowercase, hyphen-separated), or `"export"` if empty.
 */
function slugify(str) {
    return (str || "export")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "export";
}

/**
 * Triggers a browser download of the provided content as a file with the given name and MIME type.
 *
 * Creates a Blob from `content`, generates an object URL, programmatically clicks a temporary anchor to start the download, and revokes the object URL after 10 seconds.
 * @param {BlobPart|ArrayBuffer|ArrayBufferView|string} content - Data to include in the downloaded file.
 * @param {string} filename - Filename suggested to the browser for the download.
 * @param {string} mimeType - MIME type to assign to the created Blob (e.g., "text/plain;charset=utf-8").
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
