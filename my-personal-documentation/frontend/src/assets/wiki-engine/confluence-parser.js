/**
 * confluence-parser.js
 * Ported from Vonfluence (vonfluence-wiki-markdown-chalks/confluenceParser.js).
 * Exposed as window.parseConfluence for use from Angular without module bundling.
 *
 * Converts Confluence wiki markup to sanitised HTML (3-pass algorithm):
 *  1. Extract block macros → placeholders
 *  2. Process lines  (headings, tables, lists, paragraphs)
 *  3. Apply inline formatting
 *  4. Re-insert block HTML
 */
(function (global) {
    'use strict';

    const PLACEHOLDER_RE = /\x00BLOCK_(\d+)\x00/g;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function panelHtml(type, icon, content, title) {
        const titleHtml = title
            ? `<div class="confluence-panel-title">${escapeHtml(title)}</div>`
            : '';
        return `<div class="confluence-panel confluence-panel-${type}">${titleHtml}<div class="confluence-panel-body"><span class="confluence-panel-icon">${icon}</span><div>${content}</div></div></div>`;
    }

    // ── 1. Block macro extraction ─────────────────────────────────────────
    function extractBlocks(text) {
        const blocks = [];

        function placeholder(html) {
            const idx = blocks.length;
            blocks.push(html);
            return `\x00BLOCK_${idx}\x00`;
        }

        // {mermaid}…{/mermaid}
        text = text.replace(/\{mermaid\}([\s\S]*?)\{\/mermaid\}/gi, (_, body) =>
            placeholder(`<pre><code class="language-mermaid">${escapeHtml(body.trim())}</code></pre>`)
        );

        // {code:language=X}…{code}
        text = text.replace(/\{code(?::([^}]*))?\}([\s\S]*?)\{code\}/gi, (_, params, body) => {
            let lang = 'text';
            if (params) { const m = params.match(/language=([a-z0-9+#._-]+)/i); if (m) lang = m[1]; }
            return placeholder(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(body.trim())}</code></pre>`);
        });

        // {noformat}…{noformat}
        text = text.replace(/\{noformat\}([\s\S]*?)\{noformat\}/gi, (_, body) =>
            placeholder(`<pre>${escapeHtml(body.trim())}</pre>`)
        );

        // Panels
        text = text.replace(/\{info(?::[^}]*)?\}([\s\S]*?)\{info\}/gi,    (_, b) => placeholder(panelHtml('info',    'ℹ',  processLines(b.trim()))));
        text = text.replace(/\{tip(?::[^}]*)?\}([\s\S]*?)\{tip\}/gi,      (_, b) => placeholder(panelHtml('tip',     '✓',  processLines(b.trim()))));
        text = text.replace(/\{warning(?::[^}]*)?\}([\s\S]*?)\{warning\}/gi,(_, b)=> placeholder(panelHtml('warning', '⚠', processLines(b.trim()))));
        text = text.replace(/\{note(?::[^}]*)?\}([\s\S]*?)\{note\}/gi,    (_, b) => placeholder(panelHtml('note',    '📝', processLines(b.trim()))));

        // {panel:title=X}…{panel}
        text = text.replace(/\{panel(?::([^}]*))?\}([\s\S]*?)\{panel\}/gi, (_, params, body) => {
            let title = '';
            if (params) { const m = params.match(/title=([^|]+)/i); if (m) title = m[1].trim(); }
            return placeholder(panelHtml('panel', '', processLines(body.trim()), title));
        });

        // {quote}…{quote}
        text = text.replace(/\{quote\}([\s\S]*?)\{quote\}/gi, (_, b) =>
            placeholder(`<blockquote>${processLines(b.trim())}</blockquote>`)
        );

        return { text, blocks };
    }

    // ── 2. Line processing ────────────────────────────────────────────────
    function buildList(items) {
        if (!items.length) return '';
        let html = '';
        const stack = [];

        for (const item of items) {
            const tag = item.ordered ? 'ol' : 'ul';

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

        while (stack.length) html += `</${stack.pop().tag}>`;
        return html;
    }

    function parseListLine(line) {
        const m = line.match(/^([*#]+)\s+(.*)/);
        if (!m) return null;
        const markers = m[1];
        return { depth: markers.length, ordered: markers[markers.length - 1] === '#', text: m[2] };
    }

    function isTableLine(line) { return /^\|/.test(line); }

    function buildTable(lines) {
        let html = '<table>';
        for (const line of lines) {
            const isHeader = /^\|\|/.test(line);
            const tag = isHeader ? 'th' : 'td';
            const raw = line.replace(/^\|+/, '').replace(/\|+$/, '');
            const sep = isHeader ? '||' : '|';
            const cells = raw.split(sep).map(c => c.trim());
            html += '<tr>' + cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join('') + '</tr>';
        }
        return html + '</table>';
    }

    function processLines(text) {
        const lines = text.split('\n');
        let html = '';
        let listBuffer = [], tableBuffer = [], paraBuffer = [];

        const flushList  = () => { if (listBuffer.length)  { html += buildList(listBuffer);   listBuffer  = []; } };
        const flushTable = () => { if (tableBuffer.length) { html += buildTable(tableBuffer); tableBuffer = []; } };
        const flushPara  = () => {
            if (paraBuffer.length) {
                const content = paraBuffer.join(' ').trim();
                if (content) html += `<p>${applyInline(content)}</p>`;
                paraBuffer = [];
            }
        };

        for (const line of lines) {
            if (/\x00BLOCK_\d+\x00/.test(line)) {
                flushList(); flushTable(); flushPara();
                html += line;
                continue;
            }

            const hm = line.match(/^h([1-6])\.\s+(.*)/);
            if (hm) { flushList(); flushTable(); flushPara(); html += `<h${hm[1]}>${applyInline(hm[2])}</h${hm[1]}>`; continue; }

            if (/^----\s*$/.test(line)) { flushList(); flushTable(); flushPara(); html += '<hr>'; continue; }

            if (isTableLine(line)) { flushList(); flushPara(); tableBuffer.push(line); continue; }
            if (tableBuffer.length && !isTableLine(line)) flushTable();

            const li = parseListLine(line);
            if (li) { flushPara(); listBuffer.push(li); continue; }
            if (listBuffer.length && !li) flushList();

            if (line.trim() === '') { flushPara(); continue; }

            paraBuffer.push(line);
        }

        flushList(); flushTable(); flushPara();
        return html;
    }

    // ── 3. Inline formatting ──────────────────────────────────────────────
    function applyInline(text) {
        text = text.replace(/\{color:([^}]+)\}(.*?)\{color\}/gi, (_, c, t) =>
            `<span style="color:${escapeHtml(c)}">${t}</span>`
        );
        text = text.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
        text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');
        text = text.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');
        text = text.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
        text = text.replace(/~([^~]+)~/g, '<sub>$1</sub>');
        text = text.replace(/(^|[\s(])-([^-\n]+)-([\s,.)!?]|$)/g, '$1<del>$2</del>$3');
        text = text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, (_, label, url) =>
            `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`
        );
        text = text.replace(/\[([^\]]+)\]/g, (_, url) =>
            /^https?:\/\//.test(url)
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${url}</a>`
                : `[${url}]`
        );
        text = text.replace(/\\\\/g, '<br>');
        return text;
    }

    // ── Public API ────────────────────────────────────────────────────────
    global.parseConfluence = function (wikiText) {
        if (!wikiText) return '';
        const normalised = wikiText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const { text: withPlaceholders, blocks } = extractBlocks(normalised);
        let html = processLines(withPlaceholders);
        html = html.replace(PLACEHOLDER_RE, (_, idx) => blocks[parseInt(idx, 10)] || '');
        return html;
    };

}(window));
