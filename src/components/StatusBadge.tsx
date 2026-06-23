/**
 * StatusBadge — 保存状态指示器组件
 *
 * 【角色】在 FolderWorkspace 顶部栏显示文档的自动保存状态。
 *         三种状态各有独立的视觉样式和动画效果。
 *
 * 【状态与样式】
 *   - saved："已保存"，绿色圆点 + 绿色文字（status-badge done 类）
 *   - saving："保存中"，黄色圆点 + 脉冲动画 (animate-pulse) + 黄色文字
 *   - unsaved："未保存"，黄色圆点 + 黄色文字（status-badge draft 类）
 *   - 其他值：返回 null（不渲染）
 *
 * 【视觉布局】内联 flex 水平行，items-center gap-1。
 *           外层 span：12px 高度，11px 字号，圆角胶囊形状（status-badge 类）。
 *           圆点：w-1.5 h-1.5 (6px)，rounded-full。
 *
 * 【交互链】
 *   - FolderWorkspace useAutoSave hook → 设置 status 状态 → 传入本组件
 *   - 不接收任何用户交互，纯粹的状态展示组件
 *
 * 【设计决策】
 *   - early return 模式：按 status 值分别返回不同 UI，清晰分支无嵌套
 *   - 脉冲动画仅用于 "saving" 状态：给用户一种"正在工作"的即时反馈感
 *   - 圆点颜色直接通过 style background 设置，使用 CSS 变量（var(--success)/var(--warning)）
 *   - 不引入外部图标库，用纯 CSS + 内联样式实现，保持零依赖
 */
import { t, getLang } from "../i18n";

function StatusBadge({ status }: { status: string }) {
  const lang = getLang();

  if (status === "saving")
    return (
      <span
        className="status-badge"
        style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--warning)" }}
        />
        {t("statusSaving", lang)}
      </span>
    );

  if (status === "saved")
    return (
      <span className="status-badge done">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--success)" }}
        />
        {t("statusSaved", lang)}
      </span>
    );

  if (status === "unsaved")
    return (
      <span className="status-badge draft">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--warning)" }}
        />
        {t("statusUnsaved", lang)}
      </span>
    );

  return null;
}

export default StatusBadge;
