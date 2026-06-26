# Markdown 编辑区字体选择

**日期**：2026-06-27
**类型**：功能
**状态**：已批准

---

## 目标

在设置 → 外观标签页中新增字体选择栏，用户可以从系统已安装字体中选择一款应用到 Markdown 编辑区（Monaco Editor）。

---

## 架构

```
electron/main.js           → 新增 IPC handler: getSystemFonts，调用系统 API 枚举字体
electron/preload.js        → 暴露 electronAPI.getSystemFonts()
src/pages/Settings.tsx     → 外观标签页新增 "编辑器字体" 卡片，下拉框 + 预览
                             SettingsData 新增 mdFontFamily 字段
src/config.ts              → 新增 MD_FONT_DEFAULT = "Maple Mono NF CN"
src/App.tsx                → 初始化时从 localStorage 读取 mdFontFamily
src/pages/FolderWorkspace.tsx → 将 mdFontFamily 传给 MarkdownEditor
src/components/MarkdownEditor.tsx → 接收 fontFamily prop，动态设置 Monaco 字体
                                     移除所有硬编码字体字符串
src/styles/monaco.css      → 移除硬编码 font-family
index.html                 → 移除 Monaco 字体硬编码
```

## 数据流

```
系统字体 (OS)
  ↓ IPC (electronAPI.getSystemFonts → systemPreferences / fc-list)
Settings 组件 → 下拉选择器显示所有系统字体
  ↓ 用户选择
localStorage gull_settings.mdFontFamily
  ↓ App.tsx 初始化读取
FolderWorkspace (via props)
  ↓ fontFamily prop
MarkdownEditor → 注入 Monaco Editor (options + CSS + updateOptions)
```

## 详细设计

### 1. 主进程：系统字体枚举

- **处理器名称**：`font:getSystemFonts`
- **实现**（`electron/main.js`）：
  - **Windows**：读取 `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts` 注册表，或遍历 `C:\Windows\Fonts` 目录
  - **macOS**：使用 `systemPreferences` API 或 `defaults` 命令
  - **Linux**：调用 `fc-list : family` 命令
- **返回值**：`string[]` — 去重并排序的字体族名列表
- **性能**：扫描一次结果缓存到模块变量，后续调用直接返回缓存

### 2. Preload：暴露 API

```js
getSystemFonts: () => ipcRenderer.invoke("font:getSystemFonts"),
```

TypeScript 类型声明补充 `Window.electronAPI.getSystemFonts(): Promise<string[]>`。

### 3. 存储

- **Key**：`gull_settings` (现有，只新增字段)
- **新增字段**：`mdFontFamily: string`，默认值 `"Maple Mono NF CN"`
- `SettingsData` 接口扩展：
  ```ts
  interface SettingsData {
    theme: "dark" | "light" | "system";
    zoom: number;
    mdFontFamily: string;
  }
  ```

### 4. 设置 UI

外观标签页新增一张卡片：

- **卡片标题**："编辑器字体"
- **下拉选择器**：默认项为 "Maple Mono NF CN (默认)"，其余按字母排序
- **字体预览**：选中字体名称后，用该字体渲染一行预览文字（如 `AaBbCc 字体预览 The quick brown fox`）
- **交互**：
  - 打开外观标签页时触发 IPC 获取系统字体列表
  - 选择后即时生效（通过 `window.__applyMdFont` 全局函数）
  - 保存到 localStorage

### 5. MarkdownEditor 改造

- **新增 prop**：`fontFamily: string`
- **移除硬编码**：
  - `handleEditorMount` 中 `FONT_FAMILY` 常量 → 改为从 prop 构建
  - `options.fontFamily` → 使用 prop 值
  - 动态注入的 `<style>` 元素 → 使用 prop 值
- **fallback**：`fontFamily + ", monospace"`

### 6. 清理残留

| 位置 | 操作 |
|---|---|
| `src/styles/monaco.css:5,9` | 移除硬编码 font-family |
| `index.html:19` | 移除 Monaco 字体 !important 声明 |
| `src/components/MarkdownEditor.tsx:117,200` | 改为 props 传递 |

## 生效范围

- **影响**：仅 Markdown 编辑区（Monaco Editor 代码区）
- **不影响**：Excel 编辑区、Markdown 预览区、软件 UI（设置面板、侧边栏、工具栏、菜单栏等）

## 边界情况

- **字体未安装**：默认 "Maple Mono NF CN" 不存在时，Monaco 自动 fallback 到 `monospace`
- **IPC 调用失败**：静默降级，仅显示默认选项，下拉框仍然可用（显示默认字体）
- **空字体列表**：只显示默认选项
- **主题切换**：字体设置不受亮色/暗色模式影响
- **首次使用**：`gull_settings` 不存在或缺少 `mdFontFamily` 字段时，自动补全为默认值

## 测试

- 默认值回退测试
- 字体选择后 Monaco 编辑器即时应用
- 字体设置持久化（刷新后恢复）
- IPC 调用失败降级测试
- HTML 预览区不受字体设置影响
