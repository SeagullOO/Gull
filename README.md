# 🐦 GullDoc

**A desktop toolkit for game design documentation — Markdown, Excel, and Docs in one unified workspace.**

[![Electron](https://img.shields.io/badge/Electron-42.4-47848f?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

**English** | [中文](README.zh-CN.md)

---

## What is GullDoc?

GullDoc is a **game design document (GDD) editor** built with web technologies and packaged as a desktop app via Electron. It gives game designers a single tool for writing design docs in Markdown, managing data tables in Excel-format spreadsheets, and authoring rich-text documents — without switching between multiple applications.

### Why not just use Feishu / VS Code / Google Sheets?

- **Unified workspace**: All your GDD files live together in one project folder, with a purpose-built file explorer and tab system.
- **Game-designer UX**: Keyboard shortcuts, auto-save, workspace zoom, and dark theme optimized for long writing sessions.
- **Offline-first desktop app**: Works entirely on your local filesystem. No cloud, no accounts, no subscriptions.
- **Cross-editor workflow**: Edit `.md`, `.xlsx`, and `.docx` side by side in tabs, with consistent theming across all editors.

---

## Features

### Three Built-in Editors

| Editor | Format | Engine | Highlights |
|--------|--------|--------|------------|
| **Markdown** | `.md` | [Monaco](https://github.com/microsoft/monaco-editor) | Split-pane live preview, scroll sync, custom fonts, code highlighting |
| **Excel** | `.xlsx` | [Handsontable](https://handsontable.com/) | Formula bar (HyperFormula), rich formatting toolbar, row/column freeze, sort, merge cells |
| **Docs** | `.docx` | [TipTap](https://tiptap.dev/) | WYSIWYG editing, headings, lists, tables, images, links, text alignment |

### Workspace Management

- **File tree** with drag-and-drop, nested folders, and inline rename (F2)
- **Tab system** with drag-to-reorder and close confirmation for unsaved changes
- **Templates** — save workspace structures as reusable templates
- **Import** existing `.md`, `.xlsx`, `.csv`, `.docx` files from disk
- **Export** individual files or entire workspaces

### Quality of Life

- **Dual theme** — light mode + dark mode
- **UI zoom** (Ctrl+Scroll) and independent content zoom
- **Global search** across all workspace files (Ctrl+Shift+F)
- **Bilingual UI** — English / 中文
- **Auto-save** with visual status indicator
- **Custom color picker** — preset palette + HSV sliders

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop shell** | Electron 42 |
| **UI framework** | React 18 + React Router 6 |
| **Build tool** | Vite 5 |
| **Language** | TypeScript 5.5 (strict mode) |
| **Styling** | Tailwind CSS 3 + CSS custom properties (design tokens) |
| **Markdown editor** | Monaco Editor 0.55 + `@monaco-editor/react` |
| **Spreadsheet** | Handsontable + HyperFormula (vendored) |
| **Rich text** | TipTap 3 (ProseMirror-based) |
| **File format** | ExcelJS 4, Mammoth 1, Marked 18, JSZip 3 |
| **Browser storage** | Dexie.js 4 (IndexedDB) |
| **Testing** | Vitest 4 + Playwright 1.61 |
| **Packaging** | electron-builder 26 + electron-updater 6 |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Windows** (primary target; macOS/Linux untested)

### Install

```bash
git clone https://github.com/SeagullOO/GullDoc.git
cd GullDoc
npm install
```

### Development

```bash
# Browser mode (Vite dev server)
npm run dev

# Electron mode (Vite + Electron concurrently)
npm run electron:dev
```

### Build

```bash
# Production build (to dist/)
npm run build

# Windows portable package (to release/)
npm run electron:build
```

> **China mainland users**: Set these mirrors before building:
> ```bash
> export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm config set registry https://registry.npmmirror.com
> ```

---

## Project Structure

```
GullDoc/
├── electron/              # Electron main process
│   ├── main.js            # Window management, ~35 IPC channels, auto-updater
│   └── preload.js         # Context bridge (window.electronAPI)
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Root component (router, theme, ErrorBoundary)
│   ├── config.ts          # Central config (zoom, keybindings, colors, toolbar)
│   ├── types.ts           # Core types: FolderFile, Folder, Template
│   ├── db.ts              # IndexedDB layer (Dexie.js)
│   ├── storage.ts         # Storage abstraction (Electron fs ↔ IndexedDB)
│   ├── i18n.ts            # Chinese/English dictionary (~275 keys)
│   ├── pages/             # Page-level components
│   │   ├── FolderWorkspace.tsx   # Main workspace (editor, tabs, status bar)
│   │   └── Settings.tsx          # Settings panel
│   ├── components/        # ~25 reusable components
│   ├── hooks/             # ~11 custom hooks
│   ├── utils/             # Utility modules
│   ├── styles/            # CSS modules (tokens, components, per-editor)
│   └── __tests__/         # Vitest unit tests
├── docs/                  # Design docs, plans, reference
├── public/vendor/         # Vendored CDN assets
└── scripts/               # Build helper scripts
```

---

## Architecture Notes

### Dual-Mode Storage

GullDoc detects the runtime environment and switches storage backends automatically:

- **Electron** → Native filesystem via IPC. Workspace metadata in `data/`, files stored as real `.md` / `.xlsx` / `.docx`.
- **Browser** → IndexedDB via Dexie.js. Everything lives in the browser's storage.

### Theme System

CSS custom properties (`src/styles/tokens.css`) define the entire visual language. The Obsidian-inspired dark palette uses Nord Blue tones. Switching to light mode toggles `:root.light` on `<html>`.

### Zoom Strategy

Electron's native zoom is locked at 1.0. All zoom behavior uses CSS `zoom` property to avoid async timing issues between Chromium and the renderer.

---

## Contributing

This project is currently in active personal development. If you'd like to contribute:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Write tests for your changes
4. Ensure `npm test` passes
5. Open a Pull Request against the `dev` branch

See `CLAUDE.md` and `docs/` for code conventions and design context.

---

## License

MIT © SeagullOO

---

## Acknowledgments

- [Monaco Editor](https://github.com/microsoft/monaco-editor) — VS Code's editor, powering our Markdown experience
- [Handsontable](https://handsontable.com/) — Excel-like spreadsheet grid
- [TipTap](https://tiptap.dev/) — Modern rich-text editor built on ProseMirror
- [Electron](https://electronjs.org) — Cross-platform desktop apps with web technologies
- The Obsidian color palette for dark-theme inspiration
