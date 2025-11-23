import React, { useEffect, useMemo, useState } from "react";
import "./Turning.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import { LS_INSPECTION, FINISH_STATES } from "../utils/turning";

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

export default function Inspection({ storageKey = LS_INSPECTION, unitFilter = "بازرسی" }) {
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

  const openList = useMemo(
    () => openOrders.filter((r) => (r.unit || unitFilter) === unitFilter),
    [openOrders, unitFilter]
  );
  const archivedList = useMemo(
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
  const filteredOpen = useMemo(() => applyFilterList(openList), [openList, applied]);
  const filteredArchived = useMemo(() => applyFilterList(archivedList), [archivedList, applied]);
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

  const headers = ["شماره گزارش", "نام تجهیز", "کد", "وضعیت", "تاریخ شروع", "تاریخ پایان", "نوع درخواست", "توضیحات", "ویرایش"];

  return (
    <div className="tg-page" dir="rtl">
      <div className="tg-card">
        <header className="tg-hdr">
          <h3>پنل واحد بازرسی</h3>
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
            گزارش‌های باز ({filteredOpen.length})
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
        <InspectionModal
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

function InspectionModal({ record, onClose, onSave }) {
  const [status, setStatus] = useState(record.status || "در انتظار بازرسی");

  const insp = record.inspectionInfo || {};
  const [reportNo, setReportNo] = useState(insp.reportNo || "");
  const [customer, setCustomer] = useState(insp.customer || "");
  const [inspDate, setInspDate] = useState(insp.inspDate || "");
  const [inspLocation, setInspLocation] = useState(insp.inspLocation || "");
  const [inspectorName, setInspectorName] = useState(insp.inspectorName || "");
  const [wogelNumber, setWogelNumber] = useState(insp.wogelNumber || "");
  const [requesterUnit, setRequesterUnit] = useState(insp.requesterUnit || "");
  const [receiverUnit, setReceiverUnit] = useState(insp.receiverUnit || "");
  const [rigNo, setRigNo] = useState(insp.rigNo || "");

  const [visual, setVisual] = useState(!!insp.visual);
  const [dimensional, setDimensional] = useState(!!insp.dimensional);
  const [ut, setUt] = useState(!!insp.ut);
  const [emi, setEmi] = useState(!!insp.emi);
  const [mpi, setMpi] = useState(!!insp.mpi);
  const [wet, setWet] = useState(!!insp.wet);
  const [dry, setDry] = useState(!!insp.dry);

  const [grade, setGrade] = useState(insp.grade || "");
  const [wallThickness, setWallThickness] = useState(insp.wallThickness || "");
  const [connectionType, setConnectionType] = useState(insp.connectionType || "");
  const [rangeLength, setRangeLength] = useState(insp.rangeLength || "");
  const [size, setSize] = useState(insp.size || "");
  const [weight, setWeight] = useState(insp.weight || "");
  const [pipeName, setPipeName] = useState(insp.pipeName || "");
  const [pipeCode, setPipeCode] = useState(insp.pipeCode || "");
  const [odVariation, setOdVariation] = useState(insp.odVariation || "");
  const [idPitMinWall, setIdPitMinWall] = useState(insp.idPitMinWall || "");
  const [minWall, setMinWall] = useState(insp.minWall || "");
  const [maxWall, setMaxWall] = useState(insp.maxWall || "");
  const [bodyCondition, setBodyCondition] = useState(insp.bodyCondition || "ok");
  const [tongSpace, setTongSpace] = useState(insp.tongSpace || "");
  const [shoulderWidth, setShoulderWidth] = useState(insp.shoulderWidth || "");
  const [crackCondition, setCrackCondition] = useState(insp.crackCondition || "");
  const [coating, setCoating] = useState(insp.coating || "");
  const [boxOd, setBoxOd] = useState(insp.boxOd || "");
  const [boxShoulder, setBoxShoulder] = useState(insp.boxShoulder || "");
  const [boxTong, setBoxTong] = useState(insp.boxTong || "");
  const [boxCondition, setBoxCondition] = useState(insp.boxCondition || "");
  const [pinOd, setPinOd] = useState(insp.pinOd || "");
  const [pinShoulder, setPinShoulder] = useState(insp.pinShoulder || "");
  const [pinTong, setPinTong] = useState(insp.pinTong || "");
  const [pinId, setPinId] = useState(insp.pinId || "");
  const [pinCondition, setPinCondition] = useState(insp.pinCondition || "");
  const [inspectionResult, setInspectionResult] = useState(insp.inspectionResult || "");
  const [comments, setComments] = useState(insp.comments || "");
  const [sendDate, setSendDate] = useState(insp.sendDate || "");
  const [nextUnit, setNextUnit] = useState(insp.nextUnit || "");

  const submit = () => {
    onSave({
      ...record,
      status,
      inspectionInfo: {
        reportNo,
        customer,
        inspDate,
        inspLocation,
        inspectorName,
        wogelNumber,
        requesterUnit,
        receiverUnit,
        rigNo,
        visual,
        dimensional,
        ut,
        emi,
        mpi,
        wet,
        dry,
        grade,
        wallThickness,
        connectionType,
        rangeLength,
        size,
        weight,
        pipeName,
        pipeCode,
        odVariation,
        idPitMinWall,
        minWall,
        maxWall,
        bodyCondition,
        tongSpace,
        shoulderWidth,
        crackCondition,
        coating,
        boxOd,
        boxShoulder,
        boxTong,
        boxCondition,
        pinOd,
        pinShoulder,
        pinTong,
        pinId,
        pinCondition,
        inspectionResult,
        comments,
        sendDate,
        nextUnit,
      },
    });
  };

  return (
    <div className="tg-backdrop" onClick={onClose}>
      <div className="tg-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="tg-modal__hdr">
          <b>ویرایش پاسخ بازرسی ({record.orderNo})</b>
          <button className="tg-close" onClick={onClose}>✕</button>
        </header>

        <div className="tg-modal__body">
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
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>در انتظار بازرسی</option>
                <option>در حال بازرسی</option>
                <option>پایان</option>
              </select>
              <input className="input" value={record.desc || ""} readOnly placeholder="توضیحات درخواست" />
              <input className="input" value={record.createdAt || ""} readOnly placeholder="تاریخ ایجاد" />
            </div>

            <h4>اطلاعات کلی / General Info</h4>
            <div className="insp-grid">
              <label>شماره گزارش / Report No<input className="input" value={reportNo} onChange={(e) => setReportNo(e.target.value)} /></label>
              <label>مشتری / Customer<input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
              <label>تاریخ بازرسی / Inspection Date<input className="input" value={inspDate} onChange={(e) => setInspDate(e.target.value)} placeholder="مثلاً 1404/06/31" /></label>
              <label>محل بازرسی / Location<input className="input" value={inspLocation} onChange={(e) => setInspLocation(e.target.value)} /></label>
              <label>نام بازرس / Inspector<input className="input" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} /></label>
              <label>شماره وگل / Wogel No<input className="input" value={wogelNumber} onChange={(e) => setWogelNumber(e.target.value)} /></label>
              <label>واحد درخواست‌کننده / Requesting Unit<input className="input" value={requesterUnit} onChange={(e) => setRequesterUnit(e.target.value)} /></label>
              <label>واحد مقصد پاسخ / Response Unit<input className="input" value={receiverUnit} onChange={(e) => setReceiverUnit(e.target.value)} /></label>
              <label>شماره دکل / Rig No<input className="input" value={rigNo} onChange={(e) => setRigNo(e.target.value)} /></label>
              <div className="insp-radio full">
                <span>نوع بازرسی / Type</span>
                {[
                  ["visual", "VISUAL (چشمی)", visual, setVisual],
                  ["dimensional", "DIMENSIONAL (ابعادی)", dimensional, setDimensional],
                  ["ut", "UT", ut, setUt],
                  ["emi", "EMI", emi, setEmi],
                  ["mpi", "MPI", mpi, setMpi],
                  ["wet", "WET", wet, setWet],
                  ["dry", "DRY", dry, setDry],
                ].map(([key, label, val, setter]) => (
                  <label key={key} style={{ fontWeight: 600 }}>
                    <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} /> {label}
                  </label>
                ))}
              </div>
            </div>

            <h4>مشخصات فنی لوله / Pipe Specs</h4>
            <div className="insp-grid">
              <label>Grade / گرید<input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
              <label>Wall Thickness / ضخامت دیواره<input className="input" value={wallThickness} onChange={(e) => setWallThickness(e.target.value)} /></label>
              <label>Connection Type / نوع اتصال<input className="input" value={connectionType} onChange={(e) => setConnectionType(e.target.value)} /></label>
              <label>Range / طول رنج<input className="input" value={rangeLength} onChange={(e) => setRangeLength(e.target.value)} /></label>
              <label>Size / سایز<input className="input" value={size} onChange={(e) => setSize(e.target.value)} /></label>
              <label>Weight / وزن<input className="input" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
              <label>نام لوله / Pipe Name<input className="input" value={pipeName} onChange={(e) => setPipeName(e.target.value)} /></label>
              <label>کد لوله / Pipe Code<input className="input" value={pipeCode} onChange={(e) => setPipeCode(e.target.value)} /></label>
              <label>OD Variation / تغییر قطر ظاهری<input className="input" value={odVariation} onChange={(e) => setOdVariation(e.target.value)} /></label>
              <label>ID Pit Min Wall<input className="input" value={idPitMinWall} onChange={(e) => setIdPitMinWall(e.target.value)} /></label>
              <label>Minimum Wall / حداقل ضخامت<input className="input" value={minWall} onChange={(e) => setMinWall(e.target.value)} /></label>
              <label>Maximum Wall / حداکثر ضخامت<input className="input" value={maxWall} onChange={(e) => setMaxWall(e.target.value)} /></label>
              <label>Tong Space / محل گیری تنگ<input className="input" value={tongSpace} onChange={(e) => setTongSpace(e.target.value)} /></label>
              <label>Shoulder Width / پهنای شانه<input className="input" value={shoulderWidth} onChange={(e) => setShoulderWidth(e.target.value)} /></label>
              <label>Crack Condition / ترک یا شکستگی<input className="input" value={crackCondition} onChange={(e) => setCrackCondition(e.target.value)} /></label>
              <label>Coating / پوشش یا رنگ<input className="input" value={coating} onChange={(e) => setCoating(e.target.value)} /></label>
              <label className="full">
                وضعیت بدنه / Body Condition
                <div className="insp-radio">
                  {["ok", "damaged", "polished"].map((opt) => (
                    <label key={opt}>
                      <input type="radio" value={opt} checked={bodyCondition === opt} onChange={(e) => setBodyCondition(e.target.value)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </label>
            </div>

            <h4>BOX</h4>
            <div className="insp-grid">
              <label>OD<input className="input" value={boxOd} onChange={(e) => setBoxOd(e.target.value)} /></label>
              <label>Shoulder Width<input className="input" value={boxShoulder} onChange={(e) => setBoxShoulder(e.target.value)} /></label>
              <label>Tong Space<input className="input" value={boxTong} onChange={(e) => setBoxTong(e.target.value)} /></label>
              <label>Condition<input className="input" value={boxCondition} onChange={(e) => setBoxCondition(e.target.value)} /></label>
            </div>

            <h4>PIN</h4>
            <div className="insp-grid">
              <label>OD<input className="input" value={pinOd} onChange={(e) => setPinOd(e.target.value)} /></label>
              <label>Shoulder Width<input className="input" value={pinShoulder} onChange={(e) => setPinShoulder(e.target.value)} /></label>
              <label>Tong Space<input className="input" value={pinTong} onChange={(e) => setPinTong(e.target.value)} /></label>
              <label>ID<input className="input" value={pinId} onChange={(e) => setPinId(e.target.value)} /></label>
              <label>Condition<input className="input" value={pinCondition} onChange={(e) => setPinCondition(e.target.value)} /></label>
            </div>

            <h4>نتیجه نهایی / Final Result</h4>
            <div className="insp-grid">
              <label className="full">
                نتیجه آزمون / Inspection Result
                <select className="input" value={inspectionResult} onChange={(e) => setInspectionResult(e.target.value)}>
                  <option value="">انتخاب کنید</option>
                  <option value="Accept">Accept / تایید</option>
                  <option value="Reject">Reject / رد</option>
                  <option value="Reject needed">Reject needed / نیاز به رد</option>
                </select>
              </label>
              <label className="full">
                توضیحات بازرسی / Comments
                <textarea className="input" value={comments} onChange={(e) => setComments(e.target.value)} />
              </label>
              <label>
                تاریخ ارسال به واحد دیگر / Send Date
                <input className="input" value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
              </label>
              <label>
                ارسال به بخش بعدی / Next Unit
                <input className="input" value={nextUnit} onChange={(e) => setNextUnit(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <footer className="tg-modal__ftr">
          <button className="btn" onClick={onClose}>بستن</button>
          <button className="btn success" onClick={submit}>ذخیره</button>
        </footer>
      </div>
    </div>
  );
}
