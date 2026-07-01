import { useEffect } from "react";
import { matchesKey, KEYBINDINGS } from "../config";

/**
 * useKeyboardShortcuts — 全局键盘快捷键处理
 *
 * @param onSave 强制保存回调（由 useMarkdownEditor.handleForceSave 提供）
 * @param enabled 是否启用快捷键（有当前文件时启用）
 */
export function useKeyboardShortcuts(onSave: (() => void | Promise<void>) | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !onSave) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchesKey(e, KEYBINDINGS.saveFile)) {
        e.preventDefault();
        void onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSave, enabled]);
}
