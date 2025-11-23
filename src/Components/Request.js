// ==========================================
// File: RequestPanel.js
// نمایش درخواست‌های باز و بایگانی‌شده
// ==========================================
import React, { useState } from "react";
import { exportCSV, exportDOC } from "../utils/export";
import "./Request.css";

export default function RequestPanel({
  reqFilters,
  setReqFilters,
  reqFiltersApplied,
  setReqFiltersApplied,
  reqUnitFilter,
  setReqUnitFilter,
  openPaged,
  closedPaged,
  openFilteredAll,
  closedFilteredAll,
  openPage,
  setOpenPage,
  closedPage,
  setClosedPage,
  openHeaders,
  openRows,
  closedHeaders,
  closedRows,
  ymd,
  PAGE_SIZE,
}) {
  // State برای تب فعال
  const [activeTab, setActiveTab] = useState("open"); // "open" | "closed"

  return (
    <div className="req-panel">

      {/* نمایش فیلتر واحد مقصد */}
      {reqUnitFilter && (
        <div className="req-unit-filter">
          🔍 فیلتر واحد مقصد: <strong>{reqUnitFilter}</strong>
        </div>
      )}

      {/* ---------------- FIlters ---------------- */}
      <div className="req-filters">
        <div className="req-filters-grid">
          <input
            className="req-filter-input"
            placeholder="🔍 نام تجهیز"
            value={reqFilters.name}
            onChange={(e) =>
              setReqFilters((f) => ({ ...f, name: e.target.value }))
            }
          />

          <input
            className="req-filter-input"
            placeholder="🔍 کد تجهیز"
            value={reqFilters.code}
            onChange={(e) =>
              setReqFilters((f) => ({ ...f, code: e.target.value }))
            }
          />

          <input
            className="req-filter-input"
            placeholder="🔍 واحد مقصد"
            value={reqFilters.destUnit}
            onChange={(e) =>
              setReqFilters((f) => ({ ...f, destUnit: e.target.value }))
            }
          />

          <input
            className="req-filter-input"
            placeholder="🔍 شماره دستور کار"
            value={reqFilters.wo}
            onChange={(e) =>
              setReqFilters((f) => ({ ...f, wo: e.target.value }))
            }
          />

          <button
            type="button"
            className="req-filter-btn req-filter-btn-apply"
            onClick={() => setReqFiltersApplied(reqFilters)}
          >
            ✓ اعمال فیلتر
          </button>

          <button
            type="button"
            className="req-filter-btn req-filter-btn-clear"
            onClick={() => {
              const empty = { name: "", code: "", destUnit: "", wo: "" };
              setReqFilters(empty);
              setReqFiltersApplied(empty);
              setReqUnitFilter(null);
            }}
          >
            ✕ حذف فیلتر
          </button>
        </div>
      </div>

      {/* ============= TABS HEADER ============= */}
      <div className="req-tabs" role="tablist" aria-label="ناوبری درخواست‌ها">
        <button
          className={`req-tab ${activeTab === "open" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "open"}
          onClick={() => setActiveTab("open")}
        >
          <span>📝</span>
          <span>درخواست‌های باز</span>
          <span>({openFilteredAll.length})</span>
        </button>
        <button
          className={`req-tab ${activeTab === "closed" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "closed"}
          onClick={() => setActiveTab("closed")}
        >
          <span>📦</span>
          <span>درخواست های بایگانی‌شده</span>
          <span>({closedFilteredAll.length})</span>
        </button>
      </div>

      {/* ============= OPEN WOs ============= */}
      {activeTab === "open" && (
        <div className="req-content">
          <div className="req-table-wrapper">
              <table className="req-table">
                <thead>
                  <tr>
                    <th>شماره دستور کار</th>
                    <th>نام تجهیز</th>
                    <th>کد</th>
                    <th>سایز</th>
                    <th>واحد مقصد</th>
                    <th>نوع درخواست</th>
                    <th>وضعیت</th>
                    <th>تاریخ شروع</th>
                    <th>تاریخ پایان</th>
                    <th>توضیحات</th>
                  </tr>
                </thead>

                <tbody>
                  {openPaged.slice.length ? (
                    openPaged.slice.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.woNumber}</td>
                        <td>{r.name}</td>
                        <td>{r.code}</td>
                        <td>{r.size}</td>
                        <td>{r.destUnit}</td>
                        <td>{r.type}</td>
                        <td>{r.statusSnapshot || "—"}</td>
                        <td>{r.startDate || "—"}</td>
                        <td>{r.endDate || "—"}</td>
                        <td title={r.desc}>{r.desc || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="empty">
                        درخواستی نیست
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Export */}
            <div className="req-export-buttons">
              <button
                type="button"
                className="req-export-btn req-export-btn-excel"
                onClick={() =>
                  exportCSV(`درخواست‌های-باز-${ymd()}.csv`, openHeaders, openRows)
                }
              >
                <span>📊</span>
                <span>خروجی Excel (CSV)</span>
              </button>

              <button
                type="button"
                className="req-export-btn req-export-btn-word"
                onClick={() =>
                  exportDOC(
                    `درخواست‌های-باز-${ymd()}.doc`,
                    "درخواست‌های باز",
                    openHeaders,
                    openRows
                  )
                }
              >
                <span>📄</span>
                <span>خروجی Word</span>
              </button>
            </div>

            {/* Pagination */}
            <div className="req-pagination">
              <button
                className="req-pagination-btn"
                disabled={openPage <= 1}
                onClick={() => setOpenPage((p) => p - 1)}
              >
                ‹ قبلی
              </button>

              {Array.from({ length: openPaged.pages }).map((_, i) => (
                <button
                  key={i}
                  className={`req-pagination-btn ${openPage === i + 1 ? "active" : ""}`}
                  onClick={() => setOpenPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="req-pagination-btn"
                disabled={openPage >= openPaged.pages}
                onClick={() => setOpenPage((p) => p + 1)}
              >
                بعدی ›
              </button>
            </div>
        </div>
      )}

      {/* ============= CLOSED WOs ============= */}
      {activeTab === "closed" && (
        <div className="req-content">
          <div className="req-table-wrapper">
              <table className="req-table">
                <thead>
                  <tr>
                    <th>شماره دستور کار</th>
                    <th>نام تجهیز</th>
                    <th>کد</th>
                    <th>سایز</th>
                    <th>نوع درخواست</th>
                    <th>وضعیت</th>
                    <th>تاریخ شروع</th>
                    <th>تاریخ پایان</th>
                    <th>تاریخ بایگانی</th>
                  </tr>
                </thead>

                <tbody>
                  {closedPaged.slice.length ? (
                    closedPaged.slice.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.woNumber}</td>
                        <td>{r.name}</td>
                        <td>{r.code}</td>
                        <td>{r.size}</td>
                        <td>{r.type}</td>
                        <td>{r.statusSnapshot || "—"}</td>
                        <td>{r.startDate || "—"}</td>
                        <td>{r.endDate || "—"}</td>
                        <td>{(r.closedAt || "").slice(0, 10)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="empty">
                        موردی نیست
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Export */}
            <div className="req-export-buttons">
              <button
                type="button"
                className="req-export-btn req-export-btn-excel"
                onClick={() =>
                  exportCSV(
                    `درخواست کارهای-بایگانی-${ymd()}.csv`,
                    closedHeaders,
                    closedRows
                  )
                }
              >
                <span>📊</span>
                <span>خروجی Excel (CSV)</span>
              </button>

              <button
                type="button"
                className="req-export-btn req-export-btn-word"
                onClick={() =>
                  exportDOC(
                    `درخواست های-بایگانی-${ymd()}.doc`,
                    "درخواست های بایگانی‌شده",
                    closedHeaders,
                    closedRows
                  )
                }
              >
                <span>📄</span>
                <span>خروجی Word</span>
              </button>
            </div>

            {/* Pagination */}
            <div className="req-pagination">
              <button
                className="req-pagination-btn"
                disabled={closedPage <= 1}
                onClick={() => setClosedPage((p) => p - 1)}
              >
                ‹ قبلی
              </button>

              {Array.from({ length: closedPaged.pages }).map((_, i) => (
                <button
                  key={i}
                  className={`req-pagination-btn ${closedPage === i + 1 ? "active" : ""}`}
                  onClick={() => setClosedPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="req-pagination-btn"
                disabled={closedPage >= closedPaged.pages}
                onClick={() => setClosedPage((p) => p + 1)}
              >
                بعدی ›
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
