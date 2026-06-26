# 深度重构设计 — 项目结构与代码优化

> 日期: 2026-06-26 | 分支: dev | 范围: 全项目深度重构

## 目标

1. 删除死代码和垃圾文件（~735 行）
2. 拆分超 400 行的大文件（FolderWorkspace 1,238→400、index.css 2,202→300）
3. 模块化 CSS 到 `src/styles/`
4. 清理 `package.json` 无用依赖（lodash 等）
5. 引入 Vitest 测试框架
6. 重组 `docs/` 目录，创建项目地图
7. 更新 CLAUDE.md 过时描述

---

## 一、CSS 模块化拆分

### 从 `index.css`（2,202行）拆分为 `src/styles/` 目录

```
src/styles/
├── tokens.css          (~200行) CSS 变量、设计令牌（Nord Blue 暗色/亮色）
├── handsontable.css    (~400行) Handsontable 暗色/亮色覆盖、!important 规则
├── markdown.css        (~300行) Markdown 预览排版（.markdown-preview）
├── monaco.css          (~150行) Monaco Editor 主题集成、暗色/亮色切换
├── tiptap.css          (~150行) Tiptap/ProseMirror 富文本编辑器样式
├── components.css      (~500行) ActivityBar, TitleBar, Sidebar, FileExplorer, 滚动条等
└── utilities.css       (~200行) 自定义滚动条、动画（@keyframes）、工具类
```

### `index.css` 保留内容

- `@import` 上述 7 个模块
- Tailwind 指令（@tailwind base/components/utilities）
- 少量全局级样式（body, #root, 亮色模式类切换触发变量注入）

### 规范

- 只使用 CSS 变量（`var(--accent)`），不写硬编码色值
- Handsontable 模块标记 `/* !important 审查区 */` 注释
- 每个文件顶部有 JSDoc 风格注释说明用途

---

## 二、FolderWorkspace.tsx 拆分（1,238 → ~400 行）

### 拆分为页面组件

```
src/pages/
├── FolderWorkspace.tsx    (~400行) 状态协调、路由、加载/错误/空状态、内容区容器
├── HomeView.tsx           (~120行) 主页模式视图（Sidebar + TemplateModal + 文件列表）
├── WorkspaceHeader.tsx    (~80行)  面包屑导航 + 工具栏区（ActivityBar 集成）
└── WorkspaceTabs.tsx      (~100行) 标签页渲染、拖拽感知、关闭按钮
```

### 拆分为 Hooks

```
src/hooks/
├── useTabDrag.ts          (~150行) 中点法拖拽排序算法（computeInsertIndex、mousemove/mouseup 事件）
└── useWorkspaceZoom.ts    (~60行)  UI 缩放（Ctrl+滚轮）+ 内容缩放（persist 到 localStorage）
```

### 责任划分

| 模块 | 职责 |
|------|------|
| `FolderWorkspace.tsx` | 状态协调者：viewMode 切换、当前文件夹/文件状态、路由参数解析、子组件编排 |
| `HomeView.tsx` | 主页模式的 Sidebar + 文件网格 + 模板入口 |
| `WorkspaceHeader.tsx` | 面包屑路径、工作区名称、返回按钮 |
| `WorkspaceTabs.tsx` | 文件 Tab 条、拖拽排序事件桥接、激活/关闭交互 |
| `useTabDrag.ts` | 纯逻辑：insert index 计算、midpoint 算法、事件绑定/清理 |
| `useWorkspaceZoom.ts` | 纯逻辑：zoom 状态、localStorage 持久化、Ctrl+滚轮监听 |

---

## 三、死代码 & 垃圾文件清理

| 文件 | 行数 | 原因 | 操作 |
|------|------|------|------|
| `src/components/FileTree.tsx` | 269 | 无任何 import 引用（被 FileExplorer 取代） | **删除** |
| `src/pages/FolderList.tsx` | 151 | `App.tsx` import 但 Routes 不使用 | **删除** + 移除 App.tsx import |
| `test-drag.ts` | 115 | 根目录未跟踪的 Playwright 临时测试 | **删除** |
| `test-final.js` | 100 | 根目录未跟踪的 Playwright 临时测试 | **删除** |
| `src/hooks/markdown-converter.ts` | 100 | 旧 TipTap→MD 转换器，Monaco 迁移后无引用 | **删除**（确认后） |

**清理总量:** ~735 行死代码

---

## 四、package.json 依赖清理

### 审计 & 操作

| 包 | 当前状态 | 操作 |
|---|---------|------|
| `lodash` + `@types/lodash` | 检查使用位置 | 用原生 ES6 替代 → **移除** |
| `@tiptap/extension-placeholder` | 检查是否 import | 未使用则 **移除** |
| `@tiptap/*` (core/react/starter-kit/extensions) | DOCX 编辑器在用 | **保留** |
| `marked` + `dompurify` | Markdown 预览在用 | **保留** |
| 其他 25+ 依赖 | 不动 | **保留** |

### 更新 CLAUDE.md

- 将 "TipTap 2.x 富文本" 改为 "TipTap 2.x 用于 DOCX 富文本编辑"
- 将 "Monaco Editor" 列为 Markdown 编辑器
- 更新 "已知陷阱" 中过时的描述

---

## 五、Vitest 测试框架引入

### 配置

```ts
// vitest.config.ts — 基于 vite.config.ts 扩展
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'] }
  }
})
```

### 测试文件结构

```
src/__tests__/
├── utils/
│   ├── colorUtils.test.ts      (~30行) HSV/Hex/RGB 转换
│   ├── xlsxUtils.test.ts       (~40行) ExcelJS 序列化
│   └── docxUtils.test.ts       (~40行) mammoth 导入导出
├── hooks/
│   └── useTabDrag.test.ts      (~50行) 拖拽算法单元测试
├── config.test.ts              (~20行) config 导出完整性
└── storage.test.ts             (~50行) 存储抽象层 mock 测试
```

### package.json scripts 添加

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

---

## 六、Docs 目录重组

### 新结构

```
docs/
├── PROJECT-MAP.md                        🆕 完整项目地图 & 优化记录
├── reference/
│   ├── code-modification-guide.md        移入
│   ├── settings-content-reference.md     移入
│   └── ui-default-sizes.md               移入
├── archive/
│   ├── 2026-06-23-monaco-editor-migration-design.md  归档
│   └── 2026-06-23-monaco-editor-migration-plan.md    归档
└── superpowers/
    ├── specs/                            保留（当前设计文档）
    └── plans/                            保留（实施计划）
```

### PROJECT-MAP.md 内容大纲

1. 项目概述
2. 目录树（完整文件列表 + 用途）
3. 页面路由表
4. 组件索引（名称 / 路径 / 行数 / 职责）
5. Hooks 索引
6. Utils 索引
7. 样式文件索引（CSS 模块 + CSS 变量体系）
8. 数据层说明（types → db → storage）
9. 前后端通信（Electron IPC 通道表）
10. 配置体系（config.ts 导出分组）
11. 构建 & 部署
12. 优化记录（本次重构内容 + 后续优化入口）

---

## 七、其他优化项

### ExcelToolbar.tsx（810 行）

- 提取 `CustomColorPicker.tsx` (~180 行)：HSV 色相条 + SV 面板 + 预设色
- 提取 `DropPanel.tsx` (~80 行)：Portal 下拉面板通用组件
- 主文件缩减至 ~500 行

### config.ts（240 行）

- 按功能分组导出：`ZOOM` / `LAYOUT` / `KEYBOARD` / `COLORS` / `EDITOR`
- 每个分组添加 JSDoc 注释

### 文件头注释规范

所有 `.ts/.tsx` 文件顶部添加一致的 JSDoc 格式：

```ts
/**
 * @file 文件名
 * @description 一句话描述
 */
```

---

## 八、实施顺序

| 阶段 | 内容 | 依赖 |
|------|------|------|
| 1 | 删除死代码 & 垃圾文件 | 无 |
| 2 | CSS 模块化拆分 | 1 |
| 3 | FolderWorkspace 拆分（hooks 先行） | 2 |
| 4 | ExcelToolbar 提取子组件 | 2 |
| 5 | package.json 依赖清理 & CLAUDE.md 更新 | 1 |
| 6 | 引入 Vitest + 写首批测试 | 5 |
| 7 | Docs 重组 + PROJECT-MAP.md 编写 | 1-6 |
| 8 | 全量验证（`npm run dev` + `npm run build`） | 1-7 |
