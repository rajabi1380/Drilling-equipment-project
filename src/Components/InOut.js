// src/Components/InOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./Inout.css";

import { loadLS, saveLS } from "../utils/ls";
import { DatePicker, TimePicker, persian, persian_fa, faFmt, fmtFa, toISO16 } from "../utils/date";

import { exportCSV, exportDOC } from "../utils/export";
import Pagination from "./common/Pagination";
import ItemPickerModal from "./common/ItemPickerModal";
import ExportButtons from "./common/ExportButtons";
import { EQUIP_CATALOG, RIGS } from "../constants/catalog";

/* ---------- کلید ذخیره محلی ---------- */
const LS_KEY = "inout_v3";

/* ===== Helpers: موجودی کل / موجودی هر قطعه ===== */
const computeTotalStock = (rows) =>
  Math.max(0, rows.reduce((sum, r) => (r.type === "in" ? sum + 1 : r.type === "out" ? sum - 1 : sum), 0));

const buildItemStocks = (rows) => {
  const map = new Map();
  for (const r of rows) {
    if (r.type !== "in" && r.type !== "out") continue;
    const key = `${(r.name || "").trim()}|${(r.code || "").trim()}|${(r.size || "").trim()}`;
    map.set(key, (map.get(key) || 0) + (r.type === "in" ? 1 : -1));
  }
  return Array.from(map.entries()).map(([k, qty]) => {
    const [name, code, size] = k.split("|");
    return { name, code, size, qty: Math.max(0, qty) };
  });
};

/* ===== Map for export ===== */
const mapInOutForExport = (rows) =>
  rows
    .filter((r) => r.type === "in" || r.type === "out")
    .map((r) => ({
      "نام تجهیز": r.name || "",
      "کد تجهیز": r.code || "",
      "تاریخ ورود": r.enterAtISO ? fmtFa(r.enterAtISO) : "",
      "تاریخ خروج": r.exitAtISO ? fmtFa(r.exitAtISO) : "",
      "وضعیت": r.status || "",
      "مقصد": r.dest || "",
      "سایز": r.size || "",
      "بندگیری": r.bandgiri ? "✓" : "—",
      "نوع": r.type === "in" ? "ورود" : "خروج",
    }));

const mapRigForExport = (rows) =>
  rows
    .filter((r) => r.type === "rig")
    .map((r) => ({
      "نام تجهیز": r.name || "",
      "کد تجهیز": r.code || "",
      "سایز": r.size || "",
      "دکل مبدأ": r.rigFrom || "",
      "دکل مقصد": r.rigTo || "",
      "تاریخ درخواست": r.reqAtISO ? fmtFa(r.reqAtISO) : "",
      "تاریخ رسیدن": r.arriveAtISO ? fmtFa(r.arriveAtISO) : "",
      "نام درخواست‌کننده": r.requester || "",
      "نام بازرس": r.inspector || "",
      "تاریخ بازرسی": r.inspectAtISO ? fmtFa(r.inspectAtISO) : "",
      "توضیحات": r.note || "",
    }));

const mapInventoryForExport = (items) =>
  items.map((it) => ({
    "نام تجهیز": it.name || "",
    "کد تجهیز": it.code || "",
    "سایز": it.size || "",
    "موجودی هر قطعه": it.qty ?? 0,
  }));

export default function InOut() {
  const [active, setActive] = useState("inout"); // inout | rig | inventory

  const boot = loadLS(LS_KEY, { ioRows: [], thresholds: {} });
  const [thresholds, setThresholds] = useState(boot.thresholds || {});
  const [ioRows, setIoRows] = useState(boot.ioRows || []);

  useEffect(() => { saveLS(LS_KEY, { ioRows, thresholds }); }, [ioRows, thresholds]);

  /* فیلتر مشترک */
  const [filterForm, setFilterForm] = useState({ name: "", code: "", fromDate: null, toDate: null });
  const [applied, setApplied] = useState({ name: "", code: "", fromISO: "", toISO: "" });

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({
      name: filterForm.name.trim(),
      code: filterForm.code.trim(),
      fromISO: toISO16(filterForm.fromDate),
      toISO: toISO16(filterForm.toDate),
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", fromDate: null, toDate: null });
    setApplied({ name: "", code: "", fromISO: "", toISO: "" });
    setPage(1);
  };

  /* فیلتر روی ioRows */
  const filtered = useMemo(() => {
    const f = applied;
    return ioRows.filter((r) => {
      const okName = !f.name || (r.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || (r.code || "").toLowerCase().includes(f.code.toLowerCase());
      const startISO = r.enterAtISO || r.reqAtISO || "";
      const endISO   = r.exitAtISO  || r.arriveAtISO || "";
      const okFrom = !f.fromISO || (startISO && startISO >= f.fromISO);
      const okTo   = !f.toISO   || (!endISO || endISO <= f.toISO);
      return okName && okCode && okFrom && okTo;
    });
  }, [ioRows, applied]);

  /* صفحه‌بندی */
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = filtered.slice(pageStart, pageStart + pageSize);

  /* موجودی + هشدار */
  const totalStock = useMemo(() => computeTotalStock(ioRows), [ioRows]);
  const itemStocks = useMemo(() => buildItemStocks(ioRows), [ioRows]);
  const inventoryFiltered = useMemo(() => {
    const n = (applied.name || "").toLowerCase();
    const c = (applied.code || "").toLowerCase();
    return itemStocks.filter(it =>
      (!n || (it.name || "").toLowerCase().includes(n)) &&
      (!c || (it.code || "").toLowerCase().includes(c))
    );
  }, [itemStocks, applied]);

  const lowStockItems = useMemo(() => {
    return itemStocks.filter((it) => {
      const thrKey = `${it.code}|${it.size}`;
      const thr = thresholds[thrKey] ?? 3;
      return it.qty < thr;
    });
  }, [itemStocks, thresholds]);

  /* مودال‌ها */
  const [showIn, setShowIn]   = useState(false);
  const [showOut, setShowOut] = useState(false);
  const [showRig, setShowRig] = useState(false);

  /* افزودن رکوردها */
  const addIn = (payload) => {
    const enter = toISO16(payload.enterDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [{
      id: Date.now(),
      type: "in",
      name: payload.name, code: payload.code, size: payload.size,
      enterAtISO: enter, exitAtISO: "",
      status: payload.status, dest: payload.fromWhere || "—",
      note: payload.note || "",
    }, ...prev]);
  };
  const addOut = (payload) => {
    const exit = toISO16(payload.exitDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [{
      id: Date.now(),
      type: "out",
      name: payload.name, code: payload.code, size: payload.size,
      enterAtISO: "", exitAtISO: exit,
      status: payload.status, dest: payload.dest || "—",
      carrier: payload.carrier || "", planNo: payload.planNo || "", driver: payload.driver || "",
      note: payload.note || "", bandgiri: !!payload.bandgiri,
    }, ...prev]);
  };
  const addRig = (payload) => {
    const reqISO    = toISO16(payload.reqAtObj) || new Date().toISOString().slice(0, 16);
    const arriveISO = toISO16(payload.arriveAtObj) || "";
    setIoRows((prev) => [{
      id: Date.now(),
      type: "rig",
      name: payload.name, code: payload.code, size: payload.size,
      reqAtISO: reqISO, arriveAtISO: arriveISO,
      rigFrom: payload.rigFrom || "", rigTo: payload.rigTo || "",
      requester: payload.requester || "", inspector: payload.inspector || "",
      inspectAtISO: toISO16(payload.inspectAtObj) || "",
      note: payload.note || "",
    }, ...prev]);
  };

  const statusDisplay = (s) => (!s || s.trim() === "" ? "—" : s);

  /* ===== Export handlers ===== */
  const handleExportExcel = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (active === "inout") {
      const rows = mapInOutForExport(filtered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","تاریخ ورود":"","تاریخ خروج":"","وضعیت":"","مقصد":"","سایز":"","بندگیری":"","نوع":""});
      exportCSV(`inout_${today}.csv`, headers, rows);
    } else if (active === "rig") {
      const rows = mapRigForExport(filtered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","سایز":"","دکل مبدأ":"","دکل مقصد":"","تاریخ درخواست":"","تاریخ رسیدن":"","نام درخواست‌کننده":"","نام بازرس":"","تاریخ بازرسی":"","توضیحات":""});
      exportCSV(`rig_to_rig_${today}.csv`, headers, rows);
    } else {
      const rows = mapInventoryForExport(inventoryFiltered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","سایز":"","موجودی هر قطعه":0});
      exportCSV(`inventory_${today}.csv`, headers, rows);
    }
  };

  const handleExportWord = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (active === "inout") {
      const rows = mapInOutForExport(filtered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","تاریخ ورود":"","تاریخ خروج":"","وضعیت":"","مقصد":"","سایز":"","بندگیری":"","نوع":""});
      exportDOC(`inout_${today}.doc`, "گزارش ورود/خروج", headers, rows);
    } else if (active === "rig") {
      const rows = mapRigForExport(filtered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","سایز":"","دکل مبدأ":"","دکل مقصد":"","تاریخ درخواست":"","تاریخ رسیدن":"","نام درخواست‌کننده":"","نام بازرس":"","تاریخ بازرسی":"","توضیحات":""});
      exportDOC(`rig_to_rig_${today}.doc`, "گزارش دکل به دکل", headers, rows);
    } else {
      const rows = mapInventoryForExport(inventoryFiltered);
      const headers = Object.keys(rows[0] || {"نام تجهیز":"","کد تجهیز":"","سایز":"","موجودی هر قطعه":0});
      exportDOC(`inventory_${today}.doc`, "گزارش موجودی هر قطعه", headers, rows);
    }
  };

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {/* هشدار کمبود موجودی */}
        {lowStockItems.length > 0 && (
          <div className="alert warn">
            <div className="alert-title">کمبود موجودی</div>
            <div className="alert-body">
              {lowStockItems.slice(0, 3).map((x, i) => (
                <span key={i} className="badge">{x.name} / {x.code} / سایز {x.size} → {x.qty}</span>
              ))}
              {lowStockItems.length > 3 && <span className="muted"> و {lowStockItems.length - 3} مورد دیگر...</span>}
            </div>
          </div>
        )}

        {/* تب‌ها */}
        <div className="tabs">
          <button className={`tab ${active === "inout" ? "is-active" : ""}`} onClick={() => { setActive("inout"); setPage(1); }}>ورود و خروج</button>
          <span className="divider">|</span>
          <button className={`tab ${active === "rig" ? "is-active" : ""}`} onClick={() => { setActive("rig"); setPage(1); }}>دکل به دکل</button>
          <span className="divider">|</span>
          <button className={`tab ${active === "inventory" ? "is-active" : ""}`} onClick={() => { setActive("inventory"); setPage(1); }}>موجودی هر قطعه</button>
        </div>

        {/* فیلتر مشترک */}
        <form className="io-filter" onSubmit={applyFilters}>
          <div className="io-filter__fields">
            <div className="f-item">
              <label>نام تجهیز</label>
              <input className="input" value={filterForm.name} onChange={(e)=> setFilterForm(v=>({...v, name:e.target.value}))} placeholder="مثلاً Kelly" />
            </div>
            <div className="f-item">
              <label>کد تجهیز</label>
              <input className="input" value={filterForm.code} onChange={(e)=> setFilterForm(v=>({...v, code:e.target.value}))} placeholder="مثلاً KLY-2005" />
            </div>
            <div className="f-item">
              <label>از تاریخ</label>
              <DatePicker value={filterForm.fromDate} onChange={(val)=> setFilterForm(v=>({...v, fromDate:val}))}
                calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl" />
            </div>
            <div className="f-item">
              <label>تا تاریخ</label>
              <DatePicker value={filterForm.toDate} onChange={(val)=> setFilterForm(v=>({...v, toDate:val}))}
                calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl" />
            </div>
            <div className="f-item f-apply">
              <label>&nbsp;</label>
              <div className="btnrow">
                <button type="submit" className="btn primary">اعمال فیلتر</button>
                <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
              </div>
            </div>
          </div>

          {/* دکمه‌های مخصوص هر تب */}
          <div className="io-filter__actions">
            {active === "inout" && (
              <>
                <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
                <button type="button" className="btn danger"  onClick={() => setShowOut(true)}>ثبت خروج</button>
              </>
            )}
            {active === "rig" && (
              <button type="button" className="btn warn" onClick={() => setShowRig(true)}>ثبت دکل به دکل</button>
            )}
          </div>
        </form>

        {/* نوار ابزار خروجی‌ها + پاک‌سازی */}
        <div className="table-toolbar">
          <ExportButtons onExcel={handleExportExcel} onWord={handleExportWord} />
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => { localStorage.removeItem(LS_KEY); window.location.reload(); }}>
            پاک‌سازی دادهٔ محلی
          </button>
        </div>

        {/* جدول‌ها */}
        {active === "inout" && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th><th>کد تجهیز</th><th>تاریخ ورود</th><th>تاریخ خروج</th>
                    <th>وضعیت</th><th>مقصد</th><th>سایز</th><th>بندگیری</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length ? pagedRows.map((r) => (
                    <tr key={r.id} className={r.type === "in" ? "row-in" : r.type === "out" ? "row-out" : ""}>
                      <td>{r.name}</td>
                      <td>{r.code}</td>
                      <td>{fmtFa(r.enterAtISO) || "—"}</td>
                      <td>{fmtFa(r.exitAtISO) || "—"}</td>
                      <td>{statusDisplay(r.status)}</td>
                      <td>{r.dest || "—"}</td>
                      <td>{r.size || "—"}</td>
                      <td style={{ textAlign: "center" }}>{r.bandgiri ? "✓" : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="empty">موردی ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onFirst={()=> setPage(1)}
              onPrev={()=> setPage(p => Math.max(1, p-1))}
              onNext={()=> setPage(p => Math.min(totalPages, p+1))}
              onLast={()=> setPage(totalPages)}
            />
            <div className="muted">{filtered.length ? `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} از ${filtered.length}` : "0 از 0"}</div>

            <div className="total-stock">موجودی کل انبار: {totalStock} عدد</div>
          </>
        )}

        {active === "rig" && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th><th>کد تجهیز</th><th>سایز</th><th>دکل مبدأ</th><th>دکل مقصد</th>
                    <th>تاریخ درخواست</th><th>تاریخ رسیدن</th><th>نام درخواست‌کننده</th>
                    <th>نام بازرس</th><th>تاریخ بازرسی</th><th>توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length ? pagedRows.map((r) =>
                    r.type === "rig" ? (
                      <tr key={r.id} className="row-rig">
                        <td>{r.name}</td><td>{r.code}</td><td>{r.size || "—"}</td>
                        <td>{r.rigFrom || "—"}</td><td>{r.rigTo || "—"}</td>
                        <td>{fmtFa(r.reqAtISO) || "—"}</td><td>{fmtFa(r.arriveAtISO) || "—"}</td>
                        <td>{r.requester || "—"}</td><td>{r.inspector || "—"}</td>
                        <td>{fmtFa(r.inspectAtISO) || "—"}</td>
                        <td className="muted">{r.note || "—"}</td>
                      </tr>
                    ) : null
                  ) : (
                    <tr><td colSpan={11} className="empty">موردی ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onFirst={()=> setPage(1)}
              onPrev={()=> setPage(p => Math.max(1, p-1))}
              onNext={()=> setPage(p => Math.min(totalPages, p+1))}
              onLast={()=> setPage(totalPages)}
            />
            <div className="muted">{filtered.filter(r => r.type === "rig").length} درخواست دکل به دکل</div>
          </>
        )}

        {active === "inventory" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>نام تجهیز</th><th>کد تجهیز</th><th>سایز</th><th>موجودی هر قطعه</th></tr>
              </thead>
              <tbody>
                {inventoryFiltered.length ? inventoryFiltered.map((it, idx) => {
                  const thrKey = `${it.code}|${it.size}`;
                  const thr = thresholds[thrKey] ?? 3;
                  const low = it.qty < thr;
                  return (
                    <tr key={idx} className={low ? "row-low" : ""}>
                      <td>{it.name}</td><td>{it.code}</td><td>{it.size}</td>
                      <td>
                        <span className={`qty-badge ${low ? "is-low" : ""}`}>{it.qty}</span>
                        <small className="muted" style={{ marginInlineStart: 8 }}>حد نرمال: {thr}</small>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={4} className="empty">موردی ثبت نشده است</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال‌ها */}
      {showIn && (
        <InModal onClose={()=> setShowIn(false)} onSubmit={(p)=>{ addIn(p); setShowIn(false); }} catalog={EQUIP_CATALOG} />
      )}
      {showOut && (
        <OutModal onClose={()=> setShowOut(false)} onSubmit={(p)=>{ addOut(p); setShowOut(false); }} catalog={EQUIP_CATALOG} />
      )}
      {showRig && (
        <RigModal rigs={RIGS} onClose={()=> setShowRig(false)} onSubmit={(p)=>{ addRig(p); setShowRig(false); }} catalog={EQUIP_CATALOG} />
      )}
    </div>
  );
}

/* ====== Modals (از ItemPickerModal مشترک استفاده می‌کند) ====== */
function InModal({ onClose, onSubmit, catalog }) {
  const [touched] = useState(true);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [size, setSize] = useState("");
  const [enterDateObj, setEnterDateObj] = useState(null);
  const [status, setStatus] = useState("—"); const [fromWhere, setFromWhere] = useState("");
  const [note, setNote] = useState(""); const [pickOpen, setPickOpen] = useState(false);

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => { if (!hasError) onSubmit({ name, code, size, enterDateObj, status, fromWhere, note }); };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
          <header className="modal__hdr"><div className="modal__title">ثبت ورود</div><button className="modal__close" onClick={onClose}>✕</button></header>
          <div className="form">
            <div className="row">
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=> setName(e.target.value)} />
                </div>
                {touched && missing.name && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=> setCode(e.target.value)} />
                  <button type="button" className="pick-btn" title="انتخاب از لیست" onClick={()=> setPickOpen(true)}>☝️</button>
                </div>
                {touched && missing.code && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e)=> setSize(e.target.value)} />
                {touched && missing.size && <small className="err-msg">الزامی</small>}
              </div>
            </div>

            <div className="row">
              <DatePicker value={enterDateObj} onChange={setEnterDateObj} calendar={persian} locale={persian_fa}
                format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت ورود" />
              <select className="input" value={status} onChange={(e)=> setStatus(e.target.value)}>
                <option>تعمیر شده</option><option>بازرسی شده</option><option>—</option>
              </select>
              <input className="input" placeholder="از کجا آمده" value={fromWhere} onChange={(e)=> setFromWhere(e.target.value)} />
            </div>

            <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=> setNote(e.target.value)} />
          </div>
          <footer className="modal__ftr"><button className="btn" onClick={onClose}>انصراف</button><button className="btn success" onClick={submit} disabled={hasError}>ثبت ورود</button></footer>
        </div>
      </div>

      <ItemPickerModal open={pickOpen} onClose={()=> setPickOpen(false)} catalog={catalog} onPick={(it)=>{ setName(it.name); setCode(it.code); setPickOpen(false); }} />
    </>
  );
}

function OutModal({ onClose, onSubmit, catalog }) {
  const [touched] = useState(true);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [size, setSize] = useState("");
  const [exitDateObj, setExitDateObj] = useState(null);
  const [status, setStatus] = useState("—"); const [dest, setDest] = useState("");
  const [carrier, setCarrier] = useState(""); const [planNo, setPlanNo] = useState(""); const [driver, setDriver] = useState("");
  const [bandgiri, setBandgiri] = useState(false); const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => { if (!hasError) onSubmit({ name, code, size, exitDateObj, status, dest, carrier, planNo, driver, bandgiri, note }); };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
          <header className="modal__hdr"><div className="modal__title">ثبت خروج</div><button className="modal__close" onClick={onClose}>✕</button></header>

          <div className="form">
            <div className="row">
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=> setName(e.target.value)} />
                </div>
                {touched && missing.name && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=> setCode(e.target.value)} />
                  <button type="button" className="pick-btn" title="انتخاب از لیست" onClick={()=> setPickOpen(true)}>☝️</button>
                </div>
                {touched && missing.code && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e)=> setSize(e.target.value)} />
                {touched && missing.size && <small className="err-msg">الزامی</small>}
              </div>
            </div>

            <div className="row">
              <DatePicker value={exitDateObj} onChange={setExitDateObj} calendar={persian} locale={persian_fa}
                format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت خروج" />
              <select className="input" value={status} onChange={(e)=> setStatus(e.target.value)}>
                <option>تعمیر شده</option><option>بازرسی شده</option><option>—</option>
              </select>
              <label className="input checkbox">
                <input type="checkbox" checked={bandgiri} onChange={(e)=> setBandgiri(e.target.checked)} /> بندگیری
              </label>
            </div>

            <div className="row">
              <input className="input" placeholder="مقصد" value={dest} onChange={(e)=> setDest(e.target.value)} />
              <input className="input" placeholder="مشخصات حمل کننده" value={carrier} onChange={(e)=> setCarrier(e.target.value)} />
              <input className="input" placeholder="شماره برنامه" value={planNo} onChange={(e)=> setPlanNo(e.target.value)} />
            </div>

            <div className="row"><input className="input" placeholder="راننده" value={driver} onChange={(e)=> setDriver(e.target.value)} /></div>
            <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=> setNote(e.target.value)} />
          </div>

          <footer className="modal__ftr"><button className="btn" onClick={onClose}>انصراف</button><button className="btn danger" onClick={submit} disabled={hasError}>ثبت خروج</button></footer>
        </div>
      </div>

      <ItemPickerModal open={pickOpen} onClose={()=> setPickOpen(false)} catalog={catalog}
        onPick={(it)=>{ setName(it.name); setCode(it.code); setPickOpen(false); }} />
    </>
  );
}

function RigModal({ rigs, onClose, onSubmit, catalog }) {
  const [touched] = useState(true);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [size, setSize] = useState("");
  const [reqAtObj, setReqAtObj] = useState(null); const [arriveAtObj, setArriveAtObj] = useState(null);
  const [rigFrom, setRigFrom] = useState(""); const [rigTo, setRigTo] = useState("");
  const [requester, setRequester] = useState(""); const [inspector, setInspector] = useState(""); const [inspectAtObj, setInspectAtObj] = useState(null);
  const [note, setNote] = useState(""); const [pickOpen, setPickOpen] = useState(false);

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => { if (!hasError) onSubmit({ name, code, size, reqAtObj, arriveAtObj, rigFrom, rigTo, requester, inspector, inspectAtObj, note }); };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
          <header className="modal__hdr"><div className="modal__title">ثبت دکل به دکل</div><button className="modal__close" onClick={onClose}>✕</button></header>

          <div className="form">
            <div className="row">
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=> setName(e.target.value)} />
                </div>
                {touched && missing.name && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <div className="with-pick">
                  <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=> setCode(e.target.value)} />
                  <button type="button" className="pick-btn" title="انتخاب از لیست" onClick={()=> setPickOpen(true)}>☝️</button>
                </div>
                {touched && missing.code && <small className="err-msg">الزامی</small>}
              </div>
              <div className="col">
                <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e)=> setSize(e.target.value)} />
                {touched && missing.size && <small className="err-msg">الزامی</small>}
              </div>
            </div>

            <div className="row">
              <DatePicker value={reqAtObj} onChange={setReqAtObj} calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت درخواست" />
              <DatePicker value={arriveAtObj} onChange={setArriveAtObj} calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت رسیدن" />
              <select className="input" value={rigFrom} onChange={(e)=> setRigFrom(e.target.value)}>
                <option value="">دکل مبدأ</option>{rigs.map((r)=> <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="row">
              <select className="input" value={rigTo} onChange={(e)=> setRigTo(e.target.value)}>
                <option value="">دکل مقصد</option>{rigs.map((r)=> <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="input" placeholder="نام درخواست‌کننده" value={requester} onChange={(e)=> setRequester(e.target.value)} />
              <input className="input" placeholder="نام بازرس" value={inspector} onChange={(e)=> setInspector(e.target.value)} />
            </div>

            <div className="row">
              <DatePicker value={inspectAtObj} onChange={setInspectAtObj} calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ بازرسی" />
              <div className="col" /><div className="col" />
            </div>

            <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=> setNote(e.target.value)} />
          </div>

          <footer className="modal__ftr"><button className="btn" onClick={onClose}>انصراف</button><button className="btn warn" onClick={submit} disabled={hasError}>ثبت دکل به دکل</button></footer>
        </div>
      </div>

      <ItemPickerModal open={pickOpen} onClose={()=> setPickOpen(false)} catalog={catalog}
        onPick={(it)=>{ setName(it.name); setCode(it.code); setPickOpen(false); }} />
    </>
  );
}
