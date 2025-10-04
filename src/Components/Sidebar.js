// src/Components/Sidebar.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const [expandMaint, setExpandMaint] = useState(true);

  return (
    <>
      {open && <div className="sb-backdrop" onClick={onClose} />}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        dir="rtl"
        aria-hidden={!open}
        aria-label="منوی کناری"
      >
        <header className="sb-header">
          <b>منو</b>
          <button className="sb-close" onClick={onClose} aria-label="بستن">✕</button>
        </header>

        <nav className="sb-menu">
          {/* نمونه‌های غیرمسیر */}
          <button className="sb-item" type="button">درون چاهی</button>
          <button className="sb-item" type="button">برون چاهی</button>

          {/* گروه تعمیرات و نگهداری لوله با زیرمنو */}
          <button
            className="sb-item"
            type="button"
            onClick={() => setExpandMaint(v => !v)}
            aria-expanded={expandMaint}
            aria-controls="maint-sub"
          >
            تعمیرات و نگهداری لوله
            <span className="chev">{expandMaint ? "▾" : "▸"}</span>
          </button>

          {expandMaint && (
            <div className="sb-sub" id="maint-sub">
              <NavLink
                to="/maintenance/inout"
                className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
                onClick={onClose}
                end
              >
                ورود و خروج
              </NavLink>

              <NavLink
                to="/maintenance/request"
                className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
                onClick={onClose}
                end
              >
                ثبت درخواست
              </NavLink>

              {/* 👇 جدید: صفحه گزارشات */}
              <NavLink
                to="/maintenance/reports"
                className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
                onClick={onClose}
                end
              >
                گزارشات
              </NavLink>
            </div>
          )}

          {/* بازرسی (فعلاً دکمه ساده) */}
          <button className="sb-item" type="button">بازرسی</button>

          {/* تراشکاری */}
          <NavLink
            to="/maintenance/turning"
            className={({ isActive }) => "sb-subitem" + (isActive ? " is-active" : "")}
            onClick={onClose}
            end
          >
            تراشکاری
          </NavLink>
        </nav>

        <footer className="sb-footer">
          <span className="muted">© سیستم</span>
        </footer>
      </aside>
    </>
  );
}
