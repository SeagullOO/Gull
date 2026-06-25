# Settings 内容定义参考

设置面板 (`src/pages/Settings.tsx`) 的内容来自以下位置：

## 1. 导航标签页

**定义位置**：`src/pages/Settings.tsx` 第 203-208 行

```typescript
const navItems = [
  { key: "stgGeneral",     icon: <SettingsGearIcon /> },
  { key: "stgAppearance",  icon: <MonitorIcon /> },
  { key: "stgStorage",     icon: <StorageCubeIcon /> },
  { key: "stgAbout",       icon: <InfoCircleIcon /> },
];
```

| key | 用途 | 图标组件 |
|-----|------|----------|
| `stgGeneral` | 通用设置 | `SettingsGearIcon` (`src/components/icons.tsx`) |
| `stgAppearance` | 外观设置 | `MonitorIcon` |
| `stgStorage` | 存储设置 | `StorageCubeIcon` |
| `stgAbout` | 关于页面 | `InfoCircleIcon` |

---

## 2. 文案/翻译 (i18n)

**定义位置**：`src/i18n.ts` 第 225-258 行

所有设置相关的翻译 key 都以 `stg` 为前缀：

| i18n Key | 中文 | 英文 | 使用位置 |
|----------|------|------|----------|
| `stgSettings` | 设置 | Settings | 面板标题 |
| `stgGeneral` | 通用 | General | 导航标签 |
| `stgAppearance` | 外观 | Appearance | 导航标签 |
| `stgStorage` | 存储 | Storage | 导航标签 |
| `stgAbout` | 关于 | About | 导航标签 |
| `stgGeneralDesc` | 应用程序的基础行为和语言设置。 | Basic application behavior... | 通用页描述 |
| `stgAppearanceDesc` | 调整界面主题、字体和布局偏好。 | Adjust interface theme... | 外观页描述 |
| `stgStorageDesc` | 管理文件数据的存储位置。 | Manage file data storage... | 存储页描述 |
| `stgAboutDesc` | 版本信息、许可等。 | Version information... | 关于页描述 |
| `stgLanguageRegion` | 语言与地区 | Language & Region | 通用页 section |
| `stgUiLanguage` | 界面语言 | UI Language | 通用页 label |
| `stgUiLanguageDesc` | 菜单、对话框和系统提示的显示语言 | Display language for menus... | 通用页 hint |
| `stgTheme` | 主题 | Theme | 外观页 section |
| `stgColorTheme` | 颜色主题 | Color Theme | 外观页 label |
| `stgColorThemeDesc` | 选择暗色、亮色或跟随系统 | Choose dark, light... | 外观页 hint |
| `stgDark` / `stgLight` / `stgSystem` | 暗色 / 亮色 / 跟随系统 | Dark / Light / System | 外观页 options |
| `stgStorageLocation` | 存储位置 | Storage Location | 存储页 section |
| `stgStoragePathLabel` | 默认工作区存储位置 | Default Workspace Storage Path | 存储页 label |
| `stgVersion` | 软件版本 | Version | 关于页 section |
| `stgVersionInfo` | 版本信息 | Version Info | 关于页 label |
| `stgShortcuts` | 快捷键参考 | Keyboard Shortcuts | 关于页 label |
| `stgLicenses` | 第三方许可 | Third-Party Licenses | 关于页 section |
| `stgOpenSourceLicenses` | 开源软件许可 | Open Source Licenses | 关于页 label |
| `stgOpenSourceLicensesDesc` | Electron, Chromium... | Electron, Chromium... | 关于页 hint |
| `stgCheckUpdate` | 检查更新 | Check for Updates | 关于页 button |
| `stgDragTip` | 拖拽调整 / 点击输入 | Drag to adjust... | 通用页 hint |
| `stgElectronStorage` | Electron userData | Electron userData | 存储页 hint |
| `stgBrowserStorage` | 浏览器 IndexedDB | Browser IndexedDB | 存储页 hint |

---

## 3. 硬编码字符串

**定义位置**：`src/pages/Settings.tsx`

以下内容直接在 JSX 中硬编码，**未使用 i18n**：

| 内容 | 行号 | 说明 |
|------|------|------|
| `"Gull"` | 377 | 应用名称 |
| `版本 1.0.0 (build 2406.22)` | 379 | 版本号和 build 号，直接写死，未从 package.json 读取 |
| `React 18 · Vite 5 · Electron 42` | 380 | 技术栈版本信息，手动维护 |
| `© 2026` | 381 | 版权年份 |
| `"检查中..."` / `"Checking..."` | 392 | 更新检查中状态，三元表达式硬编码 |
| `"下载 v${updateVersion}"` / `"Download v${updateVersion}"` | 397 | 下载更新按钮，模板字符串硬编码 |
| `"重启安装"` / `"Restart to Install"` | 406 | 安装更新按钮 |
| `"已是最新"` / `"Up to date"` | 411 | 无更新状态 |
| `"重试"` / `"Retry"` | 418 | 更新失败重试按钮 |
| 语言选项 `"简体中文"` / `"English"` | ~85 | 语言下拉选项 |

### 修改指引

- **修改翻译文字** → 编辑 `src/i18n.ts`，搜索对应的 key
- **修改关于页版本号/技术栈** → 编辑 `src/pages/Settings.tsx` 第 378-381 行
- **添加新的设置项** → 在 `Settings.tsx` 中添加 UI，在 `i18n.ts` 中添加翻译 key
- **添加新的导航标签** → 修改 `Settings.tsx` 第 203 行的 `navItems` 数组

---

## 4. Settings 面板入口

**定义位置**：`src/App.tsx`

Settings 面板通过路由 `/settings` 访问：

```tsx
<Route path="/settings" element={<Settings ... />} />
```

面板打开/关闭通过 `onClose` 回调（调用 `navigate(-1)` 返回上一页）。
