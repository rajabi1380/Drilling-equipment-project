import React, { useMemo, useState } from "react";

export default function ItemPickerModal({
  open,
  onClose,
  catalog = [],
  onPick,
  title = "انتخاب تجهیز",
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);

  const filtered = useMemo(() => {
    const t = (q || "").toLowerCase();
    return catalog.filter(
      (x) =>
        (x.name || "").toLowerCase().includes(t) ||
        (x.code || "").toLowerCase().includes(t) ||
        // اگر سایز هم قابل جستجو بود
        (Array.isArray(x.sizes) && x.sizes.join(" / ").toLowerCase().includes(t)) ||
        (x.size || "").toLowerCase().includes(t)
    );
  }, [catalog, q]);

  if (!open) return null;

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--small" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>{title}</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="picker">
          <input
            className="input"
            placeholder="جستجو بر اساس نام، کد یا سایز..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="picker-list">
            {filtered.length ? (
              filtered.map((it, i) => {
                const isChecked = sel?.code === it.code && sel?.name === it.name;
                const sizeText = Array.isArray(it.sizes) ? it.sizes.join(" / ") : (it.size || "");
                return (
                  <label key={i} className="picker-row">
                    <input
                      type="radio"
                      name="equip"
                      checked={isChecked}
                      onChange={() => setSel(it)}
                    />
                    <span className="picker-name">{it.name}</span>
                    <span className="picker-code">{it.code}</span>
                    {sizeText ? <span className="picker-size">{sizeText}</span> : null}
                  </label>
                );
              })
            ) : (
              <div className="empty">موردی یافت نشد</div>
            )}
          </div>
        </div>

        <footer className="dh-modal__ftr">
          <button className="btn" onClick={onClose}>بستن</button>
          <button
            className="btn primary"
            disabled={!sel}
            onClick={() => sel && onPick(sel)}
          >
            تأیید
          </button>
        </footer>
      </div>
    </div>
  );
}
