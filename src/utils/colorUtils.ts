/**
 * colorUtils — HSV/Hex 颜色空间转换工具
 *
 * 为 ExcelToolbar 的自定义颜色选择器（色谱 + SV 面板）提供底层转换函数。
 * 所有函数均为纯函数，无副作用。
 */

/** RGB 颜色对象 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

/** HSV 颜色对象（h: 0-360, s: 0-1, v: 0-1） */
interface HSV {
  h: number;
  s: number;
  v: number;
}

/** 十六进制颜色字符串 → RGB 对象 */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** RGB → 十六进制颜色字符串（大写） */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) =>
        Math.max(0, Math.min(255, Math.round(x)))
          .toString(16)
          .padStart(2, "0")
          .toUpperCase(),
      )
      .join("")
  );
}

/** Hex → HSV（h: 0-360, s: 0-1, v: 0-1） */
export function hexToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn),
    delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * (((bn - rn) / delta) + 2);
    else h = 60 * (((rn - gn) / delta) + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

/** HSV → Hex */
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn: number, gn: number, bn: number;
  if (h < 60) {
    rn = c;
    gn = x;
    bn = 0;
  } else if (h < 120) {
    rn = x;
    gn = c;
    bn = 0;
  } else if (h < 180) {
    rn = 0;
    gn = c;
    bn = x;
  } else if (h < 240) {
    rn = 0;
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    gn = 0;
    bn = c;
  } else {
    rn = c;
    gn = 0;
    bn = x;
  }
  return rgbToHex((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}
