/**
 * ColorPickerPanel — shared color selection panel
 *
 * Extracted from ExcelToolbar. Renders theme colors, standard colors, recent colors,
 * and a "More Colors" button that triggers the CustomColorPicker.
 * Used by both ExcelToolbar (cell formatting) and DocxToolbar (Tiptap text color).
 *
 * Does NOT own DropPanel or CustomColorPicker — consumers wrap it.
 */

import { t } from "../i18n";

// ── Color presets ──────────────────────────────────────────────────────────

export const THEME_COLORS = [
  "#E1EAFF", "#4E83FD", "#3370FF", "#D5F6F2", "#00D6B9", "#04B49C", "#ECE2FE",
  "#7F3BF5", "#6425D0", "#FDE1E1", "#F76964", "#F54A45", "#E8F7E0", "#34C724",
];

export const STANDARD_COLORS = [
  "#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0",
  "#0070C0", "#002060", "#7030A0", "#FFFFFF", "#D6D6D6", "#ADADAD", "#808080",
];

export const MAX_RECENT = 7;

/**
 * Return theme-aware default font color.
 * Dark mode → #A5A5A5 (light grey), Light mode → #000000.
 */
export function getDefaultFontColor(): string {
  return document.documentElement.classList.contains("light") ? "#000000" : "#A5A5A5";
}

/** Immutable push to front, deduplicate, cap at MAX_RECENT. */
export function pushRecentColor(prev: string[], hex: string): string[] {
  return [hex, ...prev.filter((c) => c !== hex)].slice(0, MAX_RECENT);
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ColorPickerPanelProps {
  currentColor: string;
  recentColors: string[];
  onPick: (color: string) => void;
  onClear: () => void;
  onOpenCustom: () => void;
  lang: string;
}

// ── Component ──────────────────────────────────────────────────────────────

function ColorPickerPanel({
  currentColor,
  recentColors,
  onPick,
  onClear,
  onOpenCustom,
  lang,
}: ColorPickerPanelProps) {
  const renderColorSwatch = (
    color: string,
    onPickColor: (c: string) => void,
    selected?: boolean,
  ) => {
    const isWhite = color.toUpperCase() === "#FFFFFF";
    return (
      <div
        key={color}
        onClick={(e) => { e.stopPropagation(); onPickColor(color); }}
        title={color}
        style={{
          width: 18, height: 18,
          background: color,
          borderRadius: 2,
          cursor: "pointer",
          border: selected ? "2px solid #1456F0" : isWhite ? "1px solid var(--border-medium)" : "2px solid transparent",
          outline: selected ? "1px solid #1456F0" : "none",
          outlineOffset: 1,
          transition: "transform 0.1s",
          flexShrink: 0,
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Reset to default */}
      <div style={{ padding: "4px 10px 2px" }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          style={{
            width: "100%", padding: "3px 0", borderRadius: 3, cursor: "pointer",
            background: "transparent", border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {t("resetToDefault", lang)}
        </button>
      </div>
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 10px" }} />

      {/* Theme Colors — 2 rows × 7 */}
      <div style={{ fontSize: 9, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 10px 2px" }}>
        {t("themeColors", lang)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, padding: "0 10px 4px", justifyItems: "center" }}>
        {THEME_COLORS.map((c) => renderColorSwatch(c, onPick, currentColor === c))}
      </div>
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 10px" }} />

      {/* Standard Colors — 2 rows × 7 */}
      <div style={{ fontSize: 9, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px 2px" }}>
        {t("standardColors", lang)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, padding: "0 10px 4px", justifyItems: "center" }}>
        {STANDARD_COLORS.map((c) => renderColorSwatch(c, onPick, currentColor === c))}
      </div>
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 10px" }} />

      {/* Recent Colors — 1 row × 7, no selection highlight */}
      <div style={{ fontSize: 9, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 10px 2px" }}>
        {t("recentColors", lang)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, padding: "0 10px 4px", justifyItems: "center" }}>
        {recentColors.map((c) => renderColorSwatch(c, onPick))}
      </div>
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "2px 10px" }} />

      {/* More Colors button */}
      <div style={{ padding: "4px 6px" }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenCustom(); }}
          style={{
            width: "100%", padding: "4px 0", borderRadius: 3, cursor: "pointer",
            background: "transparent", border: "none",
            color: "var(--text-secondary)", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {t("moreColors", lang)}
        </button>
      </div>
    </div>
  );
}

export default ColorPickerPanel;
