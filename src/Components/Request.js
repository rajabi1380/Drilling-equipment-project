// src/Components/Request.js
import React, { useEffect, useMemo, useState } from "react";
import "./Request.css";

/* ✅ یوتیلیتی‌ها */
import { loadLS, saveLS } from "../utils/ls.js";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  fmtFa,
  toISO16,
} from "../utils/date.js";

/* ====== LocalStorage key ====== */
const LS_KEY = "requests_v1";

/* ====== شماره‌دهی دستورکار ====== */
const PREFIX = { wo: "WO", pm: "PM", ed: "ED" };
const makeOrderNo = (type, seq = 1) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${PREFIX[type] || "WO"}-${y}${m}${day}-${String(seq).padStart(3, "0")}`;
};

/* ====== صفحهٔ ثبت درخواست ====== */
export default function Request() {
  // بوت از حافظه (ساختار پایه)
  const boot = loadLS(LS_KEY, { open: [], archived: [], seq: 1 });

  const [openOrders, setOpenOrders] = useState(boot.open || []);
  const [archivedOrders, setArchivedOrders] = useState(boot.archived || []);
  const [seq, setSeq] = useState(boot.seq || 1);

  // ذخیره‌ی خودکار
  useEffect(
    () => saveLS(LS_KEY, { open: openOrders, archived: archivedOrders, seq }),
    [openOrders, archivedOrders, seq]
  );

  /* ---------- فیلترها ---------- */
  const [filterForm, setFilterForm] = useState({
    name: "",
    code: "",
    unit: "",
    wono: "",
  });
  const [applied, setApplied] = useState({
    name: "",
    code: "",
    unit: "",
    wono: "",
  });

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({ ...filterForm });
    setPageOpen(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", unit: "", wono: "" });
    setApplied({ name: "", code: "", unit: "", wono: "" });
    setPageOpen(1);
  };

  const filterFn = (r) => {
    const n = applied.name.trim().toLowerCase();
    const c = applied.code.trim().toLowerCase();
    const u = applied.unit.trim().toLowerCase();
    const w = applied.wono.trim().toLowerCase();
    return (
      (!n || (r.name || "").toLowerCase().includes(n)) &&
      (!c || (r.code || "").toLowerCase().includes(c)) &&
      (!u || (r.unit || "").toLowerCase().includes(u)) &&
      (!w || (r.orderNo || "").toLowerCase().includes(w))
    );
  };

  const filteredOpen = useMemo(
    () => openOrders.filter(filterFn),
    [openOrders, applied]
  );

  /* ---------- صفحه‌بندی (۱۵تایی) ---------- */
  const PAGE = 15;

  const [pageOpen, setPageOpen] = useState(1);
  const totalOpenPages = Math.max(1, Math.ceil(filteredOpen.length / PAGE));
  const openSlice = filteredOpen.slice((pageOpen - 1) * PAGE, pageOpen * PAGE);

  const [pageArc, setPageArc] = useState(1);
  const totalArcPages = Math.max(1, Math.ceil(archivedOrders.length / PAGE));
  const arcSlice = archivedOrders.slice((pageArc - 1) * PAGE, pageArc * PAGE);

  /* ---------- UI state ---------- */
  const [showOpenTable, setShowOpenTable] = useState(true);
  const [showArcTable, setShowArcTable] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // مودال تاریخچه تجهیز
  const [historyTarget, setHistoryTarget] = useState(null); // { code, name } | null

  /* ---------- Actions ---------- */
  const onCreate = (payload) => {
    const newSeq = seq + 1;
    const orderNo = makeOrderNo(payload.reqType, seq);

    const base = {
      id: Date.now(),
      orderNo,
      reqType: payload.reqType, // wo | pm | ed
      name: payload.name,
      code: payload.code,
      size: payload.size,
      unit: payload.unit || "", // واحد مقصد (اتوماتیک از تب)
      status: payload.status, // وضعیت قفل‌شده بر اساس تب
      startISO: toISO16(payload.startObj), // تاریخ درخواست/شروع
      endISO: toISO16(payload.endObj), // تاریخ پایان عملیات (اختیاری)
      desc: payload.desc || "",
      // فیلدهای قابل‌افزایش: acts[], delayHours, delayReason ...
    };
    const extra = payload.extra || {};

    const next = [{ ...base, ...extra }, ...openOrders];
    setOpenOrders(next);
    setSeq(newSeq);
    setShowModal(false);
    setShowOpenTable(true);
  };

  const completeAndArchive = (id) => {
    setOpenOrders((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];
      const rest = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      setArchivedOrders((a) => [{ ...item, status: "پایان" }, ...a]);
      return rest;
    });
  };

  return (
    <div className="rq-page" dir="rtl">
      <div className="rq-card">
        {/* فیلترها */}
        <form className="rq-filter" onSubmit={applyFilters}>
          <div className="grid">
            <div className="item">
              <label>نام تجهیز</label>
              <input
                className="input"
                value={filterForm.name}
                onChange={(e) =>
                  setFilterForm((v) => ({ ...v, name: e.target.value }))
                }
              />
            </div>
            <div className="item">
              <label>کد تجهیز</label>
              <input
                className="input"
                value={filterForm.code}
                onChange={(e) =>
                  setFilterForm((v) => ({ ...v, code: e.target.value }))
                }
              />
            </div>
            <div className="item">
              <label>واحد مقصد</label>
              <input
                className="input"
                value={filterForm.unit}
                onChange={(e) =>
                  setFilterForm((v) => ({ ...v, unit: e.target.value }))
                }
              />
            </div>
            <div className="item">
              <label>شماره دستورکار</label>
              <input
                className="input"
                value={filterForm.wono}
                onChange={(e) =>
                  setFilterForm((v) => ({ ...v, wono: e.target.value }))
                }
              />
            </div>
            <div className="item apply">
              <label>&nbsp;</label>
              <div className="row">
                <button type="submit" className="btn primary">
                  اعمال فیلتر
                </button>
                <button type="button" className="btn" onClick={clearFilters}>
                  حذف فیلتر
                </button>
                <button
                  type="button"
                  className="btn success"
                  onClick={() => setShowModal(true)}
                >
                  ثبت درخواست
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* جدول دستورکارهای باز (کشویی) */}
        <section className="section">
          <header className="sec-hdr" onClick={() => setShowOpenTable((v) => !v)}>
            <b>دستورکارهای باز</b>
            <span className="muted">({openOrders.length})</span>
            <span className="chev">{showOpenTable ? "▾" : "▸"}</span>
          </header>

          {showOpenTable && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>شماره دستورکار</th>
                      <th>نام تجهیز</th>
                      <th>وضعیت</th>
                      <th>واحد مقصد</th>
                      <th>تاریخ شروع عملیات</th>
                      <th>تاریخ پایان</th>
                      <th>نوع درخواست</th>
                      <th>توضیحات</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openSlice.length ? (
                      openSlice.map((r) => (
                        <tr key={r.id}>
                          <td>{r.orderNo}</td>
                          <td>{r.name}</td>
                          <td>{r.status}</td>
                          <td>{r.unit || "—"}</td>
                          <td>{fmtFa(r.startISO) || "—"}</td>
                          <td>{fmtFa(r.endISO) || "—"}</td>
                          <td>{(r.reqType || "").toUpperCase()}</td>
                          <td className="muted">{r.desc || "—"}</td>
                          <td>
                            <button
                              className="btn small"
                              onClick={() => completeAndArchive(r.id)}
                            >
                              تکمیل / بایگانی
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="empty">
                          موردی ثبت نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* صفحه‌بندی بازها */}
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

              <div className="sum">
                تعداد درخواست‌های باز: <b>{openOrders.length}</b>
              </div>
            </>
          )}
        </section>

        {/* جدول دستورکارهای بایگانی‌شده (کشویی) */}
        <section className="section">
          <header className="sec-hdr" onClick={() => setShowArcTable((v) => !v)}>
            <b>دستورکارهای بایگانی‌شده</b>
            <span className="muted">({archivedOrders.length})</span>
            <span className="chev">{showArcTable ? "▾" : "▸"}</span>
          </header>

          {showArcTable && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>شماره دستورکار</th>
                      <th>نام تجهیز</th>
                      <th>کد تجهیز</th>
                      <th>وضعیت</th>
                      <th>واحد مقصد</th>
                      <th>تاریخ شروع</th>
                      <th>تاریخ پایان</th>
                      <th>نوع درخواست</th>
                      <th>توضیحات</th>
                      <th>تاریخچه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arcSlice.length ? (
                      arcSlice.map((r) => (
                        <tr key={r.id}>
                          <td>{r.orderNo}</td>
                          <td>{r.name}</td>
                          <td>{r.code}</td>
                          <td>{r.status}</td>
                          <td>{r.unit || "—"}</td>
                          <td>{fmtFa(r.startISO) || "—"}</td>
                          <td>{fmtFa(r.endISO) || "—"}</td>
                          <td>{(r.reqType || "").toUpperCase()}</td>
                          <td className="muted">{r.desc || "—"}</td>
                          <td>
                            <button
                              className="btn small"
                              type="button"
                              title="نمایش تاریخچه تجهیز"
                              onClick={() =>
                                setHistoryTarget({ code: r.code, name: r.name })
                              }
                            >
                              🛈 مشخصات
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="empty">
                          موردی در آرشیو نیست
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* صفحه‌بندی آرشیو */}
              <div className="pagi">
                <button
                  className="btn"
                  disabled={pageArc === 1}
                  onClick={() => setPageArc(1)}
                >
                  « اول
                </button>
                <button
                  className="btn"
                  disabled={pageArc === 1}
                  onClick={() => setPageArc((p) => p - 1)}
                >
                  ‹ قبلی
                </button>
                <span className="muted">
                  {pageArc}/{totalArcPages}
                </span>
                <button
                  className="btn"
                  disabled={pageArc === totalArcPages}
                  onClick={() => setPageArc((p) => p + 1)}
                >
                  بعدی ›
                </button>
                <button
                  className="btn"
                  disabled={pageArc === totalArcPages}
                  onClick={() => setPageArc(totalArcPages)}
                >
                  آخر »
                </button>
              </div>

              <div className="sum">
                تعداد بایگانی: <b>{archivedOrders.length}</b>
              </div>
            </>
          )}
        </section>
      </div>

      {/* مودال ساخت درخواست */}
      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} onSubmit={onCreate} />
      )}

      {/* مودال تاریخچهٔ تجهیز */}
      {historyTarget && (
        <HistoryModal
          target={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

/* ====== Modal: ثبت درخواست (۲ تب) ====== */
function RequestModal({ onClose, onSubmit }) {
  // تب‌ها: تراشکاری | بازرسی
  const [tab, setTab] = useState("turning"); // turning | inspection
  const [reqType, setReqType] = useState("wo"); // wo | pm | ed

  // فیلدهای مشترک
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState("تراشکاری"); // بر اساس تب، اتوماتیک
  const [startObj, setStartObj] = useState(null);
  const [endObj, setEndObj] = useState(null);
  const [desc, setDesc] = useState("");

  // اختصاصی تراشکاری
  const [failureName, setFailureName] = useState("");
  const [failureCode, setFailureCode] = useState("");

  // تغییر تب ⇒ وضعیت/واحد مقصد اتوماتیک
  const status = tab === "inspection" ? "در انتظار بازرسی" : "در انتظار تعمیر";
  useEffect(() => {
    setUnit(tab === "inspection" ? "بازرسی" : "تراشکاری");
  }, [tab]);

  const touched = {
    name: !name.trim(),
    code: !code.trim(),
    size: !size.trim(),
  };
  const invalid = touched.name || touched.code || touched.size;

  const submit = () => {
    if (invalid) return;
    const payload = {
      reqType,
      name,
      code,
      size,
      unit,
      status, // ← ثابت طبق تب
      startObj,
      endObj,
      desc,
      extra: {},
    };
    if (tab === "turning") {
      payload.extra = { failureName, failureCode };
    }
    onSubmit(payload);
  };

  return (
    <div className="rq-backdrop" onClick={onClose}>
      <div className="rq-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="rq-modal__hdr">
          <b>جزئیات درخواست</b>
          <button className="rq-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {/* نوع درخواست */}
        <div className="rq-type">
          <span>نوع درخواست:</span>
          <div className="rq-type__grp">
            {["wo", "pm", "ed"].map((t) => (
              <button
                key={t}
                className={`btn chip ${reqType === t ? "primary" : ""}`}
                onClick={() => setReqType(t)}
                type="button"
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* تب‌ها */}
        <div className="rq-tabs">
          <button
            className={`tab ${tab === "turning" ? "is-active" : ""}`}
            onClick={() => setTab("turning")}
          >
            تراشکاری
          </button>
          <button
            className={`tab ${tab === "inspection" ? "is-active" : ""}`}
            onClick={() => setTab("inspection")}
          >
            بازرسی
          </button>
        </div>

        {/* فرم مشترک */}
        <div className="form">
          <div className="row">
            <div className="col">
              <input
                className={`input ${touched.name ? "err" : ""}`}
                placeholder="* نام تجهیز"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {touched.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input
                className={`input ${touched.code ? "err" : ""}`}
                placeholder="* کد تجهیز"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {touched.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input
                className={`input ${touched.size ? "err" : ""}`}
                placeholder="* سایز"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
              {touched.size && <small className="err-msg">الزامی</small>}
            </div>
          </div>

          <div className="row">
            <input className="input" value={unit} readOnly disabled />
            <input className="input" value={status} readOnly disabled />
            <DatePicker
              value={startObj}
              onChange={setStartObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ درخواست/شروع"
            />
          </div>

          <div className="row">
            <DatePicker
              value={endObj}
              onChange={setEndObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ پایان عملیات"
            />
          </div>

          {/* فیلدهای اختصاصی تب‌ها */}
          {tab === "turning" && (
            <div className="row">
              <input
                className="input"
                placeholder="نام خرابی"
                value={failureName}
                onChange={(e) => setFailureName(e.target.value)}
              />
              <input
                className="input"
                placeholder="کد خرابی"
                value={failureCode}
                onChange={(e) => setFailureCode(e.target.value)}
              />
            </div>
          )}

          <textarea
            className="input"
            placeholder="توضیحات..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <footer className="rq-modal__ftr">
          <button className="btn" onClick={onClose}>
            بستن
          </button>
          <button className="btn success" disabled={invalid} onClick={submit}>
            ثبت
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ====== Modal: تاریخچه فقط‌خواندنی ====== */
function HistoryModal({ target, onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const data = loadLS(LS_KEY, { open: [], archived: [] });
      const all = [...(data.open || []), ...(data.archived || [])];
      const items = all
        .filter((x) => (x.code || "") === (target.code || ""))
        .sort((a, b) => (a.startISO || "").localeCompare(b.startISO || ""));
      setHistory(items);
    } catch {
      setHistory([]);
    }
  }, [target]);

  return (
    <div className="rq-backdrop" onClick={onClose}>
      <div
        className="rq-modal rq-history"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rq-modal__hdr">
          <b>
            تاریخچه تجهیز: {target.name || "—"} ({target.code || "—"})
          </b>
          <button className="rq-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {history.length === 0 ? (
          <div className="empty" style={{ padding: "12px" }}>
            سابقه‌ای برای این تجهیز یافت نشد.
          </div>
        ) : (
          <div className="history-list">
            {history.map((r) => (
              <div key={r.id} className="history-card">
                <div className="row">
                  <div className="hc-field">
                    <span>شماره دستورکار:</span> <b>{r.orderNo || "—"}</b>
                  </div>
                  <div className="hc-field">
                    <span>واحد مقصد:</span> {r.unit || "—"}
                  </div>
                  <div className="hc-field">
                    <span>نوع درخواست:</span> {(r.reqType || "").toUpperCase()}
                  </div>
                </div>
                <div className="row">
                  <div className="hc-field">
                    <span>وضعیت:</span> {r.status || "—"}
                  </div>
                  <div className="hc-field">
                    <span>شروع:</span> {fmtFa(r.startISO) || "—"}
                  </div>
                  <div className="hc-field">
                    <span>پایان:</span> {fmtFa(r.endISO) || "—"}
                  </div>
                </div>

                <div className="hc-block">
                  <div className="hc-title">فعالیت‌های صورت‌گرفته</div>
                  {r.acts && r.acts.length ? (
                    <div className="acts">
                      {r.acts.map((a, i) => (
                        <div className="act-row" key={i}>
                          <div>
                            <span>تعمیرکار:</span> {a.who || "—"}
                          </div>
                          <div>
                            <span>قطعه:</span> {a.part || "—"}
                          </div>
                          <div>
                            <span>تعداد:</span> {a.qty ?? "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted">ثبت نشده</div>
                  )}
                </div>

                <div className="hc-block">
                  <div className="hc-title">تاخیر</div>
                  <div className="row">
                    <div className="hc-field">
                      <span>مدت تاخیر (ساعت):</span> {r.delayHours ?? "—"}
                    </div>
                    <div className="hc-field">
                      <span>علت:</span> {r.delayReason || "—"}
                    </div>
                  </div>
                </div>

                <div className="hc-block">
                  <div className="hc-title">توضیحات</div>
                  <div className="muted">{r.desc || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="rq-modal__ftr">
          <button className="btn" onClick={onClose}>
            بستن
          </button>
        </footer>
      </div>
    </div>
  );
}
