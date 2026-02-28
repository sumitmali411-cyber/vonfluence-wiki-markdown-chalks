/**
 * mermaid-loader.js
 * Ported from Vonfluence (vonfluence-wiki-markdown-chalks/mermaidLoader.js).
 * Exposed as window.renderMermaid for use from Angular without module bundling.
 *
 * Loads Mermaid from CDN (once) then renders all .language-mermaid code blocks
 * inside the given container element into inline SVG diagrams.
 */
(function (global) {
    'use strict';

    let currentScript = null;
    let currentVersion = null;
    let loadPromise = null;

    const MERMAID_VERSION = 'latest';

    function getMermaidUrl(version) {
        if (!version || version === 'latest') {
            return 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
        }
        return `https://cdn.jsdelivr.net/npm/mermaid@${version}/dist/mermaid.min.js`;
    }

    function loadMermaid(version) {
        version = version || MERMAID_VERSION;

        if (global.mermaid && currentVersion === version) {
            return Promise.resolve(global.mermaid);
        }
        if (loadPromise && currentVersion === version) {
            return loadPromise;
        }
        if (currentScript) { currentScript.remove(); currentScript = null; }

        currentVersion = version;
        global.mermaid = undefined;

        loadPromise = new Promise(function (resolve, reject) {
            const script = document.createElement('script');
            script.src = getMermaidUrl(version);
            script.async = true;

            script.onload = function () {
                if (!global.mermaid) {
                    reject(new Error('Mermaid loaded but window.mermaid is unavailable.'));
                    return;
                }
                global.mermaid.initialize({
                    startOnLoad: false,
                    flowchart: { htmlLabels: false, useMaxWidth: true }
                });
                resolve(global.mermaid);
            };

            script.onerror = function () {
                reject(new Error(`Failed to load Mermaid version "${version}".`));
            };

            document.head.appendChild(script);
            currentScript = script;
        }).finally(function () { loadPromise = null; });

        return loadPromise;
    }

    /**
     * Render all mermaid code blocks inside `container` as SVG.
     * @param {HTMLElement} container
     */
    global.renderMermaid = async function (container) {
        container = container || document;

        await loadMermaid(MERMAID_VERSION);

        if (!global.mermaid) return;

        const blocks = container.querySelectorAll(
            'pre > code.language-mermaid, pre > code.lang-mermaid'
        );

        for (const block of blocks) {
            const source = (block.textContent || '').trim();
            const pre = block.parentElement;
            if (!pre || !source) continue;

            const id = 'mermaid-' + Math.random().toString(36).slice(2, 10);

            try {
                const { svg } = await global.mermaid.render(id, source);
                const wrapper = document.createElement('div');
                wrapper.className = 'mermaid-diagram';
                wrapper.innerHTML = svg;
                pre.replaceWith(wrapper);
            } catch (err) {
                const errBlock = document.createElement('pre');
                errBlock.className = 'mermaid-error';
                errBlock.textContent = `Mermaid Error:\n${err.message || String(err)}`;
                pre.replaceWith(errBlock);
            }
        }
    };

}(window));
