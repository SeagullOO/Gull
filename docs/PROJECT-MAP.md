# Gull -- 项目地图 (Project Map)

> 自包含的完整项目导航文档。新开发者读完本文即可理解整个项目的结构、架构和所有关键文件。
> 生成日期: 2026-06-26 | 基于 refactor 后代码库 (Tasks 1-9 完成)

---

## 1. 项目概述

**Gull** 是一款游戏策划文档 (Game Design Document) 桌面工具。基于 Electron + React + Vite + TypeScript 构建，支持 Markdown 文档、Excel 电子表格和 DOCX 富文本文档的编辑管理。文件系统原生存储，离线可用，受 Obsidian 暗色主题设计语言影响。

| 属性 | 值 |
|------|------|
| 名称 | Gull (GullDoc) |
| 类型 | Electron 桌面应用 / Web SPA |
| 版本 | 1.0.3 |
| 技术栈 | React 18 + Vite 5 + TypeScript 5.5 + Tailwind CSS 3 |
| 运行时 | Electron 42 (桌面) / 浏览器 (降级模式) |
| 存储 | Electron: 原生文件系统 / 浏览器: IndexedDB (Dexie.js) |
| 编辑器 | Monaco (Markdown / 代码), TipTap (富文本 DOCX), Handsontable (Excel) |
| 打包 | electron-builder (Windows portable) |
| 许可 | 私有 |

---

## 2. 完整目录树

```
Gull/
├── index.html                    # HTML 入口，含 Handsontable CDN 加载和全局 <style>
├── package.json                  # 依赖、scripts、electron-builder 配置
├── vite.config.ts                # Vite 构建配置
├── vitest.config.ts              # Vitest 单元测试配置 (jsdom 环境)
├── tsconfig.json                 # TypeScript 严格模式配置
├── tailwind.config.js            # Tailwind CSS 内容路径配置
├── postcss.config.js             # PostCSS (Tailwind + autoprefixer)
├── CLAUDE.md                     # Claude Code 项目指令 (技术栈、代码规范、已知陷阱)
├── PROJECT.md                    # 旧版项目文档 (v1.0.0，本文件是更完整的替代)
│
├── electron/
│   ├── main.js                   # Electron 主进程 (窗口管理、IPC、文件系统、自动更新)
│   └── preload.js                # 预加载脚本 (contextBridge 暴露 electronAPI)
│
├── public/
│   └── vendor/                   # CDN 资源本地化 (Handsontable, HyperFormula)
│
├── scripts/
│   └── download-vendor.mjs       # CDN 资源下载脚本 (npm run vendor:update)
│
├── docs/
│   ├── PROJECT-MAP.md            # 本文件 -- 项目地图
│   ├── reference/
│   │   ├── code-modification-guide.md    # 代码修改指南
│   │   ├── settings-content-reference.md # Settings 面板数据结构参考
│   │   └── ui-default-sizes.md           # UI 默认尺寸规范
│   ├── archive/
│   │   ├── 2026-06-23-monaco-editor-migration-plan.md     # Monaco 迁移计划 (历史)
│   │   └── 2026-06-23-monaco-editor-migration-design.md   # Monaco 迁移设计 (历史)
│   └── superpowers/
│       ├── plans/2026-06-26-deep-refactor-plan.md         # 深度重构计划
│       └── specs/2026-06-26-deep-refactor-design.md       # 深度重构设计
│
├── src/
│   ├── main.tsx                  # React 渲染入口 (createRoot)
│   ├── App.tsx                   # 根组件 (Router、全局状态、ErrorBoundary、缩放/主题初始化)
│   ├── index.css                 # CSS 入口 (@import styles/*.css + @tailwind + global reset)
│   ├── config.ts                 # 集中配置 (Zoom、Colors、Layout、Shortcuts、Toolbar)
│   ├── types.ts                  # 核心数据类型 (FolderFile, Folder, Template) + generateId()
│   ├── db.ts                     # IndexedDB 层 (Dexie.js GullDB 单例 + v1→v2 迁移)
│   ├── storage.ts                # 存储抽象层 (Electron fs / IndexedDB 双模式)
│   ├── i18n.ts                   # 国际化 (中/英翻译字典)
│   ├── monaco-theme.ts           # Monaco Editor 暗/亮主题定义
│   ├── vite-env.d.ts             # Vite 类型声明
│   │
│   ├── types/                    # (空目录 -- 类型定义在 src/types.ts 中)
│   │
│   ├── styles/
│   │   ├── tokens.css            # CSS 变量设计令牌 (暗色/亮色 Obsidian 调色板)
│   │   ├── utilities.css         # 工具类 (滚动条样式、字体缩放感知)
│   │   ├── components.css        # 组件样式 (按钮、输入框、工具栏、树、面板等)
│   │   ├── handsontable.css      # Handsontable 覆盖 (冻结行/列、选中、滚动条)
│   │   ├── markdown.css          # Markdown 预览样式
│   │   ├── monaco.css            # Monaco Editor 容器样式
│   │   └── tiptap.css            # TipTap 富文本编辑器样式
│   │
│   ├── pages/
│   │   ├── FolderWorkspace.tsx   # 核心工作区页面 (文件编辑、面板切换、状态栏)
│   │   └── Settings.tsx          # 设置面板 (通用/外观/存储/关于)
│   │
│   ├── components/
│   │   ├── ActivityBar.tsx       # 活动栏 (主页/工作区切换、新建文件按钮)
│   │   ├── ContextMenu.tsx       # Excel 右键菜单 (剪切/复制/粘贴/插入/删除/冻结/排序)
│   │   ├── CustomColorPicker.tsx # 自定义颜色选择器 (调色板 + 取色器 + HSV 滑条)
│   │   ├── DocxEditor.tsx        # DOCX 编辑器 (TipTap 富文本封装)
│   │   ├── DocxToolbar.tsx       # DOCX 编辑工具栏 (粗体/斜体/标题/列表/表格)
│   │   ├── DropPanel.tsx         # 拖拽到文件夹导入面板
│   │   ├── EditorToolbar.tsx     # Markdown 编辑工具栏 (粗体/斜体/标题/列表/预览)
│   │   ├── ExcelToolbar.tsx      # Excel 工具栏 (字体/对齐/边框/颜色/合并)
│   │   ├── FileExplorer.tsx      # 文件资源管理器 (文件树、拖拽、重命名、搜索)
│   │   ├── FilePicker.tsx        # 文件选择器对话框 (用于 DOCX 插入链接)
│   │   ├── FormulaBar.tsx        # Excel 公式栏
│   │   ├── GlobalSearchModal.tsx # 全局搜索模态框
│   │   ├── HomeView.tsx          # 主页视图 (欢迎页面)
│   │   ├── icons.tsx             # SVG 图标组件库 (~35 个图标)
│   │   ├── MarkdownEditor.tsx    # Markdown 编辑器 (Monaco 封装)
│   │   ├── Panel.tsx             # 通用面板容器 (头部 + 内容)
│   │   ├── PanelLayout.tsx       # 面板布局 (居中浮层、遮罩、响应式)
│   │   ├── Sidebar.tsx           # 侧边栏 (工作区列表、文件夹 CRUD、搜索)
│   │   ├── StatusBadge.tsx       # 保存状态徽章
│   │   ├── TemplateManager.tsx   # 模版管理器面板
│   │   ├── TemplateModal.tsx     # 从模版新建工作区对话框
│   │   ├── TitleBar.tsx          # 自定义标题栏 (窗口控制、文件菜单、搜索)
│   │   ├── Toolbar.tsx           # 通用工具栏容器
│   │   ├── WorkspaceHeader.tsx   # 工作区头部 (标题面包屑、标签页操作栏)
│   │   └── WorkspaceTabs.tsx     # 工作区标签页 (拖拽排序)
│   │
│   ├── hooks/
│   │   ├── markdown-converter.ts # Markdown → HTML 转换 (marked + DOMPurify)
│   │   ├── useDocxEditor.ts      # DOCX 编辑器 Hook (TipTap 初始化 + 导入导出)
│   │   ├── useExcelEditor.ts     # Excel 编辑器 Hook (Handsontable 初始化 + CRUD)
│   │   ├── useFileTabs.ts        # 文件标签页管理 Hook
│   │   ├── useKeyboardShortcuts.ts # 键盘快捷键 Hook (统一调度)
│   │   ├── useMarkdownEditor.ts  # Markdown 编辑器 Hook (Monaco + 双向滚动)
│   │   ├── useMetaUndo.ts        # 元数据撤销 Hook (重命名/删除恢复)
│   │   ├── useScrollSync.ts      # 滚动同步 Hook (编辑/预览双向同步)
│   │   ├── useSplitterDrag.ts    # 分隔线拖拽 Hook
│   │   ├── useTabDrag.ts         # 标签页拖拽排序 Hook (中点法)
│   │   └── useWorkspaceZoom.ts   # 工作区缩放 Hook
│   │
│   ├── utils/
│   │   ├── colorUtils.ts         # 颜色工具 (HSV/Hex/RGB 互转)
│   │   ├── docxUtils.ts          # DOCX 工具 (mammoth 解析、Tiptap HTML 转换)
│   │   ├── exportUtils.ts        # 导出工具 (Markdown/ZIP/DOCX/Excel 导出)
│   │   └── xlsxUtils.ts          # Excel 工具 (ExcelJS 读写 .xlsx)
│   │
│   └── __tests__/
│       ├── config.test.ts        # 配置导出完整性测试
│       └── utils/
│           └── colorUtils.test.ts # 颜色转换单元测试
│
├── dist/                         # Vite 生产构建输出
├── release/                      # electron-builder 打包输出
├── node_modules/                 # 依赖
└── .claude/                      # Claude Code 项目配置
```

---

## 3. 页面路由

| 路由 | 组件 | 用途 |
|------|------|------|
| `/` | FolderWorkspace | 主页（文件夹列表 + 欢迎页） |
| `/folder/:id` | FolderWorkspace | 指定工作区文件编辑页 |
| _(state)_ | Settings | 设置面板 (浮层覆盖，不占用路由) |
| _(state)_ | TemplateManager | 模版管理器 (浮层覆盖，不占用路由) |

路由使用 React Router v6 的 `BrowserRouter`，Settings 和 TemplateManager 通过 React state 控制显示/隐藏，不改变 URL。

---

## 4. 组件索引

### 核心布局组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| App | `src/App.tsx` | 270 | 根组件：Router、全局状态、ErrorBoundary、缩放/主题初始化 |
| TitleBar | `src/components/TitleBar.tsx` | 198 | 自定义标题栏：窗口控制(最小化/最大化/关闭)、文件菜单、搜索按钮 |
| ActivityBar | `src/components/ActivityBar.tsx` | 158 | 左侧活动栏：主页/工作区切换、新建文件(3 种)、模版保存 |
| Sidebar | `src/components/Sidebar.tsx` | 319 | 侧边栏：工作区列表 CRUD、搜索过滤、最近使用 |
| PanelLayout | `src/components/PanelLayout.tsx` | 110 | 面板布局：居中浮层、背景遮罩、响应式尺寸约束 |

### 页面组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| FolderWorkspace | `src/pages/FolderWorkspace.tsx` | 912 | 核心工作区：文件编辑切换、面板管理、状态栏、自动保存、PDF 导出 |
| Settings | `src/pages/Settings.tsx` | 411 | 设置面板：通用(语言)、外观(主题/缩放)、存储(路径)、关于(版本/许可) |
| HomeView | `src/components/HomeView.tsx` | 81 | 主页欢迎视图 |

### 编辑器组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| MarkdownEditor | `src/components/MarkdownEditor.tsx` | 234 | Monaco 编辑器封装：Markdown 编辑、双向滚动、预览模式 |
| DocxEditor | `src/components/DocxEditor.tsx` | 102 | TipTap 富文本编辑器封装：DOCX 编辑 |
| FormulaBar | `src/components/FormulaBar.tsx` | 92 | Excel 公式栏：单元格内容/公式编辑 |

### 工具栏组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| Toolbar | `src/components/Toolbar.tsx` | 99 | 通用工具栏容器 |
| EditorToolbar | `src/components/EditorToolbar.tsx` | 194 | Markdown 编辑工具栏 |
| ExcelToolbar | `src/components/ExcelToolbar.tsx` | 597 | Excel 工具栏：字体、颜色、对齐、边框、合并 |
| DocxToolbar | `src/components/DocxToolbar.tsx` | 110 | DOCX 编辑工具栏 |

### 文件管理组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| FileExplorer | `src/components/FileExplorer.tsx` | 804 | 文件资源管理器：树形视图、拖拽移动、重命名、搜索、引导线 |
| FilePicker | `src/components/FilePicker.tsx` | 220 | 文件选择器对话框：用于 DOCX 插入链接 |

### 弹窗/面板组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| GlobalSearchModal | `src/components/GlobalSearchModal.tsx` | 242 | 全局搜索：跨工作区文件内容搜索 |
| ContextMenu | `src/components/ContextMenu.tsx` | 634 | Excel 右键菜单：剪切、复制、粘贴、插入行列、删除、排序、冻结 |
| TemplateManager | `src/components/TemplateManager.tsx` | 95 | 模版管理器面板 |
| TemplateModal | `src/components/TemplateModal.tsx` | 97 | 从模版新建工作区对话框 |
| Panel | `src/components/Panel.tsx` | 45 | 通用面板容器组件 |
| CustomColorPicker | `src/components/CustomColorPicker.tsx` | 309 | 自定义颜色选择器：预设色板 + 取色器 + HSV 滑条 |

### 工作区头部组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| WorkspaceHeader | `src/components/WorkspaceHeader.tsx` | 240 | 工作区头部：标题面包屑、操作按钮 |
| WorkspaceTabs | `src/components/WorkspaceTabs.tsx` | 71 | 标签页栏：文件标签渲染 |
| DropPanel | `src/components/DropPanel.tsx` | 53 | 拖拽导入覆盖层 |

### 通用组件

| 组件 | 路径 | 行数 | 职责 |
|------|------|------|------|
| icons | `src/components/icons.tsx` | 298 | SVG 图标组件库 (~35 个图标) |
| StatusBadge | `src/components/StatusBadge.tsx` | 71 | 保存状态徽章 (saved/unsaved/saving) |

---

## 5. Hooks 索引

| Hook | 路径 | 行数 | 职责 |
|------|------|------|------|
| markdown-converter | `src/hooks/markdown-converter.ts` | 100 | Markdown 文本 → HTML (marked + DOMPurify 净化) |
| useDocxEditor | `src/hooks/useDocxEditor.ts` | 97 | DOCX 编辑器 Hook: TipTap 初始化、mammoth导入、HTML导出 |
| useExcelEditor | `src/hooks/useExcelEditor.ts` | 417 | Excel 编辑器 Hook: Handsontable 初始化、数据 CRUD、样式管理 |
| useFileTabs | `src/hooks/useFileTabs.ts` | 116 | 文件标签页管理: 打开/关闭/切换/重排序 |
| useKeyboardShortcuts | `src/hooks/useKeyboardShortcuts.ts` | 22 | 键盘快捷键统一调度 (委托 config.ts KEYBINDINGS) |
| useMarkdownEditor | `src/hooks/useMarkdownEditor.ts` | 176 | Markdown 编辑器 Hook: Monaco 实例管理、预览切换 |
| useMetaUndo | `src/hooks/useMetaUndo.ts` | 66 | 元数据撤销: 文件和文件夹重命名/删除的 Ctrl+Z 恢复 |
| useScrollSync | `src/hooks/useScrollSync.ts` | 121 | 滚动同步: 编辑区和预览区双向同步滚动 |
| useSplitterDrag | `src/hooks/useSplitterDrag.ts` | 105 | 分隔线拖拽: 调整侧边栏宽度 |
| useTabDrag | `src/hooks/useTabDrag.ts` | 190 | 标签页拖拽排序: 中点法算法、拖拽指示器 |
| useWorkspaceZoom | `src/hooks/useWorkspaceZoom.ts` | 106 | 工作区缩放: Ctrl+滚轮、缩放值管理 |

---

## 6. Utils 索引

| 工具 | 路径 | 行数 | 职责 |
|------|------|------|------|
| colorUtils | `src/utils/colorUtils.ts` | 98 | HSV/Hex/RGB 颜色空间互转 (6 个纯函数) |
| docxUtils | `src/utils/docxUtils.ts` | 180 | DOCX 工具: mammoth .docx→HTML 解析、Tiptap HTML 生成 |
| exportUtils | `src/utils/exportUtils.ts` | 285 | 导出工具: Markdown/ZIP/DOCX/Excel 多格式导出 |
| xlsxUtils | `src/utils/xlsxUtils.ts` | 232 | Excel 工具: ExcelJS 读写 .xlsx、CSV→xlsx 迁移 |

---

## 7. CSS 模块索引

| CSS 文件 | 路径 | 行数 | 用途 |
|------|------|------|------|
| tokens | `src/styles/tokens.css` | 131 | 设计令牌: CSS 变量体系 (暗色/亮色)、root 容器、字体 |
| utilities | `src/styles/utilities.css` | 38 | 工具类: 缩放感知容器、滚动条样式、Handsontable 全局覆盖 |
| components | `src/styles/components.css` | 998 | 组件样式: 按钮、输入框、工具栏、文件树、标签页、面板等 |
| handsontable | `src/styles/handsontable.css` | 154 | Handsontable 样式覆盖: 冻结行/列、选中、滚动条、右键菜单 |
| markdown | `src/styles/markdown.css` | 109 | Markdown 预览样式: 标题、代码块、表格、引用块 |
| monaco | `src/styles/monaco.css` | 31 | Monaco 编辑器容器: 高度适配、主题同步 |
| tiptap | `src/styles/tiptap.css` | 120 | TipTap 编辑器: 富文本内容样式、ProseMirror 覆盖 |

所有 CSS 通过 `src/index.css` 的 `@import` 级联引入。

---

## 8. CSS 变量体系

Gull 采用 Obsidian 风格的 Nord Blue 暗色调色板作为设计令牌。

### 暗色主题 (:root)

| 变量 | 值 | 用途 |
|------|------|------|
| `--bg-darkest` | #181818 | 最暗背景 (窗口底色) |
| `--bg-root` | #181818 | 根背景 (与 darkest 一致) |
| `--bg-panel` | #1F1F1F | 面板/侧边栏背景 |
| `--bg-surface` | #212121 | 卡片/浮层背景 |
| `--bg-hover` | rgba(255,255,255,0.06) | 悬停态 |
| `--bg-active` | rgba(255,255,255,0.10) | 激活态 |
| `--bg-selected` | rgba(168,130,255,0.42) | 选中态 |
| `--text-primary` | #D5D5D5 | 主文字色 |
| `--text-secondary` | #A5A5A5 | 次要文字色 |
| `--text-tertiary` | #666666 | 辅助文字色 |
| `--border-subtle` | rgba(255,255,255,0.08) | 弱边框 |
| `--border-medium` | rgba(255,255,255,0.14) | 中等边框 |
| `--accent` | #a882ff | 强调色 (紫色系) |
| `--accent-hover` | #b99aff | 强调色悬停 |
| `--accent-bg` | rgba(168,130,255,0.25) | 强调色背景 |
| `--danger` | #e5484d | 危险/删除色 |
| `--warning` | #e5a023 | 警告色 |

### 亮色主题 (:root.light)

- 颜色基值取反: 底色白色系、文字深色系
- 强调色 `--accent` 保持一致 (#a882ff)
- 通过 `document.documentElement.classList.toggle("light")` 切换
- 偏好存储在 localStorage `gull_settings.theme` (值: "dark" | "light" | "system")
- Font family: Inter > system-ui > Noto Sans SC

---

## 9. 数据层

### 类型定义 (types.ts → db.ts → storage.ts)

```
types.ts                              db.ts                         storage.ts
┌──────────────────────┐    ┌───────────────────────────┐    ┌──────────────────────────┐
│ interface FolderFile │    │ class GullDB extends Dexie│    │ storageLoadFolders()     │
│ interface Folder     │───>│  folders: Table<Folder>   │───>│ storageSaveFolder()       │
│ interface Template   │    │  templates: Table<Template│    │ storageGetFolder()        │
│ generateId()         │    │  v1→v2 migration          │    │ storageDeleteFolder()     │
└──────────────────────┘    └───────────────────────────┘    │                           │
                                                              │ Electron 文件系统适配器:   │
                                                              │ - 工作区 → 子目录           │
                                                              │ - files → 真实文件           │
                                                              │ - folders → 子目录           │
                                                              │ - 模板 → templates.json     │
                                                              └──────────────────────────┘
```

### 数据模型

**FolderFile**: 单个文件
- `id: string` -- 唯一 ID (generateId())
- `name: string` -- 文件名 (含相对路径)
- `type: "md" | "excel" | "docx"` -- 文件类型
- `content: any` -- 文件内容 (md=字符串, excel={data,colHeaders,cellMeta}, docx=HTML 字符串)
- `createdAt/updatedAt: number` -- 时间戳

**Folder**: 工作区
- `id?: number` -- 自增 ID 或 hash
- `name: string` -- 工作区名称
- `files: FolderFile[]` -- 文件列表
- `folders?: string[]` -- 子文件夹路径列表
- `createdAt/updatedAt: number` -- 时间戳

**Template**: 工作区模版
- `id?: number` -- 自增 ID
- `name: string` -- 模版名称
- `files: FolderFile[]` -- 预置文件结构
- `createdAt: number` -- 创建时间戳

### 存储模式

| 环境 | 工作区索引 | 文件内容 | 模版 |
|------|----------|---------|------|
| Electron | 文件系统 (dataPath/*/子目录) | 文件系统 (真实文件) | templates.json |
| 浏览器 | IndexedDB (folders 表) | IndexedDB (内联在 folders.files) | IndexedDB (templates 表) |

---

## 10. Electron IPC 通道

### invoke (请求-响应)

| Channel | 方向 | 参数 | 返回 | 用途 |
|---------|------|------|------|------|
| `fs:readFile` | renderer→main | filename | string\|null | 读文本文件 |
| `fs:readFileBinary` | renderer→main | filename | base64\|null | 读二进制文件 |
| `fs:writeFile` | renderer→main | filename, data | boolean | 写文本文件 |
| `fs:writeFileBinary` | renderer→main | filename, base64 | boolean | 写二进制文件 |
| `fs:deleteFile` | renderer→main | filename | boolean | 删除文件 |
| `fs:listFiles` | renderer→main | - | {name,isDirectory}[] | 列出工作区 (仅目录) |
| `fs:mkdir` | renderer→main | dirPath | boolean | 创建目录 |
| `fs:rmdir` | renderer→main | dirPath | boolean | 递归删除目录 |
| `fs:rename` | renderer→main | oldPath, newPath | boolean | 重命名/移动 |
| `fs:listDir` | renderer→main | dirPath | {name,path,isDirectory}[] | 递归列出目录内容 |
| `fs:copyWorkspace` | renderer→main | srcDir | string\|null | 复制工作区到用户选择位置 |
| `export:selectFolder` | renderer→main | - | string\|null | 选择导出目标目录 |
| `export:writeFiles` | renderer→main | basePath, files[] | {success,error?,count} | 批量写出文件 |
| `dialog:selectFolder` | renderer→main | - | string\|null | 选择工作区文件夹 (导入) |
| `fs:readDir` | renderer→main | dirPath | {name,isDirectory,isFile}[] | 读取任意目录 (安全约束) |
| `fs:readFileAt` | renderer→main | filePath | string\|null | 读任意文件 (安全约束) |
| `fs:readFileAtBinary` | renderer→main | filePath | base64\|null | 读任意二进制文件 |
| `zoom:setFactor` | renderer→main | factor | void | Electron 原生缩放因子 (当前锁定 1.0) |
| `getDataPath` | renderer→main | - | string | 获取数据目录路径 |
| `selectStoragePath` | renderer→main | - | string\|null | 更改存储路径 |
| `shell:openPath` | renderer→main | path | string | 在系统文件管理器中打开 |
| `update:check` | renderer→main | - | {success?,version?,error?,dev?} | 检查更新 |
| `update:download` | renderer→main | - | {success?,error?} | 下载更新 |
| `update:install` | renderer→main | - | void | 安装更新并重启 |

### send (单向消息)

| Channel | 方向 | 用途 |
|---------|------|------|
| `window-close` | renderer→main | 关闭窗口 |
| `window-minimize` | renderer→main | 最小化窗口 |
| `window-maximize` | renderer→main | 最大化/还原窗口 |
| `window-query-max` | renderer→main | 查询窗口最大化状态 |

### on (main→renderer 事件推送)

| Event | 方向 | 用途 |
|-------|------|------|
| `window-maximized` | main→renderer | 窗口已最大化 |
| `window-unmaximized` | main→renderer | 窗口已还原 |
| `update:checking` | main→renderer | 正在检查更新 |
| `update:available` | main→renderer | 发现新版本 |
| `update:not-available` | main→renderer | 已是最新 |
| `update:progress` | main→renderer | 下载进度 (%) |
| `update:downloaded` | main→renderer | 下载完成 |
| `update:error` | main→renderer | 更新出错 |

---

## 11. 配置系统 (config.ts)

### 导出分组

| 分组 | 导出项 | 用途 |
|------|------|------|
| **Zoom** | ZOOM_DEFAULT/MIN/MAX/STEP/REFERENCE, CONTENT_ZOOM_* | UI 缩放 (Ctrl+滚轮) 和内容缩放 |
| **Colors** | COLOR_BORDER, COLOR_TEXT_SECONDARY, COLOR_ACCENT, COLOR_BG_PANEL, COLOR_BG_SELECTED | 统一颜色常量 (映射 CSS 变量) |
| **Layout** | PANEL_WIDTH/MIN_WIDTH/MAX_WIDTH, SPLITTER_WIDTH/HIT, ACTIVITY_BAR_WIDTH, TITLE_BAR_* | 面板/栏位尺寸 |
| **PanelLayout** | PANEL_LAYOUT_WIDTH/HEIGHT/MAX_WIDTH/MIN_WIDTH/MIN_HEIGHT, PANEL_BACKDROP | Settings/TemplateManager 共享面板尺寸 |
| **FileTree** | EXPLORER_HEADER_HEIGHT, TREE_INDENT_*, TREE_ICON_*, TREE_GUIDE_*, TREE_CHEVRON_* | 文件树布局精确计算参数 |
| **Window** | WINDOW_WIDTH/HEIGHT/MIN_WIDTH/MIN_HEIGHT, MAX_FILE_READ_SIZE | Electron 窗口和文件读取限制 |
| **Keybindings** | KEYBINDINGS, KeyBinding, matchesKey() | 所有键盘快捷键集中定义 |
| **Toolbar** | TOOLBAR_PADDING/GAP/BTN_*, TOOLBAR_DIVIDER_* | 工具栏按钮排版参数 |
| **Misc** | RECENT_WORKSPACES_COUNT | 其他配置常量 |

---

## 12. 国际化 (i18n.ts)

- 支持 中文 (zh) 和 English (en) 两种语言
- 语言偏好存储在 localStorage `gull_lang`
- 切换语言通过 `window.__applyLang()` 回调触发整个 App 重新 key 渲染
- 翻译覆盖约 160 个 key，涵盖所有 UI 文案
- 函数: `t(key, lang?)` 获取翻译、`getLang()` / `setLang(lang)` 管理语言状态

---

## 13. 构建与部署

### Scripts

| 命令 | 用途 |
|------|------|
| `npm run dev` | Vite 开发服务器 (localhost:5173) |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run preview` | Vite 预览生产构建 |
| `npm run electron:dev` | Electron 开发模式 (vite + electron 并行) |
| `npm run electron:build` | Electron 打包 (Windows portable) |
| `npm run electron:start` | 直接用 Electron 启动 |
| `npm run vendor:update` | 下载 Handsontable/HyperFormula CDN 资源到 public/vendor/ |
| `npm test` | 运行 Vitest 单元测试 (单次) |
| `npm run test:watch` | Vitest 监视模式 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

### 打包配置 (package.json build 字段)

- 打包格式: Windows portable (portable.exe)
- 输出目录: `release/`
- ASAR 打包: 启用
- 自动更新: GitHub Releases (需配置 repo owner)
- 镜像: `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`

### 关键技术注意事项

- Handsontable CDN 通过 `<script>` 标签在 `index.html` 中加载; 其 CSS 优先级高, 需在 `<style>` 块中用 `!important` 覆盖
- Electron 主进程锁定 `setZoomFactor(1)`, 所有缩放由 CSS zoom 管理, 避免异步时序问题
- Monaco Editor 暗色主题通过 `monaco-theme.ts` 动态定义, 从 CSS 变量读取当前配色
- HMR 安全: IndexedDB 实例挂在 `window.__GULL_DB__` 避免热更新时重复连接

---

## 14. 测试

### 测试框架

- Vitest 4.x + jsdom 环境
- 测试文件位置: `src/__tests__/**/*.test.{ts,tsx}`
- 覆盖率提供者: v8

### 当前测试覆盖

| 测试文件 | 覆盖内容 |
|------|------|
| `src/__tests__/utils/colorUtils.test.ts` | hexToRgb, rgbToHex, hexToHsv, hsvToHex (含 roundtrip) |
| `src/__tests__/config.test.ts` | config.ts 导出组完整性 (ZOOM, COLOR, LAYOUT, KEYBINDINGS) |

---

## 15. 重构记录

### 2026-06-26 深度重构 (Tasks 1-9)

**配置集中化**
- 从 index.html 清理所有硬编码样式到 `config.ts`
- 从 index.css 清理硬编码到 `config.ts`
- 从 TitleBar 清理硬编码数量字

**样式系统重构**
- `index.css` 拆分为 7 个独立模块: tokens / utilities / components / handsontable / markdown / monaco / tiptap
- 移除 index.css 中组件样式到 components.css
- 移除 handsontable 覆盖到 handsontable.css
- 移除 markdown 预览样式到 markdown.css
- 移除 monaco 容器样式到 monaco.css
- 移除 tiptap 样式到 tiptap.css
- 提取 tokens.css (设计令牌) 和 utilities.css (工具类)

**组件精简**
- WorkspaceTabs: 移除未使用逻辑
- WorkspaceHeader: 移除冗余操作按钮
- DropPanel: 提取为独立文件
- HomeView: 提取为独立文件
- ExcelToolbar: 提取颜色选择器到 CustomColorPicker
- MarkdownEditor: 迁移到 Monaco 编辑器

**颜色选择器重构 (CustomColorPicker)**
- 从 ExcelToolbar 内部提取为独立组件
- 规范数据流: HSV 状态集中管理, props 单向传递
- 修正调色板渲染与数据一致性
- 修正取色器坐标解析和 HSV 滑条方向
- 消除 magic numbers 为常量

**测试**
- 引入 Vitest + jsdom
- 创建 colorUtils 和 config 首批测试 (Task 10)

**文档**
- docs/ 目录重组: reference/ (当前参考文档) + archive/ (历史文档)
- 创建 PROJECT-MAP.md (本文件)

---

## 16. 快速导航

### 我想修改...

| 场景 | 去这里 |
|------|------|
| 调整 UI 缩放范围 | `src/config.ts` → ZOOM_* 组 |
| 修改面板宽度 | `src/config.ts` → Layout 组 |
| 修改/新增快捷键 | `src/config.ts` → KEYBINDINGS / `src/hooks/useKeyboardShortcuts.ts` |
| 修改按钮样式 | `src/styles/components.css` → .btn-* / `src/config.ts` → Toolbar 组 |
| 修改文件树缩进/图标 | `src/config.ts` → FileTree 组 |
| 修改颜色主题 | `src/styles/tokens.css` → :root / :root.light |
| 添加新文件类型 | `src/types.ts` (FolderFile.type) → `src/hooks/` (编辑器 hook) |
| 修改 IPC 通道 | `electron/preload.js` (API 暴露) + `electron/main.js` (IPC handler) |
| 添加翻译 | `src/i18n.ts` → DICT 对象 |
| 修改存储逻辑 | `src/storage.ts` → 对应函数 |
| 修改窗口大小/行为 | `electron/main.js` → createWindow() |
| 修改测试 | `src/__tests__/` |
| CSS 变量速查 | `src/styles/tokens.css` |
| 导出功能 | `src/utils/exportUtils.ts` |
| DOCX 导入/导出 | `src/utils/docxUtils.ts` + `src/hooks/useDocxEditor.ts` |
| Excel 导入/导出 | `src/utils/xlsxUtils.ts` + `src/hooks/useExcelEditor.ts` |
