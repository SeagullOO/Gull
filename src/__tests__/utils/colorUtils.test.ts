import { describe, it, expect } from "vitest";
import { hexToRgb, rgbToHex, hexToHsv, hsvToHex } from "../../utils/colorUtils";

describe("hexToRgb", () => {
  it("converts pure red hex to RGB", () => {
    expect(hexToRgb("#FF0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("converts pure green hex to RGB", () => {
    expect(hexToRgb("#00FF00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("converts pure blue hex to RGB", () => {
    expect(hexToRgb("#0000FF")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("converts white hex to RGB", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("converts black hex to RGB", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("converts mixed hex value to RGB", () => {
    expect(hexToRgb("#1A2B3C")).toEqual({ r: 26, g: 43, b: 60 });
  });
});

describe("rgbToHex", () => {
  it("converts pure red RGB to hex", () => {
    expect(rgbToHex(255, 0, 0)).toBe("#FF0000");
  });

  it("converts pure green RGB to hex", () => {
    expect(rgbToHex(0, 255, 0)).toBe("#00FF00");
  });

  it("converts pure blue RGB to hex", () => {
    expect(rgbToHex(0, 0, 255)).toBe("#0000FF");
  });

  it("converts white RGB to hex", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#FFFFFF");
  });

  it("converts black RGB to hex", () => {
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  it("clamps values outside 0-255 range", () => {
    expect(rgbToHex(300, -10, 128)).toBe("#FF0080");
  });

  it("rounds floating point values before converting", () => {
    expect(rgbToHex(127.6, 0.4, 255.1)).toBe("#8000FF");
  });

  it("pads single-digit hex values with zero", () => {
    expect(rgbToHex(15, 0, 5)).toBe("#0F0005");
  });
});

describe("hexToHsv", () => {
  it("converts pure red hex to HSV", () => {
    const result = hexToHsv("#FF0000");
    expect(result.h).toBeCloseTo(0);
    expect(result.s).toBeCloseTo(1);
    expect(result.v).toBeCloseTo(1);
  });

  it("converts pure green hex to HSV", () => {
    const result = hexToHsv("#00FF00");
    expect(result.h).toBeCloseTo(120);
    expect(result.s).toBeCloseTo(1);
    expect(result.v).toBeCloseTo(1);
  });

  it("converts pure blue hex to HSV", () => {
    const result = hexToHsv("#0000FF");
    expect(result.h).toBeCloseTo(240);
    expect(result.s).toBeCloseTo(1);
    expect(result.v).toBeCloseTo(1);
  });

  it("converts white hex to HSV", () => {
    const result = hexToHsv("#FFFFFF");
    expect(result.s).toBeCloseTo(0);
    expect(result.v).toBeCloseTo(1);
  });

  it("converts black hex to HSV", () => {
    const result = hexToHsv("#000000");
    expect(result.v).toBeCloseTo(0);
    expect(result.s).toBeCloseTo(0);
  });

  it("converts cyan hex to HSV", () => {
    const result = hexToHsv("#00FFFF");
    expect(result.h).toBeCloseTo(180);
    expect(result.s).toBeCloseTo(1);
    expect(result.v).toBeCloseTo(1);
  });
});

describe("hsvToHex", () => {
  it("converts pure red HSV to hex", () => {
    expect(hsvToHex(0, 1, 1)).toBe("#FF0000");
  });

  it("converts pure green HSV to hex", () => {
    expect(hsvToHex(120, 1, 1)).toBe("#00FF00");
  });

  it("converts pure blue HSV to hex", () => {
    expect(hsvToHex(240, 1, 1)).toBe("#0000FF");
  });

  it("converts white HSV to hex", () => {
    expect(hsvToHex(0, 0, 1)).toBe("#FFFFFF");
  });

  it("converts black HSV to hex", () => {
    expect(hsvToHex(0, 0, 0)).toBe("#000000");
  });

  it("converts cyan HSV to hex", () => {
    expect(hsvToHex(180, 1, 1)).toBe("#00FFFF");
  });
});

describe("round-trip conversions", () => {
  it("hex -> HSV -> hex returns original for red", () => {
    const original = "#FF0000";
    const hsv = hexToHsv(original);
    const roundTrip = hsvToHex(hsv.h, hsv.s, hsv.v);
    expect(roundTrip).toBe(original);
  });

  it("hex -> HSV -> hex returns original for green", () => {
    const original = "#00FF00";
    const hsv = hexToHsv(original);
    const roundTrip = hsvToHex(hsv.h, hsv.s, hsv.v);
    expect(roundTrip).toBe(original);
  });

  it("hex -> HSV -> hex returns original for blue", () => {
    const original = "#0000FF";
    const hsv = hexToHsv(original);
    const roundTrip = hsvToHex(hsv.h, hsv.s, hsv.v);
    expect(roundTrip).toBe(original);
  });

  it("hex -> RGB -> hex returns original for mixed color", () => {
    const original = "#1A2B3C";
    const rgb = hexToRgb(original);
    const roundTrip = rgbToHex(rgb.r, rgb.g, rgb.b);
    expect(roundTrip).toBe(original);
  });
});
