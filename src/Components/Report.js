import React, { useEffect, useMemo, useState } from "react";
import { loadLS } from "../utils/ls";
import ExportButtons from "./common/ExportButtons";
import Pagination from "./common/Pagination";

// از تقویم/تاریخ خودت
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  toISO16,
  fmtFa,
} from "../utils/date";

const LS_REPORT_KEY = "reports_v1";
const PAGE_SIZE = 12;

// نمایش تاریخ شمسی از ISO (برای جدول)
const fmtFaDate = (iso) => {
  if (!iso) return "—";
  try {
    return fmtFa(iso);
  } catch {
    return iso;
  }
};

export default function Reports() {
  // خواندن گزارش‌ها (پایدار)
  const [reports, setReports] = useState([]);
  useEffect(() => {
    const data = loadLS(LS_REPORT_KEY, { rows: [] });
    setReports(Array.isArray(data.rows) ? data.rows : []);
  }, []);

  // فرم فیلتر (با تقویم فارسی)
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "",      // "" | "ورود" | "خروج"
    fromObj: null, // DateObject
    toObj: null,
  });

  // آیا کاربر فیلتر را اعمال کرده؟
  const [isApplied, setIsApplied] = useState(false);

  // فیلتر اعمال‌شده (ISO نهایی برای مقایسه)
  const [applied, setApplied] = useState({
    code: "",
    name: "",
    type: "",
    fromISO: "",
    toISO: "",
  });

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      fromISO: toISO16(form.fromObj) || "",
      toISO: toISO16(form.toObj) || "",
    });
    setIsApplied(true);
    setPage(1);
  };

  const clearFilters = () => {
    setForm({ code: "", name: "", type: "", fromObj: null, toObj: null });
    setApplied({ code: "", name: "", type: "", fromISO: "", toISO: "" });
    setIsApplied(false);
    setPage(1);
  };

  // فیلتر کردن گزارش‌ها (فقط وقتی اعمال شده)
  const filtered = useMemo(() => {
    if (!isApplied) return [];
    const { code, name, type, fromISO, toISO } = applied;
    return reports.filter((r) => {
      const okCode = !code || (r.Equipment_Code || "").toLowerCase().includes(code.toLowerCase());
      const okName = !name || (r.Equipment_Name || "").toLowerCase().includes(name.toLowerCase());
      const okType = !type || r.Transaction_Type === type;

      const dt = r.Transaction_Datetime || "";
      const okFrom = !fromISO || (dt && dt >= fromISO);
      const okTo   = !toISO   || (dt && dt <= toISO);

      return okCode && okName && okType && okFrom && okTo;
    });
  }, [reports, applied, isApplied]);

  // صفحه‌بندی
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  // پکیج خروجی برای ExportButtons (فقط وقتی اعمال شده)
  const getExport = () => {
    const headers = [
      "Report_Id",
      "Equipment_Code",
      "Equipment_Name",
      "Equipment_Size",
      "Transaction_Type",
      "Transaction_Datetime",
      "Destination_Unit",
      "Condition",
      "Is_Bandgiri_Done",
      "Note",
      "Recorded_At",
    ];
    const today = new Date().toISOString().slice(0, 10);
    return {
      filename: `io_report_${today}`,
      title: "گزارش ورود/خروج تجهیزات",
      headers,
      rows: filtered, // تاریخ‌ها ISO می‌ماند برای خروجی استاندارد
    };
  };

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 10 }}>📋 گزارش ورود/خروج تجهیزات</h2>

      {/* فیلترها با تقویم فارسی */}
      <form
        onSubmit={applyFilters}
        className="io-filter"
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(6, minmax(0,1fr))",
          background: "#FAFAFA",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eee",
          marginBottom: 12
        }}
      >
        <div>
          <label>کد تجهیز</label>
          <input
            className="input"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="مثلاً PIPE-DP-35"
          />
        </div>
        <div>
          <label>نام تجهیز</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="مثلاً Drill Pipe"
          />
        </div>
        <div>
          <label>نوع تراکنش</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">همه</option>
            <option value="ورود">ورود</option>
            <option value="خروج">خروج</option>
          </select>
        </div>

        <div>
          <label>از تاریخ/زمان (شمسی)</label>
          <DatePicker
            value={form.fromObj}
            onChange={(v) => setForm((f) => ({ ...f, fromObj: v }))}
            calendar={persian}
            locale={persian_fa}
            format={faFmt}
            plugins={[<TimePicker position="bottom" />]}
            inputClass="input"
            containerClassName="rmdp-rtl"
          />
        </div>
        <div>
          <label>تا تاریخ/زمان (شمسی)</label>
          <DatePicker
            value={form.toObj}
            onChange={(v) => setForm((f) => ({ ...f, toObj: v }))}
            calendar={persian}
            locale={persian_fa}
            format={faFmt}
            plugins={[<TimePicker position="bottom" />]}
            inputClass="input"
            containerClassName="rmdp-rtl"
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {isApplied ? `نتایج: ${filtered.length}` : "ابتدا فیلتر را اعمال کنید"}
          </div>
          <div className="btnrow">
            <button type="submit" className="btn primary">اعمال فیلتر</button>
            <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
            {isApplied && filtered.length > 0 && (
              <ExportButtons getExport={getExport} variant="compact" />
            )}
          </div>
        </div>
      </form>

      {/* اگر فیلتر اعمال نشده، جدول را نشان نده */}
      {!isApplied ? (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "#64748b",
            background: "#f8fafc",
          }}
        >
          برای مشاهدهٔ گزارش، فیلتر را پر کرده و «اعمال فیلتر» را بزنید.
        </div>
      ) : (
        <>
          {/* جدول */}
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F3F4F6" }}>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>کد تجهیز</th>
                  <th style={th}>نام تجهیز</th>
                  <th style={th}>سایز</th>
                  <th style={th}>نوع</th>
                  <th style={th}>تاریخ/زمان (شمسی)</th>
                  <th style={th}>مقصد</th>
                  <th style={th}>وضعیت</th>
                  <th style={th}>بندگیری</th>
                  <th style={th}>توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length ? pageRows.map((r, i) => (
                  <tr key={r.Report_Id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>{start + i + 1}</td>
                    <td style={td}>{r.Equipment_Code || "—"}</td>
                    <td style={td}>{r.Equipment_Name || "—"}</td>
                    <td style={td}>{r.Equipment_Size || "—"}</td>
                    <td style={td}>
                      <span className="badge" style={{
                        background: r.Transaction_Type === "ورود" ? "#DCFCE7" : "#FEE2E2",
                        color: r.Transaction_Type === "ورود" ? "#166534" : "#991B1B",
                        padding: "2px 8px", borderRadius: 999, fontSize: 12
                      }}>
                        {r.Transaction_Type || "—"}
                      </span>
                    </td>
                    <td style={td}>{fmtFaDate(r.Transaction_Datetime)}</td>
                    <td style={td}>{r.Transaction_Type === "خروج" ? (r.Destination_Unit || "—") : "—"}</td>
                    <td style={td}>{r.Transaction_Type === "خروج" ? (r.Condition || "—") : "—"}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.Transaction_Type === "خروج" ? (r.Is_Bandgiri_Done || "—") : "—"}</td>
                    <td style={{ ...td, color: "#6B7280" }} title={r.Note || ""}>{r.Note || "—"}</td>
                  </tr>
                )) : (
                  <tr><td style={td} colSpan={10}>موردی یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* صفحه‌بندی */}
          <div style={{ marginTop: 10 }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              dir="rtl"
              showRange={{
                start: filtered.length ? start + 1 : 0,
                end: Math.min(start + PAGE_SIZE, filtered.length),
                total: filtered.length,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

const th = { padding: "10px 8px", textAlign: "right", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const td = { padding: "8px", fontSize: 13, whiteSpace: "nowrap" };
