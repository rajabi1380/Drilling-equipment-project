// ===============================
// File: src/Components/RigStock.js
// ===============================
import React, { useState, useMemo, useEffect } from "react";
import { keyOf, splitKey } from "../utils/Key";
import { loadRigInv, LS_RIG_INV } from "../utils/rigInventory";
import { exportCSV, exportDOC } from "../utils/export";
import { RIGS, getCatalogForUnit } from "../constants/catalog";
import { useAuth } from "./Context/AuthContext";
import "./RigStock.css";

/** 🧩 ساخت جدول از داده‌های rig_inventory_v1 */
function buildRigStockFromRigInv(rigInv) {
  const result = [];
  const rigs = rigInv?.rigs || {};
  Object.entries(rigs).forEach(([rigName, itemsMap]) => {
    if (!itemsMap || typeof itemsMap !== "object") return;
    Object.entries(itemsMap).forEach(([itemKey, qty]) => {
      const count = Number(qty || 0);
      if (count > 0) {
        const { name, code, size } = splitKey(itemKey);
        result.push({ rig: rigName, name, code, size, count });
      }
    });
  });
  result.sort((a, b) => {
    if (a.rig === b.rig) return (a.name || "").localeCompare(b.name || "", "fa");
    return (a.rig || "").localeCompare(b.rig || "", "fa");
  });
  return result;
}

export default function RigStock() {
  const { isAdmin, hasUnit, currentUnit } = useAuth();

  // ✅ فقط ادمین و رئیس (کلیدهای نقش را اگر متفاوت‌اند، همینجا تغییر بده)
  const canSeeAllRigs = isAdmin || hasUnit("MODIR") || hasUnit("RIASAT");

  // ───────── مجوز مشاهده صفحه ─────────
  const canView =
    canSeeAllRigs || // رئیس/ادمین قطعاً می‌بینند
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // ───────── state ها ─────────
  const [rigInv, setRigInv] = useState(() => loadRigInv());
  const [filters, setFilters] = useState({ name: "", code: "", rig: "" });
  const [appliedFilters, setAppliedFilters] = useState({ name: "", code: "", rig: "" });

  // 🔒 لیست تجهیزات مجازِ همین واحد (اگر دسترسی سراسری نداریم)
  const allowedKeys = useMemo(() => {
    if (!canView) return new Set();
    if (canSeeAllRigs) return null; // null یعنی فیلتر واحدی اعمال نشود
    const cat = getCatalogForUnit(currentUnit || "PIPE") || [];
    const set = new Set(
      cat.map((it) => keyOf(it.name, it.code, it.size))
    );
    return set;
  }, [canView, canSeeAllRigs, currentUnit]);

  // ───────── همگام‌سازی با localStorage و رویدادها ─────────
  useEffect(() => {
    const fetchData = () => setRigInv(loadRigInv());
    fetchData();

    const onStorage = (e) => {
      if (e.key === LS_RIG_INV || e.key === "rig_refresh_flag") fetchData();
    };
    const onUpdated = () => fetchData();

    window.addEventListener("storage", onStorage);
    window.addEventListener("rig_inventory_updated", onUpdated);

    const intervalId = setInterval(fetchData, 1500);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rig_inventory_updated", onUpdated);
    };
  }, []);

  // ───────── داده‌ها (با اعمال محدودیت واحد) ─────────
  const allItems = useMemo(() => {
    if (!canView) return [];
    const base = buildRigStockFromRigInv(rigInv);
    if (!allowedKeys) return base; // null => کاربر دارای دسترسی سراسری است
    // فقط تجهیزاتی که در کاتالوگ واحد فعلی هستند نمایش داده می‌شوند
    return base.filter((it) => allowedKeys.has(keyOf(it.name, it.code, it.size)));
  }, [rigInv, canView, allowedKeys]);

  // ───────── فیلتر UI (نام/کد/دکل) ─────────
  const filtered = useMemo(() => {
    if (!canView) return [];
    const f = appliedFilters;
    return allItems.filter((item) => {
      const byName = f.name
        ? String(item.name || "").toLowerCase().includes(f.name.toLowerCase())
        : true;
      const byCode = f.code
        ? String(item.code || "").toLowerCase().includes(f.code.toLowerCase())
        : true;
      const byRig = f.rig ? item.rig === f.rig : true;
      return byName && byCode && byRig;
    });
  }, [allItems, appliedFilters, canView]);

  // ───────── کنترل فیلتر ─────────
  const applyFilters = () => setAppliedFilters(filters);
  const clearFilters = () => {
    const empty = { name: "", code: "", rig: "" };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  // ───────── گزینه‌های دکل ─────────
  const rigOptions = useMemo(
    () =>
      RIGS.map((r) =>
        typeof r === "string"
          ? { value: r, label: r }
          : {
              value: r.id || r.code || r.name,
              label: r.name || r.id || r.code,
            }
      ),
    []
  );

  // ───────── دسترسی ─────────
  if (!canView) {
    return (
      <div className="rig-stock-page" dir="rtl">
        <h2>📦 موجودی دکل‌ها</h2>
        <div style={{ padding: 16, color: "#b00" }}>
          ❌ شما مجاز به مشاهده موجودی دکل‌ها نیستید.
        </div>
      </div>
    );
  }

  // ───────── جدول ─────────
  return (
    <div className="rig-stock-page" dir="rtl">
      <h2>📦 موجودی دکل‌ها</h2>

      {/* فیلترها و خروجی‌ها */}
      <div
        className="filter-bar"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <input
          className="input"
          placeholder="نام تجهیز"
          value={filters.name}
          onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
        />
        <input
          className="input"
          placeholder="کد تجهیز"
          value={filters.code}
          onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
        />
        <select
          className="input"
          value={filters.rig}
          onChange={(e) => setFilters((f) => ({ ...f, rig: e.target.value }))}
        >
          <option value="">همه دکل‌ها</option>
          {rigOptions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <button className="btn primary" onClick={applyFilters}>
          اعمال فیلتر
        </button>
        <button className="btn" onClick={clearFilters}>
          حذف فیلتر
        </button>
        <button
          className="btn success"
          onClick={() => {
            if (!filtered.length) return;
            const headers = ["دکل", "نام تجهیز", "کد", "سایز", "تعداد"];
            const rows = filtered.map((r) => ({
              دکل: r.rig,
              "نام تجهیز": r.name,
              کد: r.code,
              سایز: r.size,
              تعداد: r.count,
            }));
            exportCSV(`RigStock-${Date.now()}.csv`, headers, rows);
          }}
        >
          📤 خروجی Excel
        </button>
        <button
          className="btn info"
          onClick={() => {
            if (!filtered.length) return;
            const headers = ["دکل", "نام تجهیز", "کد", "سایز", "تعداد"];
            const rows = filtered.map((r) => ({
              دکل: r.rig,
              "نام تجهیز": r.name,
              کد: r.code,
              سایز: r.size,
              تعداد: r.count,
            }));
            exportDOC(`RigStock-${Date.now()}.doc`, "موجودی دکل‌ها", headers, rows);
          }}
        >
          📝 خروجی Word
        </button>
      </div>

      {/* جدول داده‌ها */}
      <table className="stock-table">
        <thead>
          <tr>
            <th>دکل</th>
            <th>نام تجهیز</th>
            <th>کد</th>
            <th>سایز</th>
            <th>تعداد</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length ? (
            filtered.map((r, i) => (
              <tr key={`${r.rig}-${r.code}-${r.size}-${i}`}>
                <td>{r.rig}</td>
                <td>{r.name}</td>
                <td>{r.code}</td>
                <td>{r.size}</td>
                <td>{r.count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="empty">
                موردی یافت نشد
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
