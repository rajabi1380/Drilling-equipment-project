import React, { useEffect, useMemo, useState } from "react";
import "./Turning.css";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

const LS_KEY = "requests_v1";

/* ---- LS helpers ---- */
const loadLS = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { open: [], archived: [], seq: 1 };
  } catch {
    return { open: [], archived: [], seq: 1 };
  }
};
const saveLS = (data) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
};

/* ---- Date helpers ---- */
const faFmt = "YYYY/MM/DD HH:mm";
const toISO16 = (dObj) => (dObj ? new Date(dObj.toDate()).toISOString().slice(0,16) : "");
const fmtFa = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit"
  }).format(d).replace(",", "");
};

export default function Turning() {
  const boot = loadLS();
  const [openOrders, setOpenOrders] = useState(boot.open);
  const [archivedOrders, setArchivedOrders] = useState(boot.archived); // برای سازگاری ذخیره می‌ماند

  // همگام‌سازی با localStorage
  useEffect(() => {
    const current = loadLS();
    saveLS({
      ...(current || { seq: 1 }),
      open: openOrders,
      archived: archivedOrders,
    });
  }, [openOrders, archivedOrders]);

  /* فقط سفارش‌های واحد تراشکاری */
  const openTurning = useMemo(
    () => openOrders.filter((r) => (r.unit || "") === "تراشکاری"),
    [openOrders]
  );

  /* -------- فیلترها (اعمال‌شون با دکمه) -------- */
  const [filterForm, setFilterForm] = useState({
    name: "",
    code: "",
    startFrom: null,  // DateObject
    endTo: null,      // DateObject
  });
  const [applied, setApplied] = useState({
    name: "",
    code: "",
    startISO: "",
    endISO: "",
  });

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({
      name: filterForm.name.trim(),
      code: filterForm.code.trim(),
      startISO: toISO16(filterForm.startFrom),
      endISO: toISO16(filterForm.endTo),
    });
    setPageOpen(1);
  };
  const clearFilters = () => {
    setFilterForm({ name:"", code:"", startFrom:null, endTo:null });
    setApplied({ name:"", code:"", startISO:"", endISO:"" });
    setPageOpen(1);
  };

  const filteredOpen = useMemo(() => {
    const f = applied;
    return openTurning.filter(r => {
      const okName = !f.name || (r.name||"").toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || (r.code||"").toLowerCase().includes(f.code.toLowerCase());
      const okStart = !f.startISO || (r.startISO && r.startISO >= f.startISO);
      const okEnd = !f.endISO || !r.endISO || r.endISO <= f.endISO;
      return okName && okCode && okStart && okEnd;
    });
  }, [openTurning, applied]);

  /* -------- صفحه‌بندی ۱۵تایی -------- */
  const PAGE = 15;
  const [pageOpen, setPageOpen] = useState(1);
  const totalOpenPages = Math.max(1, Math.ceil(filteredOpen.length / PAGE));
  const openSlice = filteredOpen.slice((pageOpen - 1) * PAGE, pageOpen * PAGE);

  /* ادیت مودال */
  const [editing, setEditing] = useState(null);

  const updateRecord = (updated) => {
    // اگر پایان شد → از open به archived منتقل کن
    if (updated.status === "پایان") {
      setOpenOrders((prev) => prev.filter((x) => x.id !== updated.id));
      setArchivedOrders((prev) => [{ ...updated }, ...prev]);
    } else {
      setOpenOrders((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...updated } : x))
      );
    }
  };

  return (
    <div className="tg-page" dir="rtl">
      <div className="tg-card">
        <header className="tg-hdr">
          <h3>پنل واحد تراشکاری</h3>
        </header>

      {/* فیلترها (استایل شبیه InOut) */}
<form className="io-filter" onSubmit={applyFilters}>
  <div className="io-filter__fields">
    <div className="f-item">
      <label>نام تجهیز</label>
      <input
        className="input"
        placeholder="مثلاً Kelly"
        value={filterForm.name}
        onChange={(e)=>setFilterForm(v=>({...v, name:e.target.value}))}
      />
    </div>

    <div className="f-item">
      <label>کد تجهیز</label>
      <input
        className="input"
        placeholder="مثلاً EQ-1001"
        value={filterForm.code}
        onChange={(e)=>setFilterForm(v=>({...v, code:e.target.value}))}
      />
    </div>

    <div className="f-item">
      <label>تاریخ درخواست (از)</label>
      <DatePicker
        value={filterForm.startFrom}
        onChange={(val)=>setFilterForm(v=>({...v, startFrom: val}))}
        calendar={persian}
        locale={persian_fa}
        format={faFmt}
        plugins={[<TimePicker position="bottom" />]}
        inputClass="input"
        containerClassName="rmdp-rtl"
        placeholder="انتخاب تاریخ/ساعت"
      />
    </div>

    <div className="f-item">
      <label>تاریخ پایان (تا)</label>
      <DatePicker
        value={filterForm.endTo}
        onChange={(val)=>setFilterForm(v=>({...v, endTo: val}))}
        calendar={persian}
        locale={persian_fa}
        format={faFmt}
        plugins={[<TimePicker position="bottom" />]}
        inputClass="input"
        containerClassName="rmdp-rtl"
        placeholder="انتخاب تاریخ/ساعت"
      />
    </div>

    <div className="f-item f-apply">
      <label>&nbsp;</label>
      <div className="btn-row">
        <button type="submit" className="btn primary">اعمال فیلتر</button>
        <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
      </div>
    </div>
  </div>
</form>


        {/* جدول بازها */}
        <section className="section">
          <header className="sec-hdr">
            <b>دستورکارهای باز</b>
            <span className="muted">({filteredOpen.length})</span>
          </header>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>شماره دستورکار</th>
                  <th>نام تجهیز</th>
                  <th>کد تجهیز</th>
                  <th>وضعیت</th>
                  <th>تاریخ شروع</th>
                  <th>تاریخ پایان</th>
                  <th>نوع درخواست</th>
                  <th>توضیحات</th>
                  <th>ویرایش</th>
                </tr>
              </thead>
              <tbody>
                {openSlice.length ? (
                  openSlice.map((r) => (
                    <tr key={r.id}>
                      <td>{r.orderNo}</td>
                      <td>{r.name}</td>
                      <td>{r.code}</td>
                      <td>{r.status}</td>
                      <td>{fmtFa(r.startISO)}</td>
                      <td>{fmtFa(r.endISO)}</td>
                      <td>{(r.reqType || "").toUpperCase()}</td>
                      <td className="muted">{r.desc || "—"}</td>
                      <td className="tg-actions">
                        <button
                          className="btn small"
                          type="button"
                          title="ویرایش جزئیات"
                          onClick={() => setEditing(r)}
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty">
                      موردی مطابق فیلترها نیست / ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* صفحه‌بندی */}
          <div className="pagi">
            <button
              className="btn"
              disabled={pageOpen === 1}
              onClick={() => setPageOpen(1)}
            >
              « اول
            </button>
            <button
              className="btn"
              disabled={pageOpen === 1}
              onClick={() => setPageOpen((p) => p - 1)}
            >
              ‹ قبلی
            </button>
            <span className="muted">
              {pageOpen}/{totalOpenPages}
            </span>
            <button
              className="btn"
              disabled={pageOpen === totalOpenPages}
              onClick={() => setPageOpen((p) => p + 1)}
            >
              بعدی ›
            </button>
            <button
              className="btn"
              disabled={pageOpen === totalOpenPages}
              onClick={() => setPageOpen(totalOpenPages)}
            >
              آخر »
            </button>
          </div>
        </section>
      </div>

      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(rec) => {
            updateRecord(rec);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Edit Modal (بدون تغییر نسبت به نسخه قبلی) ---------- */
function EditModal({ record, onClose, onSave }) {
  const [tab, setTab] = useState("info"); // info | acts | delay

  const [status, setStatus] = useState(record.status || "در انتظار تعمیر");

  const [acts, setActs] = useState(record.acts || [{ who: "", part: "", qty: 1 }]);
  const addAct = () => setActs((a) => [...a, { who: "", part: "", qty: 1 }]);
  const setAct = (i, key, val) =>
    setActs((a) => a.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)));
  const delAct = (i) => setActs((a) => a.filter((_, idx) => idx !== i));

  const [delayHours, setDelayHours] = useState(record.delayHours || 0);
  const [delayReason, setDelayReason] = useState(record.delayReason || "");

  const submit = () => {
    onSave({
      ...record,
      status,
      acts,
      delayHours,
      delayReason,
    });
  };

  return (
    <div className="tg-backdrop" onClick={onClose}>
      <div className="tg-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="tg-modal__hdr">
          <b>ویرایش دستورکار ({record.orderNo})</b>
          <button className="tg-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="tg-tabs">
          <button className={`tab ${tab==="info"?"is-active":""}`} onClick={()=>setTab("info")}>مشخصات</button>
          <button className={`tab ${tab==="acts"?"is-active":""}`} onClick={()=>setTab("acts")}>فعالیت‌ها</button>
          <button className={`tab ${tab==="delay"?"is-active":""}`} onClick={()=>setTab("delay")}>تاخیر</button>
        </div>

        {tab==="info" && (
          <div className="form">
            <div className="row">
              <input className="input" value={record.name} readOnly />
              <input className="input" value={record.code} readOnly />
              <input className="input" value={record.size || ""} readOnly />
            </div>
            <div className="row">
              <input className="input" value={record.unit || ""} readOnly />
              <input className="input" value={record.orderNo} readOnly />
              <input className="input" value={(record.reqType||"").toUpperCase()} readOnly />
            </div>
            <div className="row">
              <input className="input" value={fmtFa(record.startISO)} readOnly />
              <input className="input" value={fmtFa(record.endISO)} readOnly />
              <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
                <option>در انتظار تعمیر</option>
                <option>در حال تعمیر</option>
                <option>در انتظار قطعه</option>
                <option>در انتظار نیرو</option>
                <option>پایان</option>
              </select>
            </div>
            <textarea className="input" value={record.desc || ""} readOnly />
          </div>
        )}

        {tab==="acts" && (
          <div className="form">
            {acts.map((a, i) => (
              <div className="row" key={i}>
                <input className="input" placeholder="انجام‌دهنده" value={a.who} onChange={e=>setAct(i,"who",e.target.value)} />
                <input className="input" placeholder="قطعه مصرفی" value={a.part} onChange={e=>setAct(i,"part",e.target.value)} />
                <input className="input" type="number" min="1" placeholder="تعداد" value={a.qty} onChange={e=>setAct(i,"qty", Math.max(1, +e.target.value||1))} />
                <button className="btn small" type="button" onClick={()=>delAct(i)}>حذف</button>
              </div>
            ))}
            <button className="btn" type="button" onClick={addAct}>+ افزودن ردیف فعالیت</button>
          </div>
        )}

        {tab==="delay" && (
          <div className="form">
            <div className="row">
              <input className="input" type="number" min="0" placeholder="مدت تاخیر (ساعت)" value={delayHours} onChange={e=>setDelayHours(Math.max(0, +e.target.value||0))} />
              <input className="input" value={delayReason} onChange={e=>setDelayReason(e.target.value)} placeholder="علت تاخیر" />
            </div>
          </div>
        )}

        <footer className="tg-modal__ftr">
          <button className="btn" onClick={onClose}>بستن</button>
          <button className="btn success" onClick={submit}>ذخیره</button>
        </footer>
      </div>
    </div>
  );
}
