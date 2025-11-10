// ===============================
// File: src/Components/RigStock.js
// ===============================
import React, { useState, useMemo, useEffect } from "react";
import { splitKey } from "../utils/Key";
import { loadRigInv, LS_RIG_INV } from "../utils/Riginventory";
import { exportCSV, exportDOC } from "../utils/export";
import { RIGS } from "../constants/catalog";
import { useAuth } from "./Context/AuthContext";
import "./RigStock.css";

/** ساخت جدول از داده‌های rig_inventory_v1 */
function buildRigStockFromRigInv(rigInv) {
  const result = [];
  const rigs = rigInv?.rigs || {};

  Object.entries(rigs).forEach(([rigName, itemsMap]) => {
    if (!itemsMap || typeof itemsMap !== "object") return;

    Object.entries(itemsMap).forEach(([itemKey, qty]) => {
      const count = Number(qty || 0);
      if (count > 0) {
        const { name, code, size } = splitKey(itemKey);
        result.push({
          rig: rigName,
          name,
          code,
          size,
          count,
        });
      }
    });
  });

  // مرتب‌سازی بر اساس نام دکل و تجهیز
  result.sort((a, b) => {
    if (a.rig === b.rig) {
      return (a.name || "").localeCompare(b.name || "", "fa");
    }
    return (a.rig || "").localeCompare(b.rig || "", "fa");
  });

  return result;
}

export default function RigStock() {
  const { isAdmin, hasUnit } = useAuth();

  // ───────── state ها ─────────
  const [rigInv, setRigInv] = useState(() => loadRigInv());
  const [filters, setFilters] = useState({ name: "", code: "", rig: "" });
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    code: "",
    rig: "",
  });

  // ───────── مجوز مشاهده ─────────
  const canView =
    isAdmin ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // ───────── همگام‌سازی با localStorage ─────────
  useEffect(() => {
    if (!canView) return;

    const fetchData = () => setRigInv(loadRigInv());
    fetchData();

    const onStorage = (e) => {
      if (e.key === LS_RIG_INV || e.key === "rig_refresh_flag") {
        fetchData();
      }
    };

    window.addEventListener("storage", onStorage);

    // 🔄 همگام‌سازی خودکار هر 1.5 ثانیه
    const intervalId = setInterval(() => {
      const latest = loadRigInv();
      setRigInv((prev) =>
        JSON.stringify(prev) === JSON.stringify(latest) ? prev : latest
      );
    }, 1500);

    // 🧹 پاک‌سازی هنگام خروج از صفحه
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("storage", onStorage);
      setRigInv({ rigs: {} });
    };
  }, [canView]);

  // ───────── همه اقلام ─────────
  const allItems = useMemo(
    () => (canView ? buildRigStockFromRigInv(rigInv) : []),
    [rigInv, canView]
  );

  // ───────── فیلترها ─────────
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

  // ───────── کنترل فیلترها ─────────
  const applyFilters = () => setAppliedFilters(filters);
  const clearFilters = () => {
    const empty = { name: "", code: "", rig: "" };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  // ───────── خروجی‌ها ─────────
  const handleExportCSV = () => {
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
  };

  const handleExportWord = () => {
    if (!filtered.length) return;
    const rows = filtered.map((r) => ({
      دکل: r.rig,
      "نام تجهیز": r.name,
      کد: r.code,
      سایز: r.size,
      تعداد: r.count,
    }));
    exportDOC(
      `RigStock-${Date.now()}.doc`,
      "موجودی دکل‌ها",
      ["دکل", "نام تجهیز", "کد", "سایز", "تعداد"],
      rows
    );
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

  // ───────── نمایش پیام دسترسی ─────────
  if (!canView) {
    return (
      <div className="rig-stock-page" dir="rtl">
        <h2>📦 موجودی دکل‌ها</h2>
        <div style={{ padding: 16, color: "#b00" }}>
          ❌ شما مجاز به مشاهده موجودی دکل‌ها نیستید.
          <br />
          این بخش فقط برای واحدهای درون‌چاهی، برون‌چاهی، مانده‌یابی، تعمیرات و
          نگهداری لوله و مدیر سیستم فعال است.
        </div>
      </div>
    );
  }

  // ───────── جدول اصلی ─────────
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
        <button className="btn success" onClick={handleExportCSV}>
          📤 خروجی Excel
        </button>
        <button className="btn info" onClick={handleExportWord}>
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
