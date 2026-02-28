/**
 * exportService.js
 * PDF, standalone HTML, and raw .wiki export helpers for Vonfluence.
 */

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/**
 * Trigger browser print dialog (Save as PDF).
 * Temporarily sets the document title so the suggested PDF filename is meaningful.
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
 * Collect all in-page CSS rule text (best-effort — cross-origin sheets are skipped).
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
 * Download the raw Confluence wiki markup as a .wiki file.
 *
 * @param {string} text     Raw wiki markup.
 * @param {string} filename Base filename (without extension).
 */
export function exportAsWiki(text, filename = "export") {
    downloadBlob(text, `${slugify(filename)}.wiki`, "text/plain;charset=utf-8");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function slugify(str) {
    return (str || "export")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "export";
}

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
