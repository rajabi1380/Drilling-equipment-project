import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Navbar.css";

/* — زمان زنده (هم‌تراز با ثانیه) — */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t;
    const tick = () => { setNow(new Date()); t = setTimeout(tick, 1000 - (Date.now() % 1000)); };
    tick();
    return () => clearTimeout(t);
  }, []);
  return now;
}

/* — چیپ تاریخ/ساعت: چرخه رنگ ملایم هر 20s — */
function useSoftCycle20s() {
  const palette = ["#EEF6FF","#F3F7F2","#FFF2F6","#F6F3FF","#F2FAFF","#FFF9EE"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(x => (x + 1) % palette.length), 20000);
    return () => clearInterval(id);
  }, []);
  return palette[i];
}

/* — تقویم مینی داینامیک (شمسی) برای دراپ‌داون — */
const WEEK_FULL = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه"];
const WEEK_SHORT = ["ش","ی","د","س","چ","پ","ج"];
const faNum = (n) => new Intl.NumberFormat("fa-IR").format(n);
const faToNumber = (s) => Number(String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const parts = (d) => new Intl.DateTimeFormat("fa-IR-u-ca-persian",{
  year:"numeric", month:"numeric", day:"numeric", weekday:"long"
}).formatToParts(d).reduce((o,p)=>(o[p.type]=p.value,o),{});
const addDays = (d,n)=>{ const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfFaMonth = (d)=>{ let x=new Date(d); while(faToNumber(parts(x).day)>1) x=addDays(x,-1); return x; };
const keyFa = (y,m,d)=>`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

function CalendarMini({ value, onChange, holidaysFa = [] }) {
  const [view, setView] = useState(() => startOfFaMonth(value));
  const todayP = parts(new Date());
  const today = { y: faToNumber(todayP.year), m: faToNumber(todayP.month), d: faToNumber(todayP.day) };

  const monthStart = useMemo(() => startOfFaMonth(view), [view]);
  const startP = parts(monthStart);
  const startY = faToNumber(startP.year);
  const startM = faToNumber(startP.month);
  const weekdayIndex = WEEK_FULL.indexOf(startP.weekday);

  const days = [];
  let cur = new Date(monthStart);
  while (true) {
    const p = parts(cur);
    const y = faToNumber(p.year), m = faToNumber(p.month), d = faToNumber(p.day);
    if (m !== startM || y !== startY) break;
    days.push({ g:new Date(cur), y, m, d, weekday:p.weekday });
    cur = addDays(cur, 1);
  }

  const headerText = new Intl.DateTimeFormat("fa-IR-u-ca-persian",{ month:"long", year:"numeric" }).format(monthStart);
  const isHoliday = (d) => d.weekday === "جمعه" || holidaysFa.includes(keyFa(d.y,d.m,d.d));

  const selP = parts(value);
  const sel = { y: faToNumber(selP.year), m: faToNumber(selP.month), d: faToNumber(selP.day) };

  return (
    <div className="cal" dir="rtl">
      <div className="cal__hdr">
        <button className="cal__nav" onClick={()=> setView(addDays(monthStart, 35))} aria-label="ماه بعد">›</button>
        <div className="cal__title">{headerText}</div>
        <button className="cal__nav" onClick={()=> setView(addDays(monthStart, -1))} aria-label="ماه قبل">‹</button>
      </div>

      <div className="cal__grid cal__week">
        {WEEK_SHORT.map(w => <div key={w} className="cal__w">{w}</div>)}
      </div>

      <div className="cal__grid">
        {Array.from({length: weekdayIndex}).map((_,i)=><div key={"sp"+i} />)}
        {days.map((d,i)=>{
          const isToday = d.y===today.y && d.m===today.m && d.d===today.d;
          const isSel = d.y===sel.y && d.m===sel.m && d.d===sel.d;
          const holiday = isHoliday(d);
          return (
            <button
              key={i}
              className={
                "cal__d" +
                (isToday ? " is-today" : "") +
                (isSel ? " is-selected" : "") +
                (holiday ? " is-holiday" : "")
              }
              onClick={()=> onChange(d.g)}
              title={`${d.weekday} ${d.d}/${d.m}/${d.y}`}
            >
              {faNum(d.d)}
            </button>
          );
        })}
      </div>

      <div className="cal__footer">
        <button className="cal__btn" onClick={()=> setView(startOfFaMonth(new Date()))}>امروز</button>
      </div>
    </div>
  );
}

/* — Navbar اصلی — */
export default function Navbar({
  onLogout = () => {},
  onHamburger = () => {},
  holidaysFa = [],
  notifications = [],
}) {
  const { pathname } = useLocation();
  const now = useNow();
  const chipBg = useSoftCycle20s();

  const [openCal, setOpenCal] = useState(false);
  const [openBell, setOpenBell] = useState(false);
  const [selectedDate, setSelectedDate] = useState(now);

  // بردکرامب از روی مسیر
  const breadcrumb = useMemo(() => {
    if (pathname.startsWith("/maintenance/inout")) return "تعمیرات و نگهداری لوله / ورود و خروج";
    if (pathname.startsWith("/maintenance/request")) return "تعمیرات و نگهداری لوله / ثبت درخواست";
    return "داشبورد";
  }, [pathname]);

  const faDate = useMemo(
    () => new Intl.DateTimeFormat("fa-IR-u-ca-persian",{ dateStyle:"full" }).format(selectedDate),
    [selectedDate]
  );
  const faTime = useMemo(
    () => new Intl.DateTimeFormat("fa-IR",{ hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(now),
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

  return (
    <header className="nav" dir="rtl">
      {/* راست: بردکرامب + همبرگر با فاصله */}
      <div className="nav__right">
      
        <button className="nav__hamburger" onClick={onHamburger} aria-label="منو">☰</button>
        
          <div className="nav__breadcrumb">{breadcrumb}</div>
      </div>

      {/* چپ: خروج + زنگوله + چیپ تاریخ/ساعت (با رنگ چرخه‌ای) + تقویم بازشو */}
      <div className="nav__left">
       

        <div className="nav__bell">
          <button className="btn icon" aria-haspopup="menu" onClick={()=> setOpenBell(v=>!v)} title="اعلان‌ها">🔔</button>
          {openBell && (
            <div className="nav__dropdown nav__dropdown--bell">
              {notifications.length === 0 ? (
                <div className="empty">اعلانی وجود ندارد</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="notif">
                    <div className="notif__title">{n.title}</div>
                    <div className="notif__time">{n.time}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="nav__calendar">
          <button
            className="chip"
            style={{ background: chipBg }}
            onClick={()=> setOpenCal(v=>!v)}
            aria-expanded={openCal}
          >
            {faDate} · {faTime}
          </button>
          {openCal && (
            <div className="nav__dropdown nav__dropdown--calendar">
              <CalendarMini
                value={selectedDate}
                holidaysFa={holidaysFa}
                onChange={(d)=> setSelectedDate(d)}
              />
              <div className="nav__picked">
                تاریخ انتخابی: <b>{new Intl.DateTimeFormat("fa-IR-u-ca-persian",{ dateStyle:"full" }).format(selectedDate)}</b>
              </div>
            </div>
          )}
        </div> <button className="btn danger" onClick={onLogout}>خروج</button>
      </div>
    </header>
  );
}
