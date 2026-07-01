import { describe, expect, it } from "vitest";
import {
  makeDefaultExcelContent,
  parseMarkdownDiskContent,
  resolveMarkdownLoadText,
  selectMarkdownSaveText,
  shouldLoadExcelData,
} from "../utils/defaultFileContent";

describe("default file content", () => {
  it("creates independent Excel content objects for new files", () => {
    const first = makeDefaultExcelContent();
    const second = makeDefaultExcelContent();

    first.data[0][0] = "first file";

    expect(second.data[0][0]).toBe("");
    expect(second.data).not.toBe(first.data);
    expect(second.colHeaders).not.toBe(first.colHeaders);
  });

  it("prefers the live Monaco value when saving Markdown", () => {
    expect(selectMarkdownSaveText("stale react state", "live editor text")).toBe("live editor text");
  });

  it("refreshes Markdown from disk when there are no unsaved cached edits", () => {
    expect(resolveMarkdownLoadText("old disk text", "new disk text", "old disk text")).toBe("new disk text");
  });

  it("keeps unsaved Markdown cache instead of overwriting it with disk content", () => {
    expect(resolveMarkdownLoadText("unsaved text", "disk text", "previous saved text")).toBe("unsaved text");
  });

  it("keeps Markdown disk content as text even when it is valid JSON syntax", () => {
    expect(parseMarkdownDiskContent("123")).toBe("123");
    expect(parseMarkdownDiskContent('{"title":"plain markdown text"}')).toBe('{"title":"plain markdown text"}');
  });

  it("loads Excel data when same-sized sheet content changes", () => {
    expect(shouldLoadExcelData([[""]], [["saved"]])).toBe(true);
    expect(shouldLoadExcelData([["saved"]], [["saved"]])).toBe(false);
  });
});
