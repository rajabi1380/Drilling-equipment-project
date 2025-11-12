// ============================
// File: src/utils/rigInventory.js
// ============================
import { RIGS } from "../constants/catalog";

export const LS_RIG_INV = "rig_inventory_v1";

// نرمال‌سازی برای مچ‌کردن نام دکل
const norm = (s = "") =>
  String(s)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/دکل/gi, "")
    .replace(/rig/gi, "")
    .replace(/-/g, "")
    .toLowerCase();

const rigKey = (name, code, size) =>
  `${String(name || "").trim()}|${String(code || "").trim()}|${String(size || "").trim()}`;

// تلاش برای پیدا کردن دکل از لیست تعریف‌شده
const matchRigFromList = (value) => {
  const v = norm(value);
  if (!v) return null;
  for (const r of RIGS) {
    if (typeof r === "string") {
      if (norm(r) === v) return r;        // خود رشته
    } else if (r && typeof r === "object") {
      const candidates = [r.id, r.code, r.name].filter(Boolean).map(norm);
      if (candidates.includes(v)) return r.id || r.code || r.name || v; // کلید کاننیکال
    }
  }
  return null;
};

export const isRig = (value) => !!matchRigFromList(value);

// بارگذاری از localStorage
export const loadRigInv = () => {
  try {
    const raw = localStorage.getItem(LS_RIG_INV);
    return raw ? JSON.parse(raw) : { rigs: {} };
  } catch {
    return { rigs: {} };
  }
};

// ذخیره + اعلان برای همگام‌سازی لحظه‌ای
export const saveRigInv = (data) => {
  try {
    localStorage.setItem(LS_RIG_INV, JSON.stringify(data));
    // برای تب‌های دیگر
    localStorage.setItem("rig_refresh_flag", String(Date.now()));
    // برای همین تب (React SPA)
    window.dispatchEvent(new Event("rig_inventory_updated"));
    // console.log("🔥 rigInventory saved & event dispatched", data);
  } catch (err) {
    console.error("❌ Error saving rig inventory:", err);
  }
};

// ➕ افزودن به موجودی دکل
export const addToRigInventory = (rig, name, code, size, qty = 1) => {
  const rigId = matchRigFromList(rig);
  if (!rigId) {
    // console.warn("addToRigInventory: rig not matched:", rig);
    return;
  }
  const inv = loadRigInv();
  const rigs = inv.rigs || {};
  const rMap = { ...(rigs[rigId] || {}) }; // ✅ تایپو اینجا بود
  const k = rigKey(name, code, size);

  const prev = Number(rMap[k] || 0);
  const add = Number(qty || 0);
  if (add <= 0) return;

  rMap[k] = prev + add;
  rigs[rigId] = rMap;
  saveRigInv({ rigs });
};

// ➖ کم‌کردن از موجودی دکل
export const removeFromRigInventory = (rig, name, code, size, qty = 1) => {
  const rigId = matchRigFromList(rig);
  if (!rigId) {
    // console.warn("removeFromRigInventory: rig not matched:", rig);
    return;
  }
  const inv = loadRigInv();
  const rigs = inv.rigs || {};
  const rMap = { ...(rigs[rigId] || {}) }; // ✅ تایپو اینجا هم بود
  const k = rigKey(name, code, size);

  const prev = Number(rMap[k] || 0);
  const sub = Number(qty || 0);
  if (sub <= 0 || prev <= 0) return;

  const next = Math.max(0, prev - sub);
  if (next === 0) delete rMap[k];
  else rMap[k] = next;

  rigs[rigId] = rMap;
  saveRigInv({ rigs });
};
