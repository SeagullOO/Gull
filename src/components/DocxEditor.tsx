/**
 * DocxEditor.tsx — Tiptap 富文本编辑器（.docx WYSIWYG）
 *
 * 读取：mammoth .docx 二进制 → HTML → Tiptap
 * 存储：Tiptap HTML → altChunk .docx 二进制 → 磁盘
 *
 * 分页：使用 tiptap-community-pages (PageBreak + Pagination + PageWrapper)
 * 工具栏：DocxToolbar 独立渲染在 WorkspaceHeader 中
 */

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import HardBreakExtension from "@tiptap/extension-hard-break";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import type { Editor } from "@tiptap/react";
import { PageBreak, Pagination } from "tiptap-community-pages";
import { PageWrapper } from "tiptap-community-pages/react";
import type { FolderFile } from "../types";
import { sanitizeDocxHtml } from "../utils/docxUtils";

/** HardBreak 变体：仅绑定 Shift+Enter，不占用 Mod-Enter（留给 PageBreak） */
const HardBreak = HardBreakExtension.extend({
  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => this.editor.commands.setHardBreak(),
    };
  },
});

interface DocxEditorProps {
  currentFile: FolderFile;
  editorRef: React.MutableRefObject<Editor | null>;
  onEditorReady?: (editor: Editor | null) => void;
}

/** Word 默认页边距 2.54cm → ~96px @96dpi */
const WORD_MARGINS = { top: 96, right: 96, bottom: 96, left: 96 };

interface DocxEditorProps {
  currentFile: FolderFile;
  editorRef: React.MutableRefObject<Editor | null>;
  onEditorReady?: (editor: Editor | null) => void;
  /** PageWrapper scale factor (1 = 100%). Maps from contentZoom/100. */
  scale?: number;
}
function DocxEditor({ currentFile, editorRef, onEditorReady, scale }: DocxEditorProps) {
  const lastNonEmptyContentRef = useRef<string>("");

  // Track margins in state so PageWrapper re-renders when setMargins command runs
  const [margins, setMargins] = useState(WORD_MARGINS);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        hardBreak: false, // 在 StarterKit 中禁用，下面注册定制版
      }),
      HardBreak,
      TextStyle.configure({
        mergeNestedSpanStyles: true,
      }),
      FontSize,
      Color,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      PageBreak,
      Pagination.configure({
        pageFormat: "A4",
        orientation: "portrait",
        margins: WORD_MARGINS,
        widowOrphanControl: true,
        pageGap: 24,
      }),
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        style: "outline:none;font-size:14px;line-height:1.7;",
      },
      handleDOMEvents: {
        dragstart: (_view, event) => { event.preventDefault(); return true; },
        drop: (_view, event) => { event.preventDefault(); return true; },
      },
    },
  });

  // 同步 editor 实例到 ref 和父组件
  useEffect(() => {
    if (editor) {
      editorRef.current = editor as Editor;
      onEditorReady?.(editor as Editor);
    }
    return () => {
      editorRef.current = null;
      onEditorReady?.(null);
    };
  }, [editor, editorRef, onEditorReady]);

  // 标记：初始加载时跳过自动保存，防止用空壳 DOCX 覆盖原文件
  const skipAutoSaveRef = useRef(false);

  // 加载文件内容 & 文件切换时统一处理
  // 有内容 → setContent；空内容/非字符串 → 清除编辑器
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const content = currentFile.content;
    console.log("[DOCX-DEBUG] DocxEditor content-load effect", { contentLen: typeof content === "string" ? content.length : "non-string", fileName: currentFile.name, isSameAsLast: content === lastNonEmptyContentRef.current });
    if (typeof content === "string" && content.length > 0) {
      if (content === lastNonEmptyContentRef.current) return;
      try {
        const clean = sanitizeDocxHtml(content);
        skipAutoSaveRef.current = true;
        editor.commands.setContent(clean);
        lastNonEmptyContentRef.current = content;
        setTimeout(() => { skipAutoSaveRef.current = false; }, 500);
      } catch {
        skipAutoSaveRef.current = true;
        editor.commands.setContent("<p></p>");
        lastNonEmptyContentRef.current = "";
        setTimeout(() => { skipAutoSaveRef.current = false; }, 500);
      }
    } else {
      // 空字符串或非字符串 → 重置为空文档
      if (content === lastNonEmptyContentRef.current) return;
      skipAutoSaveRef.current = true;
      editor.commands.setContent("<p></p>");
      lastNonEmptyContentRef.current = typeof content === "string" ? content : "";
      setTimeout(() => { skipAutoSaveRef.current = false; }, 500);
    }
  }, [editor, currentFile.content]);

  // 文件切换：仅重置 lastNonEmptyContentRef 和 skipAutoSaveRef，
  // 由 content-load effect（上面）统一处理内容设置，避免两个 effect
  // 同时调用 setContent 导致加载/清除竞争。
  useEffect(() => {
    lastNonEmptyContentRef.current = "";
    skipAutoSaveRef.current = true;
    setTimeout(() => { skipAutoSaveRef.current = false; }, 500);
  }, [currentFile.id]);

  // Listen to editor storage for margin changes → re-render PageWrapper
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const updateMargins = () => {
      const s = (editor.storage as any).pagination;
      if (s?.pageConfig?.margins) {
        const m = s.pageConfig.margins;
        setMargins({ top: m.top, right: m.right, bottom: m.bottom, left: m.left });
      }
    };
    // Emitted on every setMeta for paginationPluginKey
    editor.on("transaction", updateMargins);
    // Initial sync
    const id = setTimeout(updateMargins, 200);
    return () => {
      clearTimeout(id);
      editor.off("transaction", updateMargins);
    };
  }, [editor]);

  if (!editor) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-tertiary)" }}>加载编辑器中...</div>;
  }

  return (
    <PageWrapper
      format="A4"
      orientation="portrait"
      margins={margins}
      showShadow
      scale={scale ?? 1}
      containerBackground="var(--bg-root)"
    >
      <EditorContent editor={editor} />
    </PageWrapper>
  );
}

export default DocxEditor;
