import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storageLoadTemplates, storageDeleteTemplate } from "../storage";
import type { Template } from "../types";
import { t, getLang } from "../i18n";

/**
 * TemplateManager — 模版管理页面（独立路由 /templates）
 *
 * 【角色】独立的模版列表管理页面，显示所有已保存的文件夹模版。
 *         支持查看模版详情（名称、文件数量、创建时间）和删除模版。
 *
 * 【视觉布局】全页面（min-h-screen），max-w-3xl mx-auto 居中内容区。
 *           - 头部：标题 "模版管理" + 副标题 "管理已保存的文件夹模版" + 返回按钮
 *           - 加载态：居中 "加载中..."
 *           - 空状态：大号灰 "+" + 说明文字 + 前往文件夹列表按钮
 *           - 列表态：border + rounded 卡片容器，每个模版一行（flex justify-between）
 *             * 左侧：模版名称（粗体）+ 文件数 + 创建时间
 *             * 右侧：红色"删除"按钮（hover 显示 danger-bg 背景）
 *
 * 【交互链】
 *   - 页面加载 → storageLoadTemplates() → 填充列表
 *   - 删除按钮 → confirm 确认 → storageDeleteTemplate(id) → 从列表移除
 *   - 返回按钮 → navigate("/") → 回到首页文件夹列表
 *
 * 【设计决策】
 *   - 独立路由 /templates：通过 react-router 管理，NavigateButton 导航进入
 *   - 删除不可逆：confirm 弹窗确认，防止误删
 *   - 每行底部 border（除最后一行）：模拟表格行的视觉分隔
 *   - 鼠标悬停直接操作 style（onMouseEnter/Leave），不依赖 CSS :hover 伪类
 */

function TemplateManager() {
  const lang = getLang();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    storageLoadTemplates()
      .then((list) => {
        setTemplates(list);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("confirmDeleteTemplate", lang))) return;
    await storageDeleteTemplate(id);
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-darkest)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t("templateManagement", lang)}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {t("manageTemplatesDesc", lang)}
            </p>
          </div>
          <button onClick={() => navigate("/")} className="btn-secondary py-2 text-sm">
            {t("backToFolders", lang)}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p style={{ color: "var(--text-tertiary)" }}>{t("loading", lang)}</p>
          </div>
        ) : templates.length === 0 ? (
          <div
            className="text-center py-16"
            style={{
              background: "var(--bg-panel)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="text-5xl mb-4 opacity-30">+</div>
            <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("noTemplates", lang)}
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
              {t("noTemplatesHint", lang)}
            </p>
            <button onClick={() => navigate("/")} className="btn-primary mt-6 px-5 py-2 text-sm">
              {t("goToFolders", lang)}
            </button>
          </div>
        ) : (
          <div
            className="overflow-hidden"
            style={{
              background: "var(--bg-panel)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              {templates.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="px-6 py-4 flex items-center justify-between transition-colors"
                  style={{
                    borderBottom:
                      idx < templates.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {tpl.name}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {tpl.files.length}{t("filesUnit", lang)} · {" "}
                      {new Date(tpl.createdAt).toLocaleString("zh-CN", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(tpl.id!)}
                    className="ml-4 px-3 py-1.5 text-sm transition-colors flex-shrink-0"
                    style={{
                      borderRadius: "var(--radius)",
                      color: "var(--danger)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--danger-bg)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {t("delete", lang)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplateManager;
