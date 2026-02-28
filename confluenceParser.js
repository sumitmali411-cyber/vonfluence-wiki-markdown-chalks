/**
 * confluenceParser.js
 * Converts Confluence wiki markup to sanitised HTML.
 *
 * Algorithm (3-pass):
 *  1. Extract block macros → replace with placeholders
 *  2. Process remaining lines (headings, tables, lists, paragraphs)
 *  3. Apply inline formatting
 *  4. Re-insert block HTML
 */

const PLACEHOLDER_RE = /\x00BLOCK_(\d+)\x00/g;

// ---------------------------------------------------------------------------
// 1. Block macro extraction
// ---------------------------------------------------------------------------

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function panelHtml(type, icon, content, title) {
    const titleHtml = title ? `<div class="confluence-panel-title">${escapeHtml(title)}</div>` : "";
    return `<div class="confluence-panel confluence-panel-${type}">${titleHtml}<div class="confluence-panel-body"><span class="confluence-panel-icon">${icon}</span>${content}</div></div>`;
}

/**
 * Extract all block-level macros and replace them with \x00BLOCK_N\x00 placeholders.
 * Returns { text, blocks } where blocks[N] is the rendered HTML for placeholder N.
 */
function extractBlocks(text) {
    const blocks = [];

    function placeholder(html) {
        const idx = blocks.length;
        blocks.push(html);
        return `\x00BLOCK_${idx}\x00`;
    }

    // {mermaid}...\n{/mermaid} — custom mermaid macro
    text = text.replace(/\{mermaid\}([\s\S]*?)\{\/mermaid\}/gi, (_, body) => {
        return placeholder(`<pre><code class="language-mermaid">${escapeHtml(body.trim())}</code></pre>`);
    });

    // {code:language=X} ... {code}  or  {code} ... {code}
    text = text.replace(/\{code(?::([^}]*))?\}([\s\S]*?)\{code\}/gi, (_, params, body) => {
        let lang = "text";
        if (params) {
            const m = params.match(/language=([a-z0-9+#._-]+)/i);
            if (m) lang = m[1];
        }
        return placeholder(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(body.trim())}</code></pre>`);
    });

    // {noformat} ... {noformat}
    text = text.replace(/\{noformat\}([\s\S]*?)\{noformat\}/gi, (_, body) => {
        return placeholder(`<pre>${escapeHtml(body.trim())}</pre>`);
    });

    // {info}...\n{info}
    text = text.replace(/\{info(?::[^}]*)?\}([\s\S]*?)\{info\}/gi, (_, body) => {
        return placeholder(panelHtml("info", "ℹ", processLines(body.trim())));
    });

    // {tip}...\n{tip}
    text = text.replace(/\{tip(?::[^}]*)?\}([\s\S]*?)\{tip\}/gi, (_, body) => {
        return placeholder(panelHtml("tip", "✓", processLines(body.trim())));
    });

    // {warning}...\n{warning}
    text = text.replace(/\{warning(?::[^}]*)?\}([\s\S]*?)\{warning\}/gi, (_, body) => {
        return placeholder(panelHtml("warning", "⚠", processLines(body.trim())));
    });

    // {note}...\n{note}
    text = text.replace(/\{note(?::[^}]*)?\}([\s\S]*?)\{note\}/gi, (_, body) => {
        return placeholder(panelHtml("note", "📝", processLines(body.trim())));
    });

    // {panel:title=X}...\n{panel}
    text = text.replace(/\{panel(?::([^}]*))?\}([\s\S]*?)\{panel\}/gi, (_, params, body) => {
        let title = "";
        if (params) {
            const m = params.match(/title=([^|]+)/i);
            if (m) title = m[1].trim();
        }
        return placeholder(panelHtml("panel", "", processLines(body.trim()), title));
    });

    // {quote}...\n{quote}
    text = text.replace(/\{quote\}([\s\S]*?)\{quote\}/gi, (_, body) => {
        return placeholder(`<blockquote>${processLines(body.trim())}</blockquote>`);
    });

    return { text, blocks };
}

// ---------------------------------------------------------------------------
// 2. Line processing (headings, tables, lists, paragraphs)
// ---------------------------------------------------------------------------

/**
 * Process a list of consecutive list lines into nested <ul>/<ol>.
 * Each item is like { depth, ordered, text }.
 */
function buildList(items) {
    if (!items.length) return "";

    let html = "";
    const stack = []; // { tag, depth }

    for (const item of items) {
        const tag = item.ordered ? "ol" : "ul";

        while (stack.length && stack[stack.length - 1].depth > item.depth) {
            html += `</${stack.pop().tag}>`;
        }

        if (!stack.length || stack[stack.length - 1].depth < item.depth) {
            html += `<${tag}>`;
            stack.push({ tag, depth: item.depth });
        } else if (stack[stack.length - 1].tag !== tag) {
            html += `</${stack.pop().tag}><${tag}>`;
            stack.push({ tag, depth: item.depth });
        }

        html += `<li>${applyInline(item.text)}</li>`;
    }

    while (stack.length) {
        html += `</${stack.pop().tag}>`;
    }

    return html;
}

function parseListLine(line) {
    // leading * or # characters indicate list depth
    const m = line.match(/^([*#]+)\s+(.*)/);
    if (!m) return null;
    const markers = m[1];
    const depth = markers.length;
    const ordered = markers[markers.length - 1] === "#";
    return { depth, ordered, text: m[2] };
}

function isTableLine(line) {
    return /^\|/.test(line);
}

function buildTable(lines) {
    let html = "<table>";
    for (const line of lines) {
        const isHeader = /^\|\|/.test(line);
        const tag = isHeader ? "th" : "td";
        // Split on || or |
        const raw = line.replace(/^\|+/, "").replace(/\|+$/, "");
        const sep = isHeader ? "||" : "|";
        const cells = raw.split(sep).map(c => c.trim());
        html += "<tr>" + cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join("") + "</tr>";
    }
    html += "</table>";
    return html;
}

/**
 * Main line-by-line processing.
 * Handles headings, HRs, tables, lists, and paragraphs.
 */
function processLines(text) {
    const lines = text.split("\n");
    let html = "";
    let listBuffer = [];
    let tableBuffer = [];
    let paraBuffer = [];

    function flushList() {
        if (listBuffer.length) {
            html += buildList(listBuffer);
            listBuffer = [];
        }
    }

    function flushTable() {
        if (tableBuffer.length) {
            html += buildTable(tableBuffer);
            tableBuffer = [];
        }
    }

    function flushPara() {
        if (paraBuffer.length) {
            const content = paraBuffer.join(" ").trim();
            if (content) {
                html += `<p>${applyInline(content)}</p>`;
            }
            paraBuffer = [];
        }
    }

    for (const line of lines) {
        // Placeholders pass through untouched (they'll be reinserted later)
        if (/\x00BLOCK_\d+\x00/.test(line)) {
            flushList();
            flushTable();
            flushPara();
            html += line;
            continue;
        }

        // Heading: h1. Title
        const headingMatch = line.match(/^h([1-6])\.\s+(.*)/);
        if (headingMatch) {
            flushList();
            flushTable();
            flushPara();
            html += `<h${headingMatch[1]}>${applyInline(headingMatch[2])}</h${headingMatch[1]}>`;
            continue;
        }

        // Horizontal rule
        if (/^----\s*$/.test(line)) {
            flushList();
            flushTable();
            flushPara();
            html += "<hr>";
            continue;
        }

        // Table line
        if (isTableLine(line)) {
            flushList();
            flushPara();
            tableBuffer.push(line);
            continue;
        }

        // Flush table if we leave table lines
        if (tableBuffer.length && !isTableLine(line)) {
            flushTable();
        }

        // List line
        const listItem = parseListLine(line);
        if (listItem) {
            flushPara();
            listBuffer.push(listItem);
            continue;
        }

        // Flush list if we leave list lines
        if (listBuffer.length && !listItem) {
            flushList();
        }

        // Empty line = paragraph break
        if (line.trim() === "") {
            flushPara();
            continue;
        }

        // Regular line → accumulate paragraph
        paraBuffer.push(line);
    }

    flushList();
    flushTable();
    flushPara();

    return html;
}

// ---------------------------------------------------------------------------
// 3. Inline formatting
// ---------------------------------------------------------------------------

function applyInline(text) {
    // {color:X}text{color}
    text = text.replace(/\{color:([^}]+)\}(.*?)\{color\}/gi, (_, color, content) => {
        return `<span style="color:${escapeHtml(color)}">${content}</span>`;
    });

    // *bold*
    text = text.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");

    // _italic_
    text = text.replace(/_([^_\n]+)_/g, "<em>$1</em>");

    // {{monospace}}
    text = text.replace(/\{\{([^}]+)\}\}/g, "<code>$1</code>");

    // ^superscript^
    text = text.replace(/\^([^^]+)\^/g, "<sup>$1</sup>");

    // ~subscript~
    text = text.replace(/~([^~]+)~/g, "<sub>$1</sub>");

    // -strikethrough-  (only when surrounded by spaces or start/end to avoid date ranges)
    text = text.replace(/(^|[\s(])-([^-\n]+)-([\s,.)!?]|$)/g, "$1<del>$2</del>$3");

    // [text|url] or [url]
    text = text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, (_, label, url) => {
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`;
    });
    text = text.replace(/\[([^\]]+)\]/g, (_, url) => {
        if (/^https?:\/\//.test(url)) {
            return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${url}</a>`;
        }
        return `[${url}]`; // anchor link — leave as-is
    });

    // \\ → <br>
    text = text.replace(/\\\\/g, "<br>");

    return text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse Confluence wiki markup and return sanitised HTML.
 * Caller should pass through DOMPurify after this.
 */
export function parseConfluence(wikiText) {
    if (!wikiText) return "";

    // Normalise line endings
    const normalised = wikiText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Pass 1: extract block macros
    const { text: withPlaceholders, blocks } = extractBlocks(normalised);

    // Pass 2 & 3: line processing + inline formatting
    let html = processLines(withPlaceholders);

    // Pass 4: reinsert block HTML
    html = html.replace(PLACEHOLDER_RE, (_, idx) => blocks[parseInt(idx, 10)] || "");

    return html;
}
