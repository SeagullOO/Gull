/**
 * monaco-theme.ts — Monaco Editor 主题定义
 *
 * 为 Monaco 编辑器（Markdown 编辑组件）定义暗色/亮色自定义主题，
 * 颜色值从 CSS 变量（Obsidian 风格）和硬编码备选值中获取。
 *
 * 架构说明：
 * - 主题颜色尽量从 :root 的 CSS 变量读取，保证与应用整体主题一致
 * - Monaco 不支持 rgba() 颜色字符串，选中高亮等颜色需显式使用十六进制值
 * - 每个主题定义在首次渲染编辑器前调用一次（惰性初始化）
 *
 * 导出：
 * - applyMonacoTheme(monaco, isDark) — 在 Monaco 实例上注册主题
 * - getMonacoTheme(isDark) — 返回当前配色方案对应的主题名称
 */

import type * as Monaco from "monaco-editor";

/**
 * 在 Monaco 实例上注册 GDT 自定义主题
 *
 * 颜色来源优先级：
 * 1. document.documentElement 上的 CSS 变量（--bg-root, --text-primary 等）
 * 2. 硬编码备选值（CSS 变量不可用时）
 *
 * @param monaco Monaco 编辑器模块实例
 * @param isDark 是否为暗色模式
 */
export function applyMonacoTheme(
  monaco: typeof Monaco,
  isDark: boolean,
): void {
  // 从 :root 或 :root.light 读取当前 CSS 变量值
  const style = getComputedStyle(document.documentElement);

  const bg = style.getPropertyValue("--bg-root").trim() || (isDark ? "#1e1e1e" : "#ffffff");
  const bgPanel = style.getPropertyValue("--bg-panel").trim() || (isDark ? "#262626" : "#f5f5f5");
  const fg = style.getPropertyValue("--text-primary").trim() || (isDark ? "#dadada" : "#222222");
  const muted = style.getPropertyValue("--text-tertiary").trim() || (isDark ? "#666666" : "#7c7c7c");
  const border = style.getPropertyValue("--border-subtle").trim() || "rgba(255,255,255,0.08)";
  const accent = style.getPropertyValue("--accent").trim() || "#a882ff";

  // Monaco 无法解析 getComputedStyle 返回的 rgba() 字符串，
  // 因此选中高亮和行高亮颜色使用显式的十六进制值。
  const selectionBg = isDark ? "#3a3350" : "#e8e0f0";
  const lineHighlight = isDark ? "#2a2a2a" : "#f0f0f0";

  const themeName = isDark ? "gdt-dark" : "gdt-light";

  monaco.editor.defineTheme(themeName, {
    base: isDark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      // Markdown 语法高亮规则：
      // - 关键字和类型用强调色（accent）
      // - 标点、注释用弱化色（muted）
      // 注：foreground 需要去掉 CSS 变量值的 # 前缀（Monaco API 要求）
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
 * 返回当前配色方案对应的 Monaco 主题名称
 *
 * @param isDark 是否为暗色模式
 * @returns 主题名称（"gdt-dark" 或 "gdt-light"）
 */
export function getMonacoTheme(isDark: boolean): string {
  return isDark ? "gdt-dark" : "gdt-light";
}
