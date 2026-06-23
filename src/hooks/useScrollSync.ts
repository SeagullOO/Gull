/**
 * useScrollSync.ts — Monaco 编辑器与 HTML 预览之间的双向滚动同步
 *
 * 在预览模式下，编辑器和预览面板的滚动位置保持同步。
 *
 * 算法原理：
 * - 使用滚动比例（scrollTop / maxScroll）作为同步基准，而非绝对像素值
 * - 这确保编辑器（等宽字体）和预览（可变宽度内容）即使内容高度不同也能正确对应
 * - EDITOR_HEADER_HEIGHT 常量（300px）用于给编辑器顶部标题面板预留空间
 *
 * 防无限循环机制：
 * - scrollingFrom ref 标记当前滚动事件的发起源（"editor" 或 "preview"）
 * - 在同步滚动前检查：若正在由另一端驱动则跳过
 * - 使用 requestAnimationFrame 在下帧重置标记，避免同帧内的递归
 *
 * 导出：
 * - handlePreviewScroll:  挂载到预览面板 onScroll 的处理函数
 * - syncEditorToPreview:  建立编辑器 → 预览的滚动监听（预览模式切换时调用）
 */

import { useRef, useCallback, useEffect } from "react";
import type * as Monaco from "monaco-editor";

/** 编辑器顶部固定区域高度（标题 + 工具栏），计算 maxScroll 时扣除 */
const EDITOR_HEADER_HEIGHT = 300;

interface UseScrollSyncParams {
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  isPreviewMode: boolean;
}

/**
 * useScrollSync — 双向滚动同步
 *
 * @param editorRef    Monaco 编辑器实例 ref
 * @param previewRef   预览面板 DOM ref
 * @param isPreviewMode 是否在预览模式（仅预览模式下启用同步）
 */
export function useScrollSync({
  editorRef,
  previewRef,
  isPreviewMode,
}: UseScrollSyncParams) {
  /** Monaco 滚动事件监听器的 disposable */
  const editorScrollListener = useRef<Monaco.IDisposable | null>(null);
  /** 滚动事件发起源标记：防止双向同步形成无限循环 */
  const scrollingFrom = useRef<"editor" | "preview" | null>(null);

  /**
   * 建立编辑器 → 预览的滚动同步
   *
   * 监听 Monaco 编辑器的 onDidScrollChange 事件，
   * 将滚动比例映射到预览面板。
   */
  const syncEditorToPreview = useCallback(() => {
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv || !isPreviewMode) return;

    editorScrollListener.current?.dispose();
    editorScrollListener.current = ed.onDidScrollChange(() => {
      // 若滚动由预览端发起则跳过，防止循环
      if (scrollingFrom.current === "preview") return;
      scrollingFrom.current = "editor";
      const st = ed.getScrollTop();
      // 扣除顶部固定区域高度
      const maxScroll = ed.getScrollHeight() - EDITOR_HEADER_HEIGHT;
      const ratio = maxScroll > 0 ? st / maxScroll : 0;
      pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
      // 在下一帧重置标记
      requestAnimationFrame(() => {
        scrollingFrom.current = null;
      });
    });
  }, [editorRef, previewRef, isPreviewMode]);

  /**
   * 预览 → 编辑器滚动处理
   *
   * 挂载到预览面板的 onScroll 事件。
   * 同样使用 ratio 映射 + 防循环标记。
   */
  const handlePreviewScroll = useCallback(() => {
    if (scrollingFrom.current === "editor") return;
    const ed = editorRef.current;
    const pv = previewRef.current;
    if (!ed || !pv) return;
    scrollingFrom.current = "preview";
    const st = pv.scrollTop;
    const maxScroll = pv.scrollHeight - pv.clientHeight;
    const ratio = maxScroll > 0 ? st / maxScroll : 0;
    ed.setScrollTop(ratio * (ed.getScrollHeight() - EDITOR_HEADER_HEIGHT));
    requestAnimationFrame(() => {
      scrollingFrom.current = null;
    });
  }, [editorRef, previewRef]);

  /**
   * 预览模式切换时重新建立/清除滚动监听
   *
   * - 进入预览模式：注册编辑器滚动监听
   * - 退出预览模式：dispose 监听
   * - 组件卸载：dispose 监听
   */
  useEffect(() => {
    if (!editorRef.current) return;
    if (isPreviewMode) {
      syncEditorToPreview();
    } else {
      editorScrollListener.current?.dispose();
      editorScrollListener.current = null;
    }
    return () => {
      editorScrollListener.current?.dispose();
      editorScrollListener.current = null;
    };
  }, [isPreviewMode, syncEditorToPreview, editorRef]);

  return { handlePreviewScroll, syncEditorToPreview };
}
