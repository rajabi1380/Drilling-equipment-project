// src/Components/Navbar.js
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import CalendarMini from "./CalendarMini";
import { resolveBreadcrumb as getBreadcrumbTitle } from "../utils/breadcrumbs";
import { useAuth } from "./Context/AuthContext"; // اگر مسیرت فرق دارد این را تنظیم کن

/* --- Hooks کمکی --- */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t;
    const tick = () => {
      setNow(new Date());
      t = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(t);
  }, []);
  return now;
}

function useSoftCycle20s() {
  const palette = [
    "#EEF6FF",
    "#F3F7F2",
    "#FFF2F6",
    "#F6F3FF",
    "#F2FAFF",
    "#FFF9EE",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((x) => (x + 1) % palette.length),
      20000
    );
    return () => clearInterval(id);
  }, []);
  return palette[i];
}

/* --- Navbar --- */
export default function Navbar({
  onHamburger = () => {},
  holidaysFa = [],
  notifications = [],
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const now = useNow();
  const chipBg = useSoftCycle20s();

  const { user, logout } = useAuth() || {};

  const [openCal, setOpenCal] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [selectedDate, setSelectedDate] = useState(now);

  const breadcrumb = useMemo(
    () => getBreadcrumbTitle(location),
    [location]
  );

  const faDate = useMemo(
    () =>
      new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        dateStyle: "full",
      }).format(selectedDate),
    [selectedDate]
  );

  const faTime = useMemo(
    () =>
      new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now),
    [now]
  );

  // بستن پاپ‌آپ‌ها با کلیک بیرون
  useEffect(() => {
    const onDoc = (e) => {
      const cal = document.querySelector(".nav__calendar");
      const bell = document.querySelector(".nav__bell");
      if (openCal && cal && !cal.contains(e.target)) setOpenCal(false);
      if (openBell && bell && !bell.contains(e.target)) setOpenBell(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openCal, openBell]);

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login", { replace: true });
  };

  const handleLogin = () => {
    navigate("/login", { replace: true });
  };

  return (
    <header className="nav" dir="rtl">
      {/* راست: همبرگر + بردکرامب */}
      <div className="nav__right">
        <button
          className="nav__hamburger"
          onClick={onHamburger}
          aria-label="منو"
        >
          ☰
        </button>
        <div className="nav__breadcrumb">
          {breadcrumb || "سامانه مدیریت تجهیزات و عملیات"}
        </div>
      </div>

      {/* چپ: اعلان + تاریخ/ساعت + ورود/خروج */}
      <div className="nav__left">
        {/* زنگوله اعلان‌ها */}
        <div className="nav__bell">
          <button
            className="btn icon"
            aria-haspopup="menu"
            onClick={() => setOpenBell((v) => !v)}
            title="اعلان‌ها"
          >
            🔔
          </button>
          {openBell && (
            <div className="nav__dropdown nav__dropdown--bell">
              {notifications.length === 0 ? (
                <div className="empty">اعلانی وجود ندارد</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="notif">
                    <div className="notif__title">{n.title}</div>
                    <div className="notif__time">{n.time}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* تقویم و ساعت */}
        <div className="nav__calendar">
          <button
            className="chip"
            style={{ background: chipBg }}
            onClick={() => setOpenCal((v) => !v)}
            aria-expanded={openCal}
          >
            {faDate} · {faTime}
          </button>
          {openCal && (
            <div className="nav__dropdown nav__dropdown--calendar">
              <CalendarMini
                value={selectedDate}
                holidaysFa={holidaysFa}
                onChange={(d) => setSelectedDate(d)}
                compact
              />
              <div className="nav__picked">
                تاریخ انتخابی:{" "}
                <b>
                  {new Intl.DateTimeFormat(
                    "fa-IR-u-ca-persian",
                    { dateStyle: "full" }
                  ).format(selectedDate)}
                </b>
              </div>
            </div>
          )}
        </div>

        {/* ورود / خروج بر اساس Auth */}
        {user ? (
          <>
            <span
              style={{
                fontSize: 13,
                color: "var(--text)",
                marginInlineStart: 4,
              }}
            >
              {user.displayName || user.username}
            </span>
            <button className="btn danger" onClick={handleLogout}>
              خروج
            </button>
          </>
        ) : (
          <button className="btn" onClick={handleLogin}>
            ورود
          </button>
        )}
      </div>
    </header>
  );
}
