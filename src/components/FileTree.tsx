import { useState, useRef, useEffect } from "react";
import type { FolderFile } from "../types";
import { t, getLang } from "../i18n";

/**
 * FileTree — 简单的文件树组件（不含拖拽和文件夹操作）
 *
 * 【角色】FileTree 是 FileExplorer 的精简版本，仅用于纯文件树展示（早期实现）。
 *         不支持拖拽移动、文件夹新建/删除/重命名，仅提供文件选择和行内重命名。
 *         当前项目中主要由 FileExplorer 取代，FileTree 可能用于独立弹窗或简化场景。
 *
 * 【视觉布局】固定宽度 w-60 (240px) 的 flex 垂直列。
 *           - 顶部：文件计数标题栏（"文件列表" + 文件数量）
 *           - 中部：flex-1 可滚树形文件列表（支持递归展开/折叠）
 *           - 底部：新建文件按钮（Markdown / Excel 表格）borderTop 分割
 *
 * 【交互链】
 *   - onSelectFile → 父组件 → 切换活动文件
 *   - onRenameFile → 父组件 → storage 更新
 *   - onDeleteFile → 父组件 → 删除文件
 *   - onAddFile → 父组件 → 创建新文件
 *   - 右键菜单：直接渲染在组件内（不使用 Portal，因为此组件通常在全屏场景使用）
 *
 * 【设计决策】
 *   - buildTree / sortTree 与 FileExplorer 共享相同的逻辑（路径按 "/" 分层）
 *   - 文件夹展开/折叠用 Set 管理 expandedPaths，默认全部展开
 *   - 右键菜单不使用 Portal：此组件用于全屏页面，不需要逃逸 overflow
 *   - 版本保留：尽管当前主要使用 FileExplorer，FileTree 保留为备用选型
 */
interface FileTreeProps {
  files: FolderFile[];
  currentFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onAddFile: (type: "md" | "excel") => void;
}

/** 树节点数据结构 */
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: FolderFile;
}

/** 从扁平文件列表构建树形结构（路径 "/" 分隔层级） */
function buildTree(files: FolderFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.name.split("/");
    let parent = root;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      if (isLast) {
        parent.push({ name: part, path: currentPath, isFolder: false, children: [], file });
      } else {
        let folder = parent.find((n) => n.isFolder && n.name === part);
        if (!folder) {
          folder = { name: part, path: currentPath, isFolder: true, children: [] };
          parent.push(folder);
        }
        parent = folder.children;
      }
    }
  }
  return sortTree(root);
}

/** 排序：文件夹在前、文件在后，各自字母序，递归子节点 */
function sortTree(nodes: TreeNode[]): TreeNode[] {
  const folders = nodes.filter((n) => n.isFolder).sort((a, b) => a.name.localeCompare(b.name));
  const files = nodes.filter((n) => !n.isFolder).sort((a, b) => a.name.localeCompare(b.name));
  return [...folders.map((f) => ({ ...f, children: sortTree(f.children) })), ...files];
}

function FileTree({ files, currentFileId, onSelectFile, onRenameFile, onDeleteFile, onAddFile }: FileTreeProps) {
  const lang = getLang();
  // 右键菜单状态：仅支持文件节点的右键操作（重命名 + 删除）
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);
  // 行内重命名状态
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  // 展开路径集合：默认全部展开
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const allPaths = new Set<string>();
    const collectPaths = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.isFolder) { allPaths.add(node.path); collectPaths(node.children); }
      }
    };
    collectPaths(buildTree(files));
    setExpandedPaths(allPaths);
  }, [files]);

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleRenameStart = (file: FolderFile) => {
    setRenamingId(file.id); setRenameValue(file.name); setContextMenu(null);
  };

  const handleRenameSubmit = (fileId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameFile(fileId, trimmed);
    setRenamingId(null);
  };

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const tree = buildTree(files);

  // 递归渲染树节点：缩进 = 8 + depth * 14
  // 文件夹节点：可点击折叠/展开，三角形图标 CSS 旋转动画
  // 文件节点：单击选择，显示 MD/Excel 类型图标
  const renderNode = (node: TreeNode, depth: number): JSX.Element => {
    if (node.isFolder) {
      const isExpanded = expandedPaths.has(node.path);
      const hasChildren = node.children.length > 0;
      // 有子节点的文件夹显示可点击的折叠/展开箭头，无子节点占位空白
      return (
        <div key={node.path}>
          <div
            className="tree-row group px-2 py-1 mx-1 cursor-pointer transition-colors duration-100 flex items-center gap-1"
            style={{ borderRadius: "var(--radius)", color: "var(--text-secondary)", paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {hasChildren ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ opacity: 0.5, flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.12s ease" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : <span style={{ width: 10, flexShrink: 0 }} />}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}>
              {isExpanded
                ? <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1" />
                : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />}
            </svg>
            <span className="text-[12px] truncate flex-1 select-none">{node.name}</span>
          </div>
          {isExpanded && hasChildren && <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>}
        </div>
      );
    }

    const file = node.file!;
    const isMd = file.type === "md";
    return (
      <div
        key={file.id}
        onClick={() => onSelectFile(file.id)}
        onContextMenu={(e) => handleContextMenu(e, file.id)}
        className={`tree-row group px-2 py-1 mx-1 cursor-pointer transition-colors duration-100 flex items-center gap-1${currentFileId === file.id ? " active" : ""}`}
        style={{
          borderRadius: "var(--radius)", paddingLeft: `${8 + depth * 14}px`,
          color: currentFileId === file.id ? "var(--accent-text)" : "var(--text-secondary)",
          background: currentFileId === file.id ? "var(--bg-selected)" : "transparent",
        }}
      >
        <span style={{ width: 10, flexShrink: 0 }} />
        {renamingId === file.id ? (
          <input
            ref={renameInputRef} value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => handleRenameSubmit(file.id)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(file.id); if (e.key === "Escape") setRenamingId(null); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-1 py-0.5 text-xs border rounded outline-none"
            style={{ borderColor: "var(--accent)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
          />
        ) : (
          <>
            {isMd ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, flexShrink: 0 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            )}
            <span className="text-[12px] truncate flex-1">{node.name}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-60 h-full flex flex-col flex-shrink-0 select-none"
      style={{ background: "var(--bg-panel)", borderRight: "1px solid var(--border-subtle)" }}>
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{t("fileList", lang)}</h2>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{files.length}{t("filesCount", lang)}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="text-3xl mb-2 opacity-20">+</div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("noFiles", lang)}</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{t("addFilesHint", lang)}</p>
          </div>
        ) : tree.map((node) => renderNode(node, 0))}
      </div>
      <div className="px-3 py-3 space-y-1.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button onClick={() => onAddFile("md")}
          className="fe-btn w-full px-3 py-2 text-[11px] font-medium flex items-center gap-1.5 rounded-ide border"
          style={{ color: "var(--text-secondary)", background: "var(--bg-hover)", borderColor: "var(--border-subtle)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {t("newMdButton", lang)}
        </button>
        <button onClick={() => onAddFile("excel")}
          className="fe-btn w-full px-3 py-2 text-[11px] font-medium flex items-center gap-1.5 rounded-ide border"
          style={{ color: "var(--text-secondary)", background: "var(--bg-hover)", borderColor: "var(--border-subtle)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {t("newExcelButton", lang)}
        </button>
      </div>
      {/* 右键菜单：直接渲染在组件内（fixed + z-50），不使用 Portal */}
      {/* 因为此组件用于全屏页面场景，不需要 escape overflow */}
      {contextMenu && (
        <div className="fixed z-50 context-menu animate-in" style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { const file = files.find((f) => f.id === contextMenu.fileId); if (file) handleRenameStart(file); }}
            className="context-menu-item">{t("rename", lang)}</button>
          <div className="context-menu-divider" />
          <button onClick={() => { onDeleteFile(contextMenu.fileId); setContextMenu(null); }}
            className="context-menu-item danger">{t("delete", lang)}</button>
        </div>
      )}
    </div>
  );
}

export default FileTree;
