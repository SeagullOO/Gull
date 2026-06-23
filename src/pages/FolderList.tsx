/**
 * FolderList.tsx — 文件夹列表页（首页）
 *
 * 用户进入应用时首先看到的页面，展示所有工作区文件夹的列表。
 * 支持搜索、创建、重命名、复制、删除文件夹，以及从模版创建。
 *
 * 核心功能：
 * - 文件夹 CRUD 操作（通过 storage.ts 抽象层持久化）
 * - 搜索过滤（在 Sidebar 组件内实现）
 * - 双击进入工作区（导航到 /folder/:id）
 * - 模版创建（弹出 TemplateModal）
 *
 * 状态管理：
 * - folders: 所有文件夹的本地状态快照（从存储加载）
 * - selectedId: 当前选中的文件夹（用于高亮和操作上下文）
 * - searchQuery: 搜索文本（传递给 Sidebar 组件过滤）
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TemplateModal from "../components/TemplateModal";
import { storageLoadFolders, storageSaveFolder, storageDeleteFolder, storageGetFolder, storageUpdateFolder } from "../storage";
import type { Folder, Template } from "../types";

function FolderList() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  /** 从存储层加载所有文件夹 */
  const loadFolders = useCallback(async () => {
    const list = await storageLoadFolders();
    setFolders(list);
  }, []);

  // 组件挂载时加载文件夹列表
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  /** 创建空白文件夹（乐观更新：先写入存储再追加到本地状态） */
  const handleCreateNew = async () => {
    const name = "未命名文件夹";
    const folder: Folder = {
      name,
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const id = await storageSaveFolder(folder);
    folder.id = id;
    setFolders((prev) => [folder, ...prev]);
    setSelectedId(id);
  };

  /** 从模版创建文件夹：深拷贝模版文件数组，避免共享引用 */
  const handleCreateFromTemplate = (template: Template) => {
    setTemplateModalOpen(false);
    // 深拷贝 files 数组，确保新文件夹与模版数据隔离
    const folder: Folder = {
      name: template.name,
      files: template.files.map((f) => ({ ...f })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storageSaveFolder(folder).then((id) => {
      folder.id = id;
      setFolders((prev) => [folder, ...prev]);
      setSelectedId(id);
    });
  };

  const handleSelectFolder = (id: number) => {
    setSelectedId(id);
  };

  /** 双击进入文件夹工作区 */
  const handleDoubleClick = (id: number) => {
    navigate(`/folder/${id}`);
  };

  /** 重命名文件夹：先持久化，再不可变更新本地状态 */
  const handleRename = async (id: number, newName: string) => {
    await storageUpdateFolder(id, { name: newName, updatedAt: Date.now() });
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f))
    );
  };

  /** 删除文件夹：确认后先从存储删除，再移除本地状态 */
  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这个文件夹吗？此操作不可撤销。")) return;
    await storageDeleteFolder(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /** 复制文件夹：深拷贝原文件夹内容后存入存储 */
  const handleCopy = async (id: number) => {
    const folder = await storageGetFolder(id);
    if (!folder) return;
    // 深拷贝确保副本与原文件夹数据隔离
    const copy: Folder = {
      name: `${folder.name} (副本)`,
      files: folder.files.map((f) => ({ ...f })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newId = await storageSaveFolder(copy);
    copy.id = newId;
    setFolders((prev) => [copy, ...prev]);
  };

  return (
    <div className="h-screen flex" style={{ background: "var(--bg-darkest)" }}>
      <Sidebar
        folders={folders}
        selectedId={selectedId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectFolder={handleSelectFolder}
        onDoubleClick={handleDoubleClick}
        onCreateNew={handleCreateNew}
        onCreateFromTemplate={() => setTemplateModalOpen(true)}
        onRename={handleRename}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
      <TemplateModal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSelect={handleCreateFromTemplate}
      />
      {!selectedId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-20">+</div>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
              选择一个文件夹开始工作
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FolderList;
