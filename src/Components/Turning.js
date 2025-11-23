import React, { useEffect, useMemo, useState } from "react";
import "./Turning.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { LS_TURN, FINISH_STATES } from "../utils/turning";

const faFmt = "YYYY/MM/DD HH:mm";
const toISO16 = (dObj) => (dObj ? new Date(dObj.toDate()).toISOString().slice(0, 16) : "");
const fmtFa = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(",", "");
};

export default function Turning({ storageKey = LS_TURN, unitFilter = "تراشکاری" }) {
  const loadStore = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : { open: [], archived: [], seq: 1 };
    } catch {
      return { open: [], archived: [], seq: 1 };
    }
  };
  const saveStore = (data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  };

  const boot = loadStore();
  const [openOrders, setOpenOrders] = useState(boot.open || []);
  const [archivedOrders, setArchivedOrders] = useState(boot.archived || []);
  const [view, setView] = useState("open"); // open | archived

  useEffect(() => {
    const current = loadStore();
    saveStore({ ...(current || { seq: 1 }), open: openOrders, archived: archivedOrders });
  }, [openOrders, archivedOrders, storageKey]);

  const openTurning = useMemo(
    () => openOrders.filter((r) => (r.unit || unitFilter) === unitFilter),
    [openOrders, unitFilter]
  );
  const archivedTurning = useMemo(
    () => archivedOrders.filter((r) => (r.unit || unitFilter) === unitFilter),
    [archivedOrders, unitFilter]
  );

  const [filterForm, setFilterForm] = useState({ name: "", code: "", startFrom: null, endTo: null });
  const [applied, setApplied] = useState({ name: "", code: "", startISO: "", endISO: "" });

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({
      name: filterForm.name.trim(),
      code: filterForm.code.trim(),
      startISO: toISO16(filterForm.startFrom),
      endISO: toISO16(filterForm.endTo),
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilterForm({ name: "", code: "", startFrom: null, endTo: null });
    setApplied({ name: "", code: "", startISO: "", endISO: "" });
    setPage(1);
  };

  const applyFilterList = (list) => {
    const f = applied;
    return list.filter((r) => {
      const okName = !f.name || (r.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okCode = !f.code || (r.code || "").toLowerCase().includes(f.code.toLowerCase());
      const okStart = !f.startISO || (r.startISO && r.startISO >= f.startISO);
      const okEnd = !f.endISO || !r.endISO || r.endISO <= f.endISO;
      return okName && okCode && okStart && okEnd;
    });
  };

  const PAGE = 15;
  const [page, setPage] = useState(1);
  const filteredOpen = useMemo(() => applyFilterList(openTurning), [openTurning, applied]);
  const filteredArchived = useMemo(() => applyFilterList(archivedTurning), [archivedTurning, applied]);
  const currentList = view === "open" ? filteredOpen : filteredArchived;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PAGE));
  const slice = currentList.slice((page - 1) * PAGE, page * PAGE);
  useEffect(() => setPage(1), [view]);

  const [editing, setEditing] = useState(null);
  const updateRecord = (updated) => {
    const isFinished = FINISH_STATES.has(String(updated.status || "").trim().toLowerCase());
    if (isFinished) {
      setOpenOrders((prev) => prev.filter((x) => x.id !== updated.id));
      setArchivedOrders((prev) => [{ ...updated }, ...prev]);
    } else {
      setOpenOrders((prev) => prev.map((x) => (x.id === updated.id ? { ...updated } : x)));
      setArchivedOrders((prev) => prev.filter((x) => x.id !== updated.id));
    }
  };

  const headers = ["شماره دستورکار", "نام تجهیز", "کد", "وضعیت", "تاریخ شروع", "تاریخ پایان", "نوع درخواست", "توضیحات", "ویرایش"];

  return (
    <div className="tg-page" dir="rtl">
      <div className="tg-card">
        <header className="tg-hdr">
          <h3>پنل واحد تراشکاری</h3>
        </header>

        <form className="io-filter" onSubmit={applyFilters}>
          <div className="io-filter__fields">
            <div className="f-item">
              <label>نام تجهیز</label>
              <input className="input" value={filterForm.name} onChange={(e) => setFilterForm((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="f-item">
              <label>کد تجهیز</label>
              <input className="input" value={filterForm.code} onChange={(e) => setFilterForm((v) => ({ ...v, code: e.target.value }))} />
            </div>
            <div className="f-item">
              <label>تاریخ شروع (از)</label>
              <DatePicker
                value={filterForm.startFrom}
                onChange={(val) => setFilterForm((v) => ({ ...v, startFrom: val }))}
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
                onChange={(val) => setFilterForm((v) => ({ ...v, endTo: val }))}
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

        <div className="switch-tabs">
          <button className={`btn ${view === "open" ? "primary" : ""}`} onClick={() => setView("open")}>
            دستورکارهای باز ({filteredOpen.length})
          </button>
          <button className={`btn ${view === "archived" ? "primary" : ""}`} onClick={() => setView("archived")}>
            بایگانی شده ({filteredArchived.length})
          </button>
        </div>

        <section className="section">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {slice.length ? (
                  slice.map((r) => (
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
                        <button className="btn small" type="button" title="ویرایش" onClick={() => setEditing(r)}>✎</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={headers.length} className="empty">موردی مطابق فیلتر نیست</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagi">
            <button className="btn" disabled={page === 1} onClick={() => setPage(1)}>« اول</button>
            <button className="btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ قبلی</button>
            <span className="muted">{page}/{totalPages}</span>
            <button className="btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>بعدی ›</button>
            <button className="btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>آخر »</button>
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

function EditModal({ record, onClose, onSave }) {
  const [tab, setTab] = useState("info"); // info | acts | delay
  const [status, setStatus] = useState(record.status || "در انتظار تعمیر");
  const [acts, setActs] = useState(record.acts || [{ who: "", part: "", qty: 1 }]);
  const [delayHours, setDelayHours] = useState(record.delayHours || 0);
  const [delayReason, setDelayReason] = useState(record.delayReason || "");

  const addAct = () => setActs((a) => [...a, { who: "", part: "", qty: 1 }]);
  const setAct = (i, key, val) => setActs((a) => a.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)));
  const delAct = (i) => setActs((a) => a.filter((_, idx) => idx !== i));

  const submit = () => onSave({ ...record, status, acts, delayHours, delayReason });

  return (
    <div className="tg-backdrop" onClick={onClose}>
      <div className="tg-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="tg-modal__hdr">
          <b>ویرایش دستورکار ({record.orderNo})</b>
          <button className="tg-close" onClick={onClose}>✕</button>
        </header>

        <div className="tg-tabs">
          <button className={`tab ${tab === "info" ? "is-active" : ""}`} onClick={() => setTab("info")}>مشخصات</button>
          <button className={`tab ${tab === "acts" ? "is-active" : ""}`} onClick={() => setTab("acts")}>فعالیت‌ها</button>
          <button className={`tab ${tab === "delay" ? "is-active" : ""}`} onClick={() => setTab("delay")}>تاخیر</button>
        </div>

        {tab === "info" && (
          <div className="form">
            <div className="row">
              <input className="input" value={record.name} readOnly />
              <input className="input" value={record.code} readOnly />
              <input className="input" value={record.size || ""} readOnly />
            </div>
            <div className="row">
              <input className="input" value={record.unit || ""} readOnly />
              <input className="input" value={record.orderNo} readOnly />
              <input className="input" value={(record.reqType || "").toUpperCase()} readOnly />
            </div>
            <div className="row">
              <input className="input" value={fmtFa(record.startISO)} readOnly />
              <input className="input" value={fmtFa(record.endISO)} readOnly />
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
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

        {tab === "acts" && (
          <div className="form">
            {acts.map((a, i) => (
              <div className="row" key={i}>
                <input className="input" placeholder="انجام‌دهنده" value={a.who} onChange={(e) => setAct(i, "who", e.target.value)} />
                <input className="input" placeholder="قطعه مصرفی" value={a.part} onChange={(e) => setAct(i, "part", e.target.value)} />
                <input className="input" type="number" min="1" placeholder="تعداد" value={a.qty} onChange={(e) => setAct(i, "qty", Math.max(1, +e.target.value || 1))} />
                <button className="btn small" type="button" onClick={() => delAct(i)}>حذف</button>
              </div>
            ))}
            <button className="btn" type="button" onClick={addAct}>+ افزودن ردیف فعالیت</button>
          </div>
        )}

        {tab === "delay" && (
          <div className="form">
            <div className="row">
              <input className="input" type="number" min="0" placeholder="مدت تاخیر (ساعت)" value={delayHours} onChange={(e) => setDelayHours(Math.max(0, +e.target.value || 0))} />
              <input className="input" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} placeholder="علت تاخیر" />
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
