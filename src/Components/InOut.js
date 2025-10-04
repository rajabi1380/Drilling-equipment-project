// src/pages/InOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./Inout.css";

import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

/* ---------- تاریخ ---------- */
const faFormat = "YYYY/MM/DD HH:mm";
const fmtFa = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dobj = new DateObject({ date: d, calendar: persian, locale: persian_fa });
  return dobj.format(faFormat);
};
const toISO16 = (dateObj) =>
  dateObj ? new Date(dateObj.toDate()).toISOString().slice(0, 16) : "";

/* ---------- LocalStorage ---------- */
const LS_KEY = "inout_v2";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (data) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
};

/* موجودی کل = مجموع ورودها − مجموع خروج‌ها (بر اساس qty) */
const computeTotalStock = (ioRows) =>
  Math.max(
    0,
    ioRows.reduce((sum, r) => sum + (r.type === "in" ? +r.qty || 1 : -(+r.qty || 1)), 0)
  );

export default function InOut() {
  /* مودال‌ها */
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);


  /* تب فعال */
  const [active, setActive] = useState("inout"); // "inventory" | "inout"

  /* بوت اولیه از لوکال‌استوریج */
  const boot = loadState();

  /* موجودی هر قطعه (فعلاً خالی) */
  const [inventory] = useState(boot?.inventory ?? []);

  /* لیست ورود/خروج (خالی شروع می‌شود) */
  const [ioRows, setIoRows] = useState(boot?.ioRows ?? []);

  /* ذخیرهٔ خودکار در localStorage */
  useEffect(() => {
    saveState({ inventory, ioRows });
  }, [inventory, ioRows]);

  /* فیلترها (فقط با دکمه اعمال می‌شوند) */
  const [filterForm, setFilterForm] = useState({
    name: "",
    code: "",
    inFrom: null, // DateObject
    outTo: null,  // DateObject
  });
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    code: "",
    inFromISO: "",
    outToISO: "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const applyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters({
      name: filterForm.name.trim(),
      code: filterForm.code.trim(),
      inFromISO: toISO16(filterForm.inFrom),
      outToISO: toISO16(filterForm.outTo),
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", inFrom: null, outTo: null });
    setAppliedFilters({ name: "", code: "", inFromISO: "", outToISO: "" });
    setPage(1);
  };

  /* اعمال فیلتر روی جدول */
  const filteredIo = useMemo(() => {
    const f = appliedFilters;
    return ioRows.filter((r) => {
      const okName = !f.name || r.name?.toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || r.code?.toLowerCase().includes(f.code.toLowerCase());
      const okIn = !f.inFromISO || (r.enterAtISO && r.enterAtISO >= f.inFromISO);
      const okOut = !f.outToISO || !r.exitAtISO || r.exitAtISO <= f.outToISO;
      return okName && okCode && okIn && okOut;
    });
  }, [ioRows, appliedFilters]);

  /* صفحه‌بندی */
  const totalPages = Math.max(1, Math.ceil(filteredIo.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = filteredIo.slice(pageStart, pageStart + pageSize);
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  const statusDisplay = (s) => (!s || s.trim() === "" ? "—" : s);
  const totalStock = useMemo(() => computeTotalStock(ioRows), [ioRows]);

  /* افزودن رکوردها */
  const addIn = (payload) => {
    const iso = toISO16(payload.enterDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "in",
        name: payload.name,
        code: payload.code,
        enterAtISO: iso,
        exitAtISO: "",
        status: payload.status,
        dest: payload.fromWhere || "—",
        size: payload.size,
        bandgiri: false,
        qty: payload.qty ?? 1,
      },
      ...prev,
    ]);
  };
  const addOut = (payload) => {
    const iso = toISO16(payload.exitDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "out",
        name: payload.name,
        code: payload.code,
        enterAtISO: "",
        exitAtISO: iso,
        status: payload.status,
        dest: payload.dest || "—",
        size: payload.size,
        bandgiri: !!payload.bandgiri,
        qty: payload.qty ?? 1,
      },
      ...prev,
    ]);
  };

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {/* tabs */}
        <div className="tabs">
          <button className={`tab ${active === "inventory" ? "is-active" : ""}`} onClick={() => setActive("inventory")}>
            موجودی هر قطعه
          </button>
          <span className="divider">|</span>
          <button className={`tab ${active === "inout" ? "is-active" : ""}`} onClick={() => setActive("inout")}>
            ورود و خروج
          </button>
        </div>

        {/* فیلترها */}
        {active === "inout" && (
          <form className="io-filter" onSubmit={applyFilters}>
            <div className="io-filter__fields">
              <div className="f-item">
                <label>نام تجهیز</label>
                <input
                  className="input"
                  placeholder="مثلاً Kelly"
                  value={filterForm.name}
                  onChange={(e) => setFilterForm((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div className="f-item">
                <label>کد تجهیز</label>
                <input
                  className="input"
                  placeholder="مثلاً EQ-1027"
                  value={filterForm.code}
                  onChange={(e) => setFilterForm((v) => ({ ...v, code: e.target.value }))}
                />
              </div>
              <div className="f-item">
                <label>تاریخ و ساعت ورود</label>
                <DatePicker
                  value={filterForm.inFrom}
                  onChange={(val) => setFilterForm((v) => ({ ...v, inFrom: val }))}
                  calendar={persian}
                  locale={persian_fa}
                  format={faFormat}
                  plugins={[<TimePicker position="bottom" />]}
                  inputClass="input"
                  containerClassName="rmdp-rtl"
                />
              </div>
              <div className="f-item">
                <label>تاریخ و ساعت خروج</label>
                <DatePicker
                  value={filterForm.outTo}
                  onChange={(val) => setFilterForm((v) => ({ ...v, outTo: val }))}
                  calendar={persian}
                  locale={persian_fa}
                  format={faFormat}
                  plugins={[<TimePicker position="bottom" />]}
                  inputClass="input"
                  containerClassName="rmdp-rtl"
                />
              </div>
              <div className="f-item f-apply">
                <label>&nbsp;</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="btn primary">اعمال فیلتر</button>
                  <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
                </div>
              </div>
            </div>

            <div className="io-filter__actions">
              <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
              <button type="button" className="btn danger" onClick={() => setShowOut(true)}>ثبت خروج</button>
            </div>
          </form>
        )}

        {/* ابزار جدول */}
        <div className="table-toolbar">
          <button className="btn ghost" onClick={() => alert("گزارش‌گیری (نمونه)")}>⬇️ گزارش‌گیری</button>
          <button
            className="btn"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              // بدون رفرش هم می‌شود؛ ولی اگر خواستی با رفرش:
              window.location.reload();
            }}
          >
            پاک‌سازی دادهٔ محلی
          </button>
        </div>

        {/* جدول‌ها */}
        {active === "inventory" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نام تجهیز</th>
                  <th>کد تجهیز</th>
                  <th>تاریخ ورود</th>
                  <th>خروج</th>
                  <th>وضعیت</th>
                  <th>مقصد</th>
                  <th>سایز</th>
                  <th>موجودی هر قطعه</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "#6b7280" }}>
                    موردی ثبت نشده است
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th>
                    <th>کد تجهیز</th>
                    <th>تاریخ ورود</th>
                    <th>خروج</th>
                    <th>وضعیت</th>
                    <th>مقصد</th>
                    <th>سایز</th>
                    <th>بندگیری</th>
                    {/* <th>تعداد</th> */}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length > 0 ? (
                    pagedRows.map((r) => (
                      <tr key={r.id} className={r.type === "in" ? "row-in" : "row-out"}>
                        <td>{r.name}</td>
                        <td>{r.code}</td>
                        <td>{fmtFa(r.enterAtISO) || "—"}</td>
                        <td>{fmtFa(r.exitAtISO) || "—"}</td>
                        <td>{statusDisplay(r.status)}</td>
                        <td>{r.dest || "—"}</td>
                        <td>{r.size || "—"}</td>
                        <td style={{ textAlign: "center" }}>{r.bandgiri ? "✓" : "—"}</td>
                        <td style={{ textAlign: "center" }}>{r.qty ?? 1}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "#6b7280" }}>
                        موردی ثبت نشده است
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحه‌بندی */}
            <div className="pagi" dir="rtl" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={goFirst} disabled={page === 1}>« اول</button>
              <button className="btn" onClick={goPrev} disabled={page === 1}>‹ قبلی</button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                return (
                  <button key={n} className={`btn ${page === n ? "primary" : ""}`} onClick={() => setPage(n)}>
                    {n}
                  </button>
                );
              })}
              <button className="btn" onClick={goNext} disabled={page === totalPages}>بعدی ›</button>
              <button className="btn" onClick={goLast} disabled={page === totalPages}>آخر »</button>
              <span style={{ color: "#6b7280", marginInlineStart: 8 }}>
                {filteredIo.length === 0
                  ? "0 از 0 ردیف"
                  : `${pageStart + 1}–${Math.min(pageStart + pageSize, filteredIo.length)} از ${filteredIo.length} ردیف`}
              </span>
            </div>

            {/* موجودی کل انبار */}
            <div style={{ marginTop: 10, fontWeight: 600 }}>
              موجودی کل انبار: {totalStock} عدد
            </div>
          </>
        )}
      </div>

      {/* مودال‌ها */}
      {showIn && (
        <InModal
          onClose={() => setShowIn(false)}
          onSubmit={(p) => {
            addIn(p);
            setShowIn(false);
          }}
        />
      )}
      {showOut && (
        <OutModal
          onClose={() => setShowOut(false)}
          onSubmit={(p) => {
            addOut(p);
            setShowOut(false);
          }}
        />
      )}
    </div>
  );
}

/* ------------------ مودال‌ها ------------------ */

function InModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [enterDateObj, setEnterDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [size, setSize] = useState("");
  const [fromWhere, setFromWhere] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const [touched, setTouched] = useState(false);
  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    setTouched(true);
    if (hasError) return;
    onSubmit({ name, code, enterDateObj, status, size, fromWhere, qty, note });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="modal__hdr">
          <div className="modal__title">مشخصات</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="modal__section">ورود</div>

        <div className="form">
          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && missing.name && <small className="err-msg">نام تجهیز الزامی است</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
              {touched && missing.code && <small className="err-msg">کد تجهیز الزامی است</small>}
            </div>
            <DatePicker
              value={enterDateObj}
              onChange={setEnterDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFormat}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت ورود"
            />
          </div>
          <div className="row">
            <input className="input" placeholder="از کجا آمده" value={fromWhere} onChange={(e) => setFromWhere(e.target.value)} />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>
            <div className="col">
              <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e) => setSize(e.target.value)} />
              {touched && missing.size && <small className="err-msg">سایز الزامی است</small>}
            </div>
          </div>
          {/* <div className="row">
            <input className="input" type="number" min="1" placeholder="تعداد" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))} />
          </div> */}
          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn success" onClick={submit}>ثبت ورود</button>
        </footer>
      </div>
    </div>
  );
}

function OutModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [exitDateObj, setExitDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [dest, setDest] = useState("");
  const [size, setSize] = useState("");
  const [carrier, setCarrier] = useState("");
  const [planNo, setPlanNo] = useState("");
  const [driver, setDriver] = useState("");
  const [qty, setQty] = useState(1);
  const [bandgiri, setBandgiri] = useState(false);
  const [note, setNote] = useState("");

  const [touched, setTouched] = useState(false);
  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    setTouched(true);
    if (hasError) return;
    onSubmit({
      name,
      code,
      exitDateObj,
      status,
      dest,
      size,
      carrier,
      planNo,
      driver,
      note,
      bandgiri,
      qty,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="modal__hdr">
          <div className="modal__title">مشخصات</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="modal__section">خروج</div>

        <div className="form">
          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && missing.name && <small className="err-msg">نام تجهیز الزامی است</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
              {touched && missing.code && <small className="err-msg">کد تجهیز الزامی است</small>}
            </div>
            <DatePicker
              value={exitDateObj}
              onChange={setExitDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFormat}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت خروج"
            />
          </div>

          <div className="row">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>

            <label className="input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={bandgiri} onChange={(e) => setBandgiri(e.target.checked)} />
              بندگیری
            </label>

            {/* <input
              className="input"
              type="number"
              min="1"
              placeholder="تعداد"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
            /> */}
          </div>

          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e) => setSize(e.target.value)} />
              {touched && missing.size && <small className="err-msg">سایز الزامی است</small>}
            </div>
            <input className="input" placeholder="مقصد" value={dest} onChange={(e) => setDest(e.target.value)} />
            <input className="input" placeholder="مشخصات حمل کننده" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>

          <div className="row">
            <input className="input" placeholder="شماره برنامه" value={planNo} onChange={(e) => setPlanNo(e.target.value)} />
            <input className="input" placeholder="راننده" value={driver} onChange={(e) => setDriver(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn danger" onClick={submit}>ثبت خروج</button>
        </footer>
      </div>
    </div>
  );
}
