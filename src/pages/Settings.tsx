/**
 * Settings.tsx — 设置页面（模态浮层）
 *
 * 以悬浮模态窗口形式覆盖在当前页面上，通过 React Router 的 navigate(-1) 关闭。
 *
 * 设置项分四个标签页：通用 / 外观 / 存储 / 关于
 * 所有设置保存在 localStorage (key: gdt_settings)，语言偏好保存在 gdt_lang。
 *
 * 性能优化：
 * - 移除了 backdrop-filter: blur() — 大尺寸毛玻璃导致 GPU 持续重绘
 * - React.memo 防止父组件 re-render 触发无意义渲染
 * - useMemo 缓存 navItems 避免每帧重建 SVG
 */

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { t, getLang, setLang } from "../i18n";
import type { Lang } from "../i18n";

const STORAGE_KEY = "gdt_settings";

interface SettingsData {
  theme: "dark" | "light" | "system";
  zoom: number;
}

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: ["dark", "light", "system"].includes(parsed.theme) ? parsed.theme : "dark",
        zoom: typeof parsed.zoom === "number" && parsed.zoom >= 70 && parsed.zoom <= 150 ? parsed.zoom : 100,
      };
    }
  } catch {}
  return { theme: "dark", zoom: 100 };
}

function saveSettings(s: SettingsData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function applyThemeClass(theme: string): void {
  if (theme === "light") document.documentElement.classList.add("light");
  else if (theme === "dark") document.documentElement.classList.remove("light");
  else document.documentElement.classList.toggle("light", !window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function getStoragePath(): string {
  return typeof window !== "undefined" && "electronAPI" in window
    ? "Electron userData"
    : "浏览器 IndexedDB";
}

// ── SVG 图标（组件外定义，避免每帧重建）──

const SettingsIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.2v1.8M8 13v1.8M13.2 8h-1.8M4.6 8H2.8M11.7 4.3l-1.3 1.3M5.6 10.4l-1.3 1.3M11.7 11.7l-1.3-1.3M5.6 5.6L4.3 4.3" />
  </svg>
);

const AppearanceIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="2" width="14" height="12" rx="1.5" />
    <path d="M5 14V2M1 6h4M1 10h4" />
  </svg>
);

const StorageIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4.5l4.5-2 7 2.5v7l-7 2.5-4.5-2.5v-7.5z" />
    <path d="M2 4.5l4.5 2.5v7.5" />
    <path d="M6.5 7l7-2.5" />
    <path d="M6.5 7v7.5" />
  </svg>
);

const AboutIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 5v0M8 8v3" />
  </svg>
);

// ── ZoomInput ─────────────────────────────────────────────────────────────────

const ZoomInput = memo(function ZoomInput({ value, onChange, lang }: { value: number; onChange: (v: number) => void; lang: Lang }) {
  const [editing, setEditing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; v: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const clamp = (v: number): number => Math.min(150, Math.max(70, Math.round(v / 10) * 10));

  useEffect(() => {
    if (!dragStart) return;
    const mm = (e: MouseEvent) => onChange(clamp(dragStart.v + (e.clientX - dragStart.x)));
    const mu = () => setDragStart(null);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup", mu);
    };
  }, [dragStart, onChange]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number" min={70} max={150} step={10}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditing(false); }}
        className="stg-zoom-input"
      />
    );
  }

  return (
    <span
      className="stg-zoom-value"
      onMouseDown={(e) => setDragStart({ x: e.clientX, v: value })}
      onClick={() => {
        if (!dragStart || Math.abs(value - (dragStart.v || 0)) < 5) setEditing(true);
        setDragStart(null);
      }}
      title={t("stgDragTip", lang)}
    >
      {value}%
    </span>
  );
});

// ── Settings 主组件 ───────────────────────────────────────────────────────────

const Settings = memo(function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [storagePath, setStoragePath] = useState<string>(getStoragePath);
  const [activeNav, setActiveNav] = useState<string>("stgGeneral");
  const [lang, setLangState] = useState<Lang>(getLang);
  const isElectron = typeof window !== "undefined" && "electronAPI" in window;
  const api = (window as any).electronAPI;

  // ── 自动更新状态 ──────────────────────────────────────────────────────
  type UpdateStatus =
    | "idle"
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    if (!api?.onUpdateStatus) return;
    const cleanup = api.onUpdateStatus((status: string, data?: any) => {
      switch (status) {
        case "checking": setUpdateStatus("checking"); break;
        case "available": setUpdateStatus("available"); setUpdateVersion(data || ""); break;
        case "not-available": setUpdateStatus("not-available"); break;
        case "progress": setUpdateStatus("downloading"); setUpdateProgress(data || 0); break;
        case "downloaded": setUpdateStatus("downloaded"); break;
        case "error": setUpdateStatus("error"); setUpdateError(data || ""); break;
      }
    });
    return cleanup;
  }, [api]);

  const handleCheckUpdate = useCallback(async () => {
    if (!api?.checkForUpdates) return;
    setUpdateStatus("checking");
    setUpdateError("");
    const result = await api.checkForUpdates();
    if (result?.dev) { setUpdateStatus("not-available"); }
    else if (result?.error) { setUpdateStatus("error"); setUpdateError(result.error); }
  }, [api]);

  const handleDownloadUpdate = useCallback(async () => {
    if (!api?.downloadUpdate) return;
    setUpdateStatus("downloading");
    const result = await api.downloadUpdate();
    if (result?.error) { setUpdateStatus("error"); setUpdateError(result.error); }
  }, [api]);

  const handleInstallUpdate = useCallback(() => {
    api?.installUpdate?.();
  }, [api]);

  const handleClose = useCallback(() => navigate(-1), [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const persistAndApply = useCallback((next: SettingsData) => {
    setSettings(next);
    saveSettings(next);
    applyThemeClass(next.theme);
    (window as any).__applyZoom?.(next.zoom);
  }, []);

  useEffect(() => { applyThemeClass(settings.theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** 切换语言：更新模块级状态 + 强制整个应用重渲染 */
  const switchLang = useCallback((l: Lang) => {
    setLang(l);
    setLangState(l);
    (window as any).__applyLang?.(l);
  }, []);

  const navItems = useMemo(() => [
    { key: "stgGeneral", icon: <SettingsIcon /> },
    { key: "stgAppearance", icon: <AppearanceIcon /> },
    { key: "stgStorage", icon: <StorageIcon /> },
    { key: "stgAbout", icon: <AboutIcon /> },
  ], []);

  return (
    <div
      className="settings-backdrop"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0, 0, 0, 0.55)",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          display: "flex", width: "80vw", height: "80vh",
          maxWidth: 900, minWidth: 560, minHeight: 400,
          borderRadius: "var(--radius-m)", overflow: "hidden",
          background: "var(--stg-bg)",
          border: "1px solid var(--border-medium)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute", top: 10, right: 10,
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            border: "none", borderRadius: "var(--radius-s)",
            background: "transparent", color: "var(--stg-muted)", cursor: "pointer",
            zIndex: 10, fontSize: 16, lineHeight: 1,
          }}
          title={t("close", lang)}
        >
          ✕
        </button>

        {/* Sidebar */}
        <aside className="stg-sidebar" style={{ height: "100%", borderRadius: 0 }}>
          <div className="stg-sidebar-header">{t("stgSettings", lang)}</div>
          <nav className="stg-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`stg-nav-btn${activeNav === item.key ? " active" : ""}`}
                onClick={() => setActiveNav(item.key)}
              >
                {item.icon}
                {t(item.key, lang)}
              </button>
            ))}
          </nav>
          <div className="stg-sidebar-footer">v1.0.0</div>
        </aside>

        {/* Main Content */}
        <main className="stg-main" style={{ overflow: "auto", height: "100%" }}>
          {activeNav === "stgGeneral" && (
            <>
              <div>
                <h1 className="stg-section-title">{t("stgGeneral", lang)}</h1>
                <p className="stg-section-desc">{t("stgGeneralDesc", lang)}</p>
              </div>
              <div className="stg-card">
                <div className="stg-card-header">{t("stgLanguageRegion", lang)}</div>
                <div className="stg-row">
                  <div className="stg-info">
                    <div className="stg-label">{t("stgUiLanguage", lang)}</div>
                    <div className="stg-hint">{t("stgUiLanguageDesc", lang)}</div>
                  </div>
                  <div className="stg-control">
                    <div className="stg-btn-group">
                      {(["zh", "en"] as Lang[]).map((v) => (
                        <button
                          key={v}
                          className={`stg-btn-group-btn${lang === v ? " active" : ""}`}
                          onClick={() => switchLang(v)}
                        >
                          {t(v, lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === "stgAppearance" && (
            <>
              <div>
                <h1 className="stg-section-title">{t("stgAppearance", lang)}</h1>
                <p className="stg-section-desc">{t("stgAppearanceDesc", lang)}</p>
              </div>
              <div className="stg-card">
                <div className="stg-card-header">{t("stgTheme", lang)}</div>
                <div className="stg-row">
                  <div className="stg-info">
                    <div className="stg-label">{t("stgColorTheme", lang)}</div>
                    <div className="stg-hint">{t("stgColorThemeDesc", lang)}</div>
                  </div>
                  <div className="stg-control">
                    <div className="stg-btn-group">
                      {(["dark", "light", "system"] as const).map((v) => (
                        <button
                          key={v}
                          className={`stg-btn-group-btn${settings.theme === v ? " active" : ""}`}
                          onClick={() => persistAndApply({ ...settings, theme: v })}
                        >
                          {t(`stg${v.charAt(0).toUpperCase() + v.slice(1)}` as any, lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="stg-row">
                  <div className="stg-info">
                    <div className="stg-label">{t("stgUiZoom", lang)}</div>
                    <div className="stg-hint">{t("stgUiZoomDesc", lang)}</div>
                  </div>
                  <div className="stg-control">
                    <ZoomInput
                      value={settings.zoom}
                      onChange={(v) => persistAndApply({ ...settings, zoom: v })}
                      lang={lang}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === "stgStorage" && (
            <>
              <div>
                <h1 className="stg-section-title">{t("stgStorage", lang)}</h1>
                <p className="stg-section-desc">{t("stgStorageDesc", lang)}</p>
              </div>
              <div className="stg-card">
                <div className="stg-card-header">{t("stgStorageLocation", lang)}</div>
                <div className="stg-row">
                  <div className="stg-info">
                    <div className="stg-label">{t("stgStoragePathLabel", lang)}</div>
                    <div className="stg-hint" style={{
                      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
                      maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }} title={storagePath}>
                      {storagePath}
                    </div>
                  </div>
                  <div className="stg-control">
                    {isElectron ? (
                      <button className="stg-btn" onClick={async () => {
                        const api = (window as any).electronAPI;
                        if (api?.selectStoragePath) {
                          const p = await api.selectStoragePath();
                          if (p) setStoragePath(p);
                        }
                      }}>
                        {t("change", lang)}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--stg-muted)" }}>{storagePath}</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === "stgAbout" && (
            <>
              <div>
                <h1 className="stg-section-title">{t("stgAbout", lang)}</h1>
                <p className="stg-section-desc">{t("stgAboutDesc", lang)}</p>
              </div>
              <div className="stg-card">
                <div className="stg-version-block" style={{ flexDirection: "column", gap: 12, alignItems: "stretch" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div className="stg-app-name">OO Game Tool</div>
                      <div className="stg-meta">
                        版本 1.0.0 (build 2406.22)<br />
                        React 18 · Vite 5 · Electron 42<br />
                        © 2026
                      </div>
                    </div>
                    {updateStatus === "idle" && (
                      <button className="stg-btn primary" onClick={handleCheckUpdate}>
                        {t("stgCheckUpdate", lang)}
                      </button>
                    )}
                    {updateStatus === "checking" && (
                      <button className="stg-btn primary" disabled style={{ opacity: 0.7 }}>
                        {lang === "zh" ? "检查中..." : "Checking..."}
                      </button>
                    )}
                    {updateStatus === "available" && (
                      <button className="stg-btn primary" onClick={handleDownloadUpdate}>
                        {lang === "zh" ? `下载 v${updateVersion}` : `Download v${updateVersion}`}
                      </button>
                    )}
                    {updateStatus === "downloading" && (
                      <button className="stg-btn primary" disabled style={{ opacity: 0.7 }}>
                        {updateProgress}%
                      </button>
                    )}
                    {updateStatus === "downloaded" && (
                      <button className="stg-btn primary" onClick={handleInstallUpdate}>
                        {lang === "zh" ? "重启安装" : "Restart to Install"}
                      </button>
                    )}
                    {updateStatus === "not-available" && (
                      <button className="stg-btn" disabled style={{ opacity: 0.6 }}>
                        {lang === "zh" ? "已是最新" : "Up to date"}
                      </button>
                    )}
                    {updateStatus === "error" && (
                      <div style={{ textAlign: "right" }}>
                        <button className="stg-btn" onClick={handleCheckUpdate}
                          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                          {lang === "zh" ? "重试" : "Retry"}
                        </button>
                        <div className="stg-meta" style={{ marginTop: 4, maxWidth: 180 }}>
                          {updateError}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 下载进度条 */}
                  {updateStatus === "downloading" && (
                    <div style={{ height: 4, background: "var(--stg-border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${updateProgress}%`, background: "var(--stg-accent)", borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="stg-card">
                <div className="stg-card-header">{t("stgLicenses", lang)}</div>
                <div className="stg-row">
                  <div className="stg-info">
                    <div className="stg-label">{t("stgOpenSourceLicenses", lang)}</div>
                    <div className="stg-hint">{t("stgOpenSourceLicensesDesc", lang)}</div>
                  </div>
                  <div className="stg-control">
                    <button className="stg-btn">{t("view", lang)}</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
});

export default Settings;
