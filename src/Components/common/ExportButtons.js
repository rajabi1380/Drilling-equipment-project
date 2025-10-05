import React from "react";
import { exportCSV, exportDOC } from "../../utils/export";

/**
 * props:
 *  - getExport(): { filename, title, headers, rows }  // headers: string[]
 *  - variant?: "compact" | "normal"
 */
export default function ExportButtons({ getExport, variant = "normal" }) {
  const onExcel = () => {
    const { filename, headers, rows } = getExport();
    if (!headers?.length) return;
    const finalName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    exportCSV(finalName, headers, rows);
  };

  const onWord = () => {
    const { filename, title, headers, rows } = getExport();
    if (!headers?.length) return;
    const finalName = filename.endsWith(".doc") ? filename : `${filename}.doc`;
    exportDOC(finalName, title || "گزارش", headers, rows);
  };

  return (
    <div className={`export-group ${variant === "compact" ? "export-group--compact" : ""}`}>
      <button className="btn" onClick={onExcel}>خروجی Excel</button>
      <button className="btn" onClick={onWord}>خروجی Word</button>
    </div>
  );
}
