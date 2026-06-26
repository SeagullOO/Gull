# Monaco Editor Migration Design

**Date**: 2026-06-23
**Status**: Ready for implementation
**Target**: 将 Markdown 文本编辑核心从 TipTap/textarea 迁移到 Monaco Editor

## 1. 背景

当前 .md 文件编辑采用裸 `<textarea>` + 手动行号 gutter + `marked` 渲染预览。TipTap 依赖仍在 `package.json` 但实际已被绕过，EditorToolbar 内 90% 代码（TipTap chain API）未被调用。

核心痛点:
- 行号对齐需手动维护 gutter state 与 scrollTop 同步
- 无语法高亮、无代码折叠、无多光标
- 搜索替换需自己实现
- 预览/源码滚动同步通过 hacky 的 ratio 计算实现

## 2. 技术决策

### 2.1 编辑器选型: Monaco Editor

**选择**: `@monaco-editor/react` (方案 1)

**理由**:
- Monaco 是 VS Code 的编辑核心，体验最接近需求
- `@monaco-editor/react` 是社区标准 React 封装，处理 worker、ResizeObserver、主题同步、生命周期
- 原生支持: 行号、语法高亮、搜索替换 (Ctrl+F)、多光标、撤销栈、虚拟滚动
- 通过 `executeEdits` API 可让外部工具栏按钮插入 markdown 语法 — 解耦干净
- 相比 CodeMirror 6: 不需要自己拼接预览双视图和滚动同步

**替代方案评估**:
- CodeMirror 6: 更轻量但无内置预览/源码双视图，需手写更多底层逻辑
- `monaco-editor` 裸包: 完全控制但需自写 React 封装 (~200 行)，过度设计

### 2.2 预览模型: 侧边分屏 (Split View)

- 左侧 Monaco Editor 显示/编辑 Markdown 源码
- 右侧 Panel 显示 `marked` 渲染的 HTML 预览
- 中间 3px 可拖拽分割线，调整 splitRatio (默认 0.5)
- 滚动同步: Monaco `onScroll` → ratio 计算 → preview `scrollTop`
- 预览模式开关: 关闭时 Monaco 占满全宽

**不使用 DiffEditor**: Monaco 的 DiffEditor 设计用于 diff 对比，不适合 源码↔渲染HTML 的场景，此处保持 marked 渲染更灵活。

## 3. 架构

```
FolderWorkspace.tsx                ← 644行 → ~500行 (抽出 MD 编辑区)
│
├── useMarkdownEditor.ts           ← 135行 → ~100行 (去 TipTap，加 editorRef)
│   ├── source / setSource
│   ├── auto-save (不变)
│   ├── handleForceSave
│   └── editorRef<monaco.editor.IStandaloneCodeEditor>
│
├── MarkdownEditor.tsx             ← 新增 ~150行 (从 FolderWorkspace 抽出)
│   ├── Monaco Editor (左侧)
│   │   ├── 原生行号
│   │   ├── Markdown 语法高亮
│   │   ├── 内置 Ctrl+F 搜索
│   │   └── automaticLayout: true
│   ├── 可拖拽分割线 (3px)
│   └── Preview Panel (右侧)
│       └── marked.parse(source) + 纯 HTML 渲染
│
├── EditorToolbar.tsx              ← 144行 → ~80行 (重写)
│   ├── Props: editorRef (Monaco instance)
│   ├── 撤销/重做 (Monaco trigger API)
│   ├── H1/H2/H3 (行首插入 markdown 语法)
│   ├── 加粗/斜体 (选区包裹)
│   ├── 列表/引用 (行首插入)
│   └── 预览切换按钮
│
└── Excel 编辑区 (不变)
    ├── ExcelToolbar
    ├── FormulaBar
    └── Handsontable
```

### 3.1 组件接口

```typescript
// MarkdownEditor.tsx
interface MarkdownEditorProps {
  source: string;
  onSourceChange: (value: string) => void;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

// EditorToolbar.tsx
interface EditorToolbarProps {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

// useMarkdownEditor.ts
interface UseMarkdownEditorReturn {
  source: string;
  setSource: (value: string) => void;
  handleForceSave: () => Promise<void>;
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}
```

### 3.2 数据流

```
Monaco onChange → setSource → useMarkdownEditor auto-save (防抖 1.5s)
                                   │
                                   └→ storageUpdateFolder

EditorToolbar 按钮 → editor.executeEdits() → Monaco onChange → (同上)

文件切换 → useEffect(currentFile.id) → setSource(newContent) → Monaco value 更新
```

### 3.3 关键设计决策

1. **EditorToolbar 不直接操作 source state** — 通过 Monaco `executeEdits` API 插入，编辑器自己维护撤销栈。工具栏是"命令发送者"，编辑器是"状态持有者"。

2. **MarkdownEditor 是 controlled component** — `source` 和 `onSourceChange` 由父组件传入，Monaco 内部仅做展示和用户交互。

3. **editorRef 向上暴露** — 工具栏需要 Monaco 实例来调 `executeEdits`，通过 ref 传递而非 prop drilling。

4. **分割比例持久化** — `splitRatio` 存 localStorage `gdt_md_split_ratio`，跨会话保持。

## 4. 依赖变更

### 移除 (7 个包)
```
@tiptap/extension-table
@tiptap/extension-table-cell
@tiptap/extension-table-header
@tiptap/extension-table-row
@tiptap/pm
@tiptap/react
@tiptap/starter-kit
```

### 新增 (2 个包)
```
@monaco-editor/react     — React wrapper
monaco-editor            — Monaco 本体 (peer dependency)
```

### 保持不变
- `marked` — 预览渲染
- `dexie` — IndexedDB
- `react` / `react-dom` / `react-router-dom` — UI 框架
- `lodash` — 工具库

## 5. 错误处理

| 场景 | 策略 |
|------|------|
| Monaco 加载失败 | `@monaco-editor/react` 的 `Loading`/`Error` 边界，降级为 `<textarea>` |
| 存储失败 | try-catch + setSaveStatus("unsaved") |
| 大文件 (>1MB) | Monaco 虚拟滚动原生支持 |
| 暗色/亮色切换 | Monaco `theme` prop 绑定 `isDark ? 'vs-dark' : 'vs'` |
| 窗口 resize | `automaticLayout: true` 自动处理 |
| 分割线拖拽 | `mousedown/mousemove/mouseup` + `Monaco.layout()` 重排 |

## 6. 文件变更清单

| 文件 | 操作 | 预计行数变化 |
|------|------|-------------|
| `src/components/MarkdownEditor.tsx` | 新增 | +150 |
| `src/hooks/useMarkdownEditor.ts` | 重写 | 135 → ~100 |
| `src/components/EditorToolbar.tsx` | 重写 | 144 → ~80 |
| `src/pages/FolderWorkspace.tsx` | 修改 | 644 → ~500 |
| `package.json` | 修改 | 移除 7 tiptap 依赖，新增 2 monaco 依赖 |
| `index.html` | 可能修改 | Monaco CDN worker 配置（若切换本地加载） |
| `src/index.css` | 微调 | Monaco 暗色主题 CSS 变量适配 |

## 7. 合规性检查

- [x] **解耦**: MarkdownEditor 独立组件，不依赖 FolderWorkspace 内部状态
- [x] **可扩展**: Monaco 支持自定义 language、theme、keybinding，未来可加更多语言支持
- [x] **可维护**: 单文件 <200 行，接口清晰，Props/Return 类型显式声明
- [x] **CSS 变量**: Monaco 主题色通过 defineTheme 映射到项目 CSS 变量
- [x] **不可变**: source 通过 setSource 更新，不直接修改
- [x] **Handsontable 禁区**: 不触碰 `.handsontable` / `.ht_master` 样式
- [x] **无 console.log**: 生产代码无调试语句

## 8. 验收标准

1. ✅ .md 文件在 Monaco 中编辑，原生行号、语法高亮正常
2. ✅ 点击预览按钮，右侧出现预览面板，源码 ↔ 预览滚动同步
3. ✅ 分割线可拖拽调整比例
4. ✅ 工具栏按钮插入 markdown 语法正确
5. ✅ Ctrl+S 自动保存，状态标签正常
6. ✅ 暗色/亮色切换，Monaco + 预览区主题同步
7. ✅ Excel 编辑功能不受影响（回归）
8. ✅ `npm run build` + `npm run electron:build` 通过
9. ✅ TipTap 依赖从 package.json 中完全移除
