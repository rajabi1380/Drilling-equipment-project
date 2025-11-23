// ============================
// File: src/Components/InOut.js
// ============================
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./Inout.css";

// Utils
import { loadLS, saveLS } from "../utils/ls";
import { toISO16 } from "../utils/date";
import { exportCSV, exportDOC } from "../utils/export";
import { keyOf, splitKey } from "../utils/Key";

// Rig + Catalog
import { getCatalogForUnit, RIGS } from "../constants/catalog";
import {
  isRig,
  addToRigInventory,
  removeFromRigInventory,
  loadRigInv,
  saveRigInv,
} from "../utils/rigInventory";

// Turning + WO
import {
  loadTurning,
  loadInspection,
  appendTurningOpen,
  appendInspectionOpen,
  FINISH_STATES,
  LS_TURN,
  LS_INSPECTION,
} from "../utils/turning";

// UI
import InModal from "./Modals/InModal";
import OutModal from "./Modals/OutModal";
import RigModal from "./Modals/RigModal";
import RequestPanel from "./Request";
import { useAuth } from "./Context/AuthContext";
import { useNotify } from "../utils/notify";

const LS_INV = "inventory_v1";
const LS_WO = "workorders_v1";
const LS_RM = "rig_moves_v1";
const LS_REPORT = "reports_v1";

const MIN_THRESHOLD = 10;
const PAGE_SIZE = 10;

const norm = (s = "") => String(s).trim();
const statusMap = (raw = "") => {
  const s = norm(raw);
  if (["بازرسی شده", "سالم", "قبول بازرسی"].includes(s)) return "inspected";
  if (["تعمیر شده", "تعمیر"].includes(s)) return "repaired";
  return "other";
};
const ymd = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

const pingRigRefresh = () => {
  try {
    const cur = loadRigInv();
    saveRigInv(cur);
  } catch {
    // ignore
  }
};

// Build stock buckets from IO logs
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
    const qty = Number(r.qty || r.count || 1) || 1;

    if (r.type === "in") {
      const cls = statusMap(r.status);
      if (cls === "inspected") b.inspected += qty;
      else if (cls === "repaired") b.repaired += qty;
      else b.other += qty;
      b.total += qty;
    } else if (r.type === "out") {
      let remain = qty;
      const take = (cls) => {
        if (remain <= 0) return;
        const can = Math.min(b[cls], remain);
        if (can > 0) {
          b[cls] -= can;
          b.total = Math.max(0, b.total - can);
          remain -= can;
        }
      };
      take("inspected");
      take("repaired");
      take("other");
    }
  }

  return Array.from(map.entries()).map(([k, v]) => ({ ...v, ...splitKey(k) }));
};

// Reports
const appendReportRows = (newRows = []) => {
  if (!newRows || !newRows.length) return;
  const boot = loadLS(LS_REPORT, { rows: [] });
  const rows = Array.isArray(boot.rows) ? boot.rows : [];
  const next = [...newRows, ...rows];
  saveLS(LS_REPORT, { rows: next });
};

const makeEquipmentReportRow = ({
  id,
  name,
  code,
  size,
  type,
  datetimeISO,
  sourceUnit = "",
  destUnit = "",
  condition = "",
  bandgiri = "",
  note = "",
  recordedAtISO = "",
  reportUnit = "",
}) => ({
  Report_Id: id,
  Equipment_Code: code,
  Equipment_Name: name,
  Equipment_Size: size,
  Transaction_Type: type,
  Transaction_Datetime: datetimeISO,
  Source_Unit: sourceUnit,
  Destination_Unit: destUnit,
  Condition: condition,
  Is_Bandgiri_Done: bandgiri,
  Note: note,
  Recorded_At: recordedAtISO || datetimeISO,
  Unit: reportUnit || "",
});

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
  const { isAdmin, currentUnit, hasUnit } = useAuth();

  const isSuper = !!isAdmin;
  const unitFallback = currentUnit || "PIPE";

  const canInOut =
    isSuper ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("PIPE") ||
    hasUnit("MANDEYABI");

  // Data
  const [ioRows, setIoRows] = useState(() => loadLS(LS_INV, { ioRows: [] }).ioRows || []);
  const [openWOs, setOpenWOs] = useState(() => loadLS(LS_WO, { open: [], closed: [] }).open || []);
  const [closedWOs, setClosedWOs] = useState(() => loadLS(LS_WO, { open: [], closed: [] }).closed || []);
  const [rigMoves, setRigMoves] = useState(() => loadLS(LS_RM, { moves: [] }).moves || []);

  // UI
  const [showModal, setShowModal] = useState(null); // "in" | "out" | "rig"
  const [panel, setPanel] = useState("stock");
  const [stockFilter, setStockFilter] = useState("all");
  const [reqUnitFilter, setReqUnitFilter] = useState(null);
  const [reqFilters, setReqFilters] = useState({ name: "", code: "", destUnit: "", wo: "" });
  const [reqFiltersApplied, setReqFiltersApplied] = useState({ name: "", code: "", destUnit: "", wo: "" });
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const reqListRef = useRef(null);
  const stockTableRef = useRef(null);

  const { notify, show, checkLowStock } = useNotify(3800);

  // persist
  useEffect(() => { saveLS(LS_INV, { ioRows }); }, [ioRows]);
  useEffect(() => { saveLS(LS_WO, { open: openWOs, closed: closedWOs }); }, [openWOs, closedWOs]);
  useEffect(() => { saveLS(LS_RM, { moves: rigMoves }); }, [rigMoves]);

  // Scoped by unit
  const scopedIoRows = useMemo(() => {
    if (isSuper || !currentUnit) return ioRows;
    return ioRows.filter((r) => (r.unit || "PIPE") === currentUnit);
  }, [ioRows, isSuper, currentUnit]);

  const scopedOpenWOs = useMemo(() => {
    if (isSuper || !currentUnit) return openWOs;
    // درخواست‌های بازرسی برای همه دیده شود
    return openWOs.filter((r) => (r.unit || r.destUnit || "PIPE") === currentUnit || r.destUnit === "بازرسی");
  }, [openWOs, isSuper, currentUnit]);

  const scopedClosedWOs = useMemo(() => {
    if (isSuper || !currentUnit) return closedWOs;
    return closedWOs.filter((r) => (r.unit || r.destUnit || "PIPE") === currentUnit || r.destUnit === "بازرسی");
  }, [closedWOs, isSuper, currentUnit]);

  // Stock buckets
  const items = useMemo(() => buildStockBuckets(scopedIoRows), [scopedIoRows]);
  const totals = useMemo(() => ({
    total: items.reduce((s, x) => s + x.total, 0),
    inspected: items.reduce((s, x) => s + x.inspected, 0),
    repaired: items.reduce((s, x) => s + x.repaired, 0),
  }), [items]);

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

  // Low stock alert
  useEffect(() => { checkLowStock(items, MIN_THRESHOLD); }, [items, checkLowStock]);

  /* ---------- IN ---------- */
  const addIn = useCallback((p) => {
    const unit = isSuper ? (p.unit || unitFallback) : unitFallback;
    const enterISO = toISO16(p.enterDateObj) || new Date().toISOString().slice(0, 16);
    const qty = Number(p.count || p.qty || 1) || 1;
    const id = Date.now();

    const row = {
      id, type: "in", unit,
      name: norm(p.name), code: norm(p.code), size: norm(p.size),
      status: norm(p.status || "بازرسی شده"),
      enterAtISO: enterISO, note: p.note || "", fromWhere: p.fromWhere || "", qty,
    };

    setIoRows((prev) => [row, ...prev]);

    const possibleRig = p.fromWhere || p.rig || p.rigName || p.sourceUnit || "";
    if (isRig(possibleRig)) {
      removeFromRigInventory(possibleRig, p.name, p.code, p.size, qty);
    }
    pingRigRefresh();

    appendReportRows([
      makeEquipmentReportRow({
        id, name: row.name, code: row.code, size: row.size, type: "ورود",
        datetimeISO: enterISO, sourceUnit: possibleRig, destUnit: unit,
        condition: row.status, bandgiri: "", note: row.note, recordedAtISO: enterISO, reportUnit: unit,
      }),
    ]);

    show("✅ تجهیز با موفقیت وارد شد", "success");
  }, [isSuper, unitFallback, show]);

  /* ---------- ساخت WO از خروج ---------- */
  const createWOFromOut = useCallback((payload, unit) => {
    const type = (payload.reqType || "WO").toUpperCase();
    const woNumber = makeWONumber(type);
    const wo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      woNumber, type, unit,
      name: norm(payload.name), code: norm(payload.code), size: norm(payload.size),
      destUnit: payload.dest || "تراشکاری",
      startDate:
        payload.faultReqDate ||
        (payload.exitDateObj ? new Date(payload.exitDateObj).toISOString().slice(0, 10) : ""),
      endDate: payload.repairEndDate || "",
      desc: payload.note || "",
      faultCode: payload.faultCode || "",
      faultCause: payload.faultCause || "",
      statusSnapshot: norm(payload.status || "—"),
      createdAt: new Date().toISOString(),
    };
    setOpenWOs((s) => [wo, ...s]);

    appendTurningOpen({
      name: payload.name, code: payload.code, size: payload.size, reqType: type, desc: payload.note || "",
    });

    show(`📝 درخواست (${wo.woNumber}) ثبت شد و به پنل تراشکاری ارسال گردید`, "success");
    setReqUnitFilter("تراشکاری");
    setPanel("requests");
    setOpenPage(1);
  }, [show]);

  const createInspectionWOFromOut = useCallback((payload, unit) => {
    const type = (payload.reqType || "WO").toUpperCase();
    const woNumber = makeWONumber(type);
    const wo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      woNumber, type, unit,
      name: norm(payload.name), code: norm(payload.code), size: norm(payload.size),
      destUnit: "بازرسی",
      startDate: payload.exitDateObj ? new Date(payload.exitDateObj).toISOString().slice(0, 10) : "",
      endDate: payload.repairEndDate || "",
      desc: payload.note || "",
      statusSnapshot: norm(payload.status || "—"),
      createdAt: new Date().toISOString(),
    };
    setOpenWOs((s) => [wo, ...s]);

    appendInspectionOpen({
      name: payload.name,
      code: payload.code,
      size: payload.size,
      reqType: type,
      desc: payload.note || "",
      startISO: toISO16(payload.exitDateObj),
      endISO: payload.repairEndDate || "",
    });

    show(`📝 درخواست (${wo.woNumber}) ثبت شد و به واحد بازرسی ارسال گردید`, "success");
    setReqUnitFilter(null); // نمایش برای همه
    setPanel("requests");
    setOpenPage(1);
  }, [show]);

  /* ---------- OUT ---------- */
  const addOut = useCallback((p) => {
    const unit = isSuper ? (p.unit || unitFallback) : unitFallback;
    const qty = Number(p.count || p.qty || 1) || 1;
    const stockNow = currentStockOf(p.name, p.code, p.size);

    if (stockNow < qty) {
      show(`❌ موجودی کافی نیست. موجودی فعلی: ${stockNow} ، مقدار درخواستی: ${qty}`, "warn");
      return;
    }

    const exitISO = toISO16(p.exitDateObj) || new Date().toISOString().slice(0, 16);
    const id = Date.now();
    const destNorm = norm(p.dest || "");
    const billNo = norm(p.billNo || "");
    const contractorName = norm(p.contractorName || "");
    const contractorManualWO = norm(p.contractorManualWO || "");

    const noteCombined = [
      p.note || "",
      billNo ? `بارنامه: ${billNo}` : "",
      destNorm === "پیمانکاری" && contractorName ? `پیمانکار: ${contractorName}` : "",
      destNorm === "پیمانکاری" && contractorManualWO ? `دستور کار: ${contractorManualWO}` : "",
    ].filter(Boolean).join(" | ");

    const row = {
      id, type: "out", unit,
      name: norm(p.name), code: norm(p.code), size: norm(p.size),
      status: norm(p.status || ""), dest: destNorm, exitAtISO: exitISO, note: noteCombined, qty,
      billNo, contractorName, contractorManualWO,
    };

    setIoRows((prev) => [row, ...prev]);

    if (isRig(destNorm)) {
      addToRigInventory(destNorm, p.name, p.code, p.size, qty);
    }
    pingRigRefresh();

    appendReportRows([
      makeEquipmentReportRow({
        id, name: row.name, code: row.code, size: row.size, type: "خروج",
        datetimeISO: exitISO, sourceUnit: unit, destUnit: destNorm,
        condition: row.status, bandgiri: norm(p.isBandgiri || ""), note: noteCombined,
        recordedAtISO: exitISO, reportUnit: unit,
      }),
    ]);

    show("📤 خروج تجهیز ثبت شد", "info");
    if (destNorm === "تراشکاری") createWOFromOut(p, unit);
    if (destNorm === "بازرسی") createInspectionWOFromOut(p, unit);
  }, [isSuper, unitFallback, currentStockOf, show, createWOFromOut]);

  /* ---------- RIG ↔ RIG ---------- */
  const addRigMove = useCallback((payload) => {
    const unit = isSuper ? payload.unit || unitFallback : unitFallback;

    const rec = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      unit, ...payload, createdAt: new Date().toISOString(),
    };
    setRigMoves((prev) => [rec, ...prev]);

    const itemsArr = Array.isArray(payload.items) && payload.items.length ? payload.items : [];
    itemsArr.forEach((it) => {
      const q = Number(it.qty || 1) || 1;
      if (isRig(payload.fromRig)) removeFromRigInventory(payload.fromRig, it.name, it.code, it.size, q);
      if (isRig(payload.toRig)) addToRigInventory(payload.toRig, it.name, it.code, it.size, q);
    });

    pingRigRefresh();

    const rows = [];
    itemsArr.forEach((it) => {
      const q = Number(it.qty || 1) || 1;
      for (let i = 0; i < q; i += 1) {
        rows.push(
          makeEquipmentReportRow({
            id: `${rec.id}-${it.code || "ITEM"}-${i + 1}`,
            name: norm(it.name || ""), code: norm(it.code || ""), size: norm(it.size || ""),
            type: "جابجایی",
            datetimeISO: payload.requestAtISO || new Date().toISOString().slice(0, 16),
            sourceUnit: norm(payload.fromRig || ""), destUnit: norm(payload.toRig || ""),
            condition: "", bandgiri: "", note: payload.note || "",
            recordedAtISO: rec.createdAt, reportUnit: unit,
          })
        );
      }
    });
    if (rows.length) appendReportRows(rows);

    show("🚚 جابه‌جایی دکل ثبت شد", "success");
  }, [isSuper, unitFallback, show]);

  /* ---------- همگام‌سازی تراشکاری/WO ---------- */
  const syncTurningToWOs = useCallback(() => {
    const turn = loadTurning();

    const closedByOrderNo = new Set();
    const closedSnapshots = new Map();
    const collect = (arr = []) => {
      arr.forEach((r) => {
        const st = String(r.status || "").trim().toLowerCase();
        const isFinished = FINISH_STATES.has(st);
        if (r.orderNo && isFinished) {
          closedByOrderNo.add(r.orderNo);
          closedSnapshots.set(r.orderNo, r);
        }
      });
    };
    collect(Array.isArray(turn.archived) ? turn.archived : []);
    collect(Array.isArray(turn.open) ? turn.open : []);

    const closedByNCS = new Map();
    const addNCS = (arr = []) => {
      arr.forEach((r) => {
        const st = String(r.status || "").trim().toLowerCase();
        if (FINISH_STATES.has(st)) closedByNCS.set(keyOf(r.name, r.code, r.size), r);
      });
    };
    addNCS(Array.isArray(turn.archived) ? turn.archived : []);
    addNCS(Array.isArray(turn.open) ? turn.open : []);

    if (closedByOrderNo.size === 0 && closedByNCS.size === 0) return;

    setOpenWOs((prevOpen) => {
      const stillOpen = [];
      const toArchive = [];

      for (const wo of prevOpen) {
        const byOrder = wo.woNumber && closedByOrderNo.has(wo.woNumber);
        const byNCS = closedByNCS.get(keyOf(wo.name, wo.code, wo.size));
        if (byOrder || byNCS) {
          const tr = byOrder ? closedSnapshots.get(wo.woNumber) : byNCS;
          const merged = {
            ...wo,
            endDate: tr?.endISO || wo.endDate || "",
            statusSnapshot: tr?.status ? `پایان‌یافته (تراشکاری: ${tr.status})` : "پایان‌یافته (تراشکاری)",
            desc: wo.desc || tr?.desc || "",
            turningSnapshot: {
              orderNo: tr?.orderNo || "", status: tr?.status || "",
              startISO: tr?.startISO || "", endISO: tr?.endISO || "",
              name: tr?.name || "", code: tr?.code || "", size: tr?.size || "", desc: tr?.desc || "",
            },
          };
          toArchive.push(merged);
        } else {
          stillOpen.push(wo);
        }
      }

      if (toArchive.length) {
        setClosedWOs((prevClosed) => {
          const seen = new Set(prevClosed.map((x) => x.woNumber));
          const nowISO = new Date().toISOString();
          return [
            ...prevClosed,
            ...toArchive.filter((x) => !seen.has(x.woNumber)).map((x) => ({ ...x, closedAt: nowISO })),
          ];
        });
      }

      return stillOpen;
    });
  }, []);

  /* ---------- همگام‌سازی بازرسی/WO ---------- */
  const syncInspectionToWOs = useCallback(() => {
    const insp = loadInspection();

    const finishedByOrderNo = new Set();
    const finishedSnapshots = new Map();
    const collect = (arr = []) =>
      arr.forEach((r) => {
        const st = String(r.status || "").trim().toLowerCase();
        if (FINISH_STATES.has(st)) {
          if (r.orderNo) finishedByOrderNo.add(r.orderNo);
          if (r.orderNo) finishedSnapshots.set(r.orderNo, r);
        }
      });
    collect(Array.isArray(insp.archived) ? insp.archived : []);
    collect(Array.isArray(insp.open) ? insp.open : []);

    const finishedByNCS = new Map();
    const addNCS = (arr = []) =>
      arr.forEach((r) => {
        const st = String(r.status || "").trim().toLowerCase();
        if (FINISH_STATES.has(st)) finishedByNCS.set(keyOf(r.name, r.code, r.size), r);
      });
    addNCS(Array.isArray(insp.archived) ? insp.archived : []);
    addNCS(Array.isArray(insp.open) ? insp.open : []);

    if (!finishedByOrderNo.size && !finishedByNCS.size) return;

    setOpenWOs((prevOpen) => {
      const stillOpen = [];
      const toArchive = [];

      for (const wo of prevOpen) {
        const isInspectionWO = (wo.destUnit || "") === "بازرسی";
        if (!isInspectionWO) {
          stillOpen.push(wo);
          continue;
        }

        const byOrder = wo.woNumber && finishedByOrderNo.has(wo.woNumber);
        const byNCS = finishedByNCS.get(keyOf(wo.name, wo.code, wo.size));
        if (byOrder || byNCS) {
          const inspRec = byOrder ? finishedSnapshots.get(wo.woNumber) : byNCS;
          const merged = {
            ...wo,
            endDate: inspRec?.endISO || wo.endDate || "",
            statusSnapshot: inspRec?.status
              ? `پایان‌یافته (بازرسی: ${inspRec.status})`
              : "پایان‌یافته (بازرسی)",
            desc: wo.desc || inspRec?.desc || "",
            inspectionSnapshot: {
              orderNo: inspRec?.orderNo || "",
              status: inspRec?.status || "",
              startISO: inspRec?.startISO || "",
              endISO: inspRec?.endISO || "",
              name: inspRec?.name || "",
              code: inspRec?.code || "",
              size: inspRec?.size || "",
              desc: inspRec?.desc || "",
            },
          };
          toArchive.push(merged);
        } else {
          stillOpen.push(wo);
        }
      }

      if (toArchive.length) {
        setClosedWOs((prevClosed) => {
          const seen = new Set(prevClosed.map((x) => x.woNumber));
          const nowISO = new Date().toISOString();
          return [
            ...prevClosed,
            ...toArchive.filter((x) => !seen.has(x.woNumber)).map((x) => ({ ...x, closedAt: nowISO })),
          ];
        });
      }

      return stillOpen;
    });
  }, []);

  useEffect(() => {
    syncTurningToWOs();
    syncInspectionToWOs();
    const intId = window.setInterval(() => {
      syncTurningToWOs();
      syncInspectionToWOs();
    }, 2000);
    const onStorage = (e) => {
      if (e.key === LS_TURN) syncTurningToWOs();
      if (e.key === LS_INSPECTION) syncInspectionToWOs();
    };
    const onFocus = () => {
      syncTurningToWOs();
      syncInspectionToWOs();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncTurningToWOs, syncInspectionToWOs]);

  // Request filters
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

  const openFilteredAll = useMemo(() => filterWO(scopedOpenWOs), [scopedOpenWOs, filterWO]);
  const closedFilteredAll = useMemo(() => filterWO(scopedClosedWOs), [scopedClosedWOs, filterWO]);
  useEffect(() => { setOpenPage(1); setClosedPage(1); }, [panel, reqUnitFilter, reqFiltersApplied]);

  const openPaged = useMemo(() => paginate(openFilteredAll, openPage, PAGE_SIZE), [openFilteredAll, openPage]);
  const closedPaged = useMemo(() => paginate(closedFilteredAll, closedPage, PAGE_SIZE), [closedFilteredAll, closedPage]);

  const isStock = panel === "stock";
  const isReq = panel === "requests";

  const openHeaders = useMemo(
    () => ["شماره دستور کار", "نام تجهیز", "کد", "سایز", "واحد مقصد", "نوع درخواست", "وضعیت", "تاریخ شروع", "تاریخ پایان", "توضیحات"],
    []
  );
  const openRows = useMemo(
    () => openFilteredAll.map((r) => ({
      "شماره دستور کار": r.woNumber, "نام تجهیز": r.name, "کد": r.code, "سایز": r.size, "واحد مقصد": r.destUnit,
      "نوع درخواست": r.type, وضعیت: r.statusSnapshot || "—", "تاریخ شروع": r.startDate || "—",
      "تاریخ پایان": r.endDate || "—", توضیحات: r.desc || "—",
    })),
    [openFilteredAll]
  );

  const closedHeaders = useMemo(
    () => ["شماره دستور کار", "نام تجهیز", "کد", "سایز", "نوع درخواست", "وضعیت", "تاریخ شروع", "تاریخ پایان", "تاریخ بایگانی"],
    []
  );
  const closedRows = useMemo(
    () => closedFilteredAll.map((r) => ({
      "شماره دستور کار": r.woNumber, "نام تجهیز": r.name, "کد": r.code, "سایز": r.size, "نوع درخواست": r.type,
      وضعیت: r.statusSnapshot || "—", "تاریخ شروع": r.startDate || "—",
      "تاریخ پایان": r.endDate || "—", "تاریخ بایگانی": (r.closedAt || "").slice(0, 10),
    })),
    [closedFilteredAll]
  );

  if (!canInOut) {
    return (
      <div className="io-page" dir="rtl">
        <div className="io-card">
          <h2>رسید و ارسال</h2>
          <div className="notify error">❌ شما مجاز به دسترسی به این بخش نیستید.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {notify && <div className={`notify ${notify.type}`}>{notify.msg}</div>}

        {/* Toolbar */}
        <div className="table-toolbar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn success" onClick={() => setShowModal("in")}>ورود</button>
            <button type="button" className="btn danger" onClick={() => setShowModal("out")}>خروج</button>
            <button type="button" className="btn" onClick={() => setShowModal("rig")}>دکل به دکل</button>
          </div>

          <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "all" ? "primary" : ""}`}
              onClick={() => { setPanel("stock"); setStockFilter("all"); stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            >
              📦 موجود کل ({totals.total})
            </button>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "inspected" ? "primary" : ""}`}
              onClick={() => { setPanel("stock"); setStockFilter("inspected"); stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            >
              ✅ بازرسی شده ({totals.inspected})
            </button>
            <button
              type="button"
              className={`btn ${isStock && stockFilter === "repaired" ? "primary" : ""}`}
              onClick={() => { setPanel("stock"); setStockFilter("repaired"); stockTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            >
              🧰 تعمیر شده ({totals.repaired})
            </button>
            <button type="button" className={`btn ${isReq ? "primary" : ""}`} onClick={() => { setPanel("requests"); setTimeout(() => reqListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}>
              📋 نمایش درخواست‌ها
            </button>
          </div>
        </div>

        {/* Stock table */}
        <div className="table-wrap" ref={stockTableRef} style={{ display: isStock ? "block" : "none" }}>
          <table>
            <thead>
              <tr>
                <th>#</th><th>نام تجهیز</th><th>کد</th><th>سایز</th>
                <th>کل</th><th>بازرسی</th><th>تعمیر</th><th>سایر</th><th>حداقل</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((it, idx) => (
                  <tr key={keyOf(it.name, it.code, it.size)}>
                    <td>{idx + 1}</td>
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
                <tr><td colSpan={9} className="empty">موردی مطابق فیلتر نیست</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Requests panel */}
        {isReq && (
          <div ref={reqListRef}>
            <RequestPanel
              reqFilters={reqFilters}
              setReqFilters={setReqFilters}
              reqFiltersApplied={reqFiltersApplied}
              setReqFiltersApplied={setReqFiltersApplied}
              reqUnitFilter={reqUnitFilter}
              setReqUnitFilter={setReqUnitFilter}
              openPaged={openPaged}
              closedPaged={closedPaged}
              openFilteredAll={openFilteredAll}
              closedFilteredAll={closedFilteredAll}
              openPage={openPage}
              setOpenPage={setOpenPage}
              closedPage={closedPage}
              setClosedPage={setClosedPage}
              openHeaders={openHeaders}
              openRows={openRows}
              closedHeaders={closedHeaders}
              closedRows={closedRows}
              ymd={ymd}
              PAGE_SIZE={PAGE_SIZE}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal === "in" && (
        <InModal
          open
          onClose={() => setShowModal(null)}
          onSubmit={(p) => { addIn(p); setShowModal(null); }}
          catalogProvider={() => getCatalogForUnit(currentUnit || "PIPE")}
        />
      )}

      {showModal === "out" && (
        <OutModal
          open
          onClose={() => setShowModal(null)}
          onSubmit={(p) => { addOut(p); setShowModal(null); }}
          catalogProvider={() => getCatalogForUnit(currentUnit || "PIPE")}
          size="xl"
        />
      )}

      {showModal === "rig" && (
        <RigModal
          open
          size="xl"
          rigs={RIGS}
          catalogProvider={() => getCatalogForUnit(currentUnit || "PIPE")}
          onClose={() => setShowModal(null)}
          onSubmit={(payload) => { addRigMove(payload); setShowModal(null); }}
        />
      )}
    </div>
  );
}
