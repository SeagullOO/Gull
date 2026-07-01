import { createRequire } from "module";
import path from "path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { resolveDataPath } = require("../../electron/storagePaths.cjs") as {
  resolveDataPath: (appRoot: string, config?: { customPath?: string }) => string;
};

describe("Electron storage path resolution", () => {
  it("defaults to appRoot/data when no custom path is configured", () => {
    expect(resolveDataPath("D:\\Apps\\GullDoc", {})).toBe(path.join("D:\\Apps\\GullDoc", "data"));
  });

  it("uses the configured custom path when one exists", () => {
    expect(resolveDataPath("D:\\Apps\\GullDoc", { customPath: "E:\\Docs\\Gull" })).toBe("E:\\Docs\\Gull");
  });
});
