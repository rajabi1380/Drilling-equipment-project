// src/Components/Sidebar.js
import React from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "./Context/AuthContext"; // مسیر درست ✅

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, isSuper, hasUnit } = useAuth();

  // ادمین یا مدیر: دسترسی کامل
  const isFullAccess = isSuper;

  // ────────────────────────────────
  // رسید و ارسال:
  // همه به جز بازرسی و تراشکاری
  const canInOut =
    isFullAccess ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // موجودی دکل‌ها:
  // درون‌چاهی، برون‌چاهی، مانده‌یابی، تعمیرات، مدیرها و ادمین‌ها
  const canRigs =
    isFullAccess ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // گزارشات:
  // همه واحدهای میدانی (درون‌چاهی، برون‌چاهی، مانده‌یابی، تعمیرات) + مدیرها
  const canReports =
    isFullAccess ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // گروه‌های عملیاتی:
  // مثل گزارشات
  const canGroupOps =
    isFullAccess ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  // دستورکارها:
  // فقط بازرسی و تراشکاری و مدیرها
  const canTurning =
    isFullAccess || hasUnit("INSPECTION") || hasUnit("TURNING");

  // ────────────────────────────────
  const items = [
    { label: "رسید و ارسال", to: "/maintenance/inout", allowed: canInOut },
    { label: "موجودی دکل‌ها", to: "/rigs", allowed: canRigs },
    { label: "دستورکارها", to: "/maintenance/turning", allowed: canTurning },
    { label: "گروه‌های عملیاتی", to: "/groupops", allowed: canGroupOps },
    { label: "گزارشات", to: "/maintenance/reports", allowed: canReports },
  ];

  // ────────────────────────────────
  const handleBlockedClick = (e) => {
    e.preventDefault();
    alert("شما مجاز به دسترسی به این بخش نیستید.");
  };

  return (
    <>
      {open && <div className="sb-backdrop" onClick={onClose} />}

      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        dir="rtl"
        aria-hidden={!open}
      >
        <header className="sb-header">
          <b>منوی سامانه</b>
          <button className="sb-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <nav className="sb-menu">
          {items.map((item) =>
            item.allowed ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                key={item.to}
                className="sb-subitem disabled"
                onClick={handleBlockedClick}
              >
                {item.label}
              </span>
            )
          )}
        </nav>

        <footer className="sb-footer">
          <span className="muted">© واحد تعمیرات و نگهداری</span>
        </footer>
      </aside>
    </>
  );
}
