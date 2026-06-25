/**
 * xlsxUtils.ts — Excel .xlsx 文件序列化/反序列化
 *
 * 使用 exceljs 库将内部数据模型 {data, colHeaders, cellMeta}
 * 与 .xlsx 二进制格式互相转换。
 *
 * 颜色映射：
 *   _color   → font.color (argb)
 *   _bgColor → fill (solid pattern, argb)
 *   _bold    → font.bold
 *   _italic  → font.italic
 *   _fontSize → font.size
 */

import ExcelJS from "exceljs";

// ── 编码/解码辅助函数 ────────────────────────────────────────────────────

/** ArrayBuffer → base64 字符串（用于 IPC 传输） */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** base64 字符串 → ArrayBuffer */
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── 颜色格式转换 ──────────────────────────────────────────────────────────

/** "#RRGGBB" → "FFRRGGBB"（exceljs argb 格式，前缀 FF = 不透明） */
function hexToArgb(hex: string): string {
  const clean = hex.replace("#", "").toUpperCase();
  return clean.length === 6 ? "FF" + clean : clean;
}

/** "FFRRGGBB" → "#RRGGBB" */
function argbToHex(argb: string): string {
  if (!argb) return "#000000";
  return argb.length >= 8 ? "#" + argb.substring(2, 8) : "#" + argb.substring(2);
}

// ── 核心转换函数 ──────────────────────────────────────────────────────────

/**
 * 将内部 Excel 数据模型序列化为 .xlsx ArrayBuffer
 *
 * 结构：
 *   Row 1 = colHeaders（粗体 + 居中）
 *   Rows 2..N = 数据行（含单元格样式）
 */
export async function dataToXlsxBuffer(
  data: string[][],
  colHeaders: string[],
  cellMeta?: any[][],
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");

  // 写入列头行
  const headerRow = sheet.addRow(colHeaders);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });

  // 写入数据行
  const rows = data || [];
  for (let r = 0; r < rows.length; r++) {
    const rowData = rows[r];
    if (!rowData) { sheet.addRow([]); continue; }
    const excelRow = sheet.addRow(rowData);

    // 应用单元格样式
    if (cellMeta && cellMeta[r]) {
      const metaRow = cellMeta[r];
      if (metaRow) {
        for (let c = 0; c < metaRow.length && c < rowData.length; c++) {
          const meta = metaRow[c];
          if (!meta || Object.keys(meta).length === 0) continue;
          const cell = excelRow.getCell(c + 1); // exceljs 列索引从 1 开始

          if (meta._bold) cell.font = { ...cell.font, bold: true };
          if (meta._italic) cell.font = { ...cell.font, italic: true };
          if (meta._fontSize) cell.font = { ...cell.font, size: meta._fontSize };
          if (meta._color) {
            cell.font = { ...cell.font, color: { argb: hexToArgb(meta._color) } };
          }
          if (meta._bgColor) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: hexToArgb(meta._bgColor) },
            };
          }
        }
      }
    }
  }

  // 设置列宽
  sheet.columns = colHeaders.map(() => ({ width: 14 }));

  return workbook.xlsx.writeBuffer();
}

/**
 * 从 .xlsx ArrayBuffer 解析为内部 Excel 数据模型
 *
 * 读取第一个 worksheet：
 *   Row 1 → colHeaders, Rows 2..N → data
 *   从单元格样式中提取 _color, _bgColor, _bold, _italic, _fontSize
 */
export async function xlsxBufferToData(buffer: ArrayBuffer): Promise<{
  data: string[][];
  colHeaders: string[];
  cellMeta: any[][] | undefined;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { data: [[]], colHeaders: ["A"], cellMeta: undefined };
  }

  const colHeaders: string[] = [];
  const data: string[][] = [];
  const cellMeta: any[][] = [];

  let isHeader = true;
  sheet.eachRow((row, rowNumber) => {
    const values: string[] = [];
    const metaRow: any[] = [];

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // 单元格值：始终作为字符串
      const cellValue = cell.value;
      const textValue = cellValue != null ? String(cellValue) : "";
      values.push(textValue);

      // 提取样式
      const meta: any = {};
      const font = cell.font || {};
      if (font.bold) meta._bold = true;
      if (font.italic) meta._italic = true;
      if (font.size) meta._fontSize = font.size;
      if (font.color && (font.color as any).argb) {
        const argb = (font.color as any).argb;
        // 忽略默认黑色 (FF000000)
        if (argb !== "FF000000") meta._color = argbToHex(argb);
      }
      const fill = cell.fill as any;
      if (fill && fill.type === "pattern" && fill.fgColor && fill.fgColor.argb) {
        const argb = fill.fgColor.argb;
        // 忽略白色/无色 (FFFFFFFF / 00000000)
        if (argb !== "FFFFFFFF" && argb !== "00000000") {
          meta._bgColor = argbToHex(argb);
        }
      }
      metaRow.push(meta);
    });

    if (isHeader) {
      // 第一行作为列头
      colHeaders.push(...values);
      isHeader = false;
    } else {
      data.push(values);
      cellMeta.push(metaRow);
    }
  });

  return {
    colHeaders: colHeaders.length > 0 ? colHeaders : ["A", "B", "C"],
    data: data.length > 0 ? data : [[]],
    cellMeta: cellMeta.length > 0 ? cellMeta : undefined,
  };
}

/**
 * 生成一个只含列头的空 .xlsx 文件（base64）
 * 用于新建 Excel 文件时的初始内容
 */
export async function createEmptyXlsxBase64(colHeaders?: string[]): Promise<string> {
  const headers = colHeaders || Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center" };
  });
  // 添加一行空数据行
  sheet.addRow(headers.map(() => ""));
  sheet.columns = headers.map(() => ({ width: 14 }));
  const buffer = await workbook.xlsx.writeBuffer();
  return arrayBufferToBase64(buffer);
}

/**
 * 将 base64 xlsx 字符串解析为内部数据模型（便捷函数）
 */
export async function xlsxBase64ToData(b64: string): Promise<{
  data: string[][];
  colHeaders: string[];
  cellMeta: any[][] | undefined;
}> {
  return xlsxBufferToData(base64ToArrayBuffer(b64));
}

/**
 * 将内部数据模型序列化为 base64 xlsx 字符串（便捷函数）
 */
export async function dataToXlsxBase64(
  data: string[][],
  colHeaders: string[],
  cellMeta?: any[][],
): Promise<string> {
  const buffer = await dataToXlsxBuffer(data, colHeaders, cellMeta);
  return arrayBufferToBase64(buffer);
}
