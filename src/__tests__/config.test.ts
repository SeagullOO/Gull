import { describe, it, expect } from "vitest";

// Vitest handles config.ts's top-level side effects in isolated test environments.
// Using static imports here since these are simple utility/constant tests.
import {
  ZOOM_DEFAULT,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
  ZOOM_REFERENCE,
  CONTENT_ZOOM_DEFAULT,
  CONTENT_ZOOM_MIN,
  CONTENT_ZOOM_MAX,
  CONTENT_ZOOM_STEP,
  COLOR_BORDER,
  COLOR_TEXT_SECONDARY,
  COLOR_ACCENT,
  COLOR_BG_PANEL,
  COLOR_BG_SELECTED,
  PANEL_WIDTH,
  PANEL_MIN_WIDTH,
  PANEL_MAX_WIDTH,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_MIN_HEIGHT,
  MAX_FILE_READ_SIZE,
  KEYBINDINGS,
} from "../config";

describe("ZOOM constants", () => {
  it("has expected ZOOM values", () => {
    expect(ZOOM_DEFAULT).toBe(110);
    expect(ZOOM_MIN).toBe(110);
    expect(ZOOM_MAX).toBe(150);
    expect(ZOOM_STEP).toBe(10);
    expect(ZOOM_REFERENCE).toBe(100);
  });

  it("has expected CONTENT_ZOOM values", () => {
    expect(CONTENT_ZOOM_DEFAULT).toBe(100);
    expect(CONTENT_ZOOM_MIN).toBe(50);
    expect(CONTENT_ZOOM_MAX).toBe(200);
    expect(CONTENT_ZOOM_STEP).toBe(10);
  });
});

describe("COLOR constants", () => {
  it("has defined color variables", () => {
    expect(COLOR_BORDER).toBeDefined();
    expect(COLOR_TEXT_SECONDARY).toBeDefined();
    expect(COLOR_ACCENT).toBeDefined();
    expect(COLOR_BG_PANEL).toBeDefined();
    expect(COLOR_BG_SELECTED).toBeDefined();
  });

  it("COLOR values reference CSS variables", () => {
    const colors = [
      COLOR_BORDER,
      COLOR_TEXT_SECONDARY,
      COLOR_ACCENT,
      COLOR_BG_PANEL,
      COLOR_BG_SELECTED,
    ];
    for (const value of colors) {
      expect(value).toMatch(/^var\(--/);
    }
  });
});

describe("LAYOUT constants", () => {
  it("has PANEL layout values that are positive numbers", () => {
    expect(PANEL_WIDTH).toBeGreaterThan(0);
    expect(PANEL_MIN_WIDTH).toBeGreaterThan(0);
    expect(PANEL_MAX_WIDTH).toBeGreaterThan(0);
  });

  it("has WINDOW values that are positive numbers", () => {
    expect(WINDOW_WIDTH).toBeGreaterThan(0);
    expect(WINDOW_HEIGHT).toBeGreaterThan(0);
    expect(WINDOW_MIN_WIDTH).toBeGreaterThan(0);
    expect(WINDOW_MIN_HEIGHT).toBeGreaterThan(0);
  });

  it("has MAX_FILE_READ_SIZE equal to 10MB", () => {
    expect(MAX_FILE_READ_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe("KEYBINDINGS", () => {
  it("has expected key binding entries", () => {
    expect(KEYBINDINGS).toHaveProperty("saveFile");
    expect(KEYBINDINGS).toHaveProperty("excelUndo");
    expect(KEYBINDINGS).toHaveProperty("deleteFile");
    expect(KEYBINDINGS).toHaveProperty("deleteFolder");
    expect(KEYBINDINGS).toHaveProperty("rename");
    expect(KEYBINDINGS).toHaveProperty("closePanel");
    expect(KEYBINDINGS).toHaveProperty("searchNext");
    expect(KEYBINDINGS).toHaveProperty("searchPrev");
    expect(KEYBINDINGS).toHaveProperty("searchOpen");
    expect(KEYBINDINGS).toHaveProperty("confirm");
    expect(KEYBINDINGS).toHaveProperty("cancel");
  });

  it("each key binding has a non-empty key string", () => {
    for (const [name, binding] of Object.entries(KEYBINDINGS)) {
      const b = binding as { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean };
      expect(
        b.key.length,
        `KEYBINDINGS.${name}.key should not be empty`
      ).toBeGreaterThan(0);
    }
  });

  it("saveFile binding uses Ctrl+S", () => {
    const binding = KEYBINDINGS.saveFile;
    expect(binding.key).toBe("s");
    expect(binding.ctrl).toBe(true);
  });

  it("rename uses F2 key", () => {
    expect(KEYBINDINGS.rename.key).toBe("F2");
  });

  it("closePanel uses Escape key", () => {
    expect(KEYBINDINGS.closePanel.key).toBe("Escape");
  });
});
