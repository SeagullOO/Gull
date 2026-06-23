const { app, BrowserWindow, ipcMain, dialog, protocol, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

// Register custom scheme BEFORE app ready — required for CORS
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Dev mode: running from source (not inside app.asar)
const isDev = !__dirname.includes("app.asar");
const distDir = path.join(__dirname, "..", "dist");
let mainWindow = null;

// ── Auto-updater 配置 ─────────────────────────────────────────────────────
// 仅在生产模式 (asar) 下启用；让用户选择是否下载
if (!isDev) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
}

// ── Auto-updater 事件：转发到渲染进程 ────────────────────────────────────
autoUpdater.on("checking-for-update", () => {
  mainWindow?.webContents.send("update:checking");
});
autoUpdater.on("update-available", (info) => {
  mainWindow?.webContents.send("update:available", info.version);
});
autoUpdater.on("update-not-available", () => {
  mainWindow?.webContents.send("update:not-available");
});
autoUpdater.on("download-progress", (progress) => {
  mainWindow?.webContents.send("update:progress", Math.round(progress.percent));
});
autoUpdater.on("update-downloaded", () => {
  mainWindow?.webContents.send("update:downloaded");
});
autoUpdater.on("error", (err) => {
  mainWindow?.webContents.send("update:error", err.message);
});

function getDataPath() {
  const dataDir = path.join(app.getPath("userData"), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 900, minHeight: 600,
    frame: false,
    title: "游戏策划文档工具",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadURL("app://./");
  }

  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.on("maximize", () => mainWindow.webContents.send("window-maximized"));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("window-unmaximized"));
}

// IPC
ipcMain.handle("fs:readFile", async (_e, filename) => {
  const fp = path.join(getDataPath(), filename);
  try { return fs.existsSync(fp) ? fs.readFileSync(fp, "utf-8") : null; }
  catch { return null; }
});
ipcMain.handle("fs:writeFile", async (_e, filename, data) => {
  try { fs.writeFileSync(path.join(getDataPath(), filename), data, "utf-8"); return true; }
  catch { return false; }
});
ipcMain.handle("fs:deleteFile", async (_e, filename) => {
  try { const fp = path.join(getDataPath(), filename); if (fs.existsSync(fp)) fs.unlinkSync(fp); return true; }
  catch { return false; }
});
ipcMain.handle("fs:listFiles", async () => {
  try { return fs.readdirSync(getDataPath()).filter(f => f.endsWith(".json")); }
  catch { return []; }
});
ipcMain.handle("export:selectFolder", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"], title: "选择导出目录" });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("export:writeFiles", async (_e, basePath, files) => {
  try {
    for (const f of files) {
      const fp = path.join(basePath, f.relativePath);
      const d = path.dirname(fp);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(fp, f.content, "utf-8");
    }
    return { success: true, count: files.length };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle("dialog:selectFolder", async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"], title: "选择工作区文件夹" });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("fs:readDir", async (_e, dirPath) => {
  try {
    if (typeof dirPath !== "string" || !dirPath) return [];
    const resolved = path.resolve(dirPath);
    if (resolved.includes("..")) return [];
    if (!fs.existsSync(resolved)) return [];
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return [];
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), isFile: e.isFile() }));
  } catch { return []; }
});
ipcMain.handle("fs:readFileAt", async (_e, filePath) => {
  try {
    // 路径遍历保护：只允许读取用户通过对话框选择的目录下的文件
    if (typeof filePath !== "string" || !filePath) return null;
    const resolved = path.resolve(filePath);
    // 拒绝符号链接和父目录穿越
    if (resolved.includes("..")) return null;
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) return null;
    // 限制文件大小防止内存耗尽（最大 10MB）
    if (stat.size > 10 * 1024 * 1024) return null;
    return fs.readFileSync(resolved, "utf-8");
  } catch { return null; }
});

ipcMain.handle("zoom:setFactor", async (_e, factor) => {
  if (mainWindow) mainWindow.webContents.setZoomFactor(factor);
});

// ── Auto-updater IPC ───────────────────────────────────────────────────
ipcMain.handle("update:check", async () => {
  if (isDev) return { dev: true };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, version: result?.updateInfo?.version };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("update:download", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall();
});

// Window control IPC
ipcMain.on("window-close", () => { if (mainWindow) mainWindow.close(); });
ipcMain.on("window-minimize", () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on("window-maximize", () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on("window-query-max", () => {
  if (mainWindow) mainWindow.webContents.send("window-maximized", mainWindow.isMaximized());
});

// Lifecycle
app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    const reqPath = decodeURIComponent(url.pathname);
    const baseDir = isDev ? path.join(__dirname, "..") : distDir;
    const filePath = path.join(baseDir, reqPath);

    const mime = {
      ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
      ".css": "text/css", ".json": "application/json",
      ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
    };
    const ct = mime[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    try {
      return new Response(fs.readFileSync(filePath), {
        status: 200,
        headers: { "content-type": ct, "access-control-allow-origin": "*" },
      });
    } catch {
      try {
        return new Response(fs.readFileSync(path.join(baseDir, "index.html")), {
          status: 200, headers: { "content-type": "text/html" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
