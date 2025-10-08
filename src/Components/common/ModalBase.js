import React, { useEffect } from "react";
import "./ModalBase.css";

export default function ModalBase({
  open = true,
  title = "",
  children,
  footer = null,
  onClose = () => {},
  size = "lg", // sm | md | lg
}) {
  // بستن با ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mb-backdrop" onClick={onClose}>
      <div
        className={`mb-modal ${size}`}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="mb-header">
          <b>{title}</b>
          <button type="button" className="mb-close" onClick={onClose} aria-label="close">✕</button>
        </header>

        <div className="mb-body">{children}</div>

        <div className="mb-footer">
          {/* مطمئن می‌شویم دکمه‌ها submit نباشند */}
          {footer}
        </div>
      </div>
    </div>
  );
}
