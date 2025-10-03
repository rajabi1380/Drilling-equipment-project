import React from "react";
import "./Navbar.css"; // از همین فایل CSS استفاده می‌کنیم

const faNum = (n) => new Intl.NumberFormat("fa-IR").format(n);
const WEEK_FULL = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه"];
const WEEK_SHORT = ["ش","ی","د","س","چ","پ","ج"];
const faToNumber = (s) => Number(String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const parts = (d) => new Intl.DateTimeFormat("fa-IR-u-ca-persian",{
  year:"numeric", month:"numeric", day:"numeric", weekday:"long"
}).formatToParts(d).reduce((o,p)=>(o[p.type]=p.value,o),{});
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfFaMonth = (d)=>{ let x=new Date(d); while(faToNumber(parts(x).day)>1) x=addDays(x,-1); return x; };
const keyFa = (y,m,d)=>`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

export default function CalendarMini({
  value = new Date(),
  onChange = () => {},
  holidaysFa = [], // ["1403-01-01", ...]
}) {
  const [view, setView] = React.useState(()=> startOfFaMonth(value));

  const todayP = parts(new Date());
  const today = { y: faToNumber(todayP.year), m: faToNumber(todayP.month), d: faToNumber(todayP.day) };

  const monthStart = React.useMemo(()=> startOfFaMonth(view), [view]);
  const startP = parts(monthStart);
  const startY = faToNumber(startP.year);
  const startM = faToNumber(startP.month);
  const weekdayIndex = WEEK_FULL.indexOf(startP.weekday);

  const days = [];
  let cur = new Date(monthStart);
  while (true){
    const p = parts(cur);
    const y = faToNumber(p.year), m = faToNumber(p.month), d = faToNumber(p.day);
    if (m!==startM || y!==startY) break;
    days.push({ g:new Date(cur), y, m, d, weekday:p.weekday });
    cur = addDays(cur, 1);
  }

  const headerText = new Intl.DateTimeFormat("fa-IR-u-ca-persian",{ month:"long", year:"numeric" }).format(monthStart);
  const isHoliday = (d) => d.weekday === "جمعه" || holidaysFa.includes(keyFa(d.y,d.m,d.d));

  const valP = parts(value);
  const sel = { y: faToNumber(valP.year), m: faToNumber(valP.month), d: faToNumber(valP.day) };

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
