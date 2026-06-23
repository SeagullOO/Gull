import { useState, useEffect } from "react";
import { storageLoadTemplates } from "../storage";
import type { Template } from "../types";
import { t, getLang } from "../i18n";

/**
 * TemplateModal — 模版选择弹窗（用于通过模版创建新文件夹）
 *
 * 【角色】模态弹窗，列出所有已保存的模版供用户选择。
 *         选中模版后调用 onSelect 回调（通常创建新文件夹并复制模版结构）。
 *         每次打开时重新加载模版列表。
 *
 * 【视觉布局】fixed inset-0 全屏遮罩（60% 不透明黑色背景），flex 居中。
 *           - 弹窗卡片：max-w-md mx-4，overflow-hidden，animate-in 动画
 *           - 头部：标题 "从模版新建文件夹" + 副标题
 *           - 内容区：max-h-80 overflow-y-auto 可滚列表
 *             * 加载态：居中 "加载中..."
 *             * 空状态：提示文字
 *             * 模版列表：每个模版一个按钮（全宽，左对齐）
 *           - 底部：取消按钮，borderTop 分割
 *
 * 【交互链】
 *   - 打开时 → storageLoadTemplates → 填充列表
 *   - 点击模版 → onSelect(template) → 调用方处理（创建文件夹）
 *   - 点击遮罩/cancel → onClose
 *
 * 【设计决策】
 *   - 每次 open 时重新加载模版：确保数据新鲜，支持其他页面保存模版后立即可见
 *   - 模版按钮 hover 时边框变紫色（accent），背景变淡紫（accent-bg）
 *     提供即时视觉反馈而不依赖 CSS :hover
 *   - 与 FilePicker 视觉风格一致（遮罩透明度、卡片圆角、阴影、间距）
 */

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

function TemplateModal({ open, onClose, onSelect }: TemplateModalProps) {
  const lang = getLang();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      storageLoadTemplates().then((list) => { setTemplates(list); setLoading(false); });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-4 overflow-hidden animate-in"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{t("createFromTemplate", lang)}</h2>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>{t("selectTemplateHint", lang)}</p>
        </div>
        <div className="px-5 py-4 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>{t("loading", lang)}</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{t("noTemplatesModal", lang)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{t("noTemplatesModalHint", lang)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <button key={tpl.id} onClick={() => onSelect(tpl)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{ borderRadius: "var(--radius)", border: "1px solid var(--border-subtle)", background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "transparent"; }}>
                  <div className="font-medium" style={{ color: "var(--text-primary)" }}>{tpl.name}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    {tpl.files.length}{t("filesUnit", lang)} · {" "}
                    {new Date(tpl.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex justify-end" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={onClose} className="btn-secondary py-2 text-[13px]">{t("cancel", lang)}</button>
        </div>
      </div>
    </div>
  );
}

export default TemplateModal;
