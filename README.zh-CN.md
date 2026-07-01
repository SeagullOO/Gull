# GullDoc

**游戏策划文档桌面工具 — Markdown、Excel、Docs，一个工作区全搞定。**

[![Electron](https://img.shields.io/badge/Electron-42.4-47848f?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

[English](README.md) | **中文**

---

## GullDoc 是什么？

GullDoc 是一款基于 Electron 的**游戏策划文档（GDD）编辑器**。它把 Markdown 写作、Excel 数据表格、DOCX 富文本编辑整合到一个桌面应用中，策划不用在多个工具之间来回切换。

### 为什么不用 飞书 / VS Code / Google Sheets？

- **统一工作区**：所有策划文档放在同一个项目文件夹里，用内置的文件树和标签页管理，不乱。
- **策划友好的交互**：快捷键、自动保存、界面缩放、暗色主题，为长时间写作优化。
- **离线优先**：数据全在本地文件系统。不需要登录、不需要网络、不需要订阅。
- **跨编辑器协作**：`.md`、`.xlsx`、`.docx` 三种文件在同一个窗口里切换编辑，主题统一。

---

## 功能特性

### 三大内置编辑器

| 编辑器 | 格式 | 底层引擎 | 亮点 |
|--------|------|----------|------|
| **Markdown** | `.md` | [Monaco](https://github.com/microsoft/monaco-editor) | 分屏实时预览、滚动同步、自定义字体、代码高亮 |
| **Excel** | `.xlsx` | [Handsontable](https://handsontable.com/) | 公式栏（HyperFormula）、富格式工具栏、行列冻结、排序、合并单元格 |
| **Docs** | `.docx` | [TipTap](https://tiptap.dev/) | WYSIWYG 所见即所得、标题、列表、表格、图片、链接、对齐 |

### 工作区管理

- **文件树**：拖拽排序、嵌套子目录、F2 行内重命名
- **标签页**：拖拽排序、关闭前未保存提示
- **模板系统**：保存工作区结构为模板，新建时一键复用
- **导入**：从磁盘导入已有 `.md`、`.xlsx`、`.csv`、`.docx` 文件
- **导出**：单个文件或整个工作区导出

### 体验细节

- **亮暗模式**：亮色模式 + 暗色模式
- **双缩放**：Ctrl+滚轮缩放界面 + 独立内容缩放
- **全局搜索**：跨所有工作区文件搜索（Ctrl+Shift+F）
- **双语界面**：中文 / English 一键切换
- **自动保存**：带可视化状态指示
- **取色器**：预设色板 + HSV 滑动条取色

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **桌面框架** | Electron 42 |
| **UI 框架** | React 18 + React Router 6 |
| **构建工具** | Vite 5 |
| **开发语言** | TypeScript 5.5（strict 模式） |
| **样式方案** | Tailwind CSS 3 + CSS 自定义属性（设计令牌） |
| **Markdown 编辑器** | Monaco Editor 0.55 + `@monaco-editor/react` |
| **电子表格** | Handsontable + HyperFormula（本地化部署） |
| **富文本编辑器** | TipTap 3（基于 ProseMirror） |
| **文件格式** | ExcelJS 4、Mammoth 1、Marked 18、JSZip 3 |
| **浏览器存储** | Dexie.js 4（IndexedDB） |
| **测试框架** | Vitest 4 + Playwright 1.61 |
| **打包分发** | electron-builder 26 + electron-updater 6 |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Windows**（主要目标平台；macOS/Linux 未测试）

### 安装

```bash
git clone https://github.com/SeagullOO/GullDoc.git
cd GullDoc
npm install
```

### 开发模式

```bash
# 浏览器模式（Vite 开发服务器）
npm run dev

# Electron 模式（Vite + Electron 并行启动）
npm run electron:dev
```

### 构建打包

```bash
# 生产构建（输出到 dist/）
npm run build

# Windows 便携版打包（输出到 release/）
npm run electron:build
```

> **中国大陆用户**：构建前设置镜像源：
> ```bash
> export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> npm config set registry https://registry.npmmirror.com
> ```

---

## 项目结构

```
GullDoc/
├── electron/              # Electron 主进程
│   ├── main.js            # 窗口管理、约 35 个 IPC 通道、自动更新
│   └── preload.js         # 上下文桥接（window.electronAPI）
├── src/
│   ├── main.tsx           # React 入口
│   ├── App.tsx            # 根组件（路由、主题、错误边界）
│   ├── config.ts          # 集中配置（缩放、快捷键、颜色、工具栏）
│   ├── types.ts           # 核心类型定义：FolderFile、Folder、Template
│   ├── db.ts              # IndexedDB 层（Dexie.js）
│   ├── storage.ts         # 存储抽象层（Electron 文件系统 ↔ IndexedDB）
│   ├── i18n.ts            # 中英文词典（约 275 个键）
│   ├── pages/             # 页面级组件
│   │   ├── FolderWorkspace.tsx   # 主工作区（编辑器、标签页、状态栏）
│   │   └── Settings.tsx          # 设置面板
│   ├── components/        # 约 25 个可复用组件
│   ├── hooks/             # 约 11 个自定义 Hook
│   ├── utils/             # 工具函数模块
│   ├── styles/            # CSS 模块（令牌、组件、按编辑器拆分）
│   └── __tests__/         # Vitest 单元测试
├── docs/                  # 设计文档、计划、参考
├── public/vendor/         # 本地化 CDN 资源
└── scripts/               # 构建辅助脚本
```

---

## 架构说明

### 双模式存储

GullDoc 自动检测运行环境并切换存储后端：

- **Electron 环境** → 通过 IPC 调用原生文件系统。工作区元数据存在 `data/` 目录，文件以真实 `.md` / `.xlsx` / `.docx` 格式存储。
- **浏览器环境** → 通过 Dexie.js 存储在 IndexedDB 中。所有数据留在浏览器本地存储。

### 主题系统

CSS 自定义属性（`src/styles/tokens.css`）定义了整套视觉语言。暗色主题基于 Obsidian 风格的 Nord Blue 配色。切换亮色模式时，给 `<html>` 添加 `:root.light` 类即可。

### 缩放策略

Electron 原生缩放锁定在 1.0。所有缩放行为通过 CSS `zoom` 属性实现，避免 Chromium 与渲染进程之间的异步时序问题。

---

## 参与贡献

本项目目前处于个人活跃开发阶段。如果你想贡献代码：

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feat/amazing-feature`）
3. 为新功能编写测试
4. 确保 `npm test` 全部通过
5. 向 `dev` 分支发起 Pull Request

详见 `CLAUDE.md` 和 `docs/` 目录中的代码规范与设计背景。

---

## 开源协议

MIT © SeagullOO

---

## 致谢

- [Monaco Editor](https://github.com/microsoft/monaco-editor) — VS Code 同款编辑器，驱动我们的 Markdown 写作体验
- [Handsontable](https://handsontable.com/) — 类 Excel 的电子表格引擎
- [TipTap](https://tiptap.dev/) — 基于 ProseMirror 的现代富文本编辑器
- [Electron](https://electronjs.org) — 用 Web 技术构建跨平台桌面应用
