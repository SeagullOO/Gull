/**
 * useDocxEditor.ts — Tiptap 富文本编辑器 hook（.docx 可编辑）
 *
 * 管理 Tiptap editor 实例生命周期：
 *   init → edit → auto-save (1.5s debounce) → destroy
 *
 * 存储：Tiptap HTML → htmlToDocxBase64 → .docx 二进制 → 磁盘
 * （对标 useExcelEditor 的 dataToXlsxBase64 + storageWriteWorkspaceFileBinary 模式）
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { storageGetFolder, storageUpdateFolder, storageWriteWorkspaceFileBinary } from "../storage";
import { htmlToDocxBase64 } from "../utils/docxUtils";
import type { FolderFile } from "../types";

export function useDocxEditor(
  currentFile: FolderFile | null,
  folderId: number | null,
  folderName: string | null,
  onContentUpdate?: (fileId: string, html: string) => void,
) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedHtml = useRef("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editorReadyCount, setEditorReadyCount] = useState(0);

  /** DocxEditor 挂载完成后调用，确保 editorRef.current 已就绪 */
  const handleEditorReady = useCallback((_editor: Editor | null) => {
    setEditorReadyCount((c) => c + 1);
  }, []);

  // 用 ref 保持 currentFile 的最新引用，避免闭包过期
  const currentFileRef = useRef(currentFile);
  currentFileRef.current = currentFile;

  /** 核心保存逻辑：Electron → .docx 二进制写入磁盘；浏览器 → HTML 存入 IndexedDB */
  const performSave = useCallback(async (html: string, fileId: string, fileName: string) => {
    if (folderName && (window as any).electronAPI) {
      const docxBase64 = await htmlToDocxBase64(html);
      await storageWriteWorkspaceFileBinary(folderName, fileName, docxBase64);
    } else if (folderId) {
      const folder = await storageGetFolder(folderId);
      if (!folder) return;
      const files = folder.files.map((f) =>
        f.id === fileId ? { ...f, content: html, updatedAt: Date.now() } : f,
      );
      await storageUpdateFolder(folderId, { files, updatedAt: Date.now() });
    }
    onContentUpdate?.(fileId, html);
  }, [folderId, folderName, onContentUpdate]);

  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  /** 强制保存（立即执行） */
  const handleForceSave = useCallback(async () => {
    const editor = editorRef.current;
    const file = currentFileRef.current;
    if (!editor || editor.isDestroyed || !file || !folderId) return;
    const html = editor.getHTML();
    setSaveStatus("saving");
    try {
      await performSave(html, file.id, file.name);
      lastSavedHtml.current = html;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }, [folderId, performSave]);

  // 防抖自动保存（1.5s debounce）
  // editorReadyCount 依赖解决：父组件 effect 先于子组件渲染，editorRef 可能为 null，
  // DocxEditor mount 后调用 onEditorReady → editorReadyCount++ → 本 effect 重新注册。
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed || !currentFile || !folderId) return;

    // 捕获 effect 注册时的文件引用，cleanup 中 currentFileRef 可能已更新到新文件
    const capturedFile = currentFile;

    const onUpdate = () => {
      const html = editor.getHTML();
      if (html === lastSavedHtml.current) {
        clearTimeout(saveTimer.current);
        return;
      }
      setSaveStatus("unsaved");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!editor || editor.isDestroyed) return;
        setSaveStatus("saving");
        try {
          const latestHtml = editor.getHTML();
          await performSaveRef.current(latestHtml, capturedFile.id, capturedFile.name);
          lastSavedHtml.current = latestHtml;
          setSaveStatus("saved");
        } catch {
          setSaveStatus("unsaved");
        }
      }, 1500);
    };

    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      clearTimeout(saveTimer.current);
    };
  }, [currentFile?.id, folderId, performSave, editorReadyCount]);

  return { editorRef, saveStatus, handleForceSave, handleEditorReady };
}
