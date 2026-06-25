import React from "react";
import { KEYBINDINGS } from "../config";

/**
 * FormulaBar — 公式栏组件（模仿 Excel 公式栏）
 *
 * 【角色】显示当前选中单元格的引用地址，并提供公式/值的编辑输入框。
 *         位于 ExcelToolbar 下方、Handsontable 容器上方，在整个编辑器布局中充当"地址栏"。
 *
 * 【视觉布局】flex 水平行（formula-bar 类定义）。
 *           - 左侧：cell ref 显示区（固定宽度，显示如 "A1" 或 "—"）
 *           - 中间：fx 标识（8px 宽度的标记）
 *           - 右侧：flex-1 输入框（满宽，等宽字体）
 *
 * 【交互链】
 *   - Handsontable afterSelection → FolderWorkspace → setCellRef + setFormulaValue → 传入本组件
 *   - 用户在输入框中编辑 → onChange 同步更新 formulaValue + 直接 hot.setDataAtCell 写入
 *   - 用户按 Enter → 失焦输入框（提交编辑）
 *   - 用户按 Escape → 恢复原始单元格值（从 hot.getDataAtCell 读取）并失焦
 *   - isFormulaBarFocused ref → FolderWorkspace 用于判断是否应该阻止 Handsontable 键盘事件
 *
 * 【设计决策】
 *   - 公式栏和 Handsontable 同步绑定：输入框 onChange 实时写入单元格，
 *     避免"编辑公式栏但单元格不更新"的割裂体验
 *   - Escape 恢复机制：直接读取 hot.getDataAtCell 的原始值，
 *     不依赖外部状态（因为 Handsontable 才是数据源）
 *   - isFormulaBarFocused 用 useRef 传递而非 state：
 *     聚焦/失焦切换非常频繁，用 ref 避免不必要的重渲染
 */
interface FormulaBarProps {
  cellRef: string;          // 当前选中单元格的引用地址，如 "A1"
  formulaValue: string;     // 当前单元格的公式或值
  hotInstance: React.MutableRefObject<any>; // Handsontable 实例引用
  isFormulaBarFocused: React.MutableRefObject<boolean>; // 标记公式栏是否聚焦（用于阻止 Handsontable 快捷键）
  onFormulaValueChange: (value: string) => void; // 值变化回调
}

function FormulaBar({
  cellRef,
  formulaValue,
  hotInstance,
  isFormulaBarFocused,
  onFormulaValueChange,
}: FormulaBarProps) {
  const hot = hotInstance.current;

  return (
    <div className="formula-bar">
      <div className="formula-bar-cell-ref" title="当前单元格">{cellRef || '—'}</div>
      <span className="formula-bar-fx">fx</span>
      <input
        className="formula-bar-input"
        value={formulaValue}
        spellCheck={false}
        onChange={(e) => {
          const newVal = e.target.value;
          onFormulaValueChange(newVal);
          if (hot && !hot.isDestroyed) {
            const sel = hot.getSelected();
            if (sel && sel[0]) {
              const [r, c] = sel[0];
              if (r >= 0 && c >= 0) hot.setDataAtCell(r, c, newVal);
            }
          }
        }}
        onFocus={() => { isFormulaBarFocused.current = true; }}
        onBlur={() => { isFormulaBarFocused.current = false; }}
        onKeyDown={(e) => {
          // Enter: 提交当前编辑（通过 blur 触发 onBlur 中的提交逻辑）
          if (e.key === KEYBINDINGS.confirm.key) {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === KEYBINDINGS.cancel.key) {
            // Escape: 从 Handsontable 读取原始值并恢复，然后失焦取消编辑
            if (hot && !hot.isDestroyed) {
              const sel = hot.getSelected();
              if (sel && sel[0]) {
                const [r, c] = sel[0];
                if (r >= 0 && c >= 0) {
                  const original = hot.getDataAtCell(r, c);
                  onFormulaValueChange(original != null ? String(original) : "");
                }
              }
            }
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

export default FormulaBar;
