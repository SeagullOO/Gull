export function makeDefaultMdContent() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function makeDefaultExcelContent() {
  const cols = 26;
  const rows = 100;
  const colHeaders: string[] = [];
  for (let i = 0; i < cols; i++) colHeaders.push(String.fromCharCode(65 + i));
  const data = Array.from({ length: rows }, () => Array(cols).fill(""));
  return { data, colHeaders };
}

export function selectMarkdownSaveText(source: string, editorValue: string | null | undefined) {
  return editorValue ?? source;
}

export function resolveMarkdownLoadText(
  cachedText: string | undefined,
  diskText: string,
  lastSavedText: string,
) {
  if (cachedText !== undefined && cachedText !== lastSavedText) return cachedText;
  return diskText;
}

export function parseMarkdownDiskContent(raw: string) {
  return raw;
}

export function shouldLoadExcelData(currentData: unknown[][], nextData: unknown[][]) {
  return JSON.stringify(currentData) !== JSON.stringify(nextData);
}
