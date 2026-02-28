# My Personal Documentation

A self-hosted personal documentation portal that renders **Confluence wiki markup** and **Mermaid diagrams** in a clean Angular Material UI, backed by a Spring Boot REST API.

## Features

- **Confluence wiki syntax** — headings, bold/italic, tables, lists, panels (info/tip/warning/note), quotes, code blocks, color macros
- **Mermaid diagrams** — flowcharts, sequence diagrams, ER diagrams, etc. via `{mermaid}…{/mermaid}` blocks
- **File-system storage** — documents are plain `.wiki` / `.md` files; no database needed
- **Category folders** — organize docs into subdirectories (becomes the sidebar category)
- **Angular Material UI** — responsive sidebar navigation, dark/light theme toggle
- **In-browser editor** — create and edit wiki documents right in the browser
- **Export** — PDF (print dialog) and standalone HTML

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2, Java 17 |
| Frontend | Angular 17, Angular Material |
| Wiki rendering | [Vonfluence](https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks) parser (ported) |
| Diagram rendering | Mermaid.js (CDN) |

## Quick Start

### 1. Backend

```bash
cd backend
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`.
Documents are stored at `~/personal-docs/docs/` by default.
Override with `-Ddocs.storage-path=/your/custom/path`.

### 2. Frontend

```bash
cd frontend
npm install
npm start          # serves on http://localhost:4200
```

The Angular dev server proxies `/api` → `http://localhost:8080` automatically.

### 3. Open

Navigate to [http://localhost:4200](http://localhost:4200).

## Document Format

### Confluence wiki (`.wiki`)

```wiki
h1. My Page Title

h2. Section

This is *bold*, _italic_, and {{monospace}} text.

{info}
An info panel.
{info}

{mermaid}
graph TD
  A --> B --> C
{/mermaid}
```

### Markdown (`.md`)

Standard CommonMark markdown is also supported and rendered via the viewer.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/docs` | List all documents (metadata) |
| GET | `/api/docs/{id}` | Get document with full content |
| POST | `/api/docs/{id}` | Create or update document |
| DELETE | `/api/docs/{id}` | Delete document |

## Storage Layout

```
~/personal-docs/docs/
├── getting-started.wiki      → id: "getting-started"
├── architecture/
│   └── overview.wiki         → id: "architecture/overview"
└── team/
    └── on-boarding.wiki      → id: "team/on-boarding"
```

## Credits

Wiki parser and Mermaid loader ported from **[Vonfluence](https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks)**.
