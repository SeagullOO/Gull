import { beforeEach, describe, expect, it, vi } from "vitest";

describe("storageDeleteWorkspaceFile", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (window as any).electronAPI;
  });

  it("throws when Electron reports that a workspace file was not deleted", async () => {
    (window as any).electronAPI = {
      deleteFile: vi.fn().mockResolvedValue(false),
    };

    const { storageDeleteWorkspaceFile } = await import("../storage");

    await expect(storageDeleteWorkspaceFile("Workspace", "missing.md")).rejects.toThrow(
      "Delete failed: Workspace/missing.md",
    );
  });

  it("throws when Electron reports that a workspace directory was not deleted", async () => {
    (window as any).electronAPI = {
      rmdir: vi.fn().mockResolvedValue(false),
    };

    const { storageDeleteWorkspaceDir } = await import("../storage");

    await expect(storageDeleteWorkspaceDir("Workspace", "old-folder")).rejects.toThrow(
      "Delete failed: Workspace/old-folder",
    );
  });
});
