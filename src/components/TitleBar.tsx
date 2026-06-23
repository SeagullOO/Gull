import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { t, getLang } from "../i18n";

/**
 * TitleBar — 应用顶层标题栏（模仿 VS Code 风格的自定义窗口栏）
 *
 * 【角色】充当整个应用的窗口装饰（window chrome），替代原生 Electron 标题栏。
 *         同时汇总文件操作、侧边栏切换、全局搜索等核心入口。
 *
 * 【视觉布局】固定高度 30px 的 flex 水平行（flex-shrink: 0）。
 *           - 左侧：设置按钮 | 文件下拉菜单 | 侧边栏开关 | 搜索按钮（gap: 2px）
 *           - 中央：当前文件名（flex: 1，文本居中，超出省略）
 *           - 右侧：最小化 / 最大化 / 关闭 三颗窗口控制按钮
 *           整条 bar 设置 WebkitAppRegion: "drag" 使其可拖拽移动窗口，
 *           但内部按钮容器设置 WebkitAppRegion: "no-drag" 以确保按钮可点击。
 *
 * 【交互链】
 *   - onToggleSidebar → AppContent → 控制 Sidebar 显隐
 *   - onSearch → AppContent → 打开 GlobalSearchModal
 *   - 文件菜单通过 createPortal 渲染到 document.body，使用 click-away 透明遮罩关闭
 *   - 窗口控制按钮通过 Electron API (window.electronAPI) 操作原生窗口
 *
 * 【设计决策】
 *   - 自定义标题栏而非原生：统一 Obsidian 暗黑主题，完全控制拖拽区域和菜单
 *   - 文件下拉菜单使用 Portal + fixed 定位：避免被父容器 overflow/clip 裁剪
 *   - 菜单顶部偏移 buttonRect.bottom + 4px：4px 间距与原生菜单体验一致
 *   - click-away 遮罩 z-index: 999，略低于菜单本体，确保先捕获点击再关闭
 */
interface TitleBarProps {
  onToggleSidebar: () => void;
  onSearch: () => void;
  sidebarOpen?: boolean;
  activeFileName?: string;
}

function TitleBar({ onToggleSidebar, onSearch, sidebarOpen = true, activeFileName }: TitleBarProps) {
  const lang = getLang();
  const navigate = useNavigate();
  const location = useLocation();
  const api = (window as any).electronAPI;
  const [isMaximized, setIsMaximized] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuBtnRef = useRef<HTMLButtonElement>(null);

  // 监听 Electron 主进程发来的最大化状态变化（Windows snap/maximize 事件）
  useEffect(() => {
    if (api?.onMaximizeChange) {
      api.onMaximizeChange((max: boolean) => setIsMaximized(max));
    }
    // 组件挂载时查询初始最大化状态，确保图标正确
    if (api?.send) {
      api.send("window-query-max");
    }
  }, [api]);

  const handleMinimize = () => api?.windowMinimize?.();
  const handleMaximize = () => api?.windowMaximize?.();
  const handleClose = () => api?.windowClose?.();

  // 标题栏高度 = 30px 与 VS Code 风格一致
  const barH = 30;

  return (
    <div
      style={{
        height: barH,
        display: "flex",
        alignItems: "center",
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border-subtle)",
        WebkitAppRegion: "drag",
        userSelect: "none",
        flexShrink: 0,
        paddingLeft: 6,
        paddingRight: 6,
      }}
    >
      {/* Left: settings + sidebar toggle + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, WebkitAppRegion: "no-drag" }}>
        <button
          onClick={() => location.pathname === "/settings" ? navigate(-1) : navigate("/settings")}
          title={t("settings", lang)}
          className="win-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          ref={fileMenuBtnRef}
          onClick={() => setFileMenuOpen((prev) => !prev)}
          title={t("fileMenu", lang)}
          className="win-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        {/* 文件 dropdown menu: 通过 Portal 渲染到 document.body，避免被父容器裁剪 */}
        {fileMenuOpen && fileMenuBtnRef.current && createPortal(
          <div
            className="context-menu animate-in"
            style={{
              position: "fixed",
              top: fileMenuBtnRef.current.getBoundingClientRect().bottom + 4,
              left: fileMenuBtnRef.current.getBoundingClientRect().left,
              minWidth: 130,
            }}
          >
            <button className="context-menu-item" onClick={() => {
              setFileMenuOpen(false);
              const fn = (window as any).__saveFile;
              if (fn) fn();
            }}>
              {t("save", lang)}
            </button>
            <button className="context-menu-item" onClick={() => {
              setFileMenuOpen(false);
              const fn = (window as any).__saveAs;
              if (fn) fn();
            }}>
              {t("saveAs", lang)}
            </button>
            <div className="context-menu-divider" />
            <button className="context-menu-item" onClick={() => {
              setFileMenuOpen(false);
              const fn = (window as any).__openWorkspace;
              if (fn) fn();
            }}>
              {t("openWorkspace", lang)}
            </button>
          </div>,
          document.body, // Portal 目标：挂载到 body 以突破所有 overflow/z-index 限制
        )}
        {/* Click-away 透明遮罩：点击菜单外部任意位置关闭菜单 z-index 略低于菜单本身 */}
        {fileMenuOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setFileMenuOpen(false)}
          />
        )}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? t("toggleSidebar", lang) : t("expandSidebar", lang)}
          className="win-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
        <button
          onClick={onSearch}
          title={t("search", lang)}
          className="win-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* 中央：当前活动文件名显示区，同时也是窗口拖拽区（WebkitAppRegion: "drag" 继承自父容器） */}
      <div
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0 12px",
        }}
      >
        {activeFileName || ""}
      </div>

      {/* Right: window controls */}
      <div style={{ display: "flex", alignItems: "center", WebkitAppRegion: "no-drag" }}>
        <button
          onClick={handleMinimize}
          className="win-btn win-ctrl"
          title={t("minimize", lang)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="18" x2="19" y2="18" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="win-btn win-ctrl"
          title={isMaximized ? t("restore", lang) : t("maximize", lang)}
        >
          {/* 根据最大化状态切换图标：最大化时显示还原图标（双矩形），否则显示最大化图标（单矩形） */}
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
              <path d="M8 4h12a2 2 0 0 1 2 2v10" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="win-btn win-ctrl win-btn-close"
          title={t("close", lang)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
