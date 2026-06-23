/**
 * FolderWorkspace.tsx — 工作区主页面（最核心的页面组件）
 *
 * 双模式设计：
 * 1. Home 模式（/）：展示文件夹列表，与 FolderList 功能等价
 * 2. Workspace 模式（/folder/:id）：三栏布局 — 活动栏 | 文件浏览器 | 编辑区
 *
 * 核心职责：
 * - 文件夹 CRUD（创建、重命名、删除、复制、从模版创建、从磁盘导入）
 * - 文件 CRUD（新建、重命名、删除、移动）
 * - 编辑区域切换（Markdown 编辑器 / Excel 表格编辑器）
 * - Tab 管理（通过 useFileTabs hook）
 * - 自定义上下文菜单
 * - 文件夹名称自动保存（2.5 秒防抖）
 *
 * 缩放系统：
 * - UI 缩放（zoom / setZoom）：控制侧边栏和工具栏的整体缩放，影响 ActivityBar + Sidebar/FileExplorer
 * - 内容缩放（contentZoom / setContentZoom）：仅影响编辑区域（Markdown 预览 / Excel 表格），
 *   独立于 UI 缩放，允许用户放大文档内容而不改变界面控件大小
 * - 两个缩放均通过 Ctrl+滚轮 在不同区域触发，并持久化到 localStorage
 *
 * 状态管理要点：
 * - 文件夹完整状态存储在 folder state 中，通过 reloadFolder() 从存储重新加载
 * - 文件名编辑使用 IME 组合状态（isComposing ref）防止中文输入过程中的误触发
 * - saveStatus 由 useMarkdownEditor 驱动，通过 StatusBadge 显示
 *
 * 已知：此文件约 660 行，新功能请提取到独立 hook 或组件中（CLAUDE.md 要求 < 200 行/组件）。
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { t, getLang } from "../i18n";

import ActivityBar from "../components/ActivityBar";
import FileExplorer from "../components/FileExplorer";
import Sidebar from "../components/Sidebar";
import TemplateModal from "../components/TemplateModal";
import ExcelToolbar from "../components/ExcelToolbar";
import EditorToolbar from "../components/EditorToolbar";
import ContextMenu from "../components/ContextMenu";
import FormulaBar from "../components/FormulaBar";
import {
  storageLoadFolders, storageGetFolder, storageUpdateFolder, storageSaveFolder, storageDeleteFolder, storageAddTemplate,
} from "../storage";
import { generateId } from "../types";
import type { Folder, FolderFile, Template } from "../types";
import { useExcelEditor } from "../hooks/useExcelEditor";
import { useMarkdownEditor } from "../hooks/useMarkdownEditor";
import MarkdownEditor from "../components/MarkdownEditor";
import StatusBadge from "../components/StatusBadge";
import { useFileTabs } from "../hooks/useFileTabs";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

/** 新建 Markdown 文件的默认内容（TipTap 文档结构） */
const defaultMdContent = { type: "doc", content: [{ type: "paragraph" }] };

/** 新建 Excel 文件的默认内容（26 列 x 100 行空表格） */
function makeDefaultExcelContent() {
  const cols = 26;
  const rows = 100;
  const colHeaders: string[] = [];
  for (let i = 0; i < cols; i++) colHeaders.push(String.fromCharCode(65 + i));
  const data = Array.from({ length: rows }, () => Array(cols).fill(""));
  return { data, colHeaders };
}
const defaultExcelContent = makeDefaultExcelContent();

// ─── 主组件 ─────────────────────────────────────────────────────────────────

function FolderWorkspace({ sidebarOpen = true, zoom = 110, contentZoom = 100, setZoom, setContentZoom }: { sidebarOpen?: boolean; zoom?: number; contentZoom?: number; setZoom?: React.Dispatch<React.SetStateAction<number>>; setContentZoom?: React.Dispatch<React.SetStateAction<number>> }) {
  const lang = getLang();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = id ? Number(id) : null;
  /** viewMode：有 folderId 时为 "workspace"，否则为 "home" */
  const viewMode = folderId ? "workspace" as const : "home" as const;

  // ─── Home mode state ────────────────────────────────────────────────────
  const [folders, setFolders] = useState<Folder[]>([]);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // ─── Workspace mode state ───────────────────────────────────────────────
  const [folder, setFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState(!!folderId);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const isComposing = useRef(false);
  const [searchActive, setSearchActive] = useState(false);
  const [newFileId, setNewFileId] = useState<string | null>(null);

  // ─── Custom context menu state ──────────────────────────────────────────
  const [ctxMenuVisible, setCtxMenuVisible] = useState(false);
  const [ctxMenuPos, setCtxMenuPos] = useState({ x: 0, y: 0 });
  const [ctxMenuSelection, setCtxMenuSelection] = useState<[number, number, number, number][] | null>(null);

  // ─── Folder menu ───────────────────────────────────────────────────────
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const folderMenuBtnRef = useRef<HTMLButtonElement>(null);
  const uiZoomRef = useRef<HTMLDivElement>(null);
  const wsZoomRef = useRef<HTMLDivElement>(null);
  const isElectron = typeof window !== "undefined" && "electronAPI" in window;

  // ─── File tabs ─────────────────────────────────────────────────────────
  const { openTabs, currentFileId, setCurrentFileId, handleSelectTab, handleCloseTab } = useFileTabs();
  const currentFile = folder?.files.find((f) => f.id === currentFileId) ?? null;

  // ─── 缩放滚轮监听（原生事件，按容器独立处理，非全局级）──────────
  // 设计原理：
  // - UI 缩放：监听 ActivityBar + Sidebar 区域的 Ctrl+滚轮
  // - 内容缩放：监听编辑区域的 Ctrl+滚轮
  // - 缩放值保存到 localStorage (gdt_settings)，跨会话持久化
  // - 使用 capture: true 确保在子元素之前拦截事件
  // - 依赖 currentFile?.id 确保切换文件时重新绑定（解决 TDZ 错误）
  useEffect(() => {
    const uiEl = uiZoomRef.current;
    const wsEl = wsZoomRef.current;

    const saveSetting = (key: string, val: number) => {
      try {
        const raw = localStorage.getItem("gdt_settings");
        const s = raw ? JSON.parse(raw) : {};
        s[key] = val;
        localStorage.setItem("gdt_settings", JSON.stringify(s));
      } catch {}
    };

    /** Ctrl+滚轮 → UI 缩放（步进 10%，范围 70%-150%） */
    const onUiWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom?.((prev) => {
        const next = Math.min(150, Math.max(70, prev + (e.deltaY > 0 ? -10 : 10)));
        saveSetting("zoom", next);
        (uiEl as any).style.zoom = next !== 110 ? String(next / 110) : "";
        return next;
      });
    };

    /** Ctrl+滚轮 → 内容缩放（步进 10%，范围 70%-150%） */
    const onWsWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setContentZoom?.((prev) => {
        const next = Math.min(150, Math.max(70, prev + (e.deltaY > 0 ? -10 : 10)));
        saveSetting("contentZoom", next);
        (window as any).__contentZoom = next;
        (wsEl as any).style.zoom = next !== 100 ? String(next / 100) : "";
        return next;
      });
    };

    uiEl?.addEventListener("wheel", onUiWheel, { passive: false, capture: true });
    wsEl?.addEventListener("wheel", onWsWheel, { passive: false, capture: true });
    return () => {
      uiEl?.removeEventListener("wheel", onUiWheel, { capture: true });
      wsEl?.removeEventListener("wheel", onWsWheel, { capture: true });
    };
    // currentFile?.id 作为依赖项：确保切换文件时重新绑定缩放监听器
  }, [setZoom, setContentZoom, currentFile?.id]);

  // ─── 编辑器 hooks ────────────────────────────────────────────────────
  // useMarkdownEditor: 管理 raw markdown 源文本、自动保存、强制保存
  // useExcelEditor:    管理 Handsontable 实例生命周期、编辑栏同步、撤销/重做
  // 两者通过 currentFile 判断是否激活（null 时不初始化编辑器）
  const { source, setSource, handleForceSave, editorRef } = useMarkdownEditor(currentFile, folderId, saveStatus, setSaveStatus);
  const { hotRef, hotInstance, hotKey, cellRef, formulaValue, setFormulaValue, isFormulaBarFocused, handleUndo, handleRedo } =
    useExcelEditor(currentFile, folderId, reloadFolder);

  // ─── 键盘快捷键 ──────────────────────────────────────────────────────
  // Ctrl+S / Cmd+S: 仅在 Markdown 文件激活时触发强制保存
  // Excel 使用 Handsontable 内置的 Ctrl+Z/Y 撤销/重做 + afterChange 自动保存
  const [isMdPreview, setIsMdPreview] = useState(false);
  const isMdFile = !!currentFile && currentFile.type === "md";
  useKeyboardShortcuts(isMdFile ? handleForceSave : null, isMdFile && !!folderId);
  // ─── Tab 点击：切换当前文件 ────────────────────────────────────────────
  const handleTabClick = (fileId: string) => { setCurrentFileId(fileId); };

  // ─── Home mode: load folders ────────────────────────────────────────────
  const loadFolders = useCallback(async () => { setFolders(await storageLoadFolders()); setHomeLoaded(true); }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  // ─── 工作区模式：加载文件夹 ──────────────────────────────────────────
  // 从存储获取完整文件夹数据，包括文件列表和子文件夹路径。
  // 成功加载后：
  // 1. 将当前工作区加入最近访问列表（localStorage: gdt_recent_workspaces，最多 10 个）
  // 2. 若 URL 中有 ?file=xxx 参数，则打开对应文件
  // 3. 否则打开第一个文件
  // eslint-disable-next-line react-hooks/exhaustive-deps：仅依赖 folderId 避免重复加载
  useEffect(() => {
    if (!folderId) { setFolder(null); setLoading(false); setError(null); return; }
    setFolder(null); setLoading(true); setError(null);
    storageGetFolder(folderId).then((f) => {
      if (!f) { setError(t("folderNotFound", lang)); setLoading(false); return; }
      setFolder(f); setFolderName(f.name);
      // Add to recent workspaces
      try {
        const raw = localStorage.getItem("gdt_recent_workspaces");
        const recent: { id: number; name: string }[] = raw ? JSON.parse(raw) : [];
        const filtered = recent.filter((w) => w.id !== folderId);
        filtered.unshift({ id: folderId, name: f.name });
        localStorage.setItem("gdt_recent_workspaces", JSON.stringify(filtered.slice(0, 10)));
      } catch {}
      const fileParam = searchParams.get("file");
      if (fileParam && f.files.some((ff) => ff.id === fileParam)) { handleSelectTab(fileParam); }
      else if (f.files.length > 0) { handleSelectTab(f.files[0].id); }
      setLoading(false);
    }).catch(() => { setError(t("loadFailed", lang)); setLoading(false); });
  }, [folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 工作区模式：辅助函数 ──────────────────────────────────────────
  /** 从存储重新加载文件夹数据，用于外部修改后的状态同步 */
  async function reloadFolder() {
    if (!folderId) return;
    const f = await storageGetFolder(folderId);
    if (f) setFolder(f);
  }

  // ─── 文件夹名称自动保存（2.5 秒防抖）────────────────────────────────
  // 当用户编辑文件夹名称时，延迟 2.5 秒后自动保存到存储。
  // 使用 useEffect 返回的 cleanup 函数清除前一个定时器，实现防抖。
  // eslint-disable-next-line react-hooks/exhaustive-deps：仅依赖 folderName
  useEffect(() => {
    if (!folderName.trim() || !folderId) return;
    const timer = setTimeout(() => storageUpdateFolder(folderId, { name: folderName, updatedAt: Date.now() }), 2500);
    return () => clearTimeout(timer);
  }, [folderName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 首页模式：文件夹操作 ──────────────────────────────────────────
  const handleCreateNew = async () => {
    const f: Folder = { name: t("untitledFolder", lang), files: [], createdAt: Date.now(), updatedAt: Date.now() };
    f.id = await storageSaveFolder(f);
    setFolders((prev) => [f, ...prev]);
    navigate(`/folder/${f.id}`);
  };

  const handleCreateFromTemplate = (template: Template) => {
    setTemplateModalOpen(false);
    const f: Folder = { name: template.name, files: template.files.map((x) => ({ ...x })), createdAt: Date.now(), updatedAt: Date.now() };
    storageSaveFolder(f).then((id) => { f.id = id; setFolders((prev) => [f, ...prev]); setSelectedFolderId(id); });
  };

  /** 从本地磁盘文件夹导入工作区（仅 Electron 桌面端可用）
   *  流程：选择文件夹 → 读取目录 → 识别 .md 和 .json 文件 → 创建新工作区 */
  const handleOpenWorkspace = async () => {
    const api = (window as any).electronAPI;
    if (!api?.selectFolder) { alert(t("electronOnly", lang)); return; }
    const folderPath: string | null = await api.selectFolder();
    if (!folderPath) return;
    const entries: { name: string; isDirectory: boolean; isFile: boolean }[] = await api.readDir(folderPath);
    const files: FolderFile[] = [];
    for (const entry of entries) {
      if (!entry.isFile) continue;
      const ext = entry.name.split(".").pop()?.toLowerCase();
      if (ext === "md") {
        const content = await api.readFileAt(folderPath + "/" + entry.name);
        files.push({ id: generateId(), name: entry.name, type: "md", content: content || "", createdAt: Date.now(), updatedAt: Date.now() });
      } else if (ext === "json") {
        const raw = await api.readFileAt(folderPath + "/" + entry.name);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            files.push({ id: generateId(), name: entry.name, type: "excel", content: parsed, createdAt: Date.now(), updatedAt: Date.now() });
          }
        } catch { /* skip invalid JSON */ }
      }
    }
    if (files.length === 0) { alert(t("noImportableFiles", lang)); return; }
    const folderName = folderPath.split(/[/\\]/).pop() || t("importedWorkspace", lang);
    const f: Folder = { name: folderName, files, createdAt: Date.now(), updatedAt: Date.now() };
    f.id = await storageSaveFolder(f);
    setFolders((prev) => [f, ...prev]);
    navigate(`/folder/${f.id}`);
  };

  const handleSelectFolder = (id: number) => { setSelectedFolderId(id); };
  const handleEnterFolder = (id: number) => { setSelectedFolderId(id); navigate(`/folder/${id}`); };

  const handleRenameFolder = async (id: number, newName: string) => {
    await storageUpdateFolder(id, { name: newName, updatedAt: Date.now() });
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f)));
  };

  const handleDeleteFolder = async (id: number) => {
    if (!window.confirm(t("confirmDeleteFolder", lang))) return;
    await storageDeleteFolder(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleCopyFolder = async (id: number) => {
    const orig = await storageGetFolder(id);
    if (!orig) return;
    const copy: Folder = { name: orig.name + t("folderCopySuffix", lang), files: orig.files.map((x) => ({ ...x })), createdAt: Date.now(), updatedAt: Date.now() };
    copy.id = await storageSaveFolder(copy);
    setFolders((prev) => [copy, ...prev]);
  };

  // ─── 工作区模式：文件操作 ──────────────────────────────────────────
  /** 添加新文件到当前工作区（使用不可变模式追加到文件列表） */
  const handleAddFile = async (type: "md" | "excel") => {
    if (!folderId) return;
    const file: FolderFile = {
      id: generateId(), name: type === "md" ? t("untitledDocument", lang) + ".md" : t("untitledSheet", lang), type,
      content: type === "md" ? defaultMdContent : defaultExcelContent, createdAt: Date.now(), updatedAt: Date.now(),
    };
    const files = [...(folder?.files || []), file];
    await storageUpdateFolder(folderId, { files, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, files, updatedAt: Date.now() } : null);
    handleSelectTab(file.id);
    setNewFileId(file.id);
  };

  const handleRenameFile = async (fileId: string, name: string) => {
    if (!folderId) return;
    const files = (folder?.files || []).map((f) => f.id === fileId ? { ...f, name, updatedAt: Date.now() } : f);
    await storageUpdateFolder(folderId, { files, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, files, updatedAt: Date.now() } : null);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!folderId || !confirm(t("confirmDeleteFile", lang))) return;
    const currentFiles = folder?.files;
    if (!currentFiles || currentFiles.length === 0) return;
    const filtered = currentFiles.filter((f) => f.id !== fileId);
    await storageUpdateFolder(folderId, { files: filtered, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, files: filtered, updatedAt: Date.now() } : null);
    if (currentFileId === fileId) setCurrentFileId(filtered[0]?.id || null);
  };

  const handleCreateFolder = async (name: string) => {
    if (!folderId) return;
    const folders = [...(folder?.folders || []), name];
    await storageUpdateFolder(folderId, { folders, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, folders, updatedAt: Date.now() } : null);
  };

  const handleRenameFolderPath = async (oldPath: string, newName: string) => {
    if (!folderId) return;
    // Preserve parent path
    const parentPath = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") + "/" : "";
    const newPath = parentPath + newName;
    const folders = (folder?.folders || []).map((f) => f === oldPath ? newPath : f);
    const files = (folder?.files || []).map((f) => {
      if (f.name.startsWith(oldPath + "/")) {
        return { ...f, name: newPath + f.name.slice(oldPath.length), updatedAt: Date.now() };
      }
      return f;
    });
    await storageUpdateFolder(folderId, { folders, files, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, folders, files, updatedAt: Date.now() } : null);
  };

  const handleDeleteFolderPath = async (path: string) => {
    if (!folderId) return;
    const folders = (folder?.folders || []).filter((f) => f !== path);
    const files = (folder?.files || []).filter((f) => !f.name.startsWith(path + "/"));
    await storageUpdateFolder(folderId, { folders, files, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, folders, files, updatedAt: Date.now() } : null);
  };

  /** 移动子文件夹到目标路径（防止移动到自身或子目录） */
  const handleMoveFolder = async (oldPath: string, targetPath: string) => {
    if (!folderId || !oldPath) return;
    // Prevent moving to self or descendants
    if (targetPath === oldPath || targetPath.startsWith(oldPath + "/")) return;
    const basename = oldPath.split("/").pop() || oldPath;
    const newPath = targetPath ? `${targetPath}/${basename}` : basename;

    // Update folder paths — replace oldPath with newPath under target
    let folders = (folder?.folders || []).filter((f) => f !== oldPath);
    const newFolderPath = targetPath ? `${targetPath}/${basename}` : basename;
    if (!folders.includes(newFolderPath)) folders = [...folders, newFolderPath];

    // Move all files under oldPath to newPath
    const files = (folder?.files || []).map((f) => {
      if (f.name.startsWith(oldPath + "/")) {
        return { ...f, name: newFolderPath + f.name.slice(oldPath.length), updatedAt: Date.now() };
      }
      return f;
    });

    await storageUpdateFolder(folderId, { folders, files, updatedAt: Date.now() });
    setFolder((prev) => prev ? { ...prev, folders, files, updatedAt: Date.now() } : null);
  };

  const handleMoveFile = async (fileId: string, targetPath: string) => {
    if (!folderId) return;
    const file = folder?.files.find((f) => f.id === fileId);
    if (!file) return;
    const basename = file.name.split("/").pop() || file.name;
    const newName = targetPath ? `${targetPath}/${basename}` : basename;
    await handleRenameFile(fileId, newName);
  };

  const handleSelectFile = handleSelectTab;

  const openTabFiles = openTabs.map((tid) => folder?.files.find((f) => f.id === tid)).filter(Boolean) as FolderFile[];

  const handleSaveAsTemplate = async () => {
    const name = prompt(t("templateName", lang), folderName);
    if (!name?.trim()) return;
    await storageAddTemplate({ name: name.trim(), files: folder?.files || [], createdAt: Date.now() });
    alert(t("templateSaved", lang));
  };

  const handleGoHome = () => { navigate("/"); };
  const handleGoWorkspace = () => { if (viewMode === "home" && selectedFolderId) navigate(`/folder/${selectedFolderId}`); };

  // 将处理函数暴露到 window 对象，供 TitleBar 的 "文件" 下拉菜单调用
  // 这些是 Electron 原生菜单与 React 组件之间的桥接函数
  useEffect(() => {
    (window as any).__openWorkspace = handleOpenWorkspace;
    (window as any).__saveFile = () => {
      if (currentFile?.type === "md") handleForceSave();
    };
    (window as any).__saveAs = handleSaveAsTemplate;
    return () => {
      (window as any).__openWorkspace = undefined;
      (window as any).__saveFile = undefined;
      (window as any).__saveAs = undefined;
    };
  }, [handleOpenWorkspace, handleForceSave, handleSaveAsTemplate, currentFile]);

  // ─── Loading / Error states ─────────────────────────────────────────────

  if (folderId && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-darkest)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border-medium)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (folderId && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg-darkest)" }}>
        <p className="text-sm mb-4" style={{ color: "var(--danger)" }}>{error}</p>
        <button onClick={handleGoHome} className="text-sm transition-colors"
          style={{ color: "var(--accent-text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent-text)")}>
          {t("returnToFolderList", lang)}
        </button>
      </div>
    );
  }

  if (folderId && !folder) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-darkest)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--border-medium)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  // ─── Render: Unified three-column layout ────────────────────────────────

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "var(--bg-darkest)" }}>
      <div className="flex-1 flex overflow-hidden">
      <div ref={uiZoomRef} data-ui-zoom style={{ display: "flex", flexShrink: 0, height: "100%", overflow: "hidden", zoom: zoom !== 110 ? String(zoom / 110) : undefined as any }}>
      <ActivityBar
        activeView={viewMode}
        showActions={viewMode === "workspace"}
        onAddFile={(type) => { if (viewMode === "workspace") handleAddFile(type); }}
        onSaveAsTemplate={handleSaveAsTemplate}
        onGoHome={handleGoHome}
        onGoWorkspace={handleGoWorkspace}
      />
      {sidebarOpen && (
      <div className="h-full flex-shrink-0" style={{ width: 240 }}>
        {viewMode === "home" ? (
          homeLoaded ? (
            <Sidebar folders={folders} selectedId={selectedFolderId} searchQuery={searchQuery}
              onSearchChange={setSearchQuery} onSelectFolder={handleSelectFolder} onDoubleClick={handleEnterFolder}
              onCreateNew={handleCreateNew} onCreateFromTemplate={() => setTemplateModalOpen(true)}
              onRename={handleRenameFolder} onDelete={handleDeleteFolder} onCopy={handleCopyFolder} />
          ) : null
        ) : (
          <FileExplorer folderName={folder!.name} files={folder!.files} folderPaths={folder?.folders || []}
            currentFileId={currentFileId}
            onSelectFile={handleSelectFile} onRenameFile={handleRenameFile} onDeleteFile={handleDeleteFile}
            onAddFile={handleAddFile} onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolderPath} onDeleteFolder={handleDeleteFolderPath} onMoveFile={handleMoveFile} onMoveFolder={handleMoveFolder} onDeselectAll={() => setCurrentFileId(null)}
            searchActive={searchActive}
            onSearchClose={() => setSearchActive(false)} newFileId={newFileId}
            onNewFileRenamed={() => setNewFileId(null)} />
        )}
      </div>
      )}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === "home" ? (
          <>
            <TemplateModal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} onSelect={handleCreateFromTemplate} />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 opacity-20">+</div>
              <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>{t("selectFolderToStart", lang)}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={handleOpenWorkspace} className="btn-secondary py-1.5 px-4 text-[13px]">{t("openWorkspaceBtn", lang)}</button>
                <button onClick={handleCreateNew} className="btn-secondary py-1.5 px-4 text-[13px]">{t("newWorkspaceBtn", lang)}</button>
                <button onClick={() => setTemplateModalOpen(true)} className="btn-secondary py-1.5 px-4 text-[13px]">{t("fromTemplateBtn", lang)}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="px-4 py-2 flex items-center gap-3 shrink-0"
              style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border-subtle)" }}>
              <button ref={folderMenuBtnRef}
                onClick={(e) => { e.stopPropagation(); setFolderMenuOpen((prev) => !prev); }}
                className="tool-btn"
                title={t("folderOptions", lang)}
                style={{ width: 28, height: 28 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4.5l4.5-2 7 2.5v7l-7 2.5-4.5-2.5v-7.5z" />
                  <path d="M2 4.5l4.5 2.5v7.5" />
                  <path d="M6.5 7l7-2.5" />
                  <path d="M6.5 7v7.5" />
                </svg>
              </button>
              <input
                value={currentFile ? (currentFile.name.split("/").pop() || "").replace(/\.(md|json)$/, "") : folderName}
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={(e) => {
                  isComposing.current = false;
                  const target = e.target as HTMLInputElement;
                  if (currentFile) {
                    const ext = currentFile.name.match(/\.(md|json)$/)?.[0] || "";
                    const dir = currentFile.name.split("/").slice(0, -1).join("/");
                    const newName = dir ? `${dir}/${target.value}${ext}` : `${target.value}${ext}`;
                    handleRenameFile(currentFile.id, newName);
                  } else {
                    setFolderName(target.value);
                  }
                }}
                onChange={(e) => {
                  if (isComposing.current) return;
                  if (currentFile) {
                    const ext = currentFile.name.match(/\.(md|json)$/)?.[0] || "";
                    const dir = currentFile.name.split("/").slice(0, -1).join("/");
                    const newName = dir ? `${dir}/${e.target.value}${ext}` : `${e.target.value}${ext}`;
                    handleRenameFile(currentFile.id, newName);
                  } else {
                    setFolderName(e.target.value);
                  }
                }}
                className="max-w-md px-2 py-1 text-sm font-semibold border rounded outline-none bg-transparent transition-colors"
                style={{ color: "var(--text-primary)", borderColor: "transparent" }}
                placeholder={currentFile ? t("fileName", lang) : t("folderName", lang)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => {
                  (e.currentTarget.style.borderColor = "transparent");
                  // 清空后失焦 → 自动恢复默认文件名
                  if (currentFile) {
                    const trimmed = (e.target as HTMLInputElement).value.trim();
                    if (!trimmed) {
                      const isMd = currentFile.type === "md";
                      const defaultBase = isMd
                        ? t("untitledDocument", lang).replace(/\.md$/, "")
                        : t("untitledSheet", lang);
                      const ext = currentFile.name.match(/\.(md|json)$/)?.[0] || "";
                      const dir = currentFile.name.split("/").slice(0, -1).join("/");
                      const fallbackName = dir
                        ? `${dir}/${defaultBase}${ext}`
                        : `${defaultBase}${ext}`;
                      handleRenameFile(currentFile.id, fallbackName);
                    }
                  }
                }}
                onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }} />
              <div className="flex-1" />
              <StatusBadge status={saveStatus} />
            </header>

            {/* ── Folder dropdown menu ── */}
            {folderMenuOpen && folderMenuBtnRef.current && createPortal(
              <div
                className="context-menu animate-in"
                style={{
                  position: "fixed",
                  top: folderMenuBtnRef.current.getBoundingClientRect().bottom + 4,
                  left: folderMenuBtnRef.current.getBoundingClientRect().left,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="context-menu-item" onClick={() => {
                  setFolderMenuOpen(false);
                  if (currentFile?.type === "md") handleForceSave?.();
                  // Excel auto-saves; no explicit save needed
                }}>
                  {t("save", lang)}
                </button>
                <button className="context-menu-item" onClick={() => { setFolderMenuOpen(false); handleSaveAsTemplate(); }}>
                  {t("saveAs", lang)}
                </button>
                {isElectron && (
                  <>
                    <div className="context-menu-divider" />
                    <button className="context-menu-item" onClick={async () => {
                      setFolderMenuOpen(false);
                      const api = (window as any).electronAPI;
                      if (api?.selectStoragePath) {
                        const p = await api.selectStoragePath();
                        if (p) alert("已选择: " + p);
                      }
                    }}>
                      {t("changeFolderLocation", lang)}
                    </button>
                  </>
                )}
              </div>,
              document.body,
            )}

            {/* Click-away listener */}
            {folderMenuOpen && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 999 }}
                onClick={() => setFolderMenuOpen(false)}
              />
            )}

            {!currentFile ? (
              <div className="flex-1 flex items-center justify-center m-4">
                <div className="text-center">
                  <div className="text-4xl mb-4 opacity-20">+</div>
                  <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{t("selectFileToStart", lang)}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="tab-bar" id="tab-bar">
                  {openTabFiles.map((file) => (
                    <div key={file.id}
                      className={`tab ${currentFileId === file.id ? "active" : ""}`}
                      onClick={() => handleTabClick(file.id)}>
                      <span style={{ fontSize: 11, opacity: 0.4 }}>{file.type === "md" ? "M" : "E"}</span>
                      <span>{file.name.split("/").pop()}</span>
                      {currentFileId === file.id && <span className="tab-dirty" />}
                      <button className="tab-close" onClick={(e) => handleCloseTab(file.id, e)}>×</button>
                    </div>
                  ))}
                </div>

                {/* Breadcrumb: file path (VS Code-style) */}
                {currentFile && (() => {
                  const parts = currentFile.name.split("/");
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 22,
                        padding: "0 12px",
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        background: "var(--bg-root)",
                        borderBottom: "1px solid var(--border-subtle)",
                        flexShrink: 0,
                        gap: 2,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {parts.map((part, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {i > 0 && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, flexShrink: 0 }}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          )}
                          <span style={i === parts.length - 1 ? { color: "var(--accent-text)" } : undefined}>
                            {part}
                          </span>
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {currentFile?.type === "md" && (
                  <EditorToolbar
                    editorRef={editorRef}
                    isPreviewMode={isMdPreview}
                    onTogglePreview={() => setIsMdPreview((p) => !p)}
                  />
                )}
                {currentFile?.type === "excel" && (
                  <>
                    <ExcelToolbar hot={hotInstance.current} key={hotKey} onUndo={handleUndo} onRedo={handleRedo} />
                    <FormulaBar cellRef={cellRef} formulaValue={formulaValue} hotInstance={hotInstance}
                      isFormulaBarFocused={isFormulaBarFocused} onFormulaValueChange={setFormulaValue} />
                  </>
                )}
                <div ref={wsZoomRef} data-workspace-zoom style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {currentFile.type === "md" ? (
                  <MarkdownEditor
                    source={source}
                    onSourceChange={setSource}
                    editorRef={editorRef}
                    isPreviewMode={isMdPreview}
                    onTogglePreview={() => setIsMdPreview((p) => !p)}
                  />
                ) : (
                  <div className="hot-container" style={{ position: "relative", flex: 1, minHeight: 0 }}>
                    <div ref={hotRef} style={{ width: "100%", height: "100%" }}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        const hot = (window as any).__ctxHot;
                        if (!hot || hot.isDestroyed) return;
                        const sel = hot.getSelected();
                        if (sel && sel.length > 0) setCtxMenuSelection(sel);
                        setCtxMenuPos({ x: e.clientX, y: e.clientY });
                        setCtxMenuVisible(true);
                      }} />
                  </div>
                )}
                </div>
                <ContextMenu hot={hotInstance.current} visible={ctxMenuVisible} position={ctxMenuPos}
                  selection={ctxMenuSelection} onClose={() => setCtxMenuVisible(false)} />
              </>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default FolderWorkspace;
