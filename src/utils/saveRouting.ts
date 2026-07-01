import type { FolderFile } from "../types";

export type SaveFileType = FolderFile["type"] | null | undefined;

export interface SaveHandlers {
  md: () => void | Promise<void>;
  excel: () => void | Promise<void>;
  docx: () => void | Promise<void>;
}

export function getSaveHandler(fileType: SaveFileType, handlers: SaveHandlers): (() => void | Promise<void>) | null {
  if (!fileType) return null;
  return handlers[fileType] ?? null;
}
