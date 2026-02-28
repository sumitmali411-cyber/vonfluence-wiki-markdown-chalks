import { loadMermaid, renderMermaid } from "./mermaidLoader.js";
import { parseConfluence } from "./confluenceParser.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const preview = document.getElementById("preview");
const raw = document.getElementById("rawMarkdown");
const toggleRaw = document.getElementById("toggleRaw");
const versionSelect = document.getElementById("mermaidVersion");
const dropZone = document.getElementById("dropZone");
const themeToggle = document.getElementById("themeToggle");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const processingIndicator = document.getElementById("processingIndicator");
const processingText = document.getElementById("processingText");

let renderSeq = 0;
let inputDebounce = null;
let processSeq = 0;
const activeProcesses = new Map();
const PROCESSING_DELAY_MS = 120;

// ---------------------------------------------------------------------------
// Upload / drag-drop
// ---------------------------------------------------------------------------

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = async e => {
    const file = e.target.files[0];
    if (file) {
        await readFile(file, uploadBtn);
    }
    e.target.value = "";
};

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) {
        await readFile(file);
    }
});

// ---------------------------------------------------------------------------
// Processing indicator
// ---------------------------------------------------------------------------

function refreshProcessingIndicator() {
    const visible = Array.from(activeProcesses.values()).filter(job => job.visible);

    if (visible.length === 0) {
        processingIndicator.classList.add("hidden");
        processingIndicator.setAttribute("aria-hidden", "true");
        return;
    }

    const latest = visible[visible.length - 1];
    processingText.textContent = latest.message;
    processingIndicator.classList.remove("hidden");
    processingIndicator.setAttribute("aria-hidden", "false");
}

function startProcessing(message) {
    const id = ++processSeq;
    const job = {
        message: message || "Processing...",
        visible: false,
        timer: null
    };

    job.timer = setTimeout(() => {
        const active = activeProcesses.get(id);
        if (!active) return;
        active.visible = true;
        refreshProcessingIndicator();
    }, PROCESSING_DELAY_MS);

    activeProcesses.set(id, job);
    refreshProcessingIndicator();
    return id;
}

function stopProcessing(id) {
    const job = activeProcesses.get(id);
    if (!job) return;
    clearTimeout(job.timer);
    activeProcesses.delete(id);
    refreshProcessingIndicator();
}

function startControlLoading(control, loadingLabel) {
    if (!control) {
        return () => {};
    }

    const wasDisabled = control.disabled;
    const isButton = control.tagName === "BUTTON";
    const previousText = isButton ? control.textContent : "";

    control.disabled = true;
    control.classList.add("loading-control");

    if (isButton && loadingLabel) {
        control.textContent = loadingLabel;
    }

    return () => {
        control.disabled = wasDisabled;
        control.classList.remove("loading-control");

        if (isButton && loadingLabel) {
            control.textContent = previousText;
        }
    };
}

async function withProcessing(message, task, options = {}) {
    const { control = null, controlLabel = "", showIndicator = true } = options;
    const processId = showIndicator ? startProcessing(message) : null;
    const restoreControl = startControlLoading(control, controlLabel);

    try {
        return await task();
    } finally {
        restoreControl();
        if (processId !== null) {
            stopProcessing(processId);
        }
    }
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

function readWikiFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = e => {
            resolve(String(e.target?.result || ""));
        };

        reader.onerror = () => {
            reject(reader.error || new Error(`Failed to read "${file.name}"`));
        };

        reader.readAsText(file);
    });
}

async function readFile(file, control = null) {
    try {
        const wikiText = await withProcessing(`Reading ${file.name}...`, () => readWikiFile(file), {
            control,
            controlLabel: control ? "Loading..." : ""
        });

        raw.value = wikiText;
        await renderWiki(wikiText, "Rendering Confluence wiki + Mermaid...");
    } catch (error) {
        console.error(error);
        alert(`Failed to read file: ${file.name}`);
    }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

async function renderWiki(wikiText, processingMessage = "Rendering...", useLoader = true) {
    const run = async () => {
        const seq = ++renderSeq;

        const rawHtml = parseConfluence(wikiText || "");
        const html = DOMPurify.sanitize(rawHtml, {
            ADD_ATTR: ["class", "style", "target", "rel"],
            ADD_TAGS: ["blockquote"]
        });

        preview.innerHTML = html;

        await loadMermaid(versionSelect.value);

        if (seq !== renderSeq) {
            return;
        }

        await renderMermaid(preview);
    };

    if (!useLoader) {
        await run();
        return;
    }

    await withProcessing(processingMessage, run);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

toggleRaw.onclick = () => {
    raw.classList.toggle("hidden");
};

raw.addEventListener("input", () => {
    clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => {
        renderWiki(raw.value).catch(error => {
            console.error(error);
        });
    }, 120);
});

versionSelect.onchange = async () => {
    try {
        await withProcessing(`Applying Mermaid ${versionSelect.value}...`, async () => {
            await renderWiki(raw.value, "", false);
        }, {
            control: versionSelect
        });
    } catch (error) {
        console.error(error);
        alert("Failed to switch Mermaid version.");
    }
};

themeToggle.onclick = () => {
    const theme = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", theme === "dark" ? "light" : "dark");
};

downloadPdfBtn.onclick = () => {
    window.print();
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

(async () => {
    try {
        await withProcessing(`Loading Mermaid ${versionSelect.value}...`, () => loadMermaid(versionSelect.value));
        if (raw.value.trim()) {
            await renderWiki(raw.value);
        }
    } catch (error) {
        console.error(error);
    }
})();
