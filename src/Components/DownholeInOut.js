// src/Components/DownholeInOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./DownholeInOut.css";

/* utils شما (همون قبلی) */
import { loadLS, saveLS } from "../utils/ls";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  fmtFa,
  toISO16,
} from "../utils/date";

/* ===== ثابت‌ها ===== */
const LS_KEY = "downhole_units_v2";

/* سه واحد درون‌چاهی */
const UNITS = {
  surface: { id: "surface", title: "ابزار سطحی" },
  bop: { id: "bop", title: "کنترل فوران" },
  choke: { id: "choke", title: "شبکه کاهنده" },
};
const UNIT_LIST = [UNITS.surface, UNITS.bop, UNITS.choke];

/* کاتالوگ برای انتخاب سریع تجهیز */
const CATALOG = [
  { name: "Hydrill", code: "HYD-1001" },
  { name: "Kelly", code: "KLY-2005" },
  { name: "Drill Collar", code: "DCL-3012" },
  { name: "Drill Pipe", code: "DPI-4500" },
  { name: "HWDP", code: "HWD-5507" },
];

/* دکل‌ها (برای مقصد) */
const RIGS = ["دکل 13", "دکل 21", "دکل 24", "دکل 28", "دکل 31", "دکل 38"];

/* ===== کمک‌تابع‌ها ===== */
const newId = () => Date.now();
const sumQty = (rows) => rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);

/* ===== کامپوننت اصلی ===== */
export default function DownholeInOut() {
  // Boot از LocalStorage
  const boot = loadLS(LS_KEY, { open: [], archived: [] });
  const [openRows, setOpenRows] = useState(boot.open || []);
  const [archivedRows, setArchivedRows] = useState(boot.archived || []);

  useEffect(() => {
    saveLS(LS_KEY, { open: openRows, archived: archivedRows });
  }, [openRows, archivedRows]);

  // باز/بسته بودن سکشن‌ها
  const [expanded, setExpanded] = useState({ surface: true, bop: true, choke: true });

  // انتخاب ردیف (فقط برای هایلایت سطری)
  const [selectedRowId, setSelectedRowId] = useState(null);

  // مودال‌ها
  const [showIn, setShowIn] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [rowForExit, setRowForExit] = useState(null);

  // مودال آرشیو
  const [showArchive, setShowArchive] = useState(false);

  // گروه‌بندی اقلام باز
  const grouped = useMemo(() => ({
    surface: openRows.filter((x) => x.unitId === "surface"),
    bop:     openRows.filter((x) => x.unitId === "bop"),
    choke:   openRows.filter((x) => x.unitId === "choke"),
  }), [openRows]);

  /* === ثبت ورود === */
  const addIn = (payload) => {
    const enterISO = toISO16(payload.enterObj) || new Date().toISOString().slice(0, 16);
    const row = {
      id: newId(),
      unitId: payload.unitId,                     // surface | bop | choke
      unitTitle: UNITS[payload.unitId]?.title || "—",
      name: payload.name,
      code: payload.code,
      size: payload.size,
      qty: Number(payload.qty) || 1,
      fromWhere: payload.fromWhere || "",
      status: (payload.status || "سالم").trim(), // "سالم" | "نیاز به تعمیر"
      enterISO,
      // فیلدهای تکمیلی تعمیر:
      opsGroup: "", partsUsed: "", failureDesc: "", repairCost: "",
      note: payload.note || "",
    };
    setOpenRows((prev) => [row, ...prev]);
    setShowIn(false);
  };

  /* === ذخیره جزئیات/تعمیر === */
  const updateDetails = (id, patch) => {
    setOpenRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...patch, status: (patch.status || r.status || "").trim() } : r
      )
    );
    setDetailRow(null);
  };

  /* === شروع خروج (فقط وقتی سالم) === */
  const startExit = (row) => {
    if ((row.status || "").trim() !== "سالم") return;
    setRowForExit(row);
    setShowExit(true);
  };

  /* === ثبت خروج: انتقال به آرشیو و حذف از open === */
  const commitExit = (extra) => {
    const exitISO = toISO16(extra.exitObj) || new Date().toISOString().slice(0, 16);
    const r = rowForExit;
    if (!r) return;

    const archived = {
      ...r,
      exitISO,
      destUnit: extra.destUnit || "",
      destRig: extra.destRig || "",
      destContractor: extra.destContractor || "",
      vehicleKind: extra.vehicleKind || "", // شرکتی | استیجاری
      waybillNo: extra.waybillNo || "",
      exitNote: extra.note || "",
    };
    setArchivedRows((prev) => [archived, ...prev]);
    setOpenRows((prev) => prev.filter((x) => x.id !== r.id));

    setShowExit(false);
    setRowForExit(null);
    setSelectedRowId(null);
  };

  return (
    <div className="dh-page" dir="rtl">
      <div className="dh-card">

        {/* نوار ابزار بالا */}
        <div className="dh-toolbar">
          <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
          <button type="button" className="btn" onClick={() => setShowArchive(true)}>نمایش آرشیو</button>
          <div className="muted" style={{ marginInlineStart: 8 }}>
            آرشیو: <b>{archivedRows.length}</b> مورد
          </div>
        </div>

        {/* سه سکشن کشویی */}
        {UNIT_LIST.map((u) => {
          const list = grouped[u.id];
          const total = sumQty(list);

          return (
            <section className="dh-section" key={u.id}>
              <header
                className="dh-sec-hdr"
                onClick={() => setExpanded((e) => ({ ...e, [u.id]: !e[u.id] }))}
              >
                <b>{u.title}</b>
                <span className="muted">({list.length} ردیف / مجموع {total})</span>
                <span className="chev">{expanded[u.id] ? "▾" : "▸"}</span>
              </header>

              {expanded[u.id] && (
                <>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>نام تجهیز</th>
                          <th>کد</th>
                          <th>سایز</th>
                          <th>تعداد</th>
                          <th>تاریخ ورود</th>
                          <th>وضعیت</th>
                          <th>از کجا</th>
                          <th>عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.length ? list.map((r) => {
                          const healthy = (r.status || "").trim() === "سالم";
                          const isSelected = selectedRowId === r.id;
                          return (
                            <tr
                              key={r.id}
                              className={(healthy ? "ok" : "need-fix") + (isSelected ? " is-selected" : "")}
                              onClick={() => setSelectedRowId((prev) => (prev === r.id ? null : r.id))}
                            >
                              <td>{r.name}</td>
                              <td>{r.code}</td>
                              <td>{r.size || "—"}</td>
                              <td>{r.qty ?? 1}</td>
                              <td>{fmtFa(r.enterISO) || "—"}</td>
                              <td>{r.status}</td>
                              <td>{r.fromWhere || "—"}</td>
                              <td className="ops">
                                <button
                                  type="button"
                                  className="btn small"
                                  title="مشخصات/تعمیر"
                                  onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                                >
                                  🛈 مشخصات
                                </button>

                                <button
                                  type="button"
                                  className="btn small danger"
                                  disabled={!healthy}
                                  title={healthy ? "ثبت خروج" : "تا سالم نشود، خروج ممکن نیست"}
                                  onClick={(e) => { e.stopPropagation(); startExit(r); }}
                                >
                                  ⤴ خروج
                                </button>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={8} className="empty">آیتمی ثبت نشده</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="sum">تعداد موجود در «{u.title}»: <b>{total}</b></div>
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* === مودال‌ها === */}
      {showIn && (
        <InModal
          onClose={() => setShowIn(false)}
          onSubmit={addIn}
          catalog={CATALOG}
        />
      )}

      {detailRow && (
        <DetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onSave={(patch) => updateDetails(detailRow.id, patch)}
        />
      )}

      {showExit && rowForExit && (
        <ExitModal
          row={rowForExit}
          rigs={RIGS}
          onClose={() => { setShowExit(false); setRowForExit(null); }}
          onSubmit={commitExit}
        />
      )}

      {showArchive && (
        <ArchiveModal
          rows={archivedRows}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  );
}

/* ===== Modal انتخاب از کاتالوگ ===== */
function ItemPickerModal({ open, onClose, catalog, onPick }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  if (!open) return null;

  const filtered = catalog.filter(
    (x) =>
      (x.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (x.code || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--small" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>انتخاب تجهیز</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="picker">
          <input
            className="input"
            placeholder="جستجو بر اساس نام یا کد..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="picker-list">
            {filtered.length ? (
              filtered.map((it, i) => (
                <label className="picker-row" key={i}>
                  <input
                    type="radio"
                    name="pick"
                    checked={sel?.code === it.code && sel?.name === it.name}
                    onChange={() => setSel(it)}
                  />
                  <span className="picker-name">{it.name}</span>
                  <span className="picker-code">{it.code}</span>
                </label>
              ))
            ) : (
              <div className="empty">موردی یافت نشد</div>
            )}
          </div>
        </div>

        <footer className="dh-modal__ftr">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button
            type="button"
            className="btn primary"
            disabled={!sel}
            onClick={() => sel && onPick(sel)}
          >
            تأیید
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===== Modal ورود ===== */
function InModal({ onClose, onSubmit, catalog }) {
  const [unitId, setUnitId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [enterObj, setEnterObj] = useState(null);
  const [fromWhere, setFromWhere] = useState("");
  const [status, setStatus] = useState("سالم"); // سالم | نیاز به تعمیر
  const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const missing = !unitId || !name.trim() || !code.trim() || !size.trim() || (Number(qty) || 0) <= 0;

  const submit = () => {
    if (missing) return;
    onSubmit({ unitId, name, code, size, qty, enterObj, fromWhere, status, note });
  };

  return (
    <>
      <div className="dh-backdrop" onClick={onClose}>
        <div className="dh-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
          <header className="dh-modal__hdr">
            <b>ثبت ورود قطعه (درون‌چاهی)</b>
            <button className="dh-close" onClick={onClose}>✕</button>
          </header>

          <div className="form">
            <div className="row">
              <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">* انتخاب واحد مقصد</option>
                {UNIT_LIST.map((u) => (
                  <option key={u.id} value={u.id}>{u.title}</option>
                ))}
              </select>

              <div className="with-pick">
                <input
                  className={`input ${!name.trim() ? "err" : ""}`}
                  placeholder="* نام تجهیز"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button type="button" className="pick-btn" onClick={() => setPickOpen(true)} title="انتخاب از لیست">☝️</button>
              </div>

              <input
                className={`input ${!code.trim() ? "err" : ""}`}
                placeholder="* کد تجهیز"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="row">
              <input
                className={`input ${!size.trim() ? "err" : ""}`}
                placeholder="* سایز"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
              <input
                className="input"
                type="number"
                min={1}
                placeholder="* تعداد"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <DatePicker
                value={enterObj}
                onChange={setEnterObj}
                calendar={persian}
                locale={persian_fa}
                format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input"
                containerClassName="rmdp-rtl"
                placeholder="تاریخ و ساعت ورود"
              />
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="از کدام واحد آمده"
                value={fromWhere}
                onChange={(e) => setFromWhere(e.target.value)}
              />
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="سالم">سالم</option>
                <option value="نیاز به تعمیر">نیاز به تعمیر</option>
              </select>
              <div className="col" />
            </div>

            <textarea
              className="input"
              placeholder="توضیحات..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <footer className="dh-modal__ftr">
            <button type="button" className="btn" onClick={onClose}>انصراف</button>
            <button type="button" className="btn success" onClick={submit} disabled={missing}>ثبت ورود</button>
          </footer>
        </div>
      </div>

      <ItemPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        catalog={catalog}
        onPick={(it) => { setName(it.name); setCode(it.code); setPickOpen(false); }}
      />
    </>
  );
}

/* ===== Modal جزئیات/تعمیر ===== */
function DetailModal({ row, onClose, onSave }) {
  const [opsGroup, setOpsGroup] = useState(row.opsGroup || "");
  const [partsUsed, setPartsUsed] = useState(row.partsUsed || "");
  const [failureDesc, setFailureDesc] = useState(row.failureDesc || "");
  const [repairCost, setRepairCost] = useState(row.repairCost || "");
  const [status, setStatus] = useState(row.status || "سالم");

  const submit = () => {
    onSave({ opsGroup, partsUsed, failureDesc, repairCost, status });
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>مشخصات/تعمیر — {row.name} ({row.code})</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <input className="input" placeholder="گروه عملیاتی" value={opsGroup} onChange={(e) => setOpsGroup(e.target.value)} />
            <input className="input" placeholder="قطعات مصرف‌شده" value={partsUsed} onChange={(e) => setPartsUsed(e.target.value)} />
            <input className="input" placeholder="هزینه تعمیر (تومان)" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} />
          </div>

          <div className="row">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="سالم">سالم</option>
              <option value="نیاز به تعمیر">نیاز به تعمیر</option>
            </select>
            <div className="col">
              <textarea className="input" placeholder="شرح خرابی / توضیحات" value={failureDesc} onChange={(e) => setFailureDesc(e.target.value)} />
            </div>
            <div className="col" />
          </div>
        </div>

        <footer className="dh-modal__ftr">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button type="button" className="btn primary" onClick={submit}>ذخیره</button>
        </footer>
      </div>
    </div>
  );
}

/* ===== Modal خروج ===== */
function ExitModal({ row, rigs, onClose, onSubmit }) {
  const [exitObj, setExitObj] = useState(null);
  const [destUnit, setDestUnit] = useState("");          // rig | contractor | other
  const [destRig, setDestRig] = useState("");
  const [destContractor, setDestContractor] = useState("");
  const [vehicleKind, setVehicleKind] = useState("شرکتی"); // شرکتی | استیجاری
  const [waybillNo, setWaybillNo] = useState("");
  const [note, setNote] = useState("");

  const canSubmit = !!exitObj && !!destUnit;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ exitObj, destUnit, destRig, destContractor, vehicleKind, waybillNo, note });
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>ثبت خروج — {row.name} ({row.code})</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <DatePicker
              value={exitObj}
              onChange={setExitObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="* تاریخ و ساعت خروج"
            />
            <select className="input" value={destUnit} onChange={(e) => setDestUnit(e.target.value)}>
              <option value="">* واحد مقصد</option>
              <option value="rig">دکل</option>
              <option value="contractor">پیمانکار</option>
              <option value="other">سایر</option>
            </select>
            <select className="input" value={vehicleKind} onChange={(e) => setVehicleKind(e.target.value)}>
              <option>شرکتی</option>
              <option>استیجاری</option>
            </select>
          </div>

          <div className="row">
            {destUnit === "rig" && (
              <select className="input" value={destRig} onChange={(e) => setDestRig(e.target.value)}>
                <option value="">انتخاب دکل</option>
                {rigs.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {destUnit === "contractor" && (
              <input className="input" placeholder="نام پیمانکار" value={destContractor} onChange={(e) => setDestContractor(e.target.value)} />
            )}
            <input className="input" placeholder="شماره بارنامه" value={waybillNo} onChange={(e) => setWaybillNo(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="dh-modal__ftr">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button type="button" className="btn danger" disabled={!canSubmit} onClick={submit}>ثبت خروج</button>
        </footer>
      </div>
    </div>
  );
}

/* ===== Modal آرشیو خروجی‌ها ===== */
function ArchiveModal({ rows, onClose }) {
  // فیلترهای ساده
  const [qName, setQName] = useState("");
  const [qCode, setQCode] = useState("");
  const [fromObj, setFromObj] = useState(null);
  const [toObj, setToObj] = useState(null);

  const fromISO = toISO16(fromObj);
  const toISO   = toISO16(toObj);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const okName = !qName || (r.name || "").toLowerCase().includes(qName.toLowerCase());
      const okCode = !qCode || (r.code || "").toLowerCase().includes(qCode.toLowerCase());
      const exitISO = r.exitISO || "";
      const okFrom = !fromISO || (exitISO && exitISO >= fromISO);
      const okTo   = !toISO   || (exitISO && exitISO <= toISO);
      return okName && okCode && okFrom && okTo;
    });
  }, [rows, qName, qCode, fromISO, toISO]);

  // ——— خروجی‌ها (CSV/Word) — در scope داخلی برای جلوگیری از تداخل
  const csvEscape = (v) => {
    const s = v == null ? "" : String(v);
    return (s.includes('"') || s.includes(",") || s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const downloadBlob = (filename, mime, data) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const today = new Date().toISOString().slice(0,10);
    const headers = ["نام تجهیز","کد","سایز","تعداد","واحد مبدأ","تاریخ ورود","تاریخ خروج","واحد مقصد","دکل/پیمانکار","نوع ماشین","شماره بارنامه","یادداشت خروج"];
    const head = headers.map(csvEscape).join(",") + "\n";
    const body = filtered.map(r => [
      r.name || "", r.code || "", r.size || "", r.qty ?? 1,
      r.unitTitle || "", r.enterISO ? fmtFa(r.enterISO) : "",
      r.exitISO ? fmtFa(r.exitISO) : "",
      r.destUnit || "",
      r.destUnit === "rig" ? (r.destRig || "") : (r.destUnit === "contractor" ? (r.destContractor || "") : ""),
      r.vehicleKind || "", r.waybillNo || "", r.exitNote || ""
    ].map(csvEscape).join(",")).join("\n");
    downloadBlob(`archive_${today}.csv`, "text/csv;charset=utf-8", "\uFEFF" + head + body);
  };
  const exportDOC = () => {
    const today = new Date().toISOString().slice(0,10);
    const headers = ["نام تجهیز","کد","سایز","تعداد","واحد مبدأ","تاریخ ورود","تاریخ خروج","واحد مقصد","دکل/پیمانکار","نوع ماشین","شماره بارنامه","یادداشت خروج"];
    const headCells = headers.map(h => `<th>${h}</th>`).join("");
    const bodyRows = filtered.map(r => {
      const destPeer = r.destUnit === "rig" ? (r.destRig || "")
                    : r.destUnit === "contractor" ? (r.destContractor || "")
                    : "";
      const tds = [
        r.name || "", r.code || "", r.size || "", r.qty ?? 1,
        r.unitTitle || "", r.enterISO ? fmtFa(r.enterISO) : "",
        r.exitISO ? fmtFa(r.exitISO) : "",
        r.destUnit || "", destPeer, r.vehicleKind || "", r.waybillNo || "", r.exitNote || ""
      ].map(x => `<td>${x ?? ""}</td>`).join("");
      return `<tr>${tds}</tr>`;
    }).join("");
    const html = `
<html><head><meta charset="utf-8" />
<style>
body{font-family:Tahoma,Arial,sans-serif;direction:rtl}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;font-size:13px}
thead th{background:#f3f4f6}
h3{margin:0 0 10px}
</style></head>
<body>
<h3>گزارش آرشیو خروج قطعات</h3>
<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;
    downloadBlob(`archive_${today}.doc`, "application/msword", html);
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal" dir="rtl" onClick={(e)=>e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>آرشیو خروج قطعات</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        {/* فیلتر */}
        <div className="form">
          <div className="row">
            <input className="input" placeholder="نام تجهیز..." value={qName} onChange={(e)=>setQName(e.target.value)} />
            <input className="input" placeholder="کد تجهیز..." value={qCode} onChange={(e)=>setQCode(e.target.value)} />
            <div className="col" />
          </div>
          <div className="row">
            <DatePicker
              value={fromObj}
              onChange={setFromObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="از تاریخ خروج"
            />
            <DatePicker
              value={toObj}
              onChange={setToObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تا تاریخ خروج"
            />
            <div className="col" />
          </div>
        </div>

        {/* ابزار خروجی */}
        <div className="dh-toolbar" style={{marginTop: 4}}>
          <button type="button" className="btn" onClick={exportCSV}>خروجی CSV</button>
          <button type="button" className="btn" onClick={exportDOC}>خروجی Word</button>
          <div className="muted" style={{marginInlineStart: 'auto'}}>تعداد نتایج: <b>{filtered.length}</b></div>
        </div>

        {/* جدول */}
        <div className="table-wrap" style={{marginTop:8}}>
          <table>
            <thead>
              <tr>
                <th>نام تجهیز</th>
                <th>کد</th>
                <th>سایز</th>
                <th>تعداد</th>
                <th>واحد مبدأ</th>
                <th>تاریخ ورود</th>
                <th>تاریخ خروج</th>
                <th>واحد مقصد</th>
                <th>دکل/پیمانکار</th>
                <th>نوع ماشین</th>
                <th>شماره بارنامه</th>
                <th>یادداشت خروج</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((r)=> {
                const destPeer = r.destUnit === "rig" ? (r.destRig || "")
                              : r.destUnit === "contractor" ? (r.destContractor || "")
                              : "";
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.size || "—"}</td>
                    <td>{r.qty ?? 1}</td>
                    <td>{r.unitTitle || "—"}</td>
                    <td>{r.enterISO ? fmtFa(r.enterISO) : "—"}</td>
                    <td>{r.exitISO ? fmtFa(r.exitISO) : "—"}</td>
                    <td>{r.destUnit || "—"}</td>
                    <td>{destPeer || "—"}</td>
                    <td>{r.vehicleKind || "—"}</td>
                    <td>{r.waybillNo || "—"}</td>
                    <td className="muted">{r.exitNote || "—"}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={12} className="empty">موردی در آرشیو پیدا نشد</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="dh-modal__ftr">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
        </footer>
      </div>
    </div>
  );
}
