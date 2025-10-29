// Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { loadLS } from "../utils/ls";
import ExportButtons from "./common/ExportButtons";
import Pagination from "./common/Pagination";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  toISO16,
  fmtFa,
  parseAnyDate,
} from "../utils/date";

// ————————————————— تنظیمات —————————————————
const LS_REPORT_KEY = "reports_v1";       // گزارش‌های ورود/خروج/جابجایی تجهیزات (inventory I/O)
const LS_OPS_LIVE   = "ops_groups_v2";    // عملیات‌های ثبت‌شده (زنده)
const LS_OPS_ARCH   = "ops_groups_archive"; // عملیات‌های بایگانی

const PAGE_SIZE = 12;

const UNITS = [
  { id: "downhole", label: "درون‌چاهی" },
  { id: "surface",  label: "برون‌چاهی" },
  { id: "pipe",     label: "تعمیرات و نگهداری لوله" },
];

const DATASETS = [
  { id: "equipment", label: "گزارش تجهیزات (ورود/خروج/جابجایی)" },
  { id: "ops",       label: "گزارش گروه‌های عملیاتی" },
];

const TYPE_BY_DATASET = {
  equipment: [
    { id: "", label: "همهٔ انواع" },
    { id: "ورود", label: "ورود" },
    { id: "خروج", label: "خروج" },
    { id: "جابجایی", label: "جابجایی بین دکل‌ها" },
  ],
  ops: [
    { id: "", label: "همهٔ وضعیت‌ها" },
    { id: "open", label: "در حال انجام" },
    { id: "done", label: "پایان‌یافته" },
  ],
};

// ————————————————— ابزار —————————————————
const fmtFaDate = (iso) => {
  if (!iso) return "—";
  try { return fmtFa(iso); } catch { return iso; }
};

const humanDuration = (start, end) => {
  const s = parseAnyDate(start)?.getTime();
  const e = parseAnyDate(end)?.getTime();
  if (!s || !e || e < s) return "—";
  const mins = Math.floor((e - s) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h}ساعت و ${m}دقیقه`;
  if (h) return `${h}ساعت`;
  return `${m}دقیقه`;
};

const unitLabel = (idOrLabel = "") =>
  UNITS.find((u) => u.id === idOrLabel)?.label || idOrLabel || "";

// ————————————————— کامپوننت —————————————————
export default function Reports() {
  // داده‌های پایدار
  const [ioRows, setIoRows] = useState([]);   // تجهیزات
  const [opsRows, setOpsRows] = useState([]); // عملیات (زنده + آرشیو)

  useEffect(() => {
    // تجهیزات: { rows: [...] }
    const io = loadLS(LS_REPORT_KEY, { rows: [] });
    setIoRows(Array.isArray(io.rows) ? io.rows : []);

    // عملیات: ترکیب زنده و آرشیو
    const live = loadLS(LS_OPS_LIVE, []);
    const arch = loadLS(LS_OPS_ARCH, []);
    const merged = Array.isArray(live) ? [...live] : [];
    if (Array.isArray(arch) && arch.length) {
      const ids = new Set(merged.map((r) => r.id));
      arch.forEach((r) => { if (!ids.has(r.id)) merged.push(r); });
    }
    setOpsRows(merged);
  }, []);

  // فیلترها
  const [dataset, setDataset] = useState("equipment"); // equipment | ops
  const [unit, setUnit]       = useState("");          // واحد
  const [type, setType]       = useState("");          // نوع/وضعیت
  const [fromObj, setFromObj] = useState(null);        // DateObject
  const [toObj, setToObj]     = useState(null);        // DateObject

  // اعمال/حذف فیلتر
  const [applied, setApplied] = useState(null); // { dataset, unit, type, fromISO, toISO }
  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      dataset,
      unit,
      type,
      fromISO: toISO16(fromObj) || "",
      toISO:   toISO16(toObj)   || "",
    });
    setPage(1);
  };
  const clearFilters = () => {
    setUnit(""); setType(""); setFromObj(null); setToObj(null);
    setApplied(null);
    setPage(1);
  };

  const selectedUnitLabel = unit ? unitLabel(unit) : "همهٔ واحدها";
  const selectedDatasetLabel = DATASETS.find(d=>d.id===dataset)?.label || "";

  // دادهٔ فیلترشده
  const filtered = useMemo(() => {
    if (!applied) return [];
    const { dataset: ds, unit: u, type: t, fromISO, toISO } = applied;

    if (ds === "equipment") {
      return ioRows.filter((r) => {
        const okUnit =
          !u ||
          (r.Source_Unit === u || r.Destination_Unit === u || r.Unit === u);
        const okType = !t || r.Transaction_Type === t;

        const dt = r.Transaction_Datetime || r.Recorded_At || "";
        const okFrom = !fromISO || (dt && dt >= fromISO);
        const okTo   = !toISO   || (dt && dt <= toISO);

        return okUnit && okType && okFrom && okTo;
      }).sort((a, b) => (String((b.Transaction_Datetime || "")) > String((a.Transaction_Datetime || "")) ? 1 : -1));
    }

    // ops
    return opsRows.filter((r) => {
      const okUnit = !u || r.unit === u;
      const okType = !t || r.status === t;

      const dt = r.reqAt || r.startAt || r.endAt || r.createdAt || "";
      const okFrom = !fromISO || (dt && dt >= fromISO);
      const okTo   = !toISO   || (dt && dt <= toISO);

      return okUnit && okType && okFrom && okTo;
    }).sort((a, b) => (parseAnyDate(b.reqAt) - parseAnyDate(a.reqAt)));
  }, [applied, ioRows, opsRows]);

  // صفحه‌بندی
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  // پکیج خروجی‌ها (۲ فیلد خروجی مجزا) — همراه با Report_Unit
  const getExportEquipment = () => {
    const headers = [
      "Report_Id",
      "Equipment_Code",
      "Equipment_Name",
      "Equipment_Size",
      "Transaction_Type",
      "Transaction_Datetime",
      "Source_Unit",
      "Destination_Unit",
      "Condition",
      "Is_Bandgiri_Done",
      "Note",
      "Recorded_At",
      "Report_Unit",              // 👈 اضافه شد
    ];
    const today = new Date().toISOString().slice(0, 10);
    return {
      filename: `equipment_io_${today}`,
      title: `گزارش تجهیزات — ${selectedUnitLabel}`,
      headers,
      rows: filtered.map(r => ({
        ...r,
        Report_Unit: selectedUnitLabel,
      })),
    };
  };

  const getExportOps = () => {
    const headers = [
      "Code",
      "Unit",
      "Rig",
      "Title",
      "Members",
      "Requested_At",
      "Started_At",
      "Finished_At",
      "Duration",
      "Distance",
      "Status",
      "Report_Unit",              // 👈 اضافه شد
    ];
    const rows = filtered.map((r) => ({
      Code: r.id,
      Unit: unitLabel(r.unit) || r.unit || "",
      Rig: r.rig || "",
      Title: r.title || "",
      Members: (r.members || []).join("، "),
      Requested_At: r.reqAt || "",
      Started_At: r.startAt || "",
      Finished_At: r.endAt || "",
      Duration: humanDuration(r.startAt, r.endAt),
      Distance: r.distance || "",
      Status: r.status === "done" ? "پایان‌یافته" : (r.status === "open" ? "در حال انجام" : (r.status || "")),
      Report_Unit: selectedUnitLabel,
    }));
    const today = new Date().toISOString().slice(0, 10);
    return {
      filename: `ops_groups_${today}`,
      title: `گزارش گروه‌های عملیاتی — ${selectedUnitLabel}`,
      headers,
      rows,
    };
  };

  // ستون‌های جدول بر اساس نوع گزارش
  const th = { padding: "10px 8px", textAlign: "right", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
  const td = { padding: "8px", fontSize: 13, whiteSpace: "nowrap" };

  const renderHeader = () => {
    if (!applied) return null;
    if (applied.dataset === "equipment") {
      return (
        <tr>
          <th style={th}>#</th>
          <th style={th}>کد تجهیز</th>
          <th style={th}>نام تجهیز</th>
          <th style={th}>سایز</th>
          <th style={th}>نوع</th>
          <th style={th}>تاریخ/زمان</th>
          <th style={th}>مبدأ</th>
          <th style={th}>مقصد</th>
          <th style={th}>وضعیت</th>
          <th style={th}>بندگیری</th>
          <th style={th}>توضیحات</th>
        </tr>
      );
    }
    return (
      <tr>
        <th style={th}>#</th>
        <th style={th}>کد</th>
        <th style={th}>واحد</th>
        <th style={th}>دکل</th>
        <th style={th}>عنوان عملیات</th>
        <th style={th}>اعضا</th>
        <th style={th}>درخواست</th>
        <th style={th}>شروع</th>
        <th style={th}>پایان</th>
        <th style={th}>مدت</th>
        <th style={th}>فاصله</th>
        <th style={th}>وضعیت</th>
      </tr>
    );
  };

  const renderRow = (r, i) => {
    if (!applied) return null;
    if (applied.dataset === "equipment") {
      return (
        <tr key={r.Report_Id || `${r.Equipment_Code}-${i}`} style={{ borderTop: "1px solid #eee" }}>
          <td style={td}>{start + i + 1}</td>
          <td style={td}>{r.Equipment_Code || "—"}</td>
          <td style={td}>{r.Equipment_Name || "—"}</td>
          <td style={td}>{r.Equipment_Size || "—"}</td>
          <td style={td}>
            <span className="badge" style={{
              background: r.Transaction_Type === "ورود" ? "#DCFCE7" : (r.Transaction_Type === "خروج" ? "#FEE2E2" : "#E0E7FF"),
              color:      r.Transaction_Type === "ورود" ? "#166534" : (r.Transaction_Type === "خروج" ? "#991B1B" : "#3730A3"),
              padding: "2px 8px", borderRadius: 999, fontSize: 12
            }}>
              {r.Transaction_Type || "—"}
            </span>
          </td>
          <td style={td}>{fmtFaDate(r.Transaction_Datetime || r.Recorded_At)}</td>
          <td style={td}>{unitLabel(r.Source_Unit || r.Unit) || "—"}</td>
          <td style={td}>{unitLabel(r.Destination_Unit) || "—"}</td>
          <td style={td}>{r.Condition || "—"}</td>
          <td style={{ ...td, textAlign: "center" }}>{r.Is_Bandgiri_Done ?? "—"}</td>
          <td style={{ ...td, color: "#6B7280" }} title={r.Note || ""}>{r.Note || "—"}</td>
        </tr>
      );
    }
    return (
      <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
        <td style={td}>{start + i + 1}</td>
        <td style={td}>{r.id}</td>
        <td style={td}>{unitLabel(r.unit) || "—"}</td>
        <td style={td}>{r.rig || "—"}</td>
        <td style={td}>{r.title || "—"}</td>
        <td style={td}>{(r.members || []).join("، ") || "—"}</td>
        <td style={td}>{fmtFaDate(r.reqAt)}</td>
        <td style={td}>{r.startAt ? fmtFaDate(r.startAt) : "—"}</td>
        <td style={td}>{r.endAt ? fmtFaDate(r.endAt) : "—"}</td>
        <td style={td}>{humanDuration(r.startAt, r.endAt)}</td>
        <td style={td}>{r.distance || "—"}</td>
        <td style={td}>
          <span className="badge" style={{
            background: r.status === "done" ? "#DCFCE7" : "#E0E7FF",
            color:      r.status === "done" ? "#166534" : "#3730A3",
            padding: "2px 8px", borderRadius: 999, fontSize: 12
          }}>
            {r.status === "done" ? "پایان‌یافته" : "در حال انجام"}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 10 }}>📊 گزارش‌گیری یکپارچه</h2>

      {/* ——— فیلترها: ۴ مورد ——— */}
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
          marginBottom: 12,
        }}
      >
        {/* 1) نوع گزارش */}
        <div style={{ gridColumn: "span 2" }}>
          <label>نوع گزارش</label>
          <select
            className="input"
            value={dataset}
            onChange={(e) => { setDataset(e.target.value); setType(""); }}
          >
            {DATASETS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>

        {/* 2) واحد */}
        <div>
          <label>واحد</label>
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">همهٔ واحدها</option>
            {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>

        {/* 3) نوع/وضعیت */}
        <div>
          <label>{dataset === "equipment" ? "نوع تراکنش" : "وضعیت عملیات"}</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_BY_DATASET[dataset].map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* 4) بازهٔ تاریخ: از/تا */}
        <div>
          <label>از تاریخ/زمان</label>
          <DatePicker
            value={fromObj}
            onChange={setFromObj}
            calendar={persian}
            locale={persian_fa}
            format={faFmt}
            plugins={[<TimePicker position="bottom" />]}
            inputClass="input"
            containerClassName="rmdp-rtl"
          />
        </div>
        <div>
          <label>تا تاریخ/زمان</label>
          <DatePicker
            value={toObj}
            onChange={setToObj}
            calendar={persian}
            locale={persian_fa}
            format={faFmt}
            plugins={[<TimePicker position="bottom" />]}
            inputClass="input"
            containerClassName="rmdp-rtl"
          />
        </div>

        {/* اعمال/حذف + خروجی‌ها */}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {applied ? `نتایج: ${filtered.length}` : "چهار فیلتر بالا را تنظیم و «اعمال فیلتر» را بزنید."}
          </div>
          <div className="btnrow" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="submit" className="btn primary">اعمال فیلتر</button>
            <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>

            {/* ——— ۲ فیلد خروجی گرفتن ——— */}
            {applied && filtered.length > 0 && dataset === "equipment" && (
              <ExportButtons getExport={getExportEquipment} variant="compact" label="خروجی تجهیزات" />
            )}
            {applied && filtered.length > 0 && dataset === "ops" && (
              <ExportButtons getExport={getExportOps} variant="compact" label="خروجی عملیات" />
            )}
          </div>
        </div>
      </form>

      {/* نوار اطلاعات بالای لیست: نوع گزارش + واحد انتخاب شده */}
      {applied && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
            padding: "8px 10px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8
          }}
        >
       
          <span className="badge" style={{ background: "#fff", border: "1px solid #E5E7EB" }}>
            واحد: {selectedUnitLabel}
          </span>
          {type && (
            <span className="badge" style={{ background: "#fff", border: "1px solid #E5E7EB" }}>
              {dataset === "equipment" ? "نوع تراکنش" : "وضعیت"}: {TYPE_BY_DATASET[dataset].find(t=>t.id===type)?.label || type}
            </span>
          )}
        </div>
      )}

      {/* نتایج */}
      {!applied ? (
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
          برای مشاهدهٔ گزارش، فیلترها را تنظیم کنید.
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F3F4F6" }}>
                {renderHeader()}
              </thead>
              <tbody>
                {pageRows.length ? pageRows.map((r, i) => (
                  // از همان renderRow استفاده می‌کنیم
                  renderRow(r, i)
                )) : (
                  <tr><td style={td} colSpan={12}>موردی یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>

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
