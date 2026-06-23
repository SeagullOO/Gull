/**
 * ActivityBar — 活动栏组件（模仿 VS Code Activity Bar）
 *
 * 【角色】最左侧 44px 垂直图标栏，提供视图切换（首页/工作区）和文件操作入口。
 *         是应用的顶级导航枢纽，所有页面切换都从这里发起。
 *
 * 【视觉布局】固定宽度 44px 的 flex 垂直列（flex-shrink: 0）。
 *           - 上部：首页按钮 | 工作区按钮（带竖向 active 指示条）
 *           - 分隔线（20px 宽，1px 高）
 *           - 中部（showActions 为 true 时）：新建 Markdown | 新建 Excel 表格 | 保存为模版
 *           - 按钮尺寸统一 34x34，容器 gap: 4px，上下 padding: 5px
 *           边框右 1px 分隔 ActivityBar 与 Sidebar/FileExplorer。
 *
 * 【交互链】
 *   - onGoHome → AppContent → navigate("/") → 首页视图
 *   - onGoWorkspace → AppContent → 切换工作区视图
 *   - onAddFile → AppContent → 创建新文件（md/excel）并打开编辑
 *   - onSaveAsTemplate → AppContent → 保存当前文件夹为模版
 *
 * 【设计决策】
 *   - 宽度 44px：与 VS Code Activity Bar 一致，提供足够的图标点击区域
 *   - active 指示条：绝对定位在按钮左侧 2px 宽的紫色竖线（left: -4, top: 6, bottom: 6）
 *     使用绝对定位而非 border-left，避免影响按钮的 border-box 布局
 *   - showActions 条件渲染：当视图从首页进入工作区后才显示文件操作按钮
 *   - 所有图标为内联 SVG（无外部依赖），使用 currentColor 继承颜色
 */
import { t, getLang } from "../i18n";

interface ActivityBarProps {
  activeView: "home" | "workspace";
  showActions?: boolean;
  onAddFile: (type: "md" | "excel") => void;
  onSaveAsTemplate: () => void;
  onGoHome: () => void;
  onGoWorkspace: () => void;
}

function ActivityBar({ activeView, showActions = true, onAddFile, onSaveAsTemplate, onGoHome, onGoWorkspace }: ActivityBarProps) {
  const lang = getLang();
  // 活动栏固定宽度 44px，与 VS Code 风格一致
  const barW = 44;
  // 图标按钮尺寸：34x34，与容器左右各留 5px 间距
  const btnSize = 34;

  const barStyle: React.CSSProperties = {
    width: barW,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 5,
    paddingBottom: 5,
    gap: 4,
    background: "var(--bg-panel)",
    borderRight: "1px solid var(--border-subtle)",
    flexShrink: 0,
    position: "relative",
  };

  const separatorStyle: React.CSSProperties = {
    width: 20,
    height: 1,
    background: "var(--border-subtle)",
    margin: "6px 0",
    flexShrink: 0,
  };

  // 左侧活动指示条：绝对定位的 2px 宽紫色竖线，标记当前活动视图
  // left: -4 使其定位到按钮 padding 区域左侧，不挤占图标空间
  const activeIndicator = (
    <span style={{
      position: "absolute",
      left: -4, top: 6, bottom: 6,
      width: 2, background: "var(--accent)",
      borderRadius: 1,
    }} />
  );

  const homeIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  const workspaceIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );

  const newMdIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );

  const newExcelIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );

  return (
    <div style={barStyle}>
      {/* Home */}
      <button
        onClick={onGoHome}
        className={`act-btn${activeView === "home" ? " active" : ""}`}
        title={t("home", lang)}
      >
        {activeView === "home" && activeIndicator}
        {homeIcon}
      </button>

      {/* Workspace */}
      <button
        onClick={onGoWorkspace}
        className={`act-btn${activeView === "workspace" ? " active" : ""}`}
        title={t("workspace", lang)}
      >
        {activeView === "workspace" && activeIndicator}
        {workspaceIcon}
      </button>

      {/* showActions: 仅在非首页视图时显示文件操作按钮，保持首页简洁 */}
      {showActions && (
        <>
          {/* 视觉分隔线：将导航按钮与操作按钮分组 */}
          <div style={separatorStyle} />

          {/* New Markdown */}
          <button
            onClick={() => onAddFile("md")}
            className="act-btn"
            title={t("newMarkdown", lang)}
          >
            {newMdIcon}
          </button>

          {/* New Excel */}
          <button
            onClick={() => onAddFile("excel")}
            className="act-btn"
            title={t("newExcel", lang)}
          >
            {newExcelIcon}
          </button>

          <div style={separatorStyle} />

          {/* Save as Template */}
          <button
            onClick={onSaveAsTemplate}
            className="act-btn"
            title={t("saveAsTemplate", lang)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

export default ActivityBar;
