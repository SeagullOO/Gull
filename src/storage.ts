/**
 * storage.ts — 存储抽象层
 *
 * 核心架构：提供统一的存储接口，底层根据运行环境自动切换：
 * - Electron 桌面端：通过 electronAPI 直接读写文件系统（folders.json / templates.json）
 * - 浏览器端：使用 IndexedDB（Dexie.js 封装的 db 实例）
 *
 * 设计模式：策略模式 + Repository 模式
 * - 每个公共函数内部通过 `isElectron` 判断运行环境，选择对应的存储策略
 * - 对调用方完全透明：页面和 hooks 不需要知道数据存在文件系统还是 IndexedDB
 *
 * 为什么需要这个抽象层？
 * - Electron 桌面应用需要将数据保存在用户选择的本地文件夹中
 * - 浏览器版本需要通过 IndexedDB 实现离线持久化
 * - 统一接口避免业务代码中到处写 if/else 环境判断
 *
 * 导出函数：
 *   Folder CRUD:  storageLoadFolders, storageSaveFolder, storageGetFolder,
 *                  storageDeleteFolder, storageUpdateFolder
 *   Template CRUD: storageLoadTemplates, storageAddTemplate, storageDeleteTemplate
 *   Export:        storageExportFiles（导出为本地文件/浏览器下载）
 */

// 存储抽象层：Electron 文件系统 或 浏览器 IndexedDB
import { db } from "./db";
import type { Folder, Template } from "./types";

/** Electron 主进程暴露给渲染进程的 API 类型声明 */
declare global {
  interface Window {
    electronAPI?: {
      readFile: (filename: string) => Promise<string | null>;
      writeFile: (filename: string, data: string) => Promise<boolean>;
      deleteFile: (filename: string) => Promise<boolean>;
      listFiles: () => Promise<string[]>;
      selectExportFolder: () => Promise<string | null>;
      writeExportFiles: (basePath: string, files: { relativePath: string; content: string }[]) => Promise<{ success: boolean; error?: string; count: number }>;
      selectFolder: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
      readFileAt: (filePath: string) => Promise<string | null>;
      setZoomFactor: (factor: number) => void;
      // Auto-updater
      checkForUpdates: () => Promise<{ dev?: boolean; success?: boolean; version?: string; error?: string }>;
      downloadUpdate: () => Promise<{ success?: boolean; error?: string }>;
      installUpdate: () => void;
      onUpdateStatus: (cb: (status: string, data?: any) => void) => () => void;
    };
  }
}

/** 运行时环境判断：window.electronAPI 存在即为 Electron 桌面端 */
const isElectron = !!window.electronAPI;

/**
 * 确保 IndexedDB 数据库已打开（带超时保护）
 *
 * Dexie 在 db.open() 完成前会将表操作排队，但如果数据库被永久阻塞
 * （例如另一个标签页持有旧版本），我们需要暴露明确的错误而不是永久挂起。
 * 在 Electron 环境下直接跳过（使用文件系统，不需要 IndexedDB）。
 *
 * @param timeoutMs 超时时间（毫秒），默认 3000ms
 */
async function ensureDbReady(timeoutMs = 3000): Promise<void> {
  if (isElectron) return;
  try {
    await Promise.race([
      db.open(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("数据库连接超时")), timeoutMs)
      ),
    ]);
  } catch {
    // 数据库打开失败时，Dexie 会在后续表操作中拒绝——由调用方捕获。
    // 这里仅用于超时后允许 UI 显示友好提示。
  }
}

// ===== Folder CRUD =====

/** 将文件夹数组序列化为格式化的 JSON 字符串 */
async function foldersToJSON(folders: Folder[]): Promise<string> {
  return JSON.stringify(folders, null, 2);
}

/** 从 JSON 字符串反序列化为文件夹数组 */
async function foldersFromJSON(json: string): Promise<Folder[]> {
  return JSON.parse(json);
}

/**
 * 加载所有文件夹
 *
 * Electron: 从文件系统读取 folders.json
 * 浏览器: 从 IndexedDB 按 updatedAt 降序查询
 */
export async function storageLoadFolders(): Promise<Folder[]> {
  if (isElectron) {
    const data = await window.electronAPI!.readFile("folders.json");
    return data ? await foldersFromJSON(data) : [];
  }
  return db.folders.orderBy("updatedAt").reverse().toArray();
}

/**
 * 保存文件夹（新建或更新）
 *
 * 通过检查 folder.id 是否存在判断是更新还是新建：
 * - Electron 新建时用 Date.now() 生成 ID，更新时根据 id 覆盖数组中的对应项
 * - IndexedDB 使用 Dexie 的 add/update 方法
 *
 * @returns 文件夹 ID
 */
export async function storageSaveFolder(folder: Folder): Promise<number> {
  if (isElectron) {
    const folders = await storageLoadFolders();
    const idx = folders.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      folders[idx] = folder;
    } else {
      folder.id = Date.now();
      folders.push(folder);
    }
    await window.electronAPI!.writeFile("folders.json", await foldersToJSON(folders));
    return folder.id!;
  }
  if (folder.id) {
    await db.folders.update(folder.id, folder as any);
    return folder.id;
  }
  return db.folders.add(folder as any);
}

/** 根据 ID 获取单个文件夹 */
export async function storageGetFolder(id: number): Promise<Folder | undefined> {
  if (isElectron) {
    const folders = await storageLoadFolders();
    return folders.find((f) => f.id === id);
  }
  return db.folders.get(id);
}

/** 根据 ID 删除文件夹 */
export async function storageDeleteFolder(id: number): Promise<void> {
  if (isElectron) {
    const folders = await storageLoadFolders();
    await window.electronAPI!.writeFile("folders.json", await foldersToJSON(folders.filter((f) => f.id !== id)));
    return;
  }
  await db.folders.delete(id);
}

/**
 * 部分更新文件夹
 *
 * 使用不可变模式：从存储读取 → 合并变更 → 写回。
 * Electron 版本每次都需要全量读写 JSON 文件；
 * IndexedDB 版本使用 Dexie 的 update 方法实现增量更新。
 */
export async function storageUpdateFolder(id: number, changes: Partial<Folder>): Promise<void> {
  if (isElectron) {
    const folders = await storageLoadFolders();
    const idx = folders.findIndex((f) => f.id === id);
    if (idx >= 0) {
      folders[idx] = { ...folders[idx], ...changes, updatedAt: Date.now() };
      await window.electronAPI!.writeFile("folders.json", await foldersToJSON(folders));
    }
    return;
  }
  await db.folders.update(id, { ...changes, updatedAt: Date.now() });
}

// ===== Template CRUD =====

/** 加载所有模版（按创建时间降序） */
export async function storageLoadTemplates(): Promise<Template[]> {
  if (isElectron) {
    const data = await window.electronAPI!.readFile("templates.json");
    return data ? JSON.parse(data) : [];
  }
  return db.templates.orderBy("createdAt").reverse().toArray();
}

/** 添加新模版 */
export async function storageAddTemplate(template: Template): Promise<number> {
  if (isElectron) {
    const templates = await storageLoadTemplates();
    template.id = Date.now();
    templates.push(template);
    await window.electronAPI!.writeFile("templates.json", JSON.stringify(templates, null, 2));
    return template.id;
  }
  return db.templates.add(template as any);
}

/** 删除模版 */
export async function storageDeleteTemplate(id: number): Promise<void> {
  if (isElectron) {
    const templates = await storageLoadTemplates();
    await window.electronAPI!.writeFile("templates.json", JSON.stringify(templates.filter((t) => t.id !== id), null, 2));
    return;
  }
  await db.templates.delete(id);
}

// ===== 导出（Electron 原生对话框 / 浏览器下载） =====

/**
 * 导出文件到本地
 *
 * Electron: 打开系统文件夹选择器，写入所有文件到选定目录
 * 浏览器: 逐个触发文件下载（每个文件一个 Blob URL）
 *
 * @returns 导出结果描述字符串
 */
export async function storageExportFiles(files: { relativePath: string; content: string }[]): Promise<string> {
  if (isElectron) {
    const basePath = await window.electronAPI!.selectExportFolder();
    if (!basePath) throw new Error("AbortError");
    const result = await window.electronAPI!.writeExportFiles(basePath, files);
    if (!result.success) throw new Error(result.error || "Export failed");
    return `已导出 ${result.count} 个文件`;
  }
  // 浏览器回退方案：逐个下载文件
  files.forEach((f) => {
    const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.relativePath.split("/").pop() || f.relativePath;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  return `已下载 ${files.length} 个文件`;
}
