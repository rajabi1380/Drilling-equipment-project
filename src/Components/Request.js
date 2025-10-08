// src/Components/Request.js
import React, { useEffect, useMemo, useState } from "react";
import "./Request.css";

import { loadLS, saveLS } from "../utils/ls";
import { DatePicker, TimePicker, persian, persian_fa, faFmt, fmtFa, toISO16 } from "../utils/date";
import Pagination from "./common/Pagination";
import ExportButtons from "./common/ExportButtons";
import { exportCSV, exportDOC } from "../utils/export";
import { getCatalogForUnit } from "../constants/catalog";

// توجه: مسیرها مطابق ساختار شما با M بزرگ
import RequestModal from "./Modals/RequestModal";
import HistoryModal from "./Modals/HistoryModal";

/* کلید ذخیره‌سازی محلی */
const LS_KEY = "requests_v1";

/* شماره‌دهی دستورکار */
const PREFIX = { wo: "WO", pm: "PM", ed: "ED" };
const makeOrderNo = (type, seq = 1) => {
  const d = new Date(),
    y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${PREFIX[type] || "WO"}-${y}${m}${day}-${String(seq).padStart(3, "0")}`;
};

/* واحدهایی که از کاتالوگ می‌گیریم */
const UNIT_IDS = ["surface", "bop", "choke"];

export default function Request() {
  const boot = loadLS(LS_KEY, { open: [], archived: [], seq: 1 });
  const [openOrders, setOpenOrders] = useState(boot.open || []);
  const [archivedOrders, setArchivedOrders] = useState(boot.archived || []);
  const [seq, setSeq] = useState(boot.seq || 1);

  useEffect(() => {
    saveLS(LS_KEY, { open: openOrders, archived: archivedOrders, seq });
  }, [openOrders, archivedOrders, seq]);

  /* ---------- فیلترها ---------- */
  const [filterForm, setFilterForm] = useState({ name: "", code: "", unit: "", wono: "" });
  const [applied, setApplied] = useState({ name: "", code: "", unit: "", wono: "" });
  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({ ...filterForm });
    setPageOpen(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", unit: "", wono: "" });
    setApplied({ name: "", code: "", unit: "", wono: "" });
    setPageOpen(1);
  };

  const filterFn = (r) => {
    const n = applied.name.trim().toLowerCase(),
      c = applied.code.trim().toLowerCase(),
      u = applied.unit.trim().toLowerCase(),
      w = applied.wono.trim().toLowerCase();
    return (
      (!n || (r.name || "").toLowerCase().includes(n)) &&
      (!c || (r.code || "").toLowerCase().includes(c)) &&
      (!u || (r.unit || "").toLowerCase().includes(u)) &&
      (!w || (r.orderNo || "").toLowerCase().includes(w))
    );
  };

  const filteredOpen = useMemo(() => openOrders.filter(filterFn), [openOrders, applied]);

  /* ---------- صفحه‌بندی ---------- */
  const PAGE = 15;
  const [pageOpen, setPageOpen] = useState(1);
  const totalOpenPages = Math.max(1, Math.ceil(filteredOpen.length / PAGE));
  const openSlice = filteredOpen.slice((pageOpen - 1) * PAGE, pageOpen * PAGE);

  const [pageArc, setPageArc] = useState(1);
  const totalArcPages = Math.max(1, Math.ceil(archivedOrders.length / PAGE));
  const arcSlice = archivedOrders.slice((pageArc - 1) * PAGE, pageArc * PAGE);

  /* ---------- UI ---------- */
  const [showOpenTable, setShowOpenTable] = useState(true);
  const [showArcTable, setShowArcTable] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);

  /* ---------- کاتالوگ تجمیع‌شده ---------- */
  const fullCatalog = useMemo(() => {
    try {
      const all = UNIT_IDS.flatMap((u) => getCatalogForUnit?.(u) || []);
      const key = (x) => `${x?.code || ""}__${x?.name || ""}`;
      const map = new Map();
      for (const it of all) {
        if (it && (it.name || it.code)) map.set(key(it), it);
      }
      return Array.from(map.values());
    } catch {
      return [];
    }
  }, []);

  /* ---------- Actions ---------- */
  const onCreate = (payload) => {
    const orderNo = makeOrderNo(payload.reqType, seq);
    const newSeq = seq + 1;
    const base = {
      id: Date.now(),
      orderNo,
      reqType: payload.reqType,
      name: payload.name,
      code: payload.code,
      size: payload.size,
      unit: payload.unit || "",
      status: payload.status,
      startISO: toISO16(payload.startObj),
      endISO: toISO16(payload.endObj),
      desc: payload.desc || "",
      ...(payload.extra || {}),
    };
    setOpenOrders((prev) => [base, ...prev]);
    setSeq(newSeq);
    setShowModal(false);
    setShowOpenTable(true);
  };

  const completeAndArchive = (id) => {
    setOpenOrders((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];
      const rest = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      setArchivedOrders((a) => [{ ...item, status: "پایان" }, ...a]);
      return rest;
    });
  };

  /* ===== Export helpers ===== */
  const buildRows = (items) =>
    items.map((r) => ({
      "شماره دستورکار": r.orderNo,
      "نام تجهیز": r.name,
      "کد تجهیز": r.code,
      "وضعیت": r.status,
      "واحد مقصد": r.unit || "—",
      "تاریخ شروع": fmtFa(r.startISO) || "—",
      "تاریخ پایان": fmtFa(r.endISO) || "—",
      "نوع درخواست": (r.reqType || "").toUpperCase(),
      "توضیحات": r.desc || "—",
    }));
  const safeHeaders = (rows) =>
    Object.keys(
      rows[0] || {
        "شماره دستورکار": "",
        "نام تجهیز": "",
        "کد تجهیز": "",
        "وضعیت": "",
        "واحد مقصد": "",
        "تاریخ شروع": "",
        "تاریخ پایان": "",
        "نوع درخواست": "",
        "توضیحات": "",
      }
    );

  const exportOpenExcel = () => {
    const rows = buildRows(openOrders);
    exportCSV(`open_requests_${new Date().toISOString().slice(0, 10)}.csv`, safeHeaders(rows), rows);
  };
  const exportOpenWord = () => {
    const rows = buildRows(openOrders);
    exportDOC(
      `open_requests_${new Date().toISOString().slice(0, 10)}.doc`,
      "گزارش دستورکارهای باز",
      safeHeaders(rows),
      rows
    );
  };
  const exportArchivedExcel = () => {
    const rows = buildRows(archivedOrders);
    exportCSV(`archived_requests_${new Date().toISOString().slice(0, 10)}.csv`, safeHeaders(rows), rows);
  };
  const exportArchivedWord = () => {
    const rows = buildRows(archivedOrders);
    exportDOC(
      `archived_requests_${new Date().toISOString().slice(0, 10)}.doc`,
      "گزارش دستورکارهای بایگانی‌شده",
      safeHeaders(rows),
      rows
    );
  };

  /* ===== تاریخچه برای HistoryModal ===== */
  const historyRows = useMemo(() => {
    if (!historyTarget?.code) return [];
    const all = [...openOrders, ...archivedOrders];
    return all
      .filter((x) => (x.code || "") === (historyTarget.code || ""))
      .sort((a, b) => (a.startISO || "").localeCompare(b.startISO || ""));
  }, [historyTarget, openOrders, archivedOrders]);

  return (
    <div className="rq-page" dir="rtl">
      <div className="rq-card">
        {/* فیلترها */}
        <form className="rq-filter" onSubmit={applyFilters}>
          <div className="grid">
            <div className="item">
              <label>نام تجهیز</label>
              <input
                className="input"
                value={filterForm.name}
                onChange={(e) => setFilterForm((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div className="item">
              <label>کد تجهیز</label>
              <input
                className="input"
                value={filterForm.code}
                onChange={(e) => setFilterForm((v) => ({ ...v, code: e.target.value }))}
              />
            </div>
            <div className="item">
              <label>واحد مقصد</label>
              <input
                className="input"
                value={filterForm.unit}
                onChange={(e) => setFilterForm((v) => ({ ...v, unit: e.target.value }))}
              />
            </div>
            <div className="item">
              <label>شماره دستورکار</label>
              <input
                className="input"
                value={filterForm.wono}
                onChange={(e) => setFilterForm((v) => ({ ...v, wono: e.target.value }))}
              />
            </div>
            <div className="item apply">
              <label>&nbsp;</label>
              <div className="row">
                <button type="submit" className="btn primary">
                  اعمال فیلتر
                </button>
                <button type="button" className="btn" onClick={clearFilters}>
                  حذف فیلتر
                </button>
                <button type="button" className="btn success" onClick={() => setShowModal(true)}>
                  ثبت درخواست
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* ابزار خروجی‌ها */}
        <div className="rq-toolbar">
          <ExportButtons onExcel={exportOpenExcel} onWord={exportOpenWord} label="خروجی بازها" />
          <ExportButtons onExcel={exportArchivedExcel} onWord={exportArchivedWord} label="خروجی بایگانی" />
        </div>

        {/* بازها */}
        <section className="section">
          <header className="sec-hdr" onClick={() => setShowOpenTable((v) => !v)}>
            <b>دستورکارهای باز</b>
            <span className="muted">({openOrders.length})</span>
            <span className="chev">{showOpenTable ? "▾" : "▸"}</span>
          </header>

          {showOpenTable && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>شماره دستورکار</th>
                      <th>نام تجهیز</th>
                      <th>وضعیت</th>
                      <th>واحد مقصد</th>
                      <th>تاریخ شروع عملیات</th>
                      <th>تاریخ پایان</th>
                      <th>نوع درخواست</th>
                      <th>توضیحات</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openSlice.length ? (
                      openSlice.map((r) => (
                        <tr key={r.id}>
                          <td>{r.orderNo}</td>
                          <td>{r.name}</td>
                          <td>{r.status}</td>
                          <td>{r.unit || "—"}</td>
                          <td>{fmtFa(r.startISO) || "—"}</td>
                          <td>{fmtFa(r.endISO) || "—"}</td>
                          <td>{(r.reqType || "").toUpperCase()}</td>
                          <td className="muted">{r.desc || "—"}</td>
                          <td>
                            <button className="btn small" onClick={() => completeAndArchive(r.id)}>
                              تکمیل / بایگانی
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="empty">
                          موردی ثبت نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={pageOpen}
                totalPages={totalOpenPages}
                onFirst={() => setPageOpen(1)}
                onPrev={() => setPageOpen((p) => Math.max(1, p - 1))}
                onNext={() => setPageOpen((p) => Math.min(totalOpenPages, p + 1))}
                onLast={() => setPageOpen(totalOpenPages)}
              />
              <div className="sum">
                تعداد درخواست‌های باز: <b>{openOrders.length}</b>
              </div>
            </>
          )}
        </section>

        {/* آرشیو */}
        <section className="section">
          <header className="sec-hdr" onClick={() => setShowArcTable((v) => !v)}>
            <b>دستورکارهای بایگانی‌شده</b>
            <span className="muted">({archivedOrders.length})</span>
            <span className="chev">{showArcTable ? "▾" : "▸"}</span>
          </header>

          {showArcTable && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>شماره دستورکار</th>
                      <th>نام تجهیز</th>
                      <th>کد تجهیز</th>
                      <th>وضعیت</th>
                      <th>واحد مقصد</th>
                      <th>تاریخ شروع</th>
                      <th>تاریخ پایان</th>
                      <th>نوع درخواست</th>
                      <th>توضیحات</th>
                      <th>تاریخچه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arcSlice.length ? (
                      arcSlice.map((r) => (
                        <tr key={r.id}>
                          <td>{r.orderNo}</td>
                          <td>{r.name}</td>
                          <td>{r.code}</td>
                          <td>{r.status}</td>
                          <td>{r.unit || "—"}</td>
                          <td>{fmtFa(r.startISO) || "—"}</td>
                          <td>{fmtFa(r.endISO) || "—"}</td>
                          <td>{(r.reqType || "").toUpperCase()}</td>
                          <td className="muted">{r.desc || "—"}</td>
                          <td>
                            <button
                              className="btn small"
                              type="button"
                              title="نمایش تاریخچه تجهیز"
                              onClick={() => setHistoryTarget({ code: r.code, name: r.name })}
                            >
                              🛈 مشخصات
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="empty">
                          موردی در آرشیو نیست
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={pageArc}
                totalPages={totalArcPages}
                onFirst={() => setPageArc(1)}
                onPrev={() => setPageArc((p) => Math.max(1, p - 1))}
                onNext={() => setPageArc((p) => Math.min(totalArcPages, p + 1))}
                onLast={() => setPageArc(totalArcPages)}
              />
              <div className="sum">
                تعداد بایگانی: <b>{archivedOrders.length}</b>
              </div>
            </>
          )}
        </section>
      </div>

      {/* مودال‌ها با کنترل open */}
      <RequestModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={onCreate}
        catalog={fullCatalog}
      />
      <HistoryModal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        target={historyTarget}
        history={historyRows}
      />
    </div>
  );
}
