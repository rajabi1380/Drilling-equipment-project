// src/pages/Reports.jsx
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
import { useAuth } from "./Context/AuthContext";

// ————————————————— تنظیمات —————————————————
const LS_REPORT_KEY = "reports_v1"; // تجهیزات
const LS_OPS_LIVE = "ops_groups_v2";
const LS_OPS_ARCH = "ops_groups_archive";
const PAGE_SIZE = 12;

const UNITS = [
  { id: "downhole", label: "درون‌چاهی" },
  { id: "surface", label: "برون‌چاهی" },
  { id: "pipe", label: "تعمیرات و نگهداری لوله" },
];

const DATASETS = [
  { id: "equipment", label: "گزارش تجهیزات (ورود/خروج/جابجایی)" },
  { id: "ops", label: "گزارش گروه‌های عملیاتی" },
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

const fmtFaDate = (iso) => {
  if (!iso) return "—";
  try {
    return fmtFa(iso);
  } catch {
    return iso;
  }
};

const humanDuration = (start, end) => {
  const s = parseAnyDate(start)?.getTime();
  const e = parseAnyDate(end)?.getTime();
  if (!s || !e || e < s) return "—";
  const mins = Math.floor((e - s) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}ساعت و ${m}دقیقه`;
  if (h) return `${h}ساعت`;
  return `${m}دقیقه`;
};

const unitLabel = (idOrLabel = "") =>
  UNITS.find((u) => u.id === idOrLabel)?.label || idOrLabel || "";

// ——————————————————— کامپوننت اصلی ———————————————————
export default function Reports() {
  const { isAdmin, currentUnit } = useAuth();

  // داده‌ها
  const [ioRows, setIoRows] = useState([]);
  const [opsRows, setOpsRows] = useState([]);

  const [dataset, setDataset] = useState("equipment");
  const [type, setType] = useState("");
  const [fromObj, setFromObj] = useState(null);
  const [toObj, setToObj] = useState(null);
  const [applied, setApplied] = useState(null);
  const [page, setPage] = useState(1);

  // بارگذاری داده‌ها از localStorage
  useEffect(() => {
    const io = loadLS(LS_REPORT_KEY, { rows: [] });
    setIoRows(Array.isArray(io.rows) ? io.rows : []);

    const live = loadLS(LS_OPS_LIVE, []);
    const arch = loadLS(LS_OPS_ARCH, []);

    const merged = Array.isArray(live) ? [...live] : [];
    if (Array.isArray(arch) && arch.length) {
      const ids = new Set(merged.map((r) => r.id));
      arch.forEach((r) => {
        if (!ids.has(r.id)) merged.push(r);
      });
    }
    setOpsRows(merged);
  }, []);

  // اعمال فیلتر
  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      dataset,
      type,
      fromISO: toISO16(fromObj) || "",
      toISO: toISO16(toObj) || "",
    });
    setPage(1);
  };

  const clearFilters = () => {
    setType("");
    setFromObj(null);
    setToObj(null);
    setPage(1);
    setApplied(null);
  };

  // ------------------ فیلتر اصلی ------------------
  const filtered = useMemo(() => {
    if (!applied) return [];

    const { dataset: ds, type: t, fromISO, toISO } = applied;

    if (ds === "equipment") {
      return ioRows
        .filter((r) => {
          // فقط رکوردهای واحد جاری
          if (!isAdmin) {
            const src = r.Source_Unit || r.Unit || "";
            const dst = r.Destination_Unit || "";
            if (
              src !== currentUnit &&
              dst !== currentUnit &&
              r.Unit !== currentUnit
            )
              return false;
          }

          const matchType = !t || r.Transaction_Type === t;
          const dt = r.Transaction_Datetime || r.Recorded_At || "";
          const matchFrom = !fromISO || (dt && dt >= fromISO);
          const matchTo = !toISO || (dt && dt <= toISO);

          return matchType && matchFrom && matchTo;
        })
        .sort((a, b) =>
          String(b.Transaction_Datetime || "") >
          String(a.Transaction_Datetime || "")
            ? 1
            : -1
        );
    }

    // فیلتر عملیات‌ها
    return opsRows
      .filter((r) => {
        if (!isAdmin && r.unit !== currentUnit) return false;

        const matchType = !t || r.status === t;
        const dt = r.reqAt || r.startAt || r.endAt || r.createdAt || "";
        const matchFrom = !fromISO || (dt && dt >= fromISO);
        const matchTo = !toISO || (dt && dt <= toISO);

        return matchType && matchFrom && matchTo;
      })
      .sort(
        (a, b) =>
          (parseAnyDate(b.reqAt)?.getTime() || 0) -
          (parseAnyDate(a.reqAt)?.getTime() || 0)
      );
  }, [applied, ioRows, opsRows, isAdmin, currentUnit]);

  // صفحه‌بندی
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  // خروجی برای export
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
    ];
    const today = new Date().toISOString().slice(0, 10);
    return {
      filename: `equipment_io_${today}`,
      title: `گزارش تجهیزات`,
      headers,
      rows: filtered,
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
    ];
    const rows = filtered.map((r) => ({
      Code: r.id,
      Unit: r.unit || "",
      Rig: r.rig || "",
      Title: r.title || "",
      Members: (r.members || []).join("، "),
      Requested_At: r.reqAt || "",
      Started_At: r.startAt || "",
      Finished_At: r.endAt || "",
      Duration: humanDuration(r.startAt, r.endAt),
      Distance: r.distance || "",
      Status:
        r.status === "done"
          ? "پایان‌یافته"
          : r.status === "open"
          ? "در حال انجام"
          : r.status || "",
    }));
    const today = new Date().toISOString().slice(0, 10);
    return {
      filename: `ops_groups_${today}`,
      title: `گزارش عملیات`,
      headers,
      rows,
    };
  };

  // ------------------ UI ------------------
  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 10 }}>📊 گزارش‌گیری</h2>

      {/* فیلترها */}
      <form
        onSubmit={applyFilters}
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          background: "#FAFAFA",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eee",
          marginBottom: 12,
        }}
      >
        <div>
          <label>نوع گزارش</label>
          <select
            className="input"
            value={dataset}
            onChange={(e) => {
              setDataset(e.target.value);
              setType("");
            }}
          >
            {DATASETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>
            {dataset === "equipment" ? "نوع تراکنش" : "وضعیت عملیات"}
          </label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPE_BY_DATASET[dataset].map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>از تاریخ/زمان</label>
          <DatePicker
            value={fromObj}
            onChange={setFromObj}
            calendar={persian}
            locale={persian_fa}
            format={faFmt}
            plugins={[<TimePicker key="tf" position="bottom" />]}
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
            plugins={[<TimePicker key="tt" position="bottom" />]}
            inputClass="input"
            containerClassName="rmdp-rtl"
          />
        </div>

        <div style={{ display: "flex", alignItems: "end", gap: 6 }}>
          <button type="submit" className="btn primary">
            اعمال فیلتر
          </button>
          <button type="button" className="btn" onClick={clearFilters}>
            حذف فیلتر
          </button>
        </div>
      </form>

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
          برای مشاهده گزارش، فیلترها را تنظیم کنید.
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#F3F4F6" }}>
                {dataset === "equipment" ? (
                  <tr>
                    <th>#</th>
                    <th>کد تجهیز</th>
                    <th>نام تجهیز</th>
                    <th>نوع</th>
                    <th>زمان</th>
                    <th>مبدأ</th>
                    <th>مقصد</th>
                  </tr>
                ) : (
                  <tr>
                    <th>#</th>
                    <th>کد</th>
                    <th>دکل</th>
                    <th>عنوان</th>
                    <th>اعضا</th>
                    <th>درخواست</th>
                    <th>شروع</th>
                    <th>پایان</th>
                    <th>مدت</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {pageRows.length ? (
                  pageRows.map((r, i) =>
                    dataset === "equipment" ? (
                      <tr key={i}>
                        <td>{start + i + 1}</td>
                        <td>{r.Equipment_Code}</td>
                        <td>{r.Equipment_Name}</td>
                        <td>{r.Transaction_Type}</td>
                        <td>{fmtFaDate(r.Transaction_Datetime)}</td>
                        <td>{unitLabel(r.Source_Unit || r.Unit)}</td>
                        <td>{unitLabel(r.Destination_Unit)}</td>
                      </tr>
                    ) : (
                      <tr key={r.id}>
                        <td>{start + i + 1}</td>
                        <td>{r.id}</td>
                        <td>{r.rig}</td>
                        <td>{r.title}</td>
                        <td>{(r.members || []).join("، ")}</td>
                        <td>{fmtFaDate(r.reqAt)}</td>
                        <td>{fmtFaDate(r.startAt)}</td>
                        <td>{fmtFaDate(r.endAt)}</td>
                        <td>{humanDuration(r.startAt, r.endAt)}</td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 12 }}>
                      هیچ داده‌ای یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10 }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              showRange={{
                start: filtered.length ? start + 1 : 0,
                end: Math.min(filtered.length, start + PAGE_SIZE),
                total: filtered.length,
              }}
            />
          </div>

          {filtered.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <ExportButtons
                getExport={dataset === "equipment" ? getExportEquipment : getExportOps}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
