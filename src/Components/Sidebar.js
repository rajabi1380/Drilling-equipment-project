import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const [expandMaint, setExpandMaint] = useState(true);

  return (
    <>
      {open && <div className="sb-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? "is-open" : ""}`} dir="rtl" aria-hidden={!open}>
        <header className="sb-header">
          <b>منو</b>
          <button className="sb-close" onClick={onClose} aria-label="بستن">✕</button>
        </header>

        <nav className="sb-menu">
          <button className="sb-item" type="button">درون چاهی</button>
          <button className="sb-item" type="button">برون چاهی</button>

          <button className="sb-item" type="button" onClick={() => setExpandMaint(v => !v)}>
            تعمیرات و نگهداری لوله
            <span className="chev">{expandMaint ? "▾" : "▸"}</span>
          </button>

          {expandMaint && (
            <div className="sb-sub">
           <NavLink
  to="/maintenance/inout"
  className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
  onClick={onClose}
>
  ورود و خروج
</NavLink>

<NavLink
  to="/maintenance/request"
  className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
  onClick={onClose}
>
  ثبت درخواست
</NavLink>

            </div>
          )}

          <button className="sb-item" type="button">بازرسی</button>
          <button className="sb-item" type="button">تراشکاری</button>
        </nav>

        <footer className="sb-footer">
          <span className="muted">© سیستم</span>
        </footer>
      </aside>
    </>
  );
}
