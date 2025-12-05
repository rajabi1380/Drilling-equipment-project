// src/Components/Sidebar.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import { useAuth } from "./Context/AuthContext";

export default function Sidebar({ open, onClose }) {
  const { isSuper, hasUnit } = useAuth();

  const isFullAccess = isSuper;

  const canInOut =
    isFullAccess ||
    hasUnit("DOWNHOLE") ||
    hasUnit("UPHOLE") ||
    hasUnit("MANDEYABI") ||
    hasUnit("PIPE");

  const canRigs = canInOut;
  const canReports = canInOut;
  const canGroupOps = canInOut;
  const canTurning = isFullAccess || hasUnit("INSPECTION") || hasUnit("TURNING");

  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleBlockedClick = (e) => {
    e.preventDefault();
    alert("دسترسی شما به این بخش محدود است.");
  };

  // آیتم‌های مشترک واحدها
  const userItems = [
    { label: "رسید / ارسال", to: "/maintenance/inout", allowed: canInOut },
    { label: "دکل", to: "/rigs", allowed: canRigs },
    {
      label: "دستور کارها ",
      key: "turning",
      allowed: canTurning,
      children: [
        { label: "دستور کار بازرسی", to: "/maintenance/turning" },
        { label: "دستور کار تراشکاری", to: "/maintenance/inspection" },
      ],
    },
    { label: " گروههای عملیاتی", to: "/groupops", allowed: canGroupOps },
    { label: "گزارشات", to: "/maintenance/reports", allowed: canReports },
  ];

  // ادمین: همان آیتم‌ها با دسترسی کامل + کاربران
  const adminItems = [
    ...userItems.map((item) => ({ ...item, allowed: true })),
    { label: "کاربران", to: "/users", allowed: true },
  ];

  const items = isSuper ? adminItems : userItems;

  return (
    <>
      {open && <div className="sb-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${open ? "is-open" : ""}`} dir="rtl">
        <header className="sb-header">
          <b>پنل ناوبری</b>
          <button className="sb-close" onClick={onClose}>×</button>
        </header>

        <nav className="sb-menu">
          {items.map((item) => {
            if (item.children) {
              if (!item.allowed) {
                return (
                  <div key={item.label} className="sb-parent disabled" onClick={handleBlockedClick}>
                    <span>{item.label}</span>
                  </div>
                );
              }

              const isOpen = openDropdown === item.key;

              return (
                <div key={item.label} className="sb-group">
                  <div
                    className="sb-subitem"
                    onClick={() => toggleDropdown(item.key)}
                  >
                    <span>{item.label}</span>
                  </div>

                  <div className={`sb-children ${isOpen ? "open" : ""}`}>
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          "sb-subitem" + (isActive ? " is-active" : "")
                        }
                        onClick={onClose}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            }

            return item.allowed ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            ) : (
              <div
                key={item.to}
                className="sb-subitem disabled"
                onClick={handleBlockedClick}
              >
                {item.label}
              </div>
            );
          })}
        </nav>

        <footer className="sb-footer">
          <span className="muted">برای دسترسی سریع از منوی بالا استفاده کنید.</span>
        </footer>
      </aside>
    </>
  );
}
