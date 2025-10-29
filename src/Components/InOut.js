// ============================
// File: src/pages/InOut.jsx
// ============================
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Inout.css";
import { loadLS, saveLS } from "../utils/ls";
import { toISO16 } from "../utils/date";
import { getCatalogForUnit } from "../constants/catalog";
import { exportCSV, exportDOC } from "../utils/export";
import InModal from "./Modals/InModal";
import OutModal from "./Modals/OutModal";

const LS_INV = "inventory_v1";
const LS_WO = "workorders_v1";
const MIN_THRESHOLD = 10;
const PAGE_SIZE = 10;

/* Helpers */
const norm = (s = "") => String(s).trim();
const keyOf = (name, code, size) => `${norm(name)}|${norm(code)}|${norm(size)}`;
const splitKey = (k) => {
  const [name, code, size] = k.split("|");
  return { name, code, size };
};
const statusMap = (raw = "") => {
  const s = norm(raw);
  if (["بازرسی شده", "سالم", "قبول بازرسی"].includes(s)) return "inspected";
  if (["تعمیر شده", "تعمیر"].includes(s)) return "repaired";
  return "other";
};
const buildStockBuckets = (ioRows) => {
  const sorted = [...ioRows].sort((a, b) => {
    const ta = a.enterAtISO || a.exitAtISO || "";
    const tb = b.enterAtISO || b.exitAtISO || "";
    return ta.localeCompare(tb);
  });
  const map = new Map();
  const ensure = (k) => {
    if (!map.has(k)) map.set(k, { inspected: 0, repaired: 0, other: 0, total: 0 });
    return map.get(k);
  };
  for (const r of sorted) {
    const k = keyOf(r.name, r.code, r.size);
    const b = ensure(k);
    if (r.type === "in") {
      const cls = statusMap(r.status);
      b[cls] += 1;
      b.total += 1;
    } else if (r.type === "out") {
      const take = (cls) => {
        if (b[cls] > 0) {
          b[cls] -= 1;
          b.total = Math.max(0, b.total - 1);
          return true;
        }
        return false;
      };
      if (!take("inspected")) if (!take("repaired")) take("other");
    }
  }
  return Array.from(map.entries()).map(([k, v]) => ({ ...v, ...splitKey(k) }));
};
const ymd = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
const makeWONumber = (type = "WO") => {
  const key = `wo_seq_${ymd()}`;
  const n = Number(localStorage.getItem(key) || "0") + 1;
  localStorage.setItem(key, String(n));
  return `${type}-${ymd()}-${String(n).padStart(3, "0")}`;
};
const paginate = (arr = [], page = 1, pageSize = PAGE_SIZE) => {
  const total = arr.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * pageSize;
  return { slice: arr.slice(start, start + pageSize), page: p, pages, total };
};

export default function InOut() {
  /* Inventory */
  const boot = loadLS(LS_INV, { ioRows: [] });
  const [ioRows, setIoRows] = useState(boot.ioRows || []);

  /* Work Orders */
  const wboot = loadLS(LS_WO, { open: [], closed: [] });
  const [openWOs, setOpenWOs] = useState(wboot.open || []);
  const [closedWOs] = useState(wboot.closed || []); // فقط خواندنی—setter حذف شد

  /* UI State */
  const [notify, setNotify] = useState(null);
  const [showModal, setShowModal] = useState(null); // "in" | "out"

  // Active panel: 'stock' | 'requests'
  const [panel, setPanel] = useState("stock");

  // Stock filter: 'all' | 'inspected' | 'repaired'
  const [stockFilter, setStockFilter] = useState("all");

  // Auto filter for requests when created from lathe
  const [reqUnitFilter, setReqUnitFilter] = useState(null);

  // 4 filters in requests panel
  const [reqFilters, setReqFilters] = useState({ name: "", code: "", destUnit: "", wo: "" });
  const [reqFiltersApplied, setReqFiltersApplied] = useState({ name: "", code: "", destUnit: "", wo: "" });

  // Pagination
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  // Refs
  const reqListRef = useRef(null);
  const stockTableRef = useRef(null);

  // Toast
  const toastTimerRef = useRef(null);
  const toast = useCallback((msg, type = "info") => {
    setNotify({ msg, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setNotify(null), 3800);
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* Persist LS */
  useEffect(() => {
    saveLS(LS_INV, { ioRows });
  }, [ioRows]);
  useEffect(() => {
    saveLS(LS_WO, { open: openWOs, closed: closedWOs });
  }, [openWOs, closedWOs]);

  /* Derived data */
  const items = useMemo(() => buildStockBuckets(ioRows), [ioRows]);
  const totals = useMemo(
    () => ({
      total: items.reduce((s, x) => s + x.total, 0),
      inspected: items.reduce((s, x) => s + x.inspected, 0),
      repaired: items.reduce((s, x) => s + x.repaired, 0),
    }),
    [items]
  );
  const filteredItems = useMemo(() => {
    if (stockFilter === "inspected") return items.filter((x) => x.inspected > 0);
    if (stockFilter === "repaired") return items.filter((x) => x.repaired > 0);
    return items;
  }, [items, stockFilter]);

  const currentStockOf = useCallback(
    (name, code, size) => {
      const rec = items.find((x) => x.name === norm(name) && x.code === norm(code) && x.size === norm(size));
      return rec ? rec.total : 0;
    },
    [items]
  );
  const checkMin = useCallback(
    (name, code, size, rows) => {
      const inv = buildStockBuckets(rows);
      const rec = inv.find((x) => x.name === name && x.code === code && x.size === size);
      if (rec && rec.total < MIN_THRESHOLD) toast(`هشدار: موجودی «${rec.name}» از حداقل (${MIN_THRESHOLD}) کمتر شد!`, "warn");
    },
    [toast]
  );

  /* IN */
  const addIn = useCallback(
    (p) => {
      const enterISO = toISO16(p.enterDateObj) || new Date().toISOString().slice(0, 16);
      const id = Date.now();
      const next = [
        {
          id,
          type: "in",
          name: norm(p.name),
          code: norm(p.code),
          size: norm(p.size),
          status: norm(p.status || "بازرسی شده"),
          enterAtISO: enterISO,
          note: p.note || "",
          fromWhere: p.fromWhere || "",
        },
        ...ioRows,
      ];
      setIoRows(next);
      toast("✅ تجهیز با موفقیت وارد شد", "success");
      checkMin(p.name, p.code, p.size, next);
    },
    [ioRows, toast, checkMin]
  );

  /* Create WO from OUT→Lathe */
  const createWOFromOut = useCallback(
    (payload) => {
      const type = (payload.reqType || "WO").toUpperCase();
      const woNumber = makeWONumber(type);
      const wo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        woNumber,
        type,
        name: norm(payload.name),
        code: norm(payload.code),
        size: norm(payload.size),
        destUnit: payload.dest || "تراشکاری",
        startDate:
          payload.faultReqDate || (payload.exitDateObj ? new Date(payload.exitDateObj).toISOString().slice(0, 10) : ""),
        endDate: payload.repairEndDate || "",
        desc: payload.note || "",
        faultCode: payload.faultCode || "",
        faultCause: payload.faultCause || "",
        statusSnapshot: norm(payload.status || "—"),
        createdAt: new Date().toISOString(),
      };
      setOpenWOs((s) => [wo, ...s]);
      toast(`📝 درخواست (${wo.woNumber}) ثبت شد`, "success");
      setReqUnitFilter("تراشکاری");
      setPanel("requests");
      setOpenPage(1);
    },
    [toast]
  );

  /* OUT */
  const addOut = useCallback(
    (p) => {
      const stockNow = currentStockOf(p.name, p.code, p.size);
      if (stockNow <= 0) {
        toast("❌ موجودی این تجهیز صفر است؛ خروج قابل ثبت نیست.", "warn");
        return;
      }
      const exitISO = toISO16(p.exitDateObj) || new Date().toISOString().slice(0, 16);
      const id = Date.now();
      const next = [
        {
          id,
          type: "out",
          name: norm(p.name),
          code: norm(p.code),
          size: norm(p.size),
          status: norm(p.status || ""),
          dest: p.dest || "",
          exitAtISO: exitISO,
          note: p.note || "",
        },
        ...ioRows,
      ];
      setIoRows(next);
      toast("📤 خروج تجهیز ثبت شد", "info");
      checkMin(p.name, p.code, p.size, next);
      if (norm(p.dest) === "تراشکاری") createWOFromOut(p);
    },
    [ioRows, toast, checkMin, currentStockOf, createWOFromOut]
  );

  /* Requests filtering */
  const filterWO = useCallback(
    (arr) =>
      arr.filter((r) => {
        const okUnit = reqUnitFilter ? r.destUnit === reqUnitFilter : true;
        const n = reqFiltersApplied.name.trim().toLowerCase();
        const c = reqFiltersApplied.code.trim().toLowerCase();
        const u = reqFiltersApplied.destUnit.trim().toLowerCase();
        const w = reqFiltersApplied.wo.trim().toLowerCase();
        const okName = n ? (r.name || "").toLowerCase().includes(n) : true;
        const okCode = c ? (r.code || "").toLowerCase().includes(c) : true;
        const okDest = u ? (r.destUnit || "").toLowerCase().includes(u) : true;
        const okWO = w ? (r.woNumber || "").toLowerCase().includes(w) : true;
        return okUnit && okName && okCode && okDest && okWO;
      }),
    [reqUnitFilter, reqFiltersApplied]
  );
  const openFilteredAll = useMemo(() => filterWO(openWOs), [openWOs, filterWO]);
  const closedFilteredAll = useMemo(() => filterWO(closedWOs), [closedWOs, filterWO]);

  /* Reset pages on filters/panel change */
  useEffect(() => {
    setOpenPage(1);
    setClosedPage(1);
  }, [panel, reqUnitFilter, reqFiltersApplied]);

  /* Smooth scroll when requests panel opens */
  useEffect(() => {
    if (panel === "requests" && reqListRef.current) {
      const t = window.setTimeout(() => {
        reqListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [panel]);

  const openPaged = useMemo(() => paginate(openFilteredAll, openPage, PAGE_SIZE), [openFilteredAll, openPage]);
  const closedPaged = useMemo(() => paginate(closedFilteredAll, closedPage, PAGE_SIZE), [closedFilteredAll, closedPage]);

  const Pager = ({ page, pages, onPrev, onNext, onGo }) => (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", padding: "8px 0" }}>
      <button type="button" className="btn" onClick={onPrev} disabled={page <= 1}>
        ‹ قبلی
      </button>
      {Array.from({ length: pages }).map((_, i) => {
        const p = i + 1;
        return (
          <button type="button" key={p} className={`btn ${p === page ? "primary" : ""}`} onClick={() => onGo(p)}>
            {p}
          </button>
        );
      })}
      <button type="button" className="btn" onClick={onNext} disabled={page >= pages}>
        بعدی ›
      </button>
    </div>
  );

  const isStock = panel === "stock";
  const isReq = panel === "requests";

  /* Export data */
  const openHeaders = useMemo(
    () => ["شماره دستور کار", "نام تجهیز", "کد", "سایز", "واحد مقصد", "نوع درخواست", "وضعیت", "تاریخ شروع", "تاریخ پایان", "توضیحات"],
    []
  );
  const openRows = useMemo(
    () =>
      openFilteredAll.map((r) => ({
        "شماره دستور کار": r.woNumber,
        "نام تجهیز": r.name,
        "کد": r.code,
        "سایز": r.size,
        "واحد مقصد": r.destUnit,
        "نوع درخواست": r.type,
        "وضعیت": r.statusSnapshot || "—",
        "تاریخ شروع": r.startDate || "—",
        "تاریخ پایان": r.endDate || "—",
        "توضیحات": r.desc || "—",
      })),
    [openFilteredAll]
  );
  const closedHeaders = useMemo(
    () => ["شماره دستور کار", "نام تجهیز", "کد", "سایز", "نوع درخواست", "وضعیت", "تاریخ شروع", "تاریخ پایان", "تاریخ بایگانی"],
    []
  );
  const closedRows = useMemo(
    () =>
      closedFilteredAll.map((r) => ({
        "شماره دستور کار": r.woNumber,
        "نام تجهیز": r.name,
        "کد": r.code,
        "سایز": r.size,
        "نوع درخواست": r.type,
        "وضعیت": r.statusSnapshot || "—",
        "تاریخ شروع": r.startDate || "—",
        "تاریخ پایان": r.endDate || "—",
        "تاریخ بایگانی": (r.closedAt || "").slice(0, 10),
      })),
    [closedFilteredAll]
  );

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {notify && <div className={`notify ${notify.type}`}>{notify.msg}</div>}

        <div className="table-toolbar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn success" onClick={() => setShowModal("in")}>
              ورود
            </button>
            <button type="button" className="btn danger" onClick={() => setShowModal("out")}>
              خروج
            </button>
          </div>

          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "all" ? "primary" : ""}`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("all");
                stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              title="نمایش مجموع موجودی کل"
            >
              📦 موجود کل ({totals.total})
            </button>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "inspected" ? "primary" : ""}`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("inspected");
                stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              title="فقط اقلام بازرسی‌شده در موجودی"
            >
              ✅ بازرسی شده ({totals.inspected})
            </button>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "repaired" ? "primary" : ""}`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("repaired");
                stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              title="فقط اقلام تعمیر‌شده در موجودی"
            >
              🧰 تعمیر شده ({totals.repaired})
            </button>
            <button
              type="button"
              className={`btn ${isReq ? "primary" : ""}`}
              onClick={() => {
                setPanel("requests");
              }}
              title="نمایش درخواست‌ها"
            >
              📋 نمایش درخواست‌ها
            </button>
          </div>
        </div>

        {/* STOCK TABLE */}
        <div className="table-wrap" ref={stockTableRef} style={{ display: isStock ? "block" : "none" }}>
          <table>
            <thead>
              <tr>
                <th>نام تجهیز</th>
                <th>کد</th>
                <th>سایز</th>
                <th>کل</th>
                <th>بازرسی</th>
                <th>تعمیر</th>
                <th>سایر</th>
                <th>حداقل</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((it) => (
                  <tr key={keyOf(it.name, it.code, it.size)}>
                    <td>{it.name}</td>
                    <td>{it.code}</td>
                    <td>{it.size}</td>
                    <td className={it.total < MIN_THRESHOLD ? "low" : ""}>{it.total}</td>
                    <td>{it.inspected}</td>
                    <td>{it.repaired}</td>
                    <td>{it.other}</td>
                    <td>{MIN_THRESHOLD}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty">
                    موردی مطابق فیلتر نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* REQUESTS PANEL */}
        {isReq && (
          <div className="lathe-list" ref={reqListRef}>
            {reqUnitFilter && (
              <div className="notify info" style={{ marginBottom: 8 }}>
                فیلتر واحد مقصد: {reqUnitFilter}
              </div>
            )}

            {/* Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0,1fr)) auto auto",
                gap: 8,
                alignItems: "center",
                margin: "6px 0 10px",
              }}
            >
              <input
                className="input"
                placeholder="نام تجهیز"
                value={reqFilters.name}
                onChange={(e) => setReqFilters((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="کد تجهیز"
                value={reqFilters.code}
                onChange={(e) => setReqFilters((f) => ({ ...f, code: e.target.value }))}
              />
              <input
                className="input"
                placeholder="واحد مقصد"
                value={reqFilters.destUnit}
                onChange={(e) => setReqFilters((f) => ({ ...f, destUnit: e.target.value }))}
              />
              <input
                className="input"
                placeholder="شماره دستور کار"
                value={reqFilters.wo}
                onChange={(e) => setReqFilters((f) => ({ ...f, wo: e.target.value }))}
              />
              <div />
              <button type="button" className="btn" onClick={() => setReqFiltersApplied(reqFilters)}>
                اعمال فیلتر
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const empty = { name: "", code: "", destUnit: "", wo: "" };
                  setReqFilters(empty);
                  setReqFiltersApplied(empty);
                  setReqUnitFilter(null);
                }}
              >
                حذف فیلتر
              </button>
            </div>

            {/* Open WOs */}
            <h4>📝 درخواست‌های باز ({openFilteredAll.length})</h4>
            <div className="table-wrap">
              <table>
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

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                type="button"
                className="btn"
                onClick={() => exportCSV(`درخواست‌های-باز-${ymd()}.csv`, openHeaders, openRows)}
              >
                خروجی Excel (CSV)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => exportDOC(`درخواست‌های-باز-${ymd()}.doc`, "درخواست‌های باز", openHeaders, openRows)}
              >
                خروجی Word
              </button>
            </div>

            <Pager
              page={openPaged.page}
              pages={openPaged.pages}
              onPrev={() => setOpenPage((p) => Math.max(1, p - 1))}
              onNext={() => setOpenPage((p) => Math.min(openPaged.pages, p + 1))}
              onGo={(p) => setOpenPage(p)}
            />

            {/* Closed WOs */}
            <h4 style={{ marginTop: 16 }}>📦 دستورکارهای بایگانی‌شده ({closedFilteredAll.length})</h4>
            <div className="table-wrap">
              <table>
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

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                type="button"
                className="btn"
                onClick={() => exportCSV(`دستورکار-بایگانی-${ymd()}.csv`, closedHeaders, closedRows)}
              >
                خروجی Excel (CSV)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportDOC(`دستورکار-بایگانی-${ymd()}.doc`, "دستورکارهای بایگانی‌شده", closedHeaders, closedRows)
                }
              >
                خروجی Word
              </button>
            </div>

            <Pager
              page={closedPaged.page}
              pages={closedPaged.pages}
              onPrev={() => setClosedPage((p) => Math.max(1, p - 1))}
              onNext={() => setClosedPage((p) => Math.min(closedPaged.pages, p + 1))}
              onGo={(p) => setClosedPage(p)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal === "in" && (
        <InModal
          open
          onClose={() => setShowModal(null)}
          onSubmit={(p) => {
            addIn(p);
            setShowModal(null);
          }}
          catalogProvider={() => getCatalogForUnit("pipe")}
        />
      )}
      {showModal === "out" && (
        <OutModal
          open
          onClose={() => setShowModal(null)}
          onSubmit={(p) => {
            addOut(p);
            setShowModal(null);
          }}
          catalogProvider={() => getCatalogForUnit("pipe")}
          size="xl"
        />
      )}
    </div>
  );
}
