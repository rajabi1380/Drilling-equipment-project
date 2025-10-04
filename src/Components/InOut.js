// src/Components/InOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./Inout.css";

/* یوتیلیتی‌های تاریخ و لوکال‌استوریج */
import { loadLS, saveLS } from "../utils/ls";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  fmtFa,
  toISO16,
} from "../utils/date";

/* ---------- کلید ذخیره محلی ---------- */
const LS_KEY = "inout_v3";

/* دکل‌ها (برای مدال دکل‌به‌دکل) */
const RIGS = ["دکل 13", "دکل 21", "دکل 24", "دکل 28", "دکل 31"];

/* موجودی کل = مجموع ورودها − مجموع خروج‌ها (انتقال دکل روی موجودی کل انبار اثری ندارد) */
const computeTotalStock = (rows) =>
  Math.max(
    0,
    rows.reduce((sum, r) => {
      if (r.type === "in") return sum + 1;
      if (r.type === "out") return sum - 1;
      return sum;
    }, 0)
  );

/* موجودی هر قطعه (بر اساس name+code+size) */
const buildItemStocks = (rows) => {
  const map = new Map();
  for (const r of rows) {
    // انتقال دکل را در موجودی انبار لحاظ نکن (می‌خوای می‌تونی تغییر بدی)
    if (r.type !== "in" && r.type !== "out") continue;
    const key = `${(r.name || "").trim()}|${(r.code || "").trim()}|${(r.size || "").trim()}`;
    map.set(key, (map.get(key) || 0) + (r.type === "in" ? 1 : -1));
  }
  // تبدیل به آرایه برای جدول
  return Array.from(map.entries()).map(([k, qty]) => {
    const [name, code, size] = k.split("|");
    return { name, code, size, qty: Math.max(0, qty) };
  });
};

export default function InOut() {
  /* تب‌ها: inventory | inout | rig */
  const [active, setActive] = useState("inout");

  /* بوت از LocalStorage */
  const boot = loadLS(LS_KEY, { ioRows: [], thresholds: {} });

  /* آستانه‌ها (حد نرمال هر قطعه) — به ازای code+size مثلا */
  const [thresholds, setThresholds] = useState(boot.thresholds || {}); // { "EQ-1|5\"": 3, ... }

  /* لیست ردیف‌ها: ورود/خروج/انتقال دکل */
  const [ioRows, setIoRows] = useState(boot.ioRows || []);

  /* ذخیره خودکار */
  useEffect(() => {
    saveLS(LS_KEY, { ioRows, thresholds });
  }, [ioRows, thresholds]);

  /* فیلتر مشترک بالای همه تب‌ها */
  const [filterForm, setFilterForm] = useState({
    name: "",
    code: "",
    fromDate: null, // DateObject
    toDate: null,   // DateObject
  });
  const [applied, setApplied] = useState({
    name: "",
    code: "",
    fromISO: "",
    toISO: "",
  });

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({
      name: filterForm.name.trim(),
      code: filterForm.code.trim(),
      fromISO: toISO16(filterForm.fromDate),
      toISO: toISO16(filterForm.toDate),
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", fromDate: null, toDate: null });
    setApplied({ name: "", code: "", fromISO: "", toISO: "" });
    setPage(1);
  };

  /* فیلتر روی ioRows */
  const filtered = useMemo(() => {
    const f = applied;
    return ioRows.filter((r) => {
      const okName = !f.name || (r.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || (r.code || "").toLowerCase().includes(f.code.toLowerCase());

      // بازه تاریخ: برای ورود/خروج از enterAtISO/exitAtISO؛ برای دکل به دکل از reqAtISO/arriveAtISO
      const startISO = r.enterAtISO || r.reqAtISO || "";
      const endISO   = r.exitAtISO  || r.arriveAtISO || "";

      const okFrom = !f.fromISO || (startISO && startISO >= f.fromISO);
      const okTo   = !f.toISO   || (!endISO || endISO <= f.toISO);

      return okName && okCode && okFrom && okTo;
    });
  }, [ioRows, applied]);

  /* صفحه‌بندی برای هر تب */
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = filtered.slice(pageStart, pageStart + pageSize);

  const goFirst = () => setPage(1);
  const goPrev  = () => setPage((p) => Math.max(1, p - 1));
  const goNext  = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast  = () => setPage(totalPages);

  /* موجودی کل + موجودی اقلام برای تب موجودی */
  const totalStock = useMemo(() => computeTotalStock(ioRows), [ioRows]);
  const itemStocks = useMemo(() => buildItemStocks(ioRows), [ioRows]);

  /* تعیین کمبود موجودی‌ها (برای نوتی و هایلایت) */
  const lowStockItems = useMemo(() => {
    return itemStocks.filter((it) => {
      const thrKey = `${it.code}|${it.size}`;
      const thr = thresholds[thrKey] ?? 3; // پیش‌فرض 3
      return it.qty < thr;
    });
  }, [itemStocks, thresholds]);

  /* مودال‌ها */
  const [showIn, setShowIn]     = useState(false);
  const [showOut, setShowOut]   = useState(false);
  const [showRig, setShowRig]   = useState(false);

  /* افزودن رکوردهای جدید */
  const addIn = (payload) => {
    const enter = toISO16(payload.enterDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "in",
        name: payload.name,
        code: payload.code,
        size: payload.size,
        enterAtISO: enter,
        exitAtISO: "",
        status: payload.status,
        dest: payload.fromWhere || "—",
        note: payload.note || "",
      },
      ...prev,
    ]);
  };

  const addOut = (payload) => {
    const exit = toISO16(payload.exitDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "out",
        name: payload.name,
        code: payload.code,
        size: payload.size,
        enterAtISO: "",
        exitAtISO: exit,
        status: payload.status,
        dest: payload.dest || "—",
        carrier: payload.carrier || "",
        planNo: payload.planNo || "",
        driver: payload.driver || "",
        note: payload.note || "",
        bandgiri: !!payload.bandgiri,
      },
      ...prev,
    ]);
  };

  const addRig = (payload) => {
    const reqISO    = toISO16(payload.reqAtObj) || new Date().toISOString().slice(0, 16);
    const arriveISO = toISO16(payload.arriveAtObj) || "";
    setIoRows((prev) => [
      {
        id: Date.now(),
        type: "rig",
        name: payload.name,
        code: payload.code,
        size: payload.size,
        reqAtISO: reqISO,
        arriveAtISO: arriveISO,
        rigFrom: payload.rigFrom || "",
        rigTo: payload.rigTo || "",
        requester: payload.requester || "",
        inspector: payload.inspector || "",
        inspectAtISO: toISO16(payload.inspectAtObj) || "",
        note: payload.note || "",
      },
      ...prev,
    ]);
  };

  const statusDisplay = (s) => (!s || s.trim() === "" ? "—" : s);

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {/* نوتیفیکیشن کمبود موجودی (همیشگی تا رفع کمبود) */}
        {lowStockItems.length > 0 && (
          <div className="alert warn">
            <div className="alert-title">کمبود موجودی</div>
            <div className="alert-body">
              {lowStockItems.slice(0, 3).map((x, i) => (
                <span key={i} className="badge">
                  {x.name} / {x.code} / سایز {x.size} → {x.qty}
                </span>
              ))}
              {lowStockItems.length > 3 && (
                <span className="muted"> و {lowStockItems.length - 3} مورد دیگر...</span>
              )}
            </div>
          </div>
        )}

        {/* تب‌ها */}
        <div className="tabs">
          <button className={`tab ${active === "inout" ? "is-active" : ""}`} onClick={() => { setActive("inout"); setPage(1); }}>
            ورود و خروج
          </button>
          <span className="divider">|</span>
          <button className={`tab ${active === "rig" ? "is-active" : ""}`} onClick={() => { setActive("rig"); setPage(1); }}>
            دکل به دکل
          </button>
          <span className="divider">|</span>
          <button className={`tab ${active === "inventory" ? "is-active" : ""}`} onClick={() => { setActive("inventory"); setPage(1); }}>
            موجودی هر قطعه
          </button>
        </div>

        {/* فیلتر مشترک بالا */}
        <form className="io-filter" onSubmit={applyFilters}>
          <div className="io-filter__fields">
            <div className="f-item">
              <label>نام تجهیز</label>
              <input
                className="input"
                value={filterForm.name}
                onChange={(e) => setFilterForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="مثلاً Kelly"
              />
            </div>
            <div className="f-item">
              <label>کد تجهیز</label>
              <input
                className="input"
                value={filterForm.code}
                onChange={(e) => setFilterForm((v) => ({ ...v, code: e.target.value }))}
                placeholder="مثلاً EQ-1027"
              />
            </div>
            <div className="f-item">
              <label>از تاریخ</label>
              <DatePicker
                value={filterForm.fromDate}
                onChange={(val) => setFilterForm((v) => ({ ...v, fromDate: val }))}
                calendar={persian}
                locale={persian_fa}
                format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input"
                containerClassName="rmdp-rtl"
              />
            </div>
            <div className="f-item">
              <label>تا تاریخ</label>
              <DatePicker
                value={filterForm.toDate}
                onChange={(val) => setFilterForm((v) => ({ ...v, toDate: val }))}
                calendar={persian}
                locale={persian_fa}
                format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input"
                containerClassName="rmdp-rtl"
              />
            </div>
            <div className="f-item f-apply">
              <label>&nbsp;</label>
              <div className="btnrow">
                <button type="submit" className="btn primary">اعمال فیلتر</button>
                <button type="button" className="btn" onClick={clearFilters}>حذف فیلتر</button>
              </div>
            </div>
          </div>

          {/* دکمه‌های مخصوص هر تب (مشترک نیستند) */}
          <div className="io-filter__actions">
            {active === "inout" && (
              <>
                <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
                <button type="button" className="btn danger" onClick={() => setShowOut(true)}>ثبت خروج</button>
              </>
            )}
            {active === "rig" && (
              <button type="button" className="btn warn" onClick={() => setShowRig(true)}>
                ثبت دکل به دکل
              </button>
            )}
            {/* برای موجودی، دکمه عملیاتی نشان نده */}
          </div>
        </form>

        {/* ابزار جدول */}
        <div className="table-toolbar">
          <button className="btn ghost" onClick={() => alert("گزارش‌گیری (نمونه)")}>⬇️ گزارش‌گیری</button>
          <button
            className="btn"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              window.location.reload();
            }}
          >
            پاک‌سازی دادهٔ محلی
          </button>
        </div>

        {/* جدول‌ها */}
        {active === "inout" && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th>
                    <th>کد تجهیز</th>
                    <th>تاریخ ورود</th>
                    <th>تاریخ خروج</th>
                    <th>وضعیت</th>
                    <th>مقصد</th>
                    <th>سایز</th>
                    <th>بندگیری</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length ? (
                    pagedRows.map((r) => (
                      <tr key={r.id} className={r.type === "in" ? "row-in" : r.type === "out" ? "row-out" : ""}>
                        <td>{r.name}</td>
                        <td>{r.code}</td>
                        <td>{fmtFa(r.enterAtISO) || "—"}</td>
                        <td>{fmtFa(r.exitAtISO) || "—"}</td>
                        <td>{statusDisplay(r.status)}</td>
                        <td>{r.dest || "—"}</td>
                        <td>{r.size || "—"}</td>
                        <td style={{ textAlign: "center" }}>{r.bandgiri ? "✓" : "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={8} className="empty">موردی ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحه‌بندی */}
            <div className="pagi" dir="rtl">
              <button className="btn" onClick={goFirst} disabled={page === 1}>« اول</button>
              <button className="btn" onClick={goPrev}  disabled={page === 1}>‹ قبلی</button>
              <span className="muted">{page}/{totalPages}</span>
              <button className="btn" onClick={goNext} disabled={page === totalPages}>بعدی ›</button>
              <button className="btn" onClick={goLast} disabled={page === totalPages}>آخر »</button>
              <span className="muted">{filtered.length ? `${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} از ${filtered.length}` : "0 از 0"}</span>
            </div>

            {/* موجودی کل انبار (هوک از قبل محاسبه شده) */}
            <div className="total-stock">موجودی کل انبار: {totalStock} عدد</div>
          </>
        )}

        {active === "rig" && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th>
                    <th>کد تجهیز</th>
                    <th>سایز</th>
                    <th>دکل مبدأ</th>
                    <th>دکل مقصد</th>
                    <th>تاریخ درخواست</th>
                    <th>تاریخ رسیدن</th>
                    <th>نام درخواست‌کننده</th>
                    <th>نام بازرس</th>
                    <th>تاریخ بازرسی</th>
                    <th>توضیحات</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length ? (
                    pagedRows.map((r) => (
                      r.type === "rig" ? (
                        <tr key={r.id} className="row-rig">
                          <td>{r.name}</td>
                          <td>{r.code}</td>
                          <td>{r.size || "—"}</td>
                          <td>{r.rigFrom || "—"}</td>
                          <td>{r.rigTo || "—"}</td>
                          <td>{fmtFa(r.reqAtISO) || "—"}</td>
                          <td>{fmtFa(r.arriveAtISO) || "—"}</td>
                          <td>{r.requester || "—"}</td>
                          <td>{r.inspector || "—"}</td>
                          <td>{fmtFa(r.inspectAtISO) || "—"}</td>
                          <td className="muted">{r.note || "—"}</td>
                        </tr>
                      ) : null
                    ))
                  ) : (
                    <tr><td colSpan={11} className="empty">موردی ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* صفحه‌بندی + شمارش کل موارد این تب */}
            <div className="pagi" dir="rtl">
              <button className="btn" onClick={goFirst} disabled={page === 1}>« اول</button>
              <button className="btn" onClick={goPrev}  disabled={page === 1}>‹ قبلی</button>
              <span className="muted">{page}/{totalPages}</span>
              <button className="btn" onClick={goNext} disabled={page === totalPages}>بعدی ›</button>
              <button className="btn" onClick={goLast} disabled={page === totalPages}>آخر »</button>
              <span className="muted">{filtered.filter(r => r.type === "rig").length} درخواست دکل به دکل</span>
            </div>
          </>
        )}

        {active === "inventory" && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th>
                    <th>کد تجهیز</th>
                    <th>سایز</th>
                    <th>موجودی هر قطعه</th>
                  </tr>
                </thead>
                <tbody>
                  {itemStocks.length ? (
                    itemStocks.map((it, idx) => {
                      const thrKey = `${it.code}|${it.size}`;
                      const thr = thresholds[thrKey] ?? 3;
                      const low = it.qty < thr;
                      return (
                        <tr key={idx} className={low ? "row-low" : ""}>
                          <td>{it.name}</td>
                          <td>{it.code}</td>
                          <td>{it.size}</td>
                          <td>
                            <span className={`qty-badge ${low ? "is-low" : ""}`}>
                              {it.qty}
                            </span>
                            <small className="muted" style={{ marginInlineStart: 8 }}>
                              حد نرمال: {thr}
                            </small>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4} className="empty">موردی ثبت نشده است</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* توضیح: می‌تونی UI برای تغییر Threshold هم اضافه کنی */}
          </>
        )}
      </div>

      {/* مودال‌ها */}
      {showIn && (
        <InModal
          onClose={() => setShowIn(false)}
          onSubmit={(p) => { addIn(p); setShowIn(false); }}
        />
      )}
      {showOut && (
        <OutModal
          onClose={() => setShowOut(false)}
          onSubmit={(p) => { addOut(p); setShowOut(false); }}
        />
      )}
      {showRig && (
        <RigModal
          rigs={RIGS}
          onClose={() => setShowRig(false)}
          onSubmit={(p) => { addRig(p); setShowRig(false); }}
        />
      )}
    </div>
  );
}

/* ------------------ مودال‌ها ------------------ */

function InModal({ onClose, onSubmit }) {
  // برای نمایش خطای الزامی از ابتدا:
  const [touched] = useState(true);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [enterDateObj, setEnterDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [fromWhere, setFromWhere] = useState("");
  const [note, setNote] = useState("");

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    if (hasError) return;
    onSubmit({ name, code, size, enterDateObj, status, fromWhere, note });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="modal__hdr">
          <div className="modal__title">ثبت ورود</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && missing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
              {touched && missing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e) => setSize(e.target.value)} />
              {touched && missing.size && <small className="err-msg">الزامی</small>}
            </div>
          </div>

          <div className="row">
            <DatePicker
              value={enterDateObj}
              onChange={setEnterDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت ورود"
            />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>
            <input className="input" placeholder="از کجا آمده" value={fromWhere} onChange={(e) => setFromWhere(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn success" onClick={submit} disabled={hasError}>ثبت ورود</button>
        </footer>
      </div>
    </div>
  );
}

function OutModal({ onClose, onSubmit }) {
  const [touched] = useState(true);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [exitDateObj, setExitDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [dest, setDest] = useState("");
  const [carrier, setCarrier] = useState("");
  const [planNo, setPlanNo] = useState("");
  const [driver, setDriver] = useState("");
  const [bandgiri, setBandgiri] = useState(false);
  const [note, setNote] = useState("");

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    if (hasError) return;
    onSubmit({
      name, code, size, exitDateObj, status, dest, carrier, planNo, driver, bandgiri, note
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="modal__hdr">
          <div className="modal__title">ثبت خروج</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && missing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
              {touched && missing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e) => setSize(e.target.value)} />
              {touched && missing.size && <small className="err-msg">الزامی</small>}
            </div>
          </div>

          <div className="row">
            <DatePicker
              value={exitDateObj}
              onChange={setExitDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت خروج"
            />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>
            <label className="input checkbox">
              <input type="checkbox" checked={bandgiri} onChange={(e) => setBandgiri(e.target.checked)} />
              بندگیری
            </label>
          </div>

          <div className="row">
            <input className="input" placeholder="مقصد" value={dest} onChange={(e) => setDest(e.target.value)} />
            <input className="input" placeholder="مشخصات حمل کننده" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <input className="input" placeholder="شماره برنامه" value={planNo} onChange={(e) => setPlanNo(e.target.value)} />
          </div>

          <div className="row">
            <input className="input" placeholder="راننده" value={driver} onChange={(e) => setDriver(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn danger" onClick={submit} disabled={hasError}>ثبت خروج</button>
        </footer>
      </div>
    </div>
  );
}

function RigModal({ rigs, onClose, onSubmit }) {
  const [touched] = useState(true);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");

  const [reqAtObj, setReqAtObj] = useState(null);
  const [arriveAtObj, setArriveAtObj] = useState(null);
  const [rigFrom, setRigFrom] = useState("");
  const [rigTo, setRigTo] = useState("");

  const [requester, setRequester] = useState("");
  const [inspector, setInspector] = useState("");
  const [inspectAtObj, setInspectAtObj] = useState(null);
  const [note, setNote] = useState("");

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    if (hasError) return;
    onSubmit({
      name, code, size,
      reqAtObj, arriveAtObj,
      rigFrom, rigTo,
      requester, inspector, inspectAtObj,
      note
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <header className="modal__hdr">
          <div className="modal__title">ثبت دکل به دکل</div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <div className="col">
              <input className={`input ${touched && missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && missing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
              {touched && missing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${touched && missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e) => setSize(e.target.value)} />
              {touched && missing.size && <small className="err-msg">الزامی</small>}
            </div>
          </div>

          <div className="row">
            <DatePicker
              value={reqAtObj}
              onChange={setReqAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت درخواست"
            />
            <DatePicker
              value={arriveAtObj}
              onChange={setArriveAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت رسیدن"
            />
            <select className="input" value={rigFrom} onChange={(e) => setRigFrom(e.target.value)}>
              <option value="">دکل مبدأ</option>
              {rigs.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="row">
            <select className="input" value={rigTo} onChange={(e) => setRigTo(e.target.value)}>
              <option value="">دکل مقصد</option>
              {rigs.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="input" placeholder="نام درخواست‌کننده" value={requester} onChange={(e) => setRequester(e.target.value)} />
            <input className="input" placeholder="نام بازرس" value={inspector} onChange={(e) => setInspector(e.target.value)} />
          </div>

          <div className="row">
            <DatePicker
              value={inspectAtObj}
              onChange={setInspectAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ بازرسی"
            />
            <div className="col" />
            <div className="col" />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <footer className="modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn warn" onClick={submit} disabled={hasError}>ثبت دکل به دکل</button>
        </footer>
      </div>
    </div>
  );
}
