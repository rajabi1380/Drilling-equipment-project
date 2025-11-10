// src/Components/InOut.js
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import "./Inout.css";
import { loadLS, saveLS } from "../utils/ls";
import { toISO16 } from "../utils/date";
import { getCatalogForUnit, RIGS } from "../constants/catalog";
import { exportCSV, exportDOC } from "../utils/export";
import { keyOf, splitKey } from "../utils/Key";
import {
  isRig,
  addToRigInventory,
  removeFromRigInventory,
} from "../utils/Riginventory";
import {
  loadTurning,
  appendTurningOpen,
  FINISH_STATES,
  LS_TURN,
} from "../utils/Turning";
import InModal from "./Modals/InModal";
import OutModal from "./Modals/OutModal";
import RigModal from "./Modals/RigModal";
import { useAuth } from "./Context/AuthContext";
import { useNotify } from "../utils/notify"; // ✅ استفاده از هوک نوتیف

const LS_INV = "inventory_v1";
const LS_WO = "workorders_v1";
const LS_RM = "rig_moves_v1";
const LS_REPORT = "reports_v1";

const MIN_THRESHOLD = 10;
const PAGE_SIZE = 10;

/* ---------- Helpers ---------- */
const norm = (s = "") => String(s).trim();
const statusMap = (raw = "") => {
  const s = norm(raw);
  if (["بازرسی شده", "سالم", "قبول بازرسی"].includes(s)) return "inspected";
  if (["تعمیر شده", "تعمیر"].includes(s)) return "repaired";
  return "other";
};
const ymd = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;

/* ---------- ساخت موجودی از لاگ I/O (با qty) ---------- */
const buildStockBuckets = (ioRows) => {
  const sorted = [...ioRows].sort((a, b) => {
    const ta = a.enterAtISO || a.exitAtISO || "";
    const tb = b.enterAtISO || b.exitAtISO || "";
    return ta.localeCompare(tb);
  });

  const map = new Map();
  const ensure = (k) => {
    if (!map.has(k))
      map.set(k, {
        inspected: 0,
        repaired: 0,
        other: 0,
        total: 0,
      });
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

  return Array.from(map.entries()).map(([k, v]) => ({
    ...v,
    ...splitKey(k),
  }));
};

/* ---------- گزارش مشترک ---------- */
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
  Unit: reportUnit || "", // برای فیلتر گزارشات براساس واحد
});

/* ---------- سایر ---------- */
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
  return {
    slice: arr.slice(start, start + pageSize),
    page: p,
    pages,
    total,
  };
};

/* ========================
   Component: InOut Page
   ======================== */
export default function InOut() {
  const { isAdmin, currentUnit, hasUnit } = useAuth();

  const isSuper = !!isAdmin;
  const unitFallback = currentUnit || "PIPE";

  // چه واحدهایی اجازه دیدن این صفحه را دارند
  const canInOut =
    isSuper ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("PIPE") ||
    hasUnit("MANDEYABI");

  /* --- دیتای خام از localStorage --- */
  const [ioRows, setIoRows] = useState(() => {
    const boot = loadLS(LS_INV, { ioRows: [] });
    return boot.ioRows || [];
  });

  const [openWOs, setOpenWOs] = useState(() => {
    const wboot = loadLS(LS_WO, { open: [], closed: [] });
    return wboot.open || [];
  });

  const [closedWOs, setClosedWOs] = useState(() => {
    const wboot = loadLS(LS_WO, { open: [], closed: [] });
    return wboot.closed || [];
  });

  const [rigMoves, setRigMoves] = useState(() => {
    const rmBoot = loadLS(LS_RM, { moves: [] });
    return rmBoot.moves || [];
  });

  /* --- UI state --- */
  const [showModal, setShowModal] = useState(null); // "in" | "out" | "rig"
  const [panel, setPanel] = useState("stock"); // 'stock' | 'requests'
  const [stockFilter, setStockFilter] = useState("all");
  const [reqUnitFilter, setReqUnitFilter] = useState(null);
  const [reqFilters, setReqFilters] = useState({
    name: "",
    code: "",
    destUnit: "",
    wo: "",
  });
  const [reqFiltersApplied, setReqFiltersApplied] = useState({
    name: "",
    code: "",
    destUnit: "",
    wo: "",
  });
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const reqListRef = useRef(null);
  const stockTableRef = useRef(null);

  /* --- نوتیف مشترک (عمومی + هشدار کمبود) --- */
  const { notify, show, checkLowStock } = useNotify(3800);

  /* --- persist --- */
  useEffect(() => {
    saveLS(LS_INV, { ioRows });
  }, [ioRows]);

  useEffect(() => {
    saveLS(LS_WO, { open: openWOs, closed: closedWOs });
  }, [openWOs, closedWOs]);

  useEffect(() => {
    saveLS(LS_RM, { moves: rigMoves });
  }, [rigMoves]);

  /* ---------- اسکوپ داده‌ها براساس واحد ---------- */
  const scopedIoRows = useMemo(() => {
    if (isSuper || !currentUnit) return ioRows;
    return ioRows.filter((r) => (r.unit || "PIPE") === currentUnit);
  }, [ioRows, isSuper, currentUnit]);

  const scopedOpenWOs = useMemo(() => {
    if (isSuper || !currentUnit) return openWOs;
    return openWOs.filter(
      (r) => (r.unit || r.destUnit || "PIPE") === currentUnit
    );
  }, [openWOs, isSuper, currentUnit]);

  const scopedClosedWOs = useMemo(() => {
    if (isSuper || !currentUnit) return closedWOs;
    return closedWOs.filter(
      (r) => (r.unit || r.destUnit || "PIPE") === currentUnit
    );
  }, [closedWOs, isSuper, currentUnit]);

  /* ---------- موجودی از scopedIoRows ---------- */
  const items = useMemo(
    () => buildStockBuckets(scopedIoRows),
    [scopedIoRows]
  );

  const totals = useMemo(
    () => ({
      total: items.reduce((s, x) => s + x.total, 0),
      inspected: items.reduce((s, x) => s + x.inspected, 0),
      repaired: items.reduce((s, x) => s + x.repaired, 0),
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (stockFilter === "inspected")
      return items.filter((x) => x.inspected > 0);
    if (stockFilter === "repaired")
      return items.filter((x) => x.repaired > 0);
    return items;
  }, [items, stockFilter]);

  const currentStockOf = useCallback(
    (name, code, size) => {
      const rec = items.find(
        (x) =>
          x.name === norm(name) &&
          x.code === norm(code) &&
          x.size === norm(size)
      );
      return rec ? rec.total : 0;
    },
    [items]
  );

  /* ---------- نوتیف کمبود موجودی تجمیعی ---------- */
useEffect(() => {
  checkLowStock(items, MIN_THRESHOLD);
}, [items, checkLowStock]);
;


  /* ---------- IN ---------- */
  const addIn = useCallback(
    (p) => {
      const unit = isSuper ? (p.unit || unitFallback) : unitFallback;
      const enterISO =
        toISO16(p.enterDateObj) || new Date().toISOString().slice(0, 16);
      const qty = Number(p.count || p.qty || 1) || 1;
      const id = Date.now();

      const row = {
        id,
        type: "in",
        unit,
        name: norm(p.name),
        code: norm(p.code),
        size: norm(p.size),
        status: norm(p.status || "بازرسی شده"),
        enterAtISO: enterISO,
        note: p.note || "",
        fromWhere: p.fromWhere || "",
        qty,
      };

      const next = [row, ...ioRows];
      setIoRows(next);

      const fromNorm = norm(p.fromWhere || "");
      if (isRig(fromNorm)) {
        removeFromRigInventory(fromNorm, p.name, p.code, p.size, qty);
      }

      const reportRow = makeEquipmentReportRow({
        id,
        name: row.name,
        code: row.code,
        size: row.size,
        type: "ورود",
        datetimeISO: enterISO,
        sourceUnit: fromNorm,
        destUnit: unit,
        condition: row.status,
        bandgiri: "",
        note: row.note,
        recordedAtISO: enterISO,
        reportUnit: unit,
      });
      appendReportRows([reportRow]);

      show("✅ تجهیز با موفقیت وارد شد", "success");
    },
    [ioRows, show, isSuper, unitFallback]
  );

  /* ---------- WO از خروج به تراشکاری ---------- */
  const createWOFromOut = useCallback(
    (payload, unit) => {
      const type = (payload.reqType || "WO").toUpperCase();
      const woNumber = makeWONumber(type);
      const wo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        woNumber,
        type,
        unit,
        name: norm(payload.name),
        code: norm(payload.code),
        size: norm(payload.size),
        destUnit: payload.dest || "تراشکاری",
        startDate:
          payload.faultReqDate ||
          (payload.exitDateObj
            ? new Date(payload.exitDateObj).toISOString().slice(0, 10)
            : ""),
        endDate: payload.repairEndDate || "",
        desc: payload.note || "",
        faultCode: payload.faultCode || "",
        faultCause: payload.faultCause || "",
        statusSnapshot: norm(payload.status || "—"),
        createdAt: new Date().toISOString(),
      };
      setOpenWOs((s) => [wo, ...s]);

      appendTurningOpen({
        name: payload.name,
        code: payload.code,
        size: payload.size,
        reqType: type,
        desc: payload.note || "",
      });

      show(
        `📝 درخواست (${wo.woNumber}) ثبت شد و به پنل تراشکاری ارسال گردید`,
        "success"
      );
      setReqUnitFilter("تراشکاری");
      setPanel("requests");
      setOpenPage(1);
    },
    [show]
  );

  /* ---------- OUT ---------- */
  const addOut = useCallback(
    (p) => {
      const unit = isSuper ? (p.unit || unitFallback) : unitFallback;
      const qty = Number(p.count || p.qty || 1) || 1;
      const stockNow = currentStockOf(p.name, p.code, p.size);

      if (stockNow < qty) {
        show(
          `❌ موجودی کافی نیست. موجودی فعلی: ${stockNow} ، مقدار درخواستی: ${qty}`,
          "warn"
        );
        return;
      }

      const exitISO =
        toISO16(p.exitDateObj) || new Date().toISOString().slice(0, 16);
      const id = Date.now();
      const destNorm = norm(p.dest || "");

      const row = {
        id,
        type: "out",
        unit,
        name: norm(p.name),
        code: norm(p.code),
        size: norm(p.size),
        status: norm(p.status || ""),
        dest: destNorm,
        exitAtISO: exitISO,
        note: p.note || "",
        qty,
      };

      const next = [row, ...ioRows];
      setIoRows(next);

      if (isRig(destNorm)) {
        addToRigInventory(destNorm, p.name, p.code, p.size, qty);
      }

      const reportRow = makeEquipmentReportRow({
        id,
        name: row.name,
        code: row.code,
        size: row.size,
        type: "خروج",
        datetimeISO: exitISO,
        sourceUnit: unit,
        destUnit: destNorm,
        condition: row.status,
        bandgiri: norm(p.isBandgiri || ""),
        note: row.note,
        recordedAtISO: exitISO,
        reportUnit: unit,
      });
      appendReportRows([reportRow]);

      show("📤 خروج تجهیز ثبت شد", "info");

      if (destNorm === "تراشکاری") createWOFromOut(p, unit);
    },
    [
      ioRows,
      show,
      currentStockOf,
      createWOFromOut,
      isSuper,
      unitFallback,
    ]
  );

  /* ---------- RIG ↔ RIG ---------- */
  const addRigMove = useCallback(
    (payload) => {
      const unit = isSuper ? payload.unit || unitFallback : unitFallback;

      const rec = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        unit,
        ...payload,
        createdAt: new Date().toISOString(),
      };
      setRigMoves((prev) => [rec, ...prev]);

      const itemsArr =
        Array.isArray(payload.items) && payload.items.length
          ? payload.items
          : [];

      itemsArr.forEach((it) => {
        const q = Number(it.qty || 1) || 1;
        if (isRig(payload.fromRig)) {
          removeFromRigInventory(
            payload.fromRig,
            it.name,
            it.code,
            it.size,
            q
          );
        }
        if (isRig(payload.toRig)) {
          addToRigInventory(
            payload.toRig,
            it.name,
            it.code,
            it.size,
            q
          );
        }
      });

      const rows = [];
      itemsArr.forEach((it) => {
        const q = Number(it.qty || 1) || 1;
        for (let i = 0; i < q; i += 1) {
          rows.push(
            makeEquipmentReportRow({
              id: `${rec.id}-${it.code || "ITEM"}-${i + 1}`,
              name: norm(it.name || ""),
              code: norm(it.code || ""),
              size: norm(it.size || ""),
              type: "جابجایی",
              datetimeISO:
                payload.requestAtISO ||
                new Date().toISOString().slice(0, 16),
              sourceUnit: norm(payload.fromRig || ""),
              destUnit: norm(payload.toRig || ""),
              condition: "",
              bandgiri: "",
              note: payload.note || "",
              recordedAtISO: rec.createdAt,
              reportUnit: unit,
            })
          );
        }
      });
      if (rows.length) appendReportRows(rows);

      show("🚚 جابه‌جایی دکل ثبت شد", "success");
    },
    [show, isSuper, unitFallback]
  );

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
        if (FINISH_STATES.has(st)) {
          const k = keyOf(r.name, r.code, r.size);
          closedByNCS.set(k, r);
        }
      });
    };
    addNCS(Array.isArray(turn.archived) ? turn.archived : []);
    addNCS(Array.isArray(turn.open) ? turn.open : []);

    if (closedByOrderNo.size === 0 && closedByNCS.size === 0) return;

    setOpenWOs((prevOpen) => {
      const stillOpen = [];
      const toArchive = [];

      for (const wo of prevOpen) {
        const byOrder =
          wo.woNumber && closedByOrderNo.has(wo.woNumber);
        const byNCS = closedByNCS.get(
          keyOf(wo.name, wo.code, wo.size)
        );

        if (byOrder || byNCS) {
          const tr = byOrder
            ? closedSnapshots.get(wo.woNumber)
            : byNCS;
          const merged = {
            ...wo,
            endDate: tr?.endISO || wo.endDate || "",
            statusSnapshot: tr?.status
              ? `پایان‌یافته (تراشکاری: ${tr.status})`
              : "پایان‌یافته (تراشکاری)",
            desc: wo.desc || tr?.desc || "",
            turningSnapshot: {
              orderNo: tr?.orderNo || "",
              status: tr?.status || "",
              startISO: tr?.startISO || "",
              endISO: tr?.endISO || "",
              name: tr?.name || "",
              code: tr?.code || "",
              size: tr?.size || "",
              desc: tr?.desc || "",
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
            ...toArchive
              .filter((x) => !seen.has(x.woNumber))
              .map((x) => ({
                ...x,
                closedAt: nowISO,
              })),
          ];
        });
      }

      return stillOpen;
    });
  }, []);

  useEffect(() => {
    syncTurningToWOs();
    const intId = window.setInterval(syncTurningToWOs, 2000);
    const onStorage = (e) => {
      if (e.key === LS_TURN) syncTurningToWOs();
    };
    const onFocus = () => syncTurningToWOs();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncTurningToWOs]);

  /* ---------- فیلترهای Requests ---------- */
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
        const okWO = w
          ? (r.woNumber || "").toLowerCase().includes(w)
          : true;

        return okUnit && okName && okCode && okDest && okWO;
      }),
    [reqUnitFilter, reqFiltersApplied]
  );

  const openFilteredAll = useMemo(
    () => filterWO(scopedOpenWOs),
    [scopedOpenWOs, filterWO]
  );
  const closedFilteredAll = useMemo(
    () => filterWO(scopedClosedWOs),
    [scopedClosedWOs, filterWO]
  );

  useEffect(() => {
    setOpenPage(1);
    setClosedPage(1);
  }, [panel, reqUnitFilter, reqFiltersApplied]);

  useEffect(() => {
    if (panel === "requests" && reqListRef.current) {
      const t = window.setTimeout(() => {
        reqListRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [panel]);

  const openPaged = useMemo(
    () => paginate(openFilteredAll, openPage, PAGE_SIZE),
    [openFilteredAll, openPage]
  );
  const closedPaged = useMemo(
    () => paginate(closedFilteredAll, closedPage, PAGE_SIZE),
    [closedFilteredAll, closedPage]
  );

  const Pager = ({ page, pages, onPrev, onNext, onGo }) => (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "8px 0",
      }}
    >
      <button
        type="button"
        className="btn"
        onClick={onPrev}
        disabled={page <= 1}
      >
        ‹ قبلی
      </button>
      {Array.from({ length: pages }).map((_, i) => {
        const p = i + 1;
        return (
          <button
            type="button"
            key={p}
            className={`btn ${p === page ? "primary" : ""}`}
            onClick={() => onGo(p)}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        className="btn"
        onClick={onNext}
        disabled={page >= pages}
      >
        بعدی ›
      </button>
    </div>
  );

  const isStock = panel === "stock";
  const isReq = panel === "requests";

  /* ---------- Export helpers ---------- */
  const openHeaders = useMemo(
    () => [
      "شماره دستور کار",
      "نام تجهیز",
      "کد",
      "سایز",
      "واحد مقصد",
      "نوع درخواست",
      "وضعیت",
      "تاریخ شروع",
      "تاریخ پایان",
      "توضیحات",
    ],
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
        وضعیت: r.statusSnapshot || "—",
        "تاریخ شروع": r.startDate || "—",
        "تاریخ پایان": r.endDate || "—",
        توضیحات: r.desc || "—",
      })),
    [openFilteredAll]
  );

  const closedHeaders = useMemo(
    () => [
      "شماره دستور کار",
      "نام تجهیز",
      "کد",
      "سایز",
      "نوع درخواست",
      "وضعیت",
      "تاریخ شروع",
      "تاریخ پایان",
      "تاریخ بایگانی",
    ],
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
        وضعیت: r.statusSnapshot || "—",
        "تاریخ شروع": r.startDate || "—",
        "تاریخ پایان": r.endDate || "—",
        "تاریخ بایگانی": (r.closedAt || "").slice(0, 10),
      })),
    [closedFilteredAll]
  );

  /* ---------- اگر دسترسی ندارد ---------- */
  if (!canInOut) {
    return (
      <div className="io-page" dir="rtl">
        <div className="io-card">
          <h2>رسید و ارسال</h2>
          <div className="notify error">
            ❌ شما مجاز به دسترسی به این بخش نیستید.
          </div>
        </div>
      </div>
    );
  }

  /* ---------- UI اصلی ---------- */
  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {notify && (
          <div className={`notify ${notify.type}`}>
            {notify.msg}
          </div>
        )}

        {/* Toolbar */}
        <div
          className="table-toolbar"
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn success"
              onClick={() => setShowModal("in")}
            >
              ورود
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => setShowModal("out")}
            >
              خروج
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setShowModal("rig")}
            >
              دکل به دکل
            </button>
          </div>

          <div
            style={{
              marginInlineStart: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={`btn ${
                isStock && stockFilter === "all" ? "primary" : ""
              }`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("all");
                stockTableRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              📦 موجود کل ({totals.total})
            </button>

            <button
              type="button"
              className={`btn ${
                isStock && stockFilter === "inspected"
                  ? "primary"
                  : ""
              }`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("inspected");
                stockTableRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              ✅ بازرسی شده ({totals.inspected})
            </button>

            <button
              type="button"
              className={`btn ${
                isStock && stockFilter === "repaired"
                  ? "primary"
                  : ""
              }`}
              onClick={() => {
                setPanel("stock");
                setStockFilter("repaired");
                stockTableRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              🧰 تعمیر شده ({totals.repaired})
            </button>

            <button
              type="button"
              className={`btn ${isReq ? "primary" : ""}`}
              onClick={() => {
                setPanel("requests");
              }}
            >
              📋 نمایش درخواست‌ها
            </button>
          </div>
        </div>

        {/* Stock table */}
        <div
          className="table-wrap"
          ref={stockTableRef}
          style={{ display: isStock ? "block" : "none" }}
        >
          <table>
            <thead>
              <tr>
                <th>#</th>
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
                filteredItems.map((it, idx) => (
                  <tr key={keyOf(it.name, it.code, it.size)}>
                    <td>{idx + 1}</td>
                    <td>{it.name}</td>
                    <td>{it.code}</td>
                    <td>{it.size}</td>
                    <td
                      className={
                        it.total < MIN_THRESHOLD ? "low" : ""
                      }
                    >
                      {it.total}
                    </td>
                    <td>{it.inspected}</td>
                    <td>{it.repaired}</td>
                    <td>{it.other}</td>
                    <td>{MIN_THRESHOLD}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty">
                    موردی مطابق فیلتر نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Requests panel */}
        {isReq && (
          <div className="lathe-list" ref={reqListRef}>
            {reqUnitFilter && (
              <div
                className="notify info"
                style={{ marginBottom: 8 }}
              >
                فیلتر واحد مقصد: {reqUnitFilter}
              </div>
            )}

            {/* فیلترها */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, minmax(0,1fr)) auto auto",
                gap: 8,
                alignItems: "center",
                margin: "6px 0 10px",
              }}
            >
              <input
                className="input"
                placeholder="نام تجهیز"
                value={reqFilters.name}
                onChange={(e) =>
                  setReqFilters((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
              />
              <input
                className="input"
                placeholder="کد تجهیز"
                value={reqFilters.code}
                onChange={(e) =>
                  setReqFilters((f) => ({
                    ...f,
                    code: e.target.value,
                  }))
                }
              />
              <input
                className="input"
                placeholder="واحد مقصد"
                value={reqFilters.destUnit}
                onChange={(e) =>
                  setReqFilters((f) => ({
                    ...f,
                    destUnit: e.target.value,
                  }))
                }
              />
              <input
                className="input"
                placeholder="شماره دستور کار"
                value={reqFilters.wo}
                onChange={(e) =>
                  setReqFilters((f) => ({
                    ...f,
                    wo: e.target.value,
                  }))
                }
              />
              <div />
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setReqFiltersApplied(reqFilters)
                }
              >
                اعمال فیلتر
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const empty = {
                    name: "",
                    code: "",
                    destUnit: "",
                    wo: "",
                  };
                  setReqFilters(empty);
                  setReqFiltersApplied(empty);
                  setReqUnitFilter(null);
                }}
              >
                حذف فیلتر
              </button>
            </div>

            {/* open WOs */}
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

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportCSV(
                    `درخواست‌های-باز-${ymd()}.csv`,
                    openHeaders,
                    openRows
                  )
                }
              >
                خروجی Excel (CSV)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportDOC(
                    `درخواست‌های-باز-${ymd()}.doc`,
                    "درخواست‌های باز",
                    openHeaders,
                    openRows
                  )
                }
              >
                خروجی Word
              </button>
            </div>

            <Pager
              page={openPaged.page}
              pages={openPaged.pages}
              onPrev={() =>
                setOpenPage((p) => Math.max(1, p - 1))
              }
              onNext={() =>
                setOpenPage((p) =>
                  Math.min(openPaged.pages, p + 1)
                )
              }
              onGo={(p) => setOpenPage(p)}
            />

            {/* closed WOs */}
            <h4 style={{ marginTop: 16 }}>
              📦 دستورکارهای بایگانی‌شده (
              {closedFilteredAll.length})
            </h4>
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

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportCSV(
                    `دستورکار-بایگانی-${ymd()}.csv`,
                    closedHeaders,
                    closedRows
                  )
                }
              >
                خروجی Excel (CSV)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  exportDOC(
                    `دستورکار-بایگانی-${ymd()}.doc`,
                    "دستورکارهای بایگانی‌شده",
                    closedHeaders,
                    closedRows
                  )
                }
              >
                خروجی Word
              </button>
            </div>

            <Pager
              page={closedPaged.page}
              pages={closedPaged.pages}
              onPrev={() =>
                setClosedPage((p) => Math.max(1, p - 1))
              }
              onNext={() =>
                setClosedPage((p) =>
                  Math.min(closedPaged.pages, p + 1)
                )
              }
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
          catalogProvider={() =>
            getCatalogForUnit(currentUnit || "PIPE")
          }
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
          catalogProvider={() =>
            getCatalogForUnit(currentUnit || "PIPE")
          }
          size="xl"
        />
      )}

      {showModal === "rig" && (
        <RigModal
          open
          size="xl"
          rigs={RIGS}
          catalogProvider={() =>
            getCatalogForUnit(currentUnit || "PIPE")
          }
          onClose={() => setShowModal(null)}
          onSubmit={(payload) => {
            addRigMove(payload);
            setShowModal(null);
          }}
        />
      )}
    </div>
  );
}
