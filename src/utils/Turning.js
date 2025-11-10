// ============================
// File: src/utils/turning.js
// ============================

const LS_TURN = "requests_v1";

const norm = (s = "") => String(s).trim();
const ymd = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const loadTurning = () => {
  try {
    const raw = localStorage.getItem(LS_TURN);
    return raw ? JSON.parse(raw) : { open: [], archived: [], seq: 1 };
  } catch {
    return { open: [], archived: [], seq: 1 };
  }
};

export const saveTurning = (data) => {
  try {
    localStorage.setItem(LS_TURN, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const appendTurningOpen = ({
  name,
  code,
  size,
  reqType = "WO",
  desc = "",
  startISO = "",
  endISO = "",
}) => {
  const boot = loadTurning();
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
    unit: "تراشکاری",
    status: "در انتظار تعمیر",
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

  saveTurning(next);
  return rec;
};

// وضعیت‌هایی که یعنی کار تراشکاری تمام شده
export const FINISH_STATES = new Set([
  "done",
  "پایان",
  "پایان‌یافته",
  "تمام",
  "finish",
  "finished",
]);

export { LS_TURN };
