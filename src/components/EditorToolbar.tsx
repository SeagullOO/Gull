import type * as Monaco from "monaco-editor";
import { t, getLang } from "../i18n";

/**
 * EditorToolbar — Markdown 编辑器的格式工具栏
 *
 * 【角色】为 Monaco Editor 提供 Markdown 语法快速插入按钮。
 *         支持撤销/重做、标题（H1-H3）、加粗/斜体、无序/有序列表、引用、预览切换。
 *         每个按钮通过 Monaco 的 executeEdits() API 操作编辑器内容。
 *
 * 【视觉布局】flex 水平行（flex-wrap，gap: 0.5），px-3 py-1.5（约 36px 高度）。
 *           按钮间距通过 gap-0.5 + divider（1px 宽垂直分隔线）实现分组。
 *           - 左段：撤销 | 重做 | 分隔 | H1 H2 H3 | 分隔 | B I | 分隔 | 列表 有序 | 分隔 | 引用
 *           - 右段：flex-1 spacer | 分隔 | 预览切换按钮
 *           工具栏位于 FolderWorkspace zoom 容器外部，不受 Ctrl+滚轮缩放影响。
 *
 * 【交互链】
 *   - 每个按钮 → Monaco editor.executeEdits() / editor.trigger() / editor.focus()
 *   - onTogglePreview → 父组件 (FolderWorkspace) → 切换 isPreviewMode 状态
 *   - 编辑器 undo 栈由 Monaco 自身维护，工具栏不管理状态
 *
 * 【设计决策】
 *   - wrapSelection(prefix, suffix): 通用文本包裹函数
 *     * 无选区：插入 prefix+suffix 并将光标置于中间
 *     * 有选区：用 prefix + selectedText + suffix 包裹选区
 *   - prefixLine(prefix): 行首插入函数，在当前行开始插入指定前缀
 *   - 工具栏是纯命令发送者，不持有编辑器状态
 *   - 与 ExcelToolbar 视觉风格一致（tool-btn + divider 类）
 */

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
 * EditorToolbar — Markdown 格式插入工具栏
 *
 * 每个按钮通过 Monaco 的 executeEdits() API 操作编辑器。
 * 编辑器自己维护 undo 栈，工具栏是纯命令发送者。
 * preview 模式切换由父组件 FolderWorkspace 管理。
 */
function EditorToolbar({ editorRef, isPreviewMode, onTogglePreview }: EditorToolbarProps) {
  const lang = getLang();
  // 获取 Monaco editor 实例的便捷函数
  const getEditor = () => editorRef.current;
  const getSelection = () => {
    const ed = getEditor();
    return ed?.getSelection() ?? null;
  };

  // 通用文本包裹函数：有选区则包裹，无选区则在光标处插入并置光标于中间
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

  // 行首插入函数：在当前选区起始行首插入指定前缀（用于标题/列表/引用）
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
      <ToolbarButton onClick={handleUndo} title={t("undo", lang) + " (Ctrl+Z)"}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={handleRedo} title={t("redo", lang) + " (Ctrl+Y)"}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleH1} title={t("heading1", lang)}>
        <span className="font-bold text-[13px]">H1</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleH2} title={t("heading2", lang)}>
        <span className="font-semibold text-[12px]">H2</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleH3} title={t("heading3", lang)}>
        <span className="font-semibold text-[11px]">H3</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleBold} title={t("bold", lang) + " (Ctrl+B)"}>
        <span className="font-bold text-[13px]">B</span>
      </ToolbarButton>
      <ToolbarButton onClick={handleItalic} title={t("italic", lang) + " (Ctrl+I)"}>
        <span className="italic text-[13px]">I</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleUl} title={t("ulList", lang)}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="6" cy="18" r="1.5" />
          <rect x="10" y="5" width="10" height="2" rx="0.5" />
          <rect x="10" y="11" width="10" height="2" rx="0.5" />
          <rect x="10" y="17" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={handleOl} title={t("olList", lang)}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <text x="2" y="9" fontSize="8" fontWeight="bold">1</text>
          <rect x="10" y="5" width="10" height="2" rx="0.5" />
          <text x="2" y="17" fontSize="8" fontWeight="bold">2</text>
          <rect x="10" y="13" width="10" height="2" rx="0.5" />
        </svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleQuote} title={t("blockquote", lang)}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
        </svg>
      </ToolbarButton>

      {/* Spacer + Preview toggle */}
      <div className="flex-1" />
      <Divider />
      <ToolbarButton onClick={onTogglePreview} title={t("togglePreview", lang)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="ml-1 text-[11px]">{t("preview", lang)}</span>
      </ToolbarButton>
    </div>
  );
}

export default EditorToolbar;
