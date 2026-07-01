/**
 * DocxToolbar.tsx — Word 文档格式工具栏
 *
 * 从 DocxEditor 中独立出来，继承 ToolbarContainer + ToolbarButton + ToolbarDivider。
 * 使用 Tiptap 3 的 useEditorState hook 同步按钮高亮状态（active class），
 * 所有样式由 .tool-btn / .tool-btn:hover / .tool-btn.active CSS 统一管理。
 *
 * 工具栏分组：
 *   1. 撤销/重做
 *   2. 格式：加粗/斜体/下划线/删除线/行内代码 + 字号
 *   3. 标题：H1/H2/H3 + 正文（清除格式）
 *   4. 列表：无序/有序
 *   5. 对齐：左/中/右/两端
 *   6. 块级：引用/分隔线/分页符
 *   7. 插入：链接/表格
 *   8. 字体颜色
 */

import { useState, useEffect, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { t as i18nT, getLang } from "../i18n";
import { ToolbarContainer, ToolbarButton, ToolbarDivider } from "./Toolbar";
import DropPanel from "./DropPanel";
import ColorPickerPanel from "./ColorPickerPanel";
import { getDefaultFontColor, pushRecentColor } from "./ColorPickerPanel";
import CustomColorPicker from "./CustomColorPicker";

interface DocxToolbarProps {
  editor: Editor | null;
}

interface ActiveStates {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
  link: boolean;
}

const EMPTY_STATES: ActiveStates = {
  bold: false, italic: false, underline: false, strike: false, code: false,
  h1: false, h2: false, h3: false,
  bulletList: false, orderedList: false, blockquote: false,
  alignLeft: false, alignCenter: false, alignRight: false, alignJustify: false,
  link: false,
};

function DocxToolbar({ editor }: DocxToolbarProps) {
  const lang = getLang();

  // ── Color state ───────────────────────────────────────────────────────
  const [fontColorOpen, setFontColorOpen] = useState(false);
  const [currentFontColor, setCurrentFontColor] = useState(getDefaultFontColor);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [customInitialHex, setCustomInitialHex] = useState("#3370FF");
  const fontColorBtnRef = useRef<HTMLButtonElement>(null);
  const fontColorPanelRef = useRef<HTMLDivElement>(null);
  const [recentColors, setRecentColors] = useState<string[]>([
    "#3370FF", "#F54A45", "#34C724", "#FAD355", "#7F3BF5", "#00D6B9", "#4E83FD",
  ]);

  // Close on outside click
  useEffect(() => {
    if (!fontColorOpen && !customPanelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-color-panel]")) return;
      setFontColorOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [fontColorOpen, customPanelOpen]);

  // Sync default font color on theme switch
  const fontIsDefaultRef = useRef(true);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (fontIsDefaultRef.current) {
        setCurrentFontColor(getDefaultFontColor());
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Pick current color from editor state (read textStyle color attribute)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const updateColor = () => {
      const attrs = editor.getAttributes("textStyle");
      const c = attrs.color;
      if (c) {
        setCurrentFontColor(c);
        fontIsDefaultRef.current = false;
      } else {
        setCurrentFontColor(getDefaultFontColor());
        fontIsDefaultRef.current = true;
      }
    };
    editor.on("selectionUpdate", updateColor);
    editor.on("transaction", updateColor);
    return () => {
      editor.off("selectionUpdate", updateColor);
      editor.off("transaction", updateColor);
    };
  }, [editor]);

  const handleFontColor = (color: string) => {
    setFontColorOpen(false);
    setCurrentFontColor(color);
    fontIsDefaultRef.current = false;
    setRecentColors((prev) => pushRecentColor(prev, color));
    editor?.chain().focus().setColor(color).run();
  };

  const handleClearFontColor = () => {
    setFontColorOpen(false);
    setCurrentFontColor(getDefaultFontColor());
    fontIsDefaultRef.current = true;
    editor?.chain().focus().unsetColor().run();
  };

  const handleOpenCustom = () => {
    if (!fontColorPanelRef.current) return;
    setCustomInitialHex(
      currentFontColor && currentFontColor !== "transparent" ? currentFontColor : "#3370FF",
    );
    setCustomPanelOpen(true);
  };

  const applyCustomColor = (hex: string) => {
    setFontColorOpen(false);
    setCurrentFontColor(hex);
    fontIsDefaultRef.current = false;
    setRecentColors((prev) => pushRecentColor(prev, hex));
    editor?.chain().focus().setColor(hex).run();
    setCustomPanelOpen(false);
  };

  // ── Font size state ────────────────────────────────────────────────────
  const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState<string>("");
  const fontSizeBtnRef = useRef<HTMLButtonElement>(null);

  // Outside click → close dropdowns (shared with color panel)
  useEffect(() => {
    if (!fontSizeOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-color-panel]")) return;
      setFontSizeOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [fontSizeOpen]);

  // Read current fontSize from textStyle mark
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const updateFontSize = () => {
      const attrs = editor.getAttributes("textStyle");
      setCurrentFontSize(attrs.fontSize ?? "");
    };
    editor.on("selectionUpdate", updateFontSize);
    editor.on("transaction", updateFontSize);
    return () => {
      editor.off("selectionUpdate", updateFontSize);
      editor.off("transaction", updateFontSize);
    };
  }, [editor]);

  const handleFontSize = (size: string) => {
    setFontSizeOpen(false);
    if (!editor || editor.isDestroyed) return;
    if (size === "") {
      editor.chain().focus().unsetFontSize().run();
      setCurrentFontSize("");
    } else {
      editor.chain().focus().setFontSize(size + "px").run();
      setCurrentFontSize(size);
    }
  };

  // ── Page margins state ──────────────────────────────────────────────────
  const MARGINS_PRESETS = [
    { label: "marginsNormal", top: 96, right: 96, bottom: 96, left: 96 },
    { label: "marginsNarrow", top: 96, right: 144, bottom: 96, left: 144 },
    { label: "marginsWide", top: 48, right: 48, bottom: 48, left: 48 },
    // Custom → -1 sentinel
    { label: "marginsCustom", top: -1, right: -1, bottom: -1, left: -1 },
  ] as const;
  type MarginsPreset = (typeof MARGINS_PRESETS)[number];

  const [marginsOpen, setMarginsOpen] = useState(false);
  const [currentMarginsPreset, setCurrentMarginsPreset] = useState<string>("marginsNormal");
  const marginsBtnRef = useRef<HTMLButtonElement>(null);

  // Outside click → close margins dropdown
  useEffect(() => {
    if (!marginsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-color-panel]")) return;
      setMarginsOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [marginsOpen]);

  // Read margins from editor storage → determine preset label
  const detectMarginsPreset = (m: { top: number; right: number; bottom: number; left: number }): string => {
    const match = MARGINS_PRESETS.find(
      (p) => p.top === m.top && p.right === m.right && p.bottom === m.bottom && p.left === m.left,
    );
    return match ? match.label : "marginsCustom";
  };

  const handleMargins = (label: string) => {
    setMarginsOpen(false);
    if (!editor || editor.isDestroyed) return;
    if (label === "marginsCustom") {
      // TODO: custom margins dialog — for now, keep current margins
      setCurrentMarginsPreset("marginsCustom");
      return;
    }
    const preset = MARGINS_PRESETS.find((p) => p.label === label);
    if (!preset) return;
    editor.commands.setMargins({
      top: preset.top,
      right: preset.right,
      bottom: preset.bottom,
      left: preset.left,
    });
    setCurrentMarginsPreset(label);
  };

  // Sync preset label from editor storage on mount
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const updateMarginsLabel = () => {
      const s = editor.storage.pagination as any;
      const m = s?.pageConfig?.margins;
      if (m) {
        setCurrentMarginsPreset(detectMarginsPreset(m));
      }
    };
    // Poll initially — storage is available after editor init
    const id = setTimeout(updateMarginsLabel, 200);
    editor.on("transaction", updateMarginsLabel);
    return () => {
      clearTimeout(id);
      editor.off("transaction", updateMarginsLabel);
    };
  }, [editor]);

  const active = useEditorState({
    editor,
    selector: (ctx): ActiveStates => {
      if (!ctx.editor) return EMPTY_STATES;
      const e = ctx.editor;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        h1: e.isActive("heading", { level: 1 }),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        alignLeft: e.isActive({ textAlign: "left" }),
        alignCenter: e.isActive({ textAlign: "center" }),
        alignRight: e.isActive({ textAlign: "right" }),
        alignJustify: e.isActive({ textAlign: "justify" }),
        link: e.isActive("link"),
      };
    },
  });

  if (!editor || editor.isDestroyed) return null;

  const a = active ?? EMPTY_STATES;

  const preventFocusLoss = (e: React.MouseEvent) => { e.preventDefault(); };

  return (
    <ToolbarContainer>
      {/* ── 1. 撤销 / 重做 ── */}
      <ToolbarButton title="撤销 (Ctrl+Z)" onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().undo().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="重做 (Ctrl+Y)" onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().redo().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 2. 格式：加粗 / 斜体 / 下划线 / 删除线 / 行内代码 ── */}
      <ToolbarButton active={a.bold} title="加粗 (Ctrl+B)"
        style={{ minWidth: 30, fontWeight: 700, fontSize: 13, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton active={a.italic} title="斜体 (Ctrl+I)"
        style={{ minWidth: 30, fontStyle: "italic", fontSize: 13, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleItalic().run()}>I</ToolbarButton>
      <ToolbarButton active={a.underline} title="下划线 (Ctrl+U)"
        style={{ minWidth: 30, textDecoration: "underline", fontSize: 13, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>U</ToolbarButton>
      <ToolbarButton active={a.strike} title="删除线"
        style={{ minWidth: 30, textDecoration: "line-through", fontSize: 13, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleStrike().run()}>S</ToolbarButton>
      <ToolbarButton active={a.code} title="行内代码"
        style={{ minWidth: 34, fontFamily: "Consolas, monospace", fontSize: 12, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleCode().run()}>
        {"</>"}
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 字号下拉 ── */}
      <div>
        <ToolbarButton
          ref={fontSizeBtnRef}
          title={i18nT("fontSize", lang)}
          onMouseDown={preventFocusLoss}
          onClick={(e) => {
            e.stopPropagation();
            setFontColorOpen(false);
            setCustomPanelOpen(false);
            setFontSizeOpen((prev) => !prev);
          }}
        >
          <span style={{ fontSize: 11, minWidth: 28, textAlign: "center" }}>
            {currentFontSize || i18nT("fontSize", lang)}
          </span>
          <svg
            width="8" height="8" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </ToolbarButton>
        <DropPanel triggerRef={fontSizeBtnRef} open={fontSizeOpen}>
          <div style={{ minWidth: 56, maxHeight: 220, overflowY: "auto" }}>
            <div
              onClick={() => handleFontSize("")}
              className="color-opt"
              style={{
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              {i18nT("resetFontSize", lang)}
            </div>
            {FONT_SIZES.map((size) => (
              <div
                key={size}
                onClick={() => handleFontSize(String(size))}
                className="color-opt"
                style={{
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: currentFontSize === String(size) ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {size}px
              </div>
            ))}
          </div>
        </DropPanel>
      </div>

      <ToolbarDivider />

      {/* ── 3. 标题 H1-H3 + 正文 ── */}
      <ToolbarButton active={a.h1} title="标题 1"
        style={{ minWidth: 30, fontWeight: 700, fontSize: 12, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
      <ToolbarButton active={a.h2} title="标题 2"
        style={{ minWidth: 30, fontWeight: 600, fontSize: 12, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton active={a.h3} title="标题 3"
        style={{ minWidth: 30, fontWeight: 600, fontSize: 12, justifyContent: "center" }}
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <ToolbarButton title="正文"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setParagraph().run()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 4. 无序/有序列表 ── */}
      <ToolbarButton active={a.bulletList} title="无序列表"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="6" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="6" cy="18" r="2" />
          <line x1="12" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={a.orderedList} title="有序列表"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="6" x2="22" y2="6" />
          <line x1="12" y1="12" x2="22" y2="12" />
          <line x1="12" y1="18" x2="22" y2="18" />
          <text x="2" y="7" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">1</text>
          <text x="2" y="15" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">2</text>
          <text x="2" y="22" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">3</text>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 5. 文本对齐：左 / 中 / 右 / 两端 ── */}
      <ToolbarButton active={a.alignLeft} title="左对齐"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="10" x2="15" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" />
          <line x1="3" y1="18" x2="17" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={a.alignCenter} title="居中"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="10" x2="18" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" />
          <line x1="5" y1="18" x2="19" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={a.alignRight} title="右对齐"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="9" y1="10" x2="21" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" />
          <line x1="7" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={a.alignJustify} title="两端对齐"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="3" y1="14" x2="21" y2="14" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 6. 块级元素：引用 / 分隔线 / 分页符 ── */}
      <ToolbarButton active={a.blockquote} title="引用块"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="分隔线"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="12" x2="20" y2="12" />
          <polyline points="8 8 4 12 8 16" />
          <polyline points="16 8 20 12 16 16" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="分页符 (Ctrl+Enter)"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().setPageBreak().run()}
        style={{ fontSize: 11 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
          <line x1="18" y1="9" x2="18" y2="15" strokeWidth="2" />
          <polyline points="21,9 18,12 21,15" fill="none" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 页边距下拉 ── */}
      <div>
        <ToolbarButton
          ref={marginsBtnRef}
          title={i18nT("pageMargins", lang)}
          onMouseDown={preventFocusLoss}
          onClick={(e) => {
            e.stopPropagation();
            setFontColorOpen(false);
            setCustomPanelOpen(false);
            setMarginsOpen((prev) => !prev);
          }}
        >
          <span style={{ fontSize: 11, minWidth: 28, textAlign: "center" }}>
            {i18nT(currentMarginsPreset, lang)}
          </span>
          <svg
            width="8" height="8" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </ToolbarButton>
        <DropPanel triggerRef={marginsBtnRef} open={marginsOpen}>
          <div style={{ minWidth: 120, maxHeight: 200, overflowY: "auto" }}>
            {MARGINS_PRESETS.map((preset) => (
              <div
                key={preset.label}
                onClick={() => handleMargins(preset.label)}
                className="color-opt"
                style={{
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: currentMarginsPreset === preset.label ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{i18nT(preset.label, lang)}</span>
                {preset.top > 0 && (
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: 12 }}>
                    {preset.top}px
                  </span>
                )}
              </div>
            ))}
          </div>
        </DropPanel>
      </div>

      <ToolbarDivider />

      {/* ── 7. 插入：链接 / 表格 ── */}
      <ToolbarButton active={a.link} title="插入链接"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          const prev = editor.getAttributes("link").href || "";
          const url = window.prompt("链接地址", prev);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </ToolbarButton>
      <ToolbarButton title="插入表格 (3×3)"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* ── 8. 字体颜色 ── */}
      <div>
        <ToolbarButton
          ref={fontColorBtnRef}
          title={i18nT("fontColor", lang)}
          style={{ flexDirection: "column", gap: 0, padding: "3px 7px", minWidth: 26 }}
          onMouseDown={preventFocusLoss}
          onClick={(e) => {
            e.stopPropagation();
            setFontColorOpen((prev) => !prev);
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.1,
              color: currentFontColor,
            }}
          >
            A
          </span>
          <span
            style={{
              display: "block",
              width: 18,
              height: 3,
              borderRadius: 1,
              background: currentFontColor,
              marginTop: 2,
            }}
          />
        </ToolbarButton>
        <DropPanel triggerRef={fontColorBtnRef} open={fontColorOpen} panelRef={fontColorPanelRef}>
          <ColorPickerPanel
            currentColor={currentFontColor}
            recentColors={recentColors}
            onPick={handleFontColor}
            onClear={handleClearFontColor}
            onOpenCustom={handleOpenCustom}
            lang={lang}
          />
        </DropPanel>
      </div>

      {/* ── CustomColorPicker ── */}
      <CustomColorPicker
        open={customPanelOpen}
        initialHex={customInitialHex}
        panelRect={fontColorPanelRef.current?.getBoundingClientRect() ?? null}
        onApply={applyCustomColor}
        onClose={() => setCustomPanelOpen(false)}
        lang={lang}
      />
    </ToolbarContainer>
  );
}

export default DocxToolbar;
