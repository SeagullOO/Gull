import { useEffect } from "react";

/**
 * useKeyboardShortcuts — 全局键盘快捷键处理
 *
 * 当前支持的快捷键：
 * - Ctrl+S / Cmd+S: 强制保存当前 Markdown 文件
 *
 * @param onSave 强制保存回调（由 useMarkdownEditor.handleForceSave 提供）
 * @param enabled 是否启用快捷键（有当前文件时启用）
 */
export function useKeyboardShortcuts(onSave: (() => void) | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !onSave) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave, enabled]);
}
