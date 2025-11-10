// ============================
// File: src/utils/rigInventory.js
// ============================
import { RIGS } from "../constants/catalog";

const LS_RIG_INV = "rig_inventory_v1";

const norm = (s = "") => String(s).trim();
const rigKey = (name, code, size) =>
  `${norm(name)}|${norm(code)}|${norm(size)}`;

/** تلاش برای مچ‌کردن مقدار با یکی از دکل‌های تعریف‌شده */
const matchRigFromList = (value) => {
  const v = norm(value);
  if (!v) return null;

  for (const r of RIGS) {
    if (typeof r === "string") {
      if (norm(r) === v) return r;
    } else if (r && typeof r === "object") {
      const candidates = [r.id, r.code, r.name]
        .filter(Boolean)
        .map(norm);
      if (candidates.includes(v)) {
        return r.id || r.code || r.name || v;
      }
    }
  }
  return null;
};

export const isRig = (value) => !!matchRigFromList(value);

/** 📦 بارگذاری موجودی دکل‌ها از localStorage */
export const loadRigInv = () => {
  try {
    const raw = localStorage.getItem(LS_RIG_INV);
    return raw ? JSON.parse(raw) : { rigs: {} };
  } catch {
    return { rigs: {} };
  }
};

/** 💾 ذخیره موجودی دکل‌ها در localStorage و اطلاع‌رسانی به صفحه */
export const saveRigInv = (data) => {
  try {
    localStorage.setItem(LS_RIG_INV, JSON.stringify(data));

    // برای sync با RigStock و تب‌های دیگر
    localStorage.setItem("rig_refresh_flag", String(Date.now()));

    // ✅ اطلاع‌رسانی زنده به تمام کامپوننت‌ها در همان تب (React SPA)
    window.dispatchEvent(new Event("rig_inventory_updated"));
  } catch {
    // ignore
  }
};

/** ➕ افزودن تجهیز به موجودی دکل */
export const addToRigInventory = (rig, name, code, size, qty = 1) => {
  const rigId = matchRigFromList(rig);
  if (!rigId) return;

  const boot = loadRigInv();
  const rigs = boot.rigs || {};
  const rMap = rigs[rigId] || {};
  const k = rigKey(name, code, size);
  const prev = Number(rMap[k] || 0) || 0;
  const add = Number(qty || 0) || 0;

  if (add <= 0) {
    rigs[rigId] = rMap;
    saveRigInv({ rigs });
    return;
  }

  rMap[k] = prev + add;
  rigs[rigId] = rMap;
  saveRigInv({ rigs });
};

/** ➖ حذف تجهیز از موجودی دکل */
export const removeFromRigInventory = (rig, name, code, size, qty = 1) => {
  const rigId = matchRigFromList(rig);
  if (!rigId) return;

  const boot = loadRigInv();
  const rigs = boot.rigs || {};
  const rMap = rigs[rigId] || {};
  const k = rigKey(name, code, size);
  const prev = Number(rMap[k] || 0) || 0;
  const sub = Number(qty || 0) || 0;

  if (prev <= 0 || sub <= 0) {
    rigs[rigId] = rMap;
    saveRigInv({ rigs });
    return;
  }

  const next = Math.max(0, prev - sub);
  if (next === 0) {
    delete rMap[k];
  } else {
    rMap[k] = next;
  }
  rigs[rigId] = rMap;
  saveRigInv({ rigs });
};

export { LS_RIG_INV };
