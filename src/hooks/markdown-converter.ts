/**
 * markdown-converter.ts — TipTap JSON 到 Markdown 纯文本转换器
 *
 * 将旧版本的 TipTap 富文本编辑器 JSON 格式转换为标准 Markdown 纯文本。
 *
 * 背景：
 * - 早期版本使用 TipTap 编辑器，内容以 ProseMirror JSON 格式存储
 * - 迁移到 Monaco 编辑器后，需要读取旧文件格式并转为 Markdown 显示
 * - 此转换器在 useMarkdownEditor hook 的文件加载阶段被调用
 *
 * 支持的节点类型：
 * - 块级：doc, paragraph, heading, bulletList, orderedList, listItem,
 *         blockquote, codeBlock
 * - 行内：text, bold, strong, italic, em, hardBreak
 * - 跳过：image, fileLink, spreadsheetBlock 等（无 Markdown 等价表示）
 *
 * 导出：
 * - extractTextFromJson(json) — 将 TipTap JSON 转为 Markdown 字符串
 */

/**
 * 将 TipTap/ProseMirror JSON 文档转为 Markdown 纯文本
 *
 * 节点树遍历：
 * 1. renderNode() 处理块级节点（段落、标题、列表等）
 * 2. renderInline() 处理行内节点（粗体、斜体、链接等）
 *
 * @param json TipTap JSON 文档对象（包含 type 和 content 字段）
 * @returns Markdown 格式的纯文本字符串
 */
export function extractTextFromJson(json: Record<string, unknown>): string {
  if (!json || !json.content) return "";
  const content = json.content as Array<Record<string, unknown>>;
  return content.map(renderNode).join("\n");
}

/** 递归渲染块级节点为 Markdown */
function renderNode(node: Record<string, unknown>): string {
  if (!node) return "";
  const type = node.type as string;
  const content = node.content as Array<Record<string, unknown>> | undefined;

  switch (type) {
    case "doc":
      return content?.map(renderNode).join("\n") ?? "";
    case "paragraph": {
      const text = content?.map(renderInline).join("") ?? "";
      return text;
    }
    case "heading": {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 1;
      const text = content?.map(renderInline).join("") ?? "";
      return "#".repeat(level) + " " + text;
    }
    case "bulletList":
      return content?.map((item) => renderNode(item)).join("\n") ?? "";
    case "orderedList":
      return content?.map((item, i) => renderNode(item).replace(/^- /, `${i + 1}. `)).join("\n") ?? "";
    case "listItem":
      return "- " + (content?.map(renderInline).join("") ?? "");
    case "blockquote": {
      const text = content?.map(renderInline).join("") ?? "";
      return text.split("\n").map((line) => "> " + line).join("\n");
    }
    case "codeBlock": {
      const text = content?.map((c) => (c.type === "text" ? (c.text as string) : "")).join("") ?? "";
      return "```\n" + text + "\n```";
    }
    case "bold":
    case "strong":
      return "**" + (content?.map(renderInline).join("") ?? "") + "**";
    case "italic":
    case "em":
      return "*" + (content?.map(renderInline).join("") ?? "") + "*";
    case "text":
      return (node.text as string) ?? "";
    case "hardBreak":
      return "\n";
    default:
      return content?.map(renderNode).join("") ?? "";
  }
}

/** 递归渲染行内节点为 Markdown 内联语法 */
function renderInline(node: Record<string, unknown>): string {
  if (!node) return "";
  const type = node.type as string;

  if (type === "text") return (node.text as string) ?? "";
  if (type === "bold" || type === "strong") {
    const text = ((node.content as Array<Record<string, unknown>>) ?? []).map(renderInline).join("");
    return "**" + text + "**";
  }
  if (type === "italic" || type === "em") {
    const text = ((node.content as Array<Record<string, unknown>>) ?? []).map(renderInline).join("");
    return "*" + text + "*";
  }
  if (type === "hardBreak") return "\n";
  return "";
}
