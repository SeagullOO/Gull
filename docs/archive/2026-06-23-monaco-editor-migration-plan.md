# Monaco Editor Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TipTap/textarea markdown editing with Monaco Editor + split-view preview, preserving all existing auto-save and Excel functionality.

**Architecture:** Extract `MarkdownEditor.tsx` as a standalone controlled component containing Monaco Editor (left) and `marked` HTML preview (right) with a draggable splitter. Rewrite `EditorToolbar.tsx` to use Monaco's `executeEdits` API for markdown syntax insertion. Simplify `useMarkdownEditor.ts` to pure state management with an `editorRef`.

**Tech Stack:** React 18, TypeScript 5.5, Vite 5, Monaco Editor via `@monaco-editor/react`, `marked` for preview, Electron 42 (unchanged)

## Global Constraints

- CSS variables only (var(--accent), var(--bg-root), etc.) — no hardcoded hex colors
- Handsontable styles untouched — no `.handsontable` / `.ht_master` selectors modified
- No `!important` on Monaco-related styles that could conflict with Handsontable
- Components < 200 lines, hooks < 150 lines
- TypeScript strict mode — no `any` in new code
- No `console.log` in production code
- Immutable state updates — never mutate directly

---

### Task 1: Install Monaco Editor & Remove TipTap Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: Monaco packages available for import, TipTap removed from node_modules

- [ ] **Step 1: Remove TipTap dependencies**

```bash
cd "D:/AI Projects/Hermes/Code Task/game-design-tool"
npm uninstall @tiptap/extension-table @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-table-row @tiptap/pm @tiptap/react @tiptap/starter-kit
```

- [ ] **Step 2: Install Monaco Editor packages**

```bash
npm install @monaco-editor/react monaco-editor
```
Expected: packages added to `package.json` dependencies.

- [ ] **Step 3: Verify package.json**

Check that `package.json` dependencies section contains:
```json
"@monaco-editor/react": "^4.x.x",
"monaco-editor": "^0.x.x",
```
And NO TipTap packages remain (`@tiptap/*`).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace tiptap with monaco-editor and @monaco-editor/react"
```

---

### Task 2: Define Monaco Dark/Light Theme

**Files:**
- Create: `src/monaco-theme.ts`
- Modify: `src/index.css` (add Monaco-specific CSS variable mappings)

**Interfaces:**
- Produces: `applyMonacoTheme(monaco: typeof import('monaco-editor'), isDark: boolean): void` — defines `'gdt-dark'` and `'gdt-light'` themes on the monaco instance
- Produces: `getMonacoTheme(isDark: boolean): string` — returns `'gdt-dark'` or `'gdt-light'`

- [ ] **Step 1: Create `src/monaco-theme.ts`**

```typescript
import type * as Monaco from "monaco-editor";

/**
 * Defines GDT custom themes on the Monaco instance.
 * Called once before rendering the first editor.
 */
export function applyMonacoTheme(
  monaco: typeof Monaco,
  isDark: boolean,
): void {
  // Read current CSS variable values from :root or :root.light
  const style = getComputedStyle(document.documentElement);

  const bg = style.getPropertyValue("--bg-root").trim() || (isDark ? "#1e1e1e" : "#ffffff");
  const bgPanel = style.getPropertyValue("--bg-panel").trim() || (isDark ? "#262626" : "#f5f5f5");
  const fg = style.getPropertyValue("--text-primary").trim() || (isDark ? "#dadada" : "#222222");
  const muted = style.getPropertyValue("--text-tertiary").trim() || (isDark ? "#666666" : "#7c7c7c");
  const border = style.getPropertyValue("--border-subtle").trim() || "rgba(255,255,255,0.08)";
  const accent = style.getPropertyValue("--accent").trim() || "#a882ff";
  const selectionBg = style.getPropertyValue("--bg-selected").trim() || "rgba(168,130,255,0.22)";
  const lineHighlight = style.getPropertyValue("--bg-hover").trim() || "rgba(255,255,255,0.06)";

  const themeName = isDark ? "gdt-dark" : "gdt-light";

  monaco.editor.defineTheme(themeName, {
    base: isDark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      // Markdown tokens — use muted for punctuation, fg for text
      { token: "keyword", foreground: accent.slice(1) },
      { token: "string", foreground: muted.slice(1) },
      { token: "comment", foreground: muted.slice(1), fontStyle: "italic" },
      { token: "type", foreground: accent.slice(1) },
      { token: "number", foreground: accent.slice(1) },
      { token: "delimiter", foreground: muted.slice(1) },
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editor.lineHighlightBackground": lineHighlight,
      "editor.selectionBackground": selectionBg,
      "editorCursor.foreground": accent,
      "editorLineNumber.foreground": muted,
      "editorLineNumber.activeForeground": fg,
      "editor.selectionHighlightBackground": selectionBg,
      "editor.inactiveSelectionBackground": selectionBg,
      "editorWidget.background": bgPanel,
      "editorWidget.border": border,
      "input.background": bgPanel,
      "input.foreground": fg,
      "input.border": border,
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": border,
      "scrollbarSlider.hoverBackground": muted,
    },
  });
}

/**
 * Returns the theme name for the current color scheme.
 */
export function getMonacoTheme(isDark: boolean): string {
  return isDark ? "gdt-dark" : "gdt-light";
}
```

- [ ] **Step 2: Add Monaco CSS variable overrides to `src/index.css`**

Append to end of `src/index.css`:

```css
/* ----------------------------------------------------------
   Monaco Editor theme integration
   ---------------------------------------------------------- */

/* Monaco gutter — match our panel background */
.monaco-editor .margin {
  background: var(--bg-root) !important;
}

/* Monaco minimap (disabled by default, but safe) */
.monaco-editor .minimap {
  opacity: 0.4;
}

/* Monaco find widget — match our surface */
.monaco-editor .find-widget {
  background: var(--bg-panel) !important;
  border-color: var(--border-subtle) !important;
}

/* Monaco suggest widget */
.monaco-editor .suggest-widget {
  background: var(--bg-panel) !important;
  border-color: var(--border-medium) !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/monaco-theme.ts src/index.css
git commit -m "feat: add Monaco Editor dark/light theme definitions"
```

---

### Task 3: Rewrite `useMarkdownEditor.ts`

**Files:**
- Modify: `src/hooks/useMarkdownEditor.ts` (full rewrite)

**Interfaces:**
- Consumes: `FolderFile`, `storageGetFolder`, `storageUpdateFolder` (unchanged)
- Produces:
  ```typescript
  interface UseMarkdownEditorReturn {
    source: string;
    setSource: (value: string) => void;
    handleForceSave: () => Promise<void>;
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  }
  ```

- [ ] **Step 1: Write the full replacement for `useMarkdownEditor.ts`**

```typescript
import { useEffect, useRef, useCallback, useState } from "react";
import type * as Monaco from "monaco-editor";
import { storageGetFolder, storageUpdateFolder } from "../storage";
import type { FolderFile } from "../types";

/**
 * useMarkdownEditor — raw markdown source editing with auto-save.
 *
 * Manages source text state and exposes a ref to the Monaco editor instance
 * so the toolbar can call executeEdits() for syntax insertion.
 */
export function useMarkdownEditor(
  currentFile: FolderFile | null,
  folderId: number | null,
  saveStatus: "saved" | "saving" | "unsaved",
  setSaveStatus: (status: "saved" | "saving" | "unsaved") => void,
) {
  const [source, setSource] = useState("");
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const fileCache = useRef<Record<string, string>>({});
  const lastSaved = useRef("");

  // Load content when file changes
  useEffect(() => {
    if (!currentFile || currentFile.type !== "md") return;
    const cached = fileCache.current[currentFile.id];
    if (cached !== undefined) {
      setSource(cached);
      lastSaved.current = cached;
      return;
    }
    const content = currentFile.content;
    let text = "";
    if (typeof content === "string") {
      text = content;
    } else if (content && typeof content === "object") {
      // Legacy TipTap JSON — extract text content as plain markdown
      text = extractTextFromJson(content);
    }
    fileCache.current[currentFile.id] = text;
    setSource(text);
    lastSaved.current = text;
  }, [currentFile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save
  useEffect(() => {
    if (!currentFile || currentFile.type !== "md" || !folderId) return;
    const fileId = currentFile.id;
    clearTimeout(saveTimer.current);
    if (source === lastSaved.current) return;
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      const text = source;
      fileCache.current[fileId] = text;
      lastSaved.current = text;
      setSaveStatus("saving");
      try {
        const f = await storageGetFolder(folderId);
        if (!f) return;
        const files = f.files.map((file) =>
          file.id === fileId
            ? { ...file, content: text, updatedAt: Date.now() }
            : file,
        );
        await storageUpdateFolder(folderId, { files, updatedAt: Date.now() });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 1500);
    return () => {
      clearTimeout(saveTimer.current);
    };
  }, [source, currentFile?.id, folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleForceSave = useCallback(async () => {
    if (!currentFile || currentFile.type !== "md" || !folderId) return;
    const text = source;
    const fileId = currentFile.id;
    fileCache.current[fileId] = text;
    lastSaved.current = text;
    setSaveStatus("saving");
    try {
      const f = await storageGetFolder(folderId);
      if (!f) return;
      const files = f.files.map((file) =>
        file.id === fileId
          ? { ...file, content: text, updatedAt: Date.now() }
          : file,
      );
      await storageUpdateFolder(folderId, { files, updatedAt: Date.now() });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [source, currentFile, folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { source, setSource, handleForceSave, editorRef };
}

/**
 * Convert legacy TipTap JSON to plain markdown text.
 * Preserves structure as markdown syntax so existing documents remain readable.
 */
function extractTextFromJson(json: Record<string, unknown>): string {
  if (!json || !json.content) return "";
  const content = json.content as Array<Record<string, unknown>>;
  return content.map(renderNode).join("\n");
}

function renderNode(node: Record<string, unknown>): string {
  if (!node) return "";
  const type = node.type as string;
  const content = node.content as Array<Record<string, unknown>> | undefined;

  switch (type) {
    case "doc":
      return content?.map(renderNode).join("\n") ?? "";
    case "paragraph": {
      const text = content?.map(renderInline).join("") ?? "";
      return text;
    }
    case "heading": {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 1;
      const text = content?.map(renderInline).join("") ?? "";
      return "#".repeat(level) + " " + text;
    }
    case "bulletList":
      return content?.map((item) => renderNode(item)).join("\n") ?? "";
    case "orderedList":
      return content?.map((item, i) => renderNode(item).replace(/^- /, `${i + 1}. `)).join("\n") ?? "";
    case "listItem":
      return "- " + (content?.map(renderInline).join("") ?? "");
    case "blockquote": {
      const text = content?.map(renderInline).join("") ?? "";
      return text.split("\n").map((line) => "> " + line).join("\n");
    }
    case "codeBlock": {
      const text = content?.map((c) => (c.type === "text" ? (c.text as string) : "")).join("") ?? "";
      return "```\n" + text + "\n```";
    }
    case "bold":
    case "strong":
      return "**" + (content?.map(renderInline).join("") ?? "") + "**";
    case "italic":
    case "em":
      return "*" + (content?.map(renderInline).join("") ?? "") + "*";
    case "text":
      return (node.text as string) ?? "";
    case "hardBreak":
      return "\n";
    default:
      return content?.map(renderNode).join("") ?? "";
  }
}

function renderInline(node: Record<string, unknown>): string {
  if (!node) return "";
  const type = node.type as string;

  if (type === "text") return (node.text as string) ?? "";
  if (type === "bold" || type === "strong") {
    const text = ((node.content as Array<Record<string, unknown>>) ?? []).map(renderInline).join("");
    return "**" + text + "**";
  }
  if (type === "italic" || type === "em") {
    const text = ((node.content as Array<Record<string, unknown>>) ?? []).map(renderInline).join("");
    return "*" + text + "*";
  }
  if (type === "hardBreak") return "\n";
  return "";
}
```

- [ ] **Step 2: Verify no TipTap imports remain**

```bash
grep -r "tiptap" src/hooks/useMarkdownEditor.ts
```
Expected: NO matches.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMarkdownEditor.ts
git commit -m "refactor: rewrite useMarkdownEditor — remove TipTap, add editorRef, legacy JSON→markdown converter"
```

---

### Task 4: Rewrite `EditorToolbar.tsx`

**Files:**
- Modify: `src/components/EditorToolbar.tsx` (full rewrite)

**Interfaces:**
- Consumes: `React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>` (editorRef from useMarkdownEditor)
- Produces: Toolbar UI with markdown insertion buttons

- [ ] **Step 1: Write the full replacement for `EditorToolbar.tsx`**

```typescript
import type * as Monaco from "monaco-editor";

interface EditorToolbarProps {
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="tool-btn"
      style={{ color: "var(--text-tertiary)", background: "transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-tertiary)";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="divider" />;
}

/**
 * EditorToolbar — markdown syntax insertion toolbar.
 *
 * Each button manipulates the Monaco editor via executeEdits().
 * The editor maintains its own undo stack; toolbar is a pure command sender.
 */
function EditorToolbar({ editorRef, isPreviewMode, onTogglePreview }: EditorToolbarProps) {
  const getEditor = () => editorRef.current;
  const getSelection = () => {
    const ed = getEditor();
    return ed?.getSelection() ?? null;
  };

  // Helper: wrap selected text or insert at cursor
  const wrapSelection = (prefix: string, suffix: string) => {
    const ed = getEditor();
    if (!ed) return;
    const sel = getSelection();
    if (!sel || sel.isEmpty()) {
      // No selection — insert prefix+suffix and place cursor between them
      const pos = ed.getPosition();
      if (!pos) return;
      ed.executeEdits("toolbar", [
        {
          range: {
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
          },
          text: prefix + suffix,
        },
      ]);
      ed.setPosition({ lineNumber: pos.lineNumber, column: pos.column + prefix.length });
    } else {
      // Wrap selection
      const selectedText = ed.getModel()?.getValueInRange(sel) ?? "";
      ed.executeEdits("toolbar", [
        { range: sel, text: prefix + selectedText + suffix },
      ]);
    }
    ed.focus();
  };

  // Helper: insert at line start
  const prefixLine = (prefix: string) => {
    const ed = getEditor();
    if (!ed) return;
    const sel = getSelection();
    if (!sel) return;
    const lineStart = sel.startLineNumber;
    ed.executeEdits("toolbar", [
      {
        range: {
          startLineNumber: lineStart,
          startColumn: 1,
          endLineNumber: lineStart,
          endColumn: 1,
        },
        text: prefix,
      },
    ]);
    ed.focus();
  };

  const handleUndo = () => getEditor()?.trigger("keyboard", "undo", null);
  const handleRedo = () => getEditor()?.trigger("keyboard", "redo", null);
  const handleBold = () => wrapSelection("**", "**");
  const handleItalic = () => wrapSelection("*", "*");
  const handleH1 = () => prefixLine("# ");
  const handleH2 = () => prefixLine("## ");
  const handleH3 = () => prefixLine("### ");
  const handleUl = () => prefixLine("- ");
  const handleOl = () => prefixLine("1. ");
  const handleQuote = () => prefixLine("> ");

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 flex-shrink-0"
      style={{
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <ToolbarButton onClick={handleUndo} title="撤销 (Ctrl+Z)">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={handleRedo} title="重做 (Ctrl+Y)">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleH1} title="标题 1">
        <span className="font-bold text-[13px]">H1</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleH2} title="标题 2">
        <span className="font-semibold text-[12px]">H2</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleH3} title="标题 3">
        <span className="font-semibold text-[11px]">H3</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleBold} title="加粗 (Ctrl+B)">
        <span className="font-bold text-[13px]">B</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleItalic} title="斜体 (Ctrl+I)">
        <span className="italic text-[13px]">I</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleUl} title="无序列表">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="6" cy="18" r="1.5" />
          <rect x="10" y="5" width="10" height="2" rx="0.5" />
          <rect x="10" y="11" width="10" height="2" rx="0.5" />
          <rect x="10" y="17" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={handleOl} title="有序列表">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="9" fontSize="8" fontWeight="bold">1</text>
          <rect x="10" y="5" width="10" height="2" rx="0.5" />
          <text x="2" y="17" fontSize="8" fontWeight="bold">2</text>
          <rect x="10" y="13" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleQuote} title="引用">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
        </svg>
      </ToolbarButton>

      {/* Spacer + Preview toggle */}
      <div className="flex-1" />
      <Divider />
      <ToolbarButton onClick={onTogglePreview} title="切换预览">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="ml-1 text-[11px]">预览</span>
      </ToolbarButton>
    </div>
  );
}

export default EditorToolbar;
```

- [ ] **Step 2: Verify no TipTap imports remain**

```bash
grep -r "tiptap" src/components/EditorToolbar.tsx
```
Expected: NO matches.

- [ ] **Step 3: Commit**

```bash
git add src/components/EditorToolbar.tsx
git commit -m "refactor: rewrite EditorToolbar — Monaco executeEdits API, remove TipTap"
```

---

### Task 5: Create `MarkdownEditor.tsx`

**Files:**
- Create: `src/components/MarkdownEditor.tsx`
- Modify: `src/index.css` (add Markdown preview typography styles)

**Interfaces:**
- Consumes:
  ```typescript
  interface MarkdownEditorProps {
    source: string;
    onSourceChange: (value: string) => void;
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  }
  ```
- Produces: Self-contained component with Monaco editor + optional preview split view

- [ ] **Step 1: Write `src/components/MarkdownEditor.tsx`**

```typescript
import { useState, useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { marked } from "marked";
import { applyMonacoTheme, getMonacoTheme } from "../monaco-theme";
import EditorToolbar from "./EditorToolbar";

interface MarkdownEditorProps {
  source: string;
  onSourceChange: (value: string) => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
}

const SPLIT_RATIO_KEY = "gdt_md_split_ratio";
const DEFAULT_SPLIT = 0.5;
const MIN_SPLIT = 0.2;
const MAX_SPLIT = 0.8;

/**
 * MarkdownEditor — Monaco editor + optional split-view HTML preview.
 *
 * Manages preview toggle, draggable splitter, and scroll sync between
 * Monaco (source) and the rendered HTML preview panel.
 */
function MarkdownEditor({ source, onSourceChange, editorRef }: MarkdownEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(SPLIT_RATIO_KEY);
      return saved ? parseFloat(saved) : DEFAULT_SPLIT;
    } catch {
      return DEFAULT_SPLIT;
    }
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const monacoRef = useRef<typeof Monaco | null>(null);

  // Persist split ratio
  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_RATIO_KEY, String(splitRatio));
    } catch { /* localStorage unavailable */ }
  }, [splitRatio]);

  // Detect dark/light mode
  const isDark = !document.documentElement.classList.contains("light");

  // Theme initializer — run once before first editor mount
  const handleBeforeMount = useCallback(
    (monaco: typeof Monaco) => {
      monacoRef.current = monaco;
      applyMonacoTheme(monaco, isDark);
      // Re-apply when theme class changes
      const observer = new MutationObserver(() => {
        const dark = !document.documentElement.classList.contains("light");
        applyMonacoTheme(monaco, dark);
        monaco.editor.setTheme(getMonacoTheme(dark));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    },
    [isDark],
  );

  // Editor mount callback — store instance in ref
  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
    },
    [editorRef],
  );

  // Toggle preview
  const handleTogglePreview = useCallback(() => {
    setIsPreviewMode((prev) => !prev);
  }, []);

  // Scroll sync: Monaco → Preview
  const handleEditorScroll = useCallback(() => {
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    const st = ed.getScrollTop();
    const maxScroll = ed.getScrollHeight() - 300;
    const ratio = maxScroll > 0 ? st / maxScroll : 0;
    pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
  }, [editorRef]);

  // Scroll sync: Preview → Monaco
  const handlePreviewScroll = useCallback(() => {
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    const st = pv.scrollTop;
    const maxScroll = pv.scrollHeight - pv.clientHeight;
    const ratio = maxScroll > 0 ? st / maxScroll : 0;
    ed.setScrollTop(ratio * (ed.getScrollHeight() - 300));
  }, [editorRef]);

  // Splitter drag handlers
  const handleSplitterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const x = ev.clientX - rect.left;
        const ratio = x / rect.width;
        setSplitRatio(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio)));
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        editorRef.current?.layout();
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [editorRef],
  );

  // Set marked options once
  useEffect(() => {
    marked.setOptions({ breaks: true });
  }, []);

  const previewHtml = marked.parse(source) as string;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
      <EditorToolbar
        editorRef={editorRef}
        isPreviewMode={isPreviewMode}
        onTogglePreview={handleTogglePreview}
      />

      <div ref={containerRef} className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {/* Monaco Editor panel */}
        <div
          className="overflow-hidden"
          style={{
            flex: isPreviewMode ? undefined : 1,
            width: isPreviewMode ? `${splitRatio * 100}%` : "100%",
            minWidth: isPreviewMode ? "120px" : undefined,
          }}
        >
          <Editor
            height="100%"
            language="markdown"
            theme={getMonacoTheme(isDark)}
            value={source}
            onChange={(value) => onSourceChange(value ?? "")}
            onMount={handleEditorMount}
            beforeMount={handleBeforeMount}
            onScroll={isPreviewMode ? handleEditorScroll : undefined}
            options={{
              fontSize: 13,
              fontFamily:
                "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
              lineHeight: 22,
              padding: { top: 8, bottom: 8 },
              minimap: { enabled: false },
              lineNumbers: "on",
              renderLineHighlight: "line",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              tabSize: 2,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>

        {/* Preview panel */}
        {isPreviewMode && (
          <>
            {/* Draggable splitter */}
            <div
              className="flex-shrink-0 cursor-col-resize relative group"
              style={{
                width: 4,
                background: "var(--border-subtle)",
                transition: "background 0.15s",
              }}
              onMouseDown={handleSplitterMouseDown}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                if (!isDragging.current) {
                  e.currentTarget.style.background = "var(--border-subtle)";
                }
              }}
            />

            {/* HTML Preview */}
            <div
              ref={previewRef}
              className="overflow-y-auto"
              onScroll={handlePreviewScroll}
              style={{
                flex: 1,
                minWidth: "120px",
                background: "var(--bg-root)",
              }}
            >
              <div
                className="markdown-preview"
                style={{
                  padding: "1.5rem 2rem",
                  maxWidth: 800,
                  lineHeight: "22px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MarkdownEditor;
```

- [ ] **Step 2: Add markdown preview typography styles to `src/index.css`**

Append to end of `src/index.css`:

```css
/* ----------------------------------------------------------
   Markdown Preview Typography
   ---------------------------------------------------------- */

.markdown-preview h1 {
  font-size: 1.75em;
  font-weight: 700;
  margin: 0.75em 0 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.markdown-preview h2 {
  font-size: 1.4em;
  font-weight: 600;
  margin: 0.75em 0 0.4em;
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.markdown-preview h3 {
  font-size: 1.15em;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
  color: var(--text-primary);
}
.markdown-preview h4,
.markdown-preview h5,
.markdown-preview h6 {
  font-weight: 600;
  margin: 0.5em 0 0.25em;
  color: var(--text-primary);
}
.markdown-preview p {
  margin: 0.5em 0;
}
.markdown-preview ul,
.markdown-preview ol {
  padding-left: 1.5em;
  margin: 0.4em 0;
}
.markdown-preview li {
  margin: 0.15em 0;
}
.markdown-preview blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1em;
  margin: 0.5em 0;
  color: var(--text-secondary);
}
.markdown-preview code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  background: var(--bg-panel);
  padding: 0.15em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
}
.markdown-preview pre {
  background: var(--bg-panel);
  padding: 1em;
  border-radius: var(--radius);
  overflow-x: auto;
  margin: 0.5em 0;
}
.markdown-preview pre code {
  background: transparent;
  padding: 0;
}
.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}
.markdown-preview th,
.markdown-preview td {
  border: 1px solid var(--border-subtle);
  padding: 6px 10px;
  text-align: left;
}
.markdown-preview th {
  background: var(--bg-panel);
  font-weight: 600;
}
.markdown-preview a {
  color: var(--accent-text);
  text-decoration: none;
}
.markdown-preview a:hover {
  text-decoration: underline;
}
.markdown-preview hr {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 1em 0;
}
.markdown-preview img {
  max-width: 100%;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MarkdownEditor.tsx src/index.css
git commit -m "feat: add MarkdownEditor component with Monaco + split preview"
```

---

### Task 6: Refactor `FolderWorkspace.tsx`

**Files:**
- Modify: `src/pages/FolderWorkspace.tsx`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
```

Add:
```typescript
import MarkdownEditor from "../components/MarkdownEditor";
```

- [ ] **Step 2: Update useMarkdownEditor call (~line 86)**

Replace:
```typescript
const { source, setSource, handleForceSave } = useMarkdownEditor(currentFile, folderId, handleFileLinkClick, saveStatus, setSaveStatus);
```

With:
```typescript
const { source, setSource, handleForceSave, editorRef } = useMarkdownEditor(currentFile, folderId, saveStatus, setSaveStatus);
```

- [ ] **Step 3: Remove old markdown editor state and scroll logic**

Delete these declarations (currently lines ~56–65 and ~90–123):
- `isPreviewMode` state
- `editorScrollRef`, `previewScrollRef`, `editorGutterRef`, `previewGutterRef` refs
- `syncing` ref
- `lineCount`, `LINE_H` constants
- `onEditorScroll`, `onPreviewScroll` functions

- [ ] **Step 4: Remove `handleFileLinkClick` callback (~line 81)**

Delete:
```typescript
const handleFileLinkClick = useCallback((fileId: string) => {
  if (folder?.files.some((f) => f.id === fileId)) handleSelectTab(fileId);
}, [folder, handleSelectTab]);
```

- [ ] **Step 5: Simplify `handleTabClick` (~line 132)**

Replace:
```typescript
const handleTabClick = (fileId: string) => { setCurrentFileId(fileId); setIsPreviewMode(false); };
```

With:
```typescript
const handleTabClick = (fileId: string) => { setCurrentFileId(fileId); };
```

- [ ] **Step 6: Replace the markdown editing block (~lines 536–611)**

Replace the entire `{currentFile.type === "md" ? (` block through its closing tag (before the `) : (` for Excel) with:

```typescript
{currentFile.type === "md" ? (
  <MarkdownEditor
    source={source}
    onSourceChange={setSource}
    editorRef={editorRef}
  />
) : (
```

- [ ] **Step 7: Remove `marked.setOptions` call (~line 129)**

Delete:
```typescript
marked.setOptions({ breaks: true });
```
(This is now called inside MarkdownEditor.tsx)

- [ ] **Step 8: Remove unused `marked` import**

If `marked` is no longer used directly in FolderWorkspace, update:
```typescript
import { marked } from "marked";
```
→ Remove this line.

- [ ] **Step 9: Commit**

```bash
git add src/pages/FolderWorkspace.tsx
git commit -m "refactor: integrate MarkdownEditor into FolderWorkspace, remove legacy textarea"
```

---

### Task 7: Build Verification & Cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No type errors. Fix any that appear.

- [ ] **Step 2: Run Vite build**

```bash
npm run build
```
Expected: Build succeeds, no warnings.

- [ ] **Step 3: Verify no TipTap residuals**

```bash
grep -r "tiptap" src/ --include="*.ts" --include="*.tsx"
grep -r "tiptap" package.json
```
Expected: No matches in either.

- [ ] **Step 4: Verify no Handsontable style breakage**

```bash
grep -n "\.handsontable\|\.ht_master\|\.ht_clone\|\.htCore" src/index.css
```
Expected: Only existing Handsontable styles. No new `!important` rules that could conflict.

- [ ] **Step 5: Start dev server and manually verify**

```bash
npm run dev
```
Open browser, verify:
1. Open a markdown file → Monaco editor rendered with line numbers and syntax highlighting
2. Click Preview button → split view appears with HTML preview
3. Scroll editor → preview scrolls in sync
4. Scroll preview → editor scrolls in sync
5. Drag splitter → ratio adjusts, persists on reload
6. Ctrl+S → save status badge updates
7. Switch to Excel file → Handsontable still works
8. Toggle light mode → Monaco + preview theme update

- [ ] **Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore: build verification and final cleanup"
```

---

### Task 8: Electron Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run Electron build**

```bash
npm run electron:build
```
Expected: Build succeeds, produces portable executable.

- [ ] **Step 2: Commit if any electron config changes were needed**

```bash
git add -A
git commit -m "chore: electron build compatibility fixes"
```
