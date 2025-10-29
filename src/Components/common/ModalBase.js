import React, { useEffect } from "react";
import "./ModalBase.css";

export default function ModalBase({
  open = true,
  title = "",
  children,
  footer = null,
  onClose = () => {},
  size = "lg",         // sm | md | lg | xl
  className = "",      // برای استایل دلخواه (مثل r-modal-xl)
  style = {},          // استایل اضافی
}) {
  // بستن با ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // قفل اسکرول بدنه هنگام باز بودن مدال (cleanup امن)
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow || ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="mb-backdrop" onClick={onClose} role="presentation">
      <div
        className={`mb-modal ${size} ${className}`.trim()}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={style}
      >
        <header className="mb-header">
          <b>{title}</b>
          <button
            type="button"
            className="mb-close"
            onClick={onClose}
            aria-label="close"
          >
            ✕
          </button>
        </header>

        <div className="mb-body">{children}</div>

        {footer && (
          <div className="mb-footer">
            {/* دکمه‌ها را بیرون تعیین می‌کنی؛ اینجا فقط رندر می‌شود */}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
