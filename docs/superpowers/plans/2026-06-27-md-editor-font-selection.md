# Markdown 编辑区字体选择 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置 → 外观标签页新增字体选择下拉框，用户可从系统已安装字体中选择一款应用到 Markdown 编辑区。

**Architecture:** 主进程通过平台原生命令枚举系统字体（Windows: PowerShell + System.Drawing，macOS: system_profiler，Linux: fc-list），渲染进程通过 IPC 获取字体列表。用户选择后 Settings 通过 `window.__applyMdFont` 更新 App 的 `mdFontFamily` state，经 AppContent → FolderWorkspace → MarkdownEditor props 链到达 Monaco 编辑器即时应用。设置同时持久化到 localStorage `gull_settings.mdFontFamily`。

**Tech Stack:** Electron IPC (ipcMain/ipcRenderer + contextBridge), React props, localStorage, Monaco Editor updateOptions, CSS 变量

## 全局约束

- 字体只对 .md 编辑区（Monaco）生效，Excel 和 UI 不受影响
- 默认字体：`Maple Mono NF CN`，不存在时 fallback 到 `monospace`
- 字体列表由主进程系统原生 API 扫描，不做预设
- 软降级：IPC 失败时静默回收，只显示默认选项
- 现有 `gull_settings` localStorage key 复用，只新增 `mdFontFamily` 字段

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/config.ts` | 修改 +3行 | 新增 `MD_FONT_DEFAULT` 常量 |
| `electron/main.js` | 修改 +35行 | 新增 `font:getSystemFonts` IPC handler，跨平台字体枚举 |
| `electron/preload.js` | 修改 +1行 | 暴露 `getSystemFonts` 到渲染进程 |
| `src/storage.ts` | 修改 +1行 | 在 `Window.electronAPI` 类型声明中添加 `getSystemFonts` |
| `src/i18n.ts` | 修改 +14行 | 新增字体选择器相关 i18n 标签 |
| `src/App.tsx` | 修改 +10行 | 新增 `mdFontFamily` 状态 + `__applyMdFont` 全局函数 |
| `src/pages/Settings.tsx` | 修改 +80行 | 外观标签页新增 `stg-select-wrap` 下拉框 + 字体预览 |
| `src/pages/FolderWorkspace.tsx` | 修改 +5行 | 从 `window.__getMdFont` 读取并传给 MarkdownEditor |
| `src/components/MarkdownEditor.tsx` | 修改 +10行 | 接口新增 `fontFamily` prop，移除 3 处硬编码 |
| `src/styles/monaco.css` | 修改 -6行 | 移除硬编码 font-family |
| `index.html` | 修改 -1行 | 移除 Monaco 字体 !important 声明 |

---

### Task 1: 添加默认字体常量到 config.ts

**Files:**
- Modify: `src/config.ts`（末尾追加）

**Interfaces:**
- Consumes: 无
- Produces: `MD_FONT_DEFAULT = "Maple Mono NF CN"` — 被 Settings, App, MarkdownEditor 引用

- [ ] **Step 1: 在 config.ts 末尾追加常量**

在 `src/config.ts` 文件末尾（`RECENT_WORKSPACES_COUNT` 之后）添加：

```ts
/** Markdown 编辑器默认字体 */
export const MD_FONT_DEFAULT = "Maple Mono NF CN";
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit src/config.ts
```

- [ ] **Step 3: 提交**

```bash
git add src/config.ts
git commit -m "feat: add MD_FONT_DEFAULT constant to config.ts"
```

---

### Task 2: 主进程添加字体扫描 IPC handler

**Files:**
- Modify: `electron/main.js`（在 `shell:openPath` handler 之后插入）

**Interfaces:**
- Consumes: 无（Node.js 内建模块 `child_process`）
- Produces: `ipcMain.handle("font:getSystemFonts")` → `Promise<string[]>`（去重排序的字体族名列表，失败时返回 `[]`）

- [ ] **Step 1: 在 main.js 顶部导入 execSync**

在 `electron/main.js` 第 3 行 `const fs = require("fs");` 之后添加：

```js
const { execSync } = require("child_process");
```

- [ ] **Step 2: 定义 getSystemFonts 函数并注册 IPC handler**

在 `electron/main.js` 的 `shell:openPath` handler 之后（约第 335 行）插入：

```js
// ── 系统字体扫描 ───────────────────────────────────────────────────────
// 缓存：只扫描一次，后续调用直接返回缓存
let _cachedFonts = null;

function getSystemFonts() {
  if (_cachedFonts) return _cachedFonts;
  try {
    if (process.platform === "win32") {
      // PowerShell 通过 System.Drawing 枚举已安装字体
      const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; [System.Drawing.Text.InstalledFontCollection]::new().Families | ForEach-Object { \\$_.Name } | Sort-Object -Unique"`;
      const output = execSync(cmd, { encoding: "utf-8", timeout: 15000, windowsHide: true });
      _cachedFonts = output.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } else if (process.platform === "darwin") {
      // macOS: system_profiler 查询字体
      const cmd = `system_profiler SPFontsDataType 2>/dev/null | grep "Family:" | sed 's/.*Family: //' | sort -u`;
      const output = execSync(cmd, { encoding: "utf-8", timeout: 15000, shell: "/bin/bash" });
      _cachedFonts = output.split(/\n/).map(s => s.trim()).filter(Boolean);
    } else {
      // Linux: fc-list 查询 fontconfig
      const output = execSync("fc-list : family", { encoding: "utf-8", timeout: 15000 });
      const lines = output.split(/\n/).flatMap(line => line.split(",").map(s => s.trim()).filter(Boolean));
      _cachedFonts = [...new Set(lines)].sort();
    }
  } catch {
    _cachedFonts = [];
  }
  return _cachedFonts;
}

ipcMain.handle("font:getSystemFonts", async () => {
  return getSystemFonts();
});
```

- [ ] **Step 3: 提交**

```bash
git add electron/main.js
git commit -m "feat: add font:getSystemFonts IPC handler with cross-platform system font scanning"
```

---

### Task 3: Preload 暴露 getSystemFonts + TypeScript 类型声明

**Files:**
- Modify: `electron/preload.js`（在 `Shell` 注释块后插入）
- Modify: `src/storage.ts`（在 `Window.electronAPI` 接口中添加）

**Interfaces:**
- Consumes: 主进程 `font:getSystemFonts` handler（Task 2）
- Produces: `window.electronAPI.getSystemFonts(): Promise<string[]>` — 渲染进程可用

- [ ] **Step 1: 在 preload.js 中暴露 API**

在 `electron/preload.js` 第 35 行 `openPath` 之后插入：

```js
// Font
getSystemFonts: () => ipcRenderer.invoke("font:getSystemFonts"),
```

- [ ] **Step 2: 在 storage.ts 的类型声明中添加**

在 `src/storage.ts` 的 `Window.electronAPI` 接口中（`onUpdateStatus` 之后，约第 37 行）添加：

```ts
getSystemFonts: () => Promise<string[]>;
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add electron/preload.js src/storage.ts
git commit -m "feat: expose font:getSystemFonts via preload bridge and TypeScript types"
```

---

### Task 4: 添加字体选择器 i18n 标签

**Files:**
- Modify: `src/i18n.ts`（在 `stgColorThemeDesc` 之后插入）

**Interfaces:**
- Consumes: 无
- Produces: `stgEditorFont`, `stgFontFamily`, `stgFontFamilyDesc`, `stgFontPreview`, `stgDefault` 等翻译键

- [ ] **Step 1: 在 i18n 字典中添加字体选择相关标签**

在 `src/i18n.ts` 的 `stgColorThemeDesc` 之后（约第 245 行）插入：

```ts
stgEditorFont: { zh: "编辑器字体", en: "Editor Font" },
stgFontFamily: { zh: "字体", en: "Font Family" },
stgFontFamilyDesc: { zh: "选择 Markdown 编辑区的显示字体。", en: "Choose the display font for the Markdown editor." },
stgFontPreview: { zh: "AaBbCc 字体预览 The quick brown fox jumps over the lazy dog.", en: "AaBbCc Font Preview The quick brown fox jumps over the lazy dog." },
stgDefault: { zh: "默认", en: "Default" },
stgLoadingFonts: { zh: "正在加载字体列表...", en: "Loading font list..." },
stgNoFonts: { zh: "未找到其他字体", en: "No other fonts found" },
```

- [ ] **Step 2: 提交**

```bash
git add src/i18n.ts
git commit -m "feat: add editor font i18n labels (zh/en)"
```

---

### Task 5: App.tsx 添加 mdFontFamily 状态和全局 setter

**Files:**
- Modify: `src/App.tsx`（在 `useEffect` 初始化块和 `__applyZoom` 注册附近）

**Interfaces:**
- Consumes: `MD_FONT_DEFAULT` from config.ts (Task 1)
- Produces: `window.__applyMdFont(font: string): void` — 供 Settings 页面即时应用字体变更
- Produces: `mdFontFamily` state passed to `AppContent` → `FolderWorkspace` via props

- [ ] **Step 1: 导入 MD_FONT_DEFAULT**

在 `src/App.tsx` 顶部的 import 中，将 `MD_FONT_DEFAULT` 添加到已有的 config import 语句中。当前 import 为：
```ts
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from "./config";
```
改为：
```ts
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT, MD_FONT_DEFAULT } from "./config";
```

- [ ] **Step 2: 在 App 组件中添加 mdFontFamily 状态**

在 `App` 函数中，`setZoom` / `setContentZoom` 状态声明之后（约第 122 行）添加：

```ts
const [mdFontFamily, setMdFontFamily] = useState<string>(() => {
  try {
    const raw = localStorage.getItem("gull_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.mdFontFamily === "string" && parsed.mdFontFamily) return parsed.mdFontFamily;
    }
  } catch {}
  return MD_FONT_DEFAULT;
});
```

- [ ] **Step 3: 注册 __applyMdFont 全局函数**

在已有的 `__applyZoom` / `__applyLang` 注册 useEffect 中（约第 171 行），在 `__applyZoom` 和 `__applyLang` 之后添加：

```ts
(window as any).__applyMdFont = (f: string) => setMdFontFamily(f);
```

在 cleanup 中也添加清理：

```ts
(window as any).__applyMdFont = undefined;
```

- [ ] **Step 4: 在 AppContent 渲染处传递 mdFontFamily**

在 `AppContent` 组件调用处（约第 197 行），添加 `mdFontFamily` prop：

```tsx
<AppContent
  sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
  globalSearchOpen={globalSearchOpen} setGlobalSearchOpen={setGlobalSearchOpen}
  zoom={zoom} contentZoom={contentZoom} setZoom={setZoom} setContentZoom={setContentZoom}
  mdFontFamily={mdFontFamily}
  settingsOpen={settingsOpen}
  onOpenSettings={handleOpenSettings}
  onCloseSettings={handleCloseSettings}
  templateManagerOpen={templateManagerOpen}
  onCloseTemplateManager={() => setTemplateManagerOpen(false)}
/>
```

- [ ] **Step 5: 更新 AppContent 的 props 接口和 Route 渲染**

在 `AppContent` 函数（第 217 行）的 props 解构中添加 `mdFontFamily`：

```ts
function AppContent({
  sidebarOpen, setSidebarOpen,
  globalSearchOpen, setGlobalSearchOpen,
  zoom, contentZoom, setZoom, setContentZoom,
  mdFontFamily,
  settingsOpen, onOpenSettings, onCloseSettings,
  templateManagerOpen, onCloseTemplateManager,
}: {
  // ... 现有类型 ...
  mdFontFamily: string;
})
```

然后在 `FolderWorkspace` Route 渲染处（第 251-252 行）传递 `mdFontFamily`：

```tsx
<Route path="/" element={<FolderWorkspace sidebarOpen={sidebarOpen} zoom={zoom} contentZoom={contentZoom} setZoom={setZoom} setContentZoom={setContentZoom} mdFontFamily={mdFontFamily} />} />
<Route path="/folder/:id" element={<FolderWorkspace sidebarOpen={sidebarOpen} zoom={zoom} contentZoom={contentZoom} setZoom={setZoom} setContentZoom={setContentZoom} mdFontFamily={mdFontFamily} />} />
```

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: 提交**

```bash
git add src/App.tsx
git commit -m "feat: add mdFontFamily state, pass via props chain to FolderWorkspace"
```

---

### Task 6: Settings.tsx 外观标签页新增字体选择卡片

**Files:**
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes:
  - `window.electronAPI.getSystemFonts(): Promise<string[]>` (Task 3)
  - i18n keys (Task 4)
  - `window.__applyMdFont(font: string)` (Task 5)
- Produces: `window.__applyMdFont` 调用，写入 `gull_settings.mdFontFamily`

- [ ] **Step 1: 扩展 SettingsData 接口**

在 `src/pages/Settings.tsx` 第 24-27 行的 `SettingsData` 接口中添加 `mdFontFamily` 字段：

```ts
interface SettingsData {
  theme: "dark" | "light" | "system";
  zoom: number;
  mdFontFamily: string;
}
```

- [ ] **Step 2: 更新 loadSettings 函数**

在 `loadSettings` 函数（第 29-41 行）的 `return` 语句中添加 `mdFontFamily` 字段：

```ts
return {
  theme: ["dark", "light", "system"].includes(parsed.theme) ? parsed.theme : "dark",
  zoom: typeof parsed.zoom === "number" && parsed.zoom >= ZOOM_MIN && parsed.zoom <= ZOOM_MAX ? parsed.zoom : ZOOM_DEFAULT,
  mdFontFamily: typeof parsed.mdFontFamily === "string" && parsed.mdFontFamily ? parsed.mdFontFamily : MD_FONT_DEFAULT,
};
```

并在 fallback 返回中添加：

```ts
return { theme: "dark", zoom: ZOOM_DEFAULT, mdFontFamily: MD_FONT_DEFAULT };
```

- [ ] **Step 3: 导入 MD_FONT_DEFAULT**

在 Settings.tsx 顶部 import 中添加：

```ts
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT, MD_FONT_DEFAULT } from "../config";
```

- [ ] **Step 4: 在 Settings 组件中添加字体相关状态**

在 `Settings` 组件内部，`lang` state 之后（约第 129 行）添加：

```ts
const [fontList, setFontList] = useState<string[]>([]);
const [fontListLoading, setFontListLoading] = useState(false);
```

- [ ] **Step 5: 添加字体列表加载 useEffect**

在 `Settings` 组件内部添加（可以放在现有 `applyThemeClass` useEffect 之后）：

```ts
// 打开外观标签页时加载系统字体列表
useEffect(() => {
  if (activeNav !== "stgAppearance") return;
  if (fontList.length > 0) return;
  setFontListLoading(true);
  const api = (window as any).electronAPI;
  if (api?.getSystemFonts) {
    api.getSystemFonts().then((fonts: string[]) => {
      setFontList(fonts.filter((f: string) => f !== MD_FONT_DEFAULT));
      setFontListLoading(false);
    }).catch(() => {
      setFontListLoading(false);
    });
  } else {
    setFontListLoading(false);
  }
}, [activeNav, fontList.length]);
```

- [ ] **Step 6: 添加字体选择卡片到外观标签页**

在 `src/pages/Settings.tsx` 的 `stgAppearance` 标签页中（`stgColorTheme` 卡片之后，约第 284 行 `</div>` 之后），插入新卡片：

```tsx
{/* 编辑器字体 */}
<div className="stg-card">
  <div className="stg-card-header">{t("stgEditorFont", lang)}</div>
  <div className="stg-row">
    <div className="stg-info">
      <div className="stg-label">{t("stgFontFamily", lang)}</div>
      <div className="stg-hint">{t("stgFontFamilyDesc", lang)}</div>
    </div>
    <div className="stg-control">
      <div className="stg-select-wrap">
        <select
          value={settings.mdFontFamily}
          onChange={(e) => {
            const v = e.target.value;
            const next = { ...settings, mdFontFamily: v };
            setSettings(next);
            saveSettings(next);
            (window as any).__applyMdFont?.(v);
          }}
        >
          <option value={MD_FONT_DEFAULT}>
            {MD_FONT_DEFAULT} ({t("stgDefault", lang)})
          </option>
          {fontListLoading ? (
            <option disabled>{t("stgLoadingFonts", lang)}</option>
          ) : fontList.length === 0 ? (
            <option disabled>{t("stgNoFonts", lang)}</option>
          ) : (
            fontList.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))
          )}
        </select>
      </div>
    </div>
  </div>
  {/* 字体预览 */}
  <div className="stg-row">
    <div
      className="stg-font-preview"
      style={{
        fontFamily: `${settings.mdFontFamily}, monospace`,
        fontSize: 14,
        color: "var(--text-primary)",
        padding: "8px 0",
        lineHeight: 1.6,
      }}
    >
      {t("stgFontPreview", lang)}
    </div>
  </div>
</div>
```

- [ ] **Step 7: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: 提交**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: add font selector card with live preview in Settings Appearance tab"
```

---

### Task 7: FolderWorkspace 接收 mdFontFamily prop 并传递到 MarkdownEditor

**Files:**
- Modify: `src/pages/FolderWorkspace.tsx`（在组件 props 和 MarkdownEditor 渲染处）

**Interfaces:**
- Consumes: `mdFontFamily: string` prop from AppContent (Task 5)
- Produces: 将 `mdFontFamily` 作为 prop 传给 `<MarkdownEditor fontFamily={...} />`

- [ ] **Step 1: 在 FolderWorkspace 的 props 接口中添加 mdFontFamily**

搜索 `FolderWorkspace` 的 props 类型定义。查看当前 props 解构签名（约第 110-130 行），添加 `mdFontFamily`：

```ts
function FolderWorkspace({
  sidebarOpen,
  zoom,
  contentZoom,
  setZoom,
  setContentZoom,
  mdFontFamily,
}: {
  sidebarOpen: boolean;
  zoom: number;
  contentZoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setContentZoom: React.Dispatch<React.SetStateAction<number>>;
  mdFontFamily: string;
})
```

- [ ] **Step 2: 传递给 MarkdownEditor**

在 `MarkdownEditor` 渲染处（约第 877 行）添加 `fontFamily` prop：

```tsx
<MarkdownEditor
  source={source}
  onSourceChange={setSource}
  editorRef={editorRef}
  isPreviewMode={isMdPreview}
  onTogglePreview={() => setIsMdPreview((p) => !p)}
  fontFamily={mdFontFamily}
/>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/pages/FolderWorkspace.tsx
git commit -m "feat: pass mdFontFamily prop from FolderWorkspace to MarkdownEditor"
```

---

### Task 8: MarkdownEditor 使用 fontFamily prop，移除硬编码

**Files:**
- Modify: `src/components/MarkdownEditor.tsx`

**Interfaces:**
- Consumes: `fontFamily: string` prop (Task 7)
- Produces: Monaco 编辑器使用动态字体，不再硬编码

- [ ] **Step 1: 扩展 MarkdownEditorProps 接口**

在 `src/components/MarkdownEditor.tsx` 第 50-56 行的 `MarkdownEditorProps` 接口中添加 `fontFamily`：

```ts
interface MarkdownEditorProps {
  source: string;
  onSourceChange: (value: string) => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  fontFamily: string;
}
```

- [ ] **Step 2: 添加 fontFamily 到解构**

在 `MarkdownEditor` 函数签名（第 64 行）中添加 `fontFamily`：

```ts
function MarkdownEditor({ source, onSourceChange, editorRef, isPreviewMode, onTogglePreview, fontFamily }: MarkdownEditorProps) {
```

- [ ] **Step 3: 构建带 fallback 的字体栈**

在组件内部，构建最终字体栈字符串（在 `isDark` 行之后，约第 81 行）：

```ts
const fontStack = `"${fontFamily}", monospace`;
```

- [ ] **Step 4: 替换 options.fontFamily（第 188-189 行）**

将 `fontFamily:` 行改为：

```ts
fontFamily: fontStack,
```

- [ ] **Step 5: 替换 handleEditorMount 中的硬编码字体（第 115-117 行）**

删除 `const FONT_FAMILY = "'Maple Mono NF CN', ..."` 行，改为：

```ts
editor.updateOptions({ fontFamily: fontStack });
```

- [ ] **Step 6: 替换注入 style 中的字体（第 121-126 行）**

```ts
style.textContent =
  `.monaco-editor .view-lines,` +
  `.monaco-editor .view-lines * {` +
  `  font-family: ${fontStack} !important;` +
  `}`;
```

注意：`handleEditorMount` 的依赖数组中需要添加 `fontStack`：

```ts
}, [editorRef, syncEditorToPreview, fontStack]);
```

- [ ] **Step 7: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: 提交**

```bash
git add src/components/MarkdownEditor.tsx
git commit -m "feat: use fontFamily prop in MarkdownEditor, remove hardcoded font"
```

---

### Task 9: 移除 monaco.css 和 index.html 中的硬编码字体

**Files:**
- Modify: `src/styles/monaco.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: 无（清理残留）
- Produces: Monaco 编辑区字体由 JS 动态控制，不再受 CSS 硬编码覆盖

- [ ] **Step 1: 移除 monaco.css 中的硬编码字体**

在 `src/styles/monaco.css` 中：

删除第 3-10 行（包含注释和两个 CSS 块）：
```css
/* Monaco editor font — override everything */
.monaco-editor {
  --monaco-monospace-font: ...
}
.monaco-editor .view-lines,
.monaco-editor .view-lines * {
  font-family: ... !important;
}
```

- [ ] **Step 2: 移除 index.html 中的 Monaco 字体声明**

在 `index.html` 第 18-19 行，删除或注释掉：
```css
/* Monaco editor font */
.monaco-editor,.monaco-editor .view-lines,.monaco-editor .view-lines *{font-family:...!important}
```

- [ ] **Step 3: 验证构建**

```bash
npm run build
```

- [ ] **Step 4: 提交**

```bash
git add src/styles/monaco.css index.html
git commit -m "fix: remove hardcoded Monaco font-family from CSS, now controlled via JS"
```

---

### 验证清单

全部 Task 完成后，逐项确认：

1. **`npm run dev`** — 应用正常启动，无编译错误
2. **打开设置 → 外观** — 看到"编辑器字体"卡片，下拉框出现
3. **字体列表加载** — 默认项为 "Maple Mono NF CN (默认)"，其余系统字体按字母排列
4. **选择字体** — 预览区实时显示对应字体；关闭设置，Markdown 编辑区立即切换字体
5. **刷新页面** — 字体设置在 `localStorage` 中持久化，刷新后不变
6. **清理缓存** — 清除 `gull_settings`，首次使用自动回退为 `MD_FONT_DEFAULT`
7. **Excel 编辑区** — 字体未受影响
8. **浏览器环境**（非 Electron）— IPC 调用失败，仅显示默认选项，应用不崩溃
