// ============================
// File: src/utils/turning.js
// Helper for storing work orders (turning / inspection) in localStorage
// ============================

export const LS_TURN = "requests_v1";
export const LS_INSPECTION = "requests_inspection_v1";

const norm = (s = "") => String(s || "").trim();
const ymd = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;

const loadByKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { open: [], archived: [], seq: 1 };
  } catch {
    return { open: [], archived: [], seq: 1 };
  }
};

const saveByKey = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const loadTurning = () => loadByKey(LS_TURN);
export const saveTurning = (data) => saveByKey(LS_TURN, data);
export const loadInspection = () => loadByKey(LS_INSPECTION);
export const saveInspection = (data) => saveByKey(LS_INSPECTION, data);

const appendByKey = ({
  name,
  code,
  size,
  reqType = "WO",
  desc = "",
  startISO = "",
  endISO = "",
  storageKey,
  unit,
  defaultStatus = "",
  status = "",
}) => {
  const boot = loadByKey(storageKey);
  const seq = Number(boot.seq || 1);
  const orderNo = `${(reqType || "WO").toUpperCase()}-${ymd()}-${String(
    seq
  ).padStart(3, "0")}`;

  const rec = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    orderNo,
    name: norm(name),
    code: norm(code),
    size: norm(size),
    unit,
    status: norm(status) || defaultStatus,
    startISO: startISO || new Date().toISOString().slice(0, 16),
    endISO: endISO || "",
    reqType: (reqType || "WO").toUpperCase(),
    desc: desc || "",
  };

  const next = {
    open: [rec, ...(boot.open || [])],
    archived: boot.archived || [],
    seq: seq + 1,
  };

  saveByKey(storageKey, next);
  return rec;
};

export const appendTurningOpen = (props) =>
  appendByKey({
    ...props,
    storageKey: LS_TURN,
    unit: "تراشکاری",
    defaultStatus: "در انتظار تعمیر",
  });

export const appendInspectionOpen = (props) =>
  appendByKey({
    ...props,
    storageKey: LS_INSPECTION,
    unit: "بازرسی",
    defaultStatus: "در انتظار بازرسی",
  });

// وضعیت‌هایی که یعنی کار تمام شده است
export const FINISH_STATES = new Set([
  "done",
  "finish",
  "finished",
  "پایان",
  "پایان‌یافته",
  "تمام",
  "اختتام",
]);
