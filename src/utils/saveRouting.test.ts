import { describe, expect, it, vi } from "vitest";
import { getSaveHandler } from "./saveRouting";

describe("getSaveHandler", () => {
  it("routes manual save to the active file type", async () => {
    const md = vi.fn();
    const excel = vi.fn();
    const docx = vi.fn();

    await getSaveHandler("md", { md, excel, docx })?.();
    await getSaveHandler("excel", { md, excel, docx })?.();
    await getSaveHandler("docx", { md, excel, docx })?.();

    expect(md).toHaveBeenCalledTimes(1);
    expect(excel).toHaveBeenCalledTimes(1);
    expect(docx).toHaveBeenCalledTimes(1);
  });

  it("returns null when there is no active file type", () => {
    expect(getSaveHandler(null, { md: vi.fn(), excel: vi.fn(), docx: vi.fn() })).toBeNull();
  });
});
