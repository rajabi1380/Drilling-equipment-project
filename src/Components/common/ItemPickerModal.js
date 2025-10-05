import React, { useMemo, useState } from "react";
// import "./ItemPickerModal.css"; 

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
        (x.code || "").toLowerCase().includes(t)
    );
  }, [catalog, q]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--small" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="modal__hdr">
          <div className="modal__title">{title}</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="picker">
          <input
            className="input"
            placeholder="جستجو بر اساس نام یا کد..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="picker-list">
            {filtered.length ? (
              filtered.map((it, i) => (
                <label key={i} className="picker-row">
                  <input
                    type="radio"
                    name="equip"
                    checked={sel?.code === it.code && sel?.name === it.name}
                    onChange={() => setSel(it)}
                  />
                  <span className="picker-name">{it.name}</span>
                  <span className="picker-code">{it.code}</span>
                </label>
              ))
            ) : (
              <div className="empty">موردی یافت نشد</div>
            )}
          </div>
        </div>

        <footer className="modal__ftr">
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
