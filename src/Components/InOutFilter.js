// src/pages/InOut.js
import React, { useMemo, useState } from "react";
import "./Inout.css";

export default function InOut() {
  const [active, setActive] = useState("inventory"); // "inventory" | "inout"

  // موجودی هر قطعه (نمونه)
  const [inventory] = useState([
    { id: 1, name: "Kelly",      code: "EQ-1001", enterDate: "", exitDate: "", status: "تعمیر شده",  dest: "—", size: "—", qty: "5 عدد" },
    { id: 2, name: "Drill pipe", code: "EQ-1027", enterDate: "", exitDate: "", status: "بازرسی شده", dest: "—", size: "—", qty: "10 عدد" },
  ]);

  // ورود/خروج (نمونه) — شامل فیلدهای ISO برای فیلتر دقیق
  const [ioRows, setIoRows] = useState([
    {
      id: 1,
      type: "in",
      name: "Kelly",
      code: "EQ-1001",
      enterDate: "1403/07/11 09:20",
      exitDate: "",
      enterAtISO: "2025-09-30T09:20",
      exitAtISO: "",
      status: "تعمیر شده",
      dest: "—",
      size: "—",
    },
    {
      id: 2,
      type: "out",
      name: "Drill pipe",
      code: "EQ-1027",
      enterDate: "1403/07/10 08:30",
      exitDate: "1403/07/11 17:15",
      enterAtISO: "2025-09-29T08:30",
      exitAtISO: "2025-09-30T17:15",
      status: "بازرسی شده",
      dest: "—",
      size: "—",
    },
  ]);

  // مودال‌ها
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);

  const statusDisplay = (raw) => {
    if (!raw) return "—";
    const s = String(raw).trim();
    if (/تعمیر/.test(s)) return "تعمیر شده";
    if (/بازرس/.test(s)) return "بازرسی شده";
    return s || "—";
  };

  // ---- فیلترها: فرم جدا از فیلتر اعمال‌شده ----
  const [filterForm, setFilterForm] = useState({
    name: "",
    code: "",
    inFrom: "", // datetime-local (ISO-like)
    outTo: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    code: "",
    inFrom: "",
    outTo: "",
  });

  const applyFilters = (e) => {
    e.preventDefault();
    setAppliedFilters(filterForm); // فقط با دکمه اعمال شود
  };
  const clearFilters = () => {
    const empty = { name: "", code: "", inFrom: "", outTo: "" };
    setFilterForm(empty);
    setAppliedFilters(empty);
  };

  // فیلتر روی جدول
  const filteredIo = useMemo(() => {
    const f = appliedFilters;
    return ioRows.filter((r) => {
      const okName = !f.name || r.name?.toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || r.code?.toLowerCase().includes(f.code.toLowerCase());
      const okIn   = !f.inFrom || (r.enterAtISO && r.enterAtISO >= f.inFrom);
      const okOut  = !f.outTo  || !r.exitAtISO || r.exitAtISO <= f.outTo; // اگر خروج ندارد، حذف نکن
      return okName && okCode && okIn && okOut;
    });
  }, [ioRows, appliedFilters]);

  // افزودن رکورد از مودال‌ها (اگر ISO نیامد، برای کارکرد فیلتر از now استفاده می‌کنیم)
  const addIn = (p) => {
    const nowISO = new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "in",
        name: p.name,
        code: p.code,
        enterDate: p.enterDate,   // نمایش
        exitDate: "",
        enterAtISO: p.enterAtISO || nowISO,
        exitAtISO: "",
        status: p.status,
        dest: p.fromWhere || "—",
        size: p.size || "—",
      },
      ...prev,
    ]);
    setShowIn(false);
  };

  const addOut = (p) => {
    const nowISO = new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "out",
        name: p.name,
        code: p.code,
        enterDate: "", // ناشناخته فعلاً
        exitDate: p.exitDate,
        enterAtISO: "", // اگر لازم شد می‌تونی از رکورد قبلی بیاری
        exitAtISO: p.exitAtISO || nowISO,
        status: p.status || "—",
        dest: p.dest || "—",
        size: p.size || "—",
      },
      ...prev,
    ]);
    setShowOut(false);
  };

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {/* تب‌ها */}
        <div className="tabs">
          <button
            className={`tab ${active === "inventory" ? "is-active" : ""}`}
            onClick={() => setActive("inventory")}
          >
            موجودی هر قطعه
          </button>
        </div>
        <span className="divider">|</span>
        <div className="tabs" style={{ marginTop: 0 }}>
          <button
            className={`tab ${active === "inout" ? "is-active" : ""}`}
            onClick={() => setActive("inout")}
          >
            ورود و خروج
          </button>
        </div>

        {/* نوار فیلتر مطابق وایرفریم (فقط در تب ورود/خروج) */}
        {active === "inout" && (
          <form className="io-filter" onSubmit={applyFilters}>
            <div className="io-filter__fields">
              <div className="f-item">
                <label>نام تجهیز</label>
                <input
                  className="input"
                  placeholder="مثلاً Kelly"
                  value={filterForm.name}
                  onChange={(e) => setFilterForm({ ...filterForm, name: e.target.value })}
                />
              </div>
              <div className="f-item">
                <label>کد تجهیز</label>
                <input
                  className="input"
                  placeholder="مثلاً EQ-1027"
                  value={filterForm.code}
                  onChange={(e) => setFilterForm({ ...filterForm, code: e.target.value })}
                />
              </div>
              <div className="f-item">
                <label>تاریخ و ساعت ورود</label>
                <div className="date-wrap">
                  <span className="icon">📅</span>
                  <input
                    type="datetime-local"
                    className="input date"
                    value={filterForm.inFrom}
                    onChange={(e) => setFilterForm({ ...filterForm, inFrom: e.target.value })}
                  />
                </div>
              </div>
              <div className="f-item">
                <label>تاریخ و ساعت خروج</label>
                <div className="date-wrap">
                  <span className="icon">📅</span>
                  <input
                    type="datetime-local"
                    className="input date"
                    value={filterForm.outTo}
                    onChange={(e) => setFilterForm({ ...filterForm, outTo: e.target.value })}
                  />
                </div>
              </div>
              <div className="f-item f-apply">
                <label>&nbsp;</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="btn primary">اعمال فیلتر</button>
                  <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
                </div>
              </div>
            </div>

            {/* سمت چپ: دکمه‌های ثبت */}
            <div className="io-filter__actions">
              <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
              <button type="button" className="btn danger"  onClick={() => setShowOut(true)}>ثبت خروج</button>
            </div>
          </form>
        )}

        {/* دکمه گزارش‌گیری بالای جدول */}
        <div className="table-toolbar">
          <button className="btn ghost" onClick={() => alert("گزارش‌گیری (نمونه)")}>
            ⬇️ گزارش‌گیری
          </button>
        </div>

        {/* محتوا: جدول‌ها */}
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
                {inventory.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.enterDate || "—"}</td>
                    <td>{r.exitDate || "—"}</td>
                    <td className="muted">{statusDisplay(r.status)}</td>
                    <td>{r.dest || "—"}</td>
                    <td>{r.size || "—"}</td>
                    <td>{r.qty || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {filteredIo.map((r) => (
                  <tr key={r.id} className={r.type === "in" ? "row-in" : "row-out"}>
                    <td>{r.name}</td>
                    <td>{r.code}</td>
                    <td>{r.enterDate || "—"}</td>
                    <td>{r.exitDate || "—"}</td>
                    <td>{statusDisplay(r.status)}</td>
                    <td>{r.dest || "—"}</td>
                    <td>{r.size || "—"}</td>
                  </tr>
                ))}
                {filteredIo.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#6b7280", padding: 16 }}>
                      نتیجه‌ای مطابق فیلترها یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال‌ها */}
      {showIn && <InModal onClose={() => setShowIn(false)} onSubmit={addIn} />}
      {showOut && <OutModal onClose={() => setShowOut(false)} onSubmit={addOut} />}
    </div>
  );
}

/* -------------------- مودال ثبت ورود -------------------- */
function InModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    enterDate: "",
    enterAtISO: "", // اگر خواستی به‌صورت دقیق بده؛ اگر خالی بود با now پر می‌شود
    status: "",
    size: "",
    fromWhere: "",
    note: "",
  });

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
            <input className="input" placeholder="نام تجهیز" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="کد تجهیز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="input" placeholder="تاریخ ورود (مثال 1403/07/12 10:15)" value={form.enterDate} onChange={(e) => setForm({ ...form, enterDate: e.target.value })} />
          </div>
          <div className="row">
            <input className="input" placeholder="از کجا آمده" value={form.fromWhere} onChange={(e) => setForm({ ...form, fromWhere: e.target.value })} />
            <input className="input" placeholder="وضعیت (تعمیر شده / بازرسی شده / —)" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            <input className="input" placeholder="سایز" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
          <textarea className="input" placeholder="توضیحات..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn success" onClick={() => onSubmit(form)}>ثبت ورود</button>
        </footer>
      </div>
    </div>
  );
}

/* -------------------- مودال ثبت خروج -------------------- */
function OutModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    exitDate: "",
    exitAtISO: "", // اگر خالی باشد با now پر می‌شود
    dest: "",
    size: "",
    carrier: "",
    planNo: "",
    driver: "",
    status: "",
    note: "",
  });

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
            <input className="input" placeholder="نام تجهیز" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="کد تجهیز" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="input" placeholder="تاریخ و ساعت خروج (مثال 1403/07/12 17:30)" value={form.exitDate} onChange={(e) => setForm({ ...form, exitDate: e.target.value })} />
          </div>
          <div className="row">
            <input className="input" placeholder="مقصد" value={form.dest} onChange={(e) => setForm({ ...form, dest: e.target.value })} />
            <input className="input" placeholder="سایز" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <input className="input" placeholder="مشخصات حمل کننده" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
          </div>
          <div className="row">
            <input className="input" placeholder="شماره برنامه" value={form.planNo} onChange={(e) => setForm({ ...form, planNo: e.target.value })} />
            <input className="input" placeholder="راننده" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
          </div>
          <textarea className="input" placeholder="توضیحات..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn danger" onClick={() => onSubmit(form)}>ثبت خروج</button>
        </footer>
      </div>
    </div>
  );
}
