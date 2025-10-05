// src/Components/Sidebar.js
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const [expandDownhole, setExpandDownhole] = useState(true);   // درون‌چاهی
  const [expandSurface, setExpandSurface]   = useState(false);  // برون‌چاهی
  const [expandMaint, setExpandMaint]       = useState(true);   // تعمیرات لوله

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
          <button className="sb-close" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </header>

        <nav className="sb-menu">

          {/* === درون‌چاهی === */}
          <button
            className="sb-item"
            type="button"
            onClick={() => setExpandDownhole(v => !v)}
            aria-expanded={expandDownhole}
            aria-controls="downhole-sub"
          >
برون‌چاهی            <span className="chev">{expandDownhole ? "▾" : "▸"}</span>
          </button>

          {expandDownhole && (
            <div className="sb-sub" id="downhole-sub">
              <NavLink
                to="/downhole/inout"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                ورود و خروج
              </NavLink>

              <NavLink
                to="/downhole/repair"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                تعمیرات
              </NavLink>
            </div>
          )}

          {/* === برون‌چاهی (Surface) — برگردونده شد === */}
           { <button
            className="sb-item"
            type="button"
            onClick={() => setExpandSurface(v => !v)}
            aria-expanded={expandSurface}
            aria-controls="surface-sub"
          >
درون‌چاهی            <span className="chev">{expandSurface ? "▾" : "▸"}</span>
          </button> }

          {/* {expandSurface && (
            <div className="sb-sub" id="surface-sub">
              <NavLink
                to="/surface/inout"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                ورود و خروج
              </NavLink>

              <NavLink
                to="/surface/repair"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                تعمیرات
              </NavLink>
            </div>
          )}  */}

          {/* === گروه‌های عملیاتی (گلوبال) — بدون زیرمنو === */}
          <NavLink
            to="/ops/groups"
            className={({ isActive }) =>
              "sb-subitem" + (isActive ? " is-active" : "")
            }
            onClick={onClose}
            end
          >
            گروه‌های عملیاتی
          </NavLink>

          {/* === تعمیرات و نگهداری لوله === */}
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
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                ورود و خروج
              </NavLink>

              <NavLink
                to="/maintenance/request"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                ثبت درخواست
              </NavLink>

              <NavLink
                to="/maintenance/reports"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                گزارشات
              </NavLink>

              <NavLink
                to="/maintenance/turning"
                className={({ isActive }) =>
                  "sb-subitem" + (isActive ? " is-active" : "")
                }
                onClick={onClose}
                end
              >
                تراشکاری
              </NavLink>
            </div>
          )}
        </nav>

        <footer className="sb-footer">
          <span className="muted">© سیستم</span>
        </footer>
      </aside>
    </>
  );
}
