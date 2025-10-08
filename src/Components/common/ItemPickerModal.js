// src/Components/common/ItemPickerModal.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export default function ItemPickerModal({
  open,
  onClose,
  catalog = [],
  onPick,
  title = "انتخاب از لیست تجهیزات",
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const onKey = useCallback((e) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose?.(); }
    else if (e.key === "Enter" && filtered.length) { e.preventDefault(); onPick?.(filtered[0]); }
  }, [onClose, onPick]); // filtered عمداً وارد نشده که با هر تایپ rebind نشود

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onKey]);

  const rows = Array.isArray(catalog) ? catalog : [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 300);
    return rows
      .filter((it) => {
        const n = (it?.name || "").toLowerCase();
        const c = (it?.code || "").toLowerCase();
        const sz = Array.isArray(it?.sizes) ? it.sizes.join(" ").toLowerCase() : (it?.size || "").toLowerCase();
        return n.includes(s) || c.includes(s) || sz.includes(s);
      })
      .slice(0, 300);
  }, [rows, q]);

  if (!open) return null;

  const body = (
    <div className="ipm-backdrop" onClick={onClose}>
      <div className="ipm-modal" dir="rtl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="ipm-header">
          <div className="ipm-title">{title}</div>
          <button className="ipm-close" onClick={onClose} aria-label="بستن">✕</button>
        </header>

        <div className="ipm-body">
          <input
            className="ipm-search"
            placeholder="...جستجو بر اساس نام/کد/سایز"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />

          <div className="ipm-tablewrap">
            <table className="ipm-table">
              <thead>
                <tr>
                  <th>نام تجهیز</th>
                  <th>کد</th>
                  <th>سایز</th>
                  <th style={{ width: 110 }} /> {/* دکمه انتخاب آخرِ ردیف */}
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((it, idx) => {
                    const size0 = Array.isArray(it?.sizes) ? (it.sizes[0] || "") : (it?.size || "");
                    return (
                      <tr key={`${it.code || it.name || "row"}-${idx}`}>
                        <td>{it?.name || "—"}</td>
                        <td>{it?.code || "—"}</td>
                        <td>{size0 || "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="ipm-pick"
                            onClick={() => onPick?.(it)}
                          >
                            انتخاب
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="empty">موردی یافت نشد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="ipm-footer">
          <button className="btn" onClick={onClose}>بستن</button>
        </footer>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
