// src/Components/common/ExportButtons.js
import React from "react";
import { exportCSV, exportDOC } from "../../utils/export";

/**
 * حالت A: getExport(): { filename, title, headers, rows }
 * حالت B: onExcel(), onWord()
 * variant: "compact" | "normal"
 */
export default function ExportButtons({ getExport, onExcel, onWord, variant = "normal", label }) {
  const _excel = () => {
    if (typeof onExcel === "function") return onExcel();
    const pack = getExport?.();
    if (!pack || !pack.headers?.length) return;
    const name = pack.filename.endsWith(".csv") ? pack.filename : `${pack.filename}.csv`;
    exportCSV(name, pack.headers, pack.rows || []);
  };

  const _word = () => {
    if (typeof onWord === "function") return onWord();
    const pack = getExport?.();
    if (!pack || !pack.headers?.length) return;
    const name = pack.filename.endsWith(".doc") ? pack.filename : `${pack.filename}.doc`;
    exportDOC(name, pack.title || "گزارش", pack.headers, pack.rows || []);
  };

  return (
    <div className={`export-group ${variant === "compact" ? "export-group--compact" : ""}`}>
      {label && <span style={{ marginInlineEnd: 8 }}>{label}</span>}
      <button className="btn" onClick={_excel}>خروجی Excel</button>
      <button className="btn" onClick={_word}>خروجی Word</button>
    </div>
  );
}
