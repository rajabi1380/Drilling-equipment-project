// DownholeInOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./DownholeInOut.css";

/* utils محلی شما */
import { loadLS, saveLS } from "../utils/ls";
import { DatePicker, TimePicker, persian, persian_fa, faFmt, fmtFa } from "../utils/date";
import ExportButtons from "./common/ExportButtons";
import ItemPickerModal from "./common/ItemPickerModal";

/* کاتالوگ و دکل‌ها */
import { getCatalogForUnit, RIGS } from "../constants/catalog";

/* ===== تاریخ امن ===== */
const asDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") { try { return v.toDate(); } catch(e) {} }
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const toISO16Safe = (v) => {
  const d = asDate(v);
  if (!d) return "";
  const p = (n) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/* ===== ثابت‌ها ===== */
const LS_KEY = "downhole_units_v3";
const PAGE_SIZE = 10;

const UNITS = {
  surface: { id: "surface", title: "ابزار سطحی" },
  bop:     { id: "bop",     title: "کنترل فوران" },
  choke:   { id: "choke",   title: "شبکه کاهنده" },
};
const UNIT_LIST = [UNITS.surface, UNITS.bop, UNITS.choke];

const TECHS = [
  "محسن جلالی‌زاده","همیار پلیس","هومن رجبی","حسین کریمی","مهدی نامدار","فریدون زند"
];
const CONSUMABLES = ["پیچ","مهره","واشر","اورینگ","گریس","روغن","لاستیک آب‌بندی"];

const newId  = () => Number(`${Date.now()}${Math.floor(Math.random()*1e3)}`);

/* CSV ساده برای خروجی (در صورت نبود util اختصاصی) */
const simpleCSV = (filename, headers, rows) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const csv = [headers.map(esc).join(",")]
    .concat(rows.map(r => headers.map(h => esc(r[h])).join(",")))
    .join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ===== آیکون انگشت شست ===== */
const FingerIcon = () => (
  <svg className="finger-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
    <path fill="currentColor"
      d="M9 11V5a2 2 0 1 1 4 0v6h1.5a2.5 2.5 0 0 1 2.5 2.5V16a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2a3 3 0 0 1 3-3h2z" />
  </svg>
);

/* سلول آیکن: فقط برای هم‌ترازی با inputها */
const IconCell = ({ children }) => (
  <div className="col" style={{display:"flex",alignItems:"center",paddingInlineStart:6}}>
    {children}
  </div>
);

/* ===== کامپوننت اصلی ===== */
export default function DownholeInOut() {
  // Boot
  const boot = loadLS(LS_KEY, { open: [], archived: [], rigMoves: [] });
  const [openRows, setOpenRows] = useState(boot.open || []);
  const [archivedRows, setArchivedRows] = useState(boot.archived || []);
  const [rigMoves, setRigMoves] = useState(boot.rigMoves || []);
  useEffect(() => { saveLS(LS_KEY, { open: openRows, archived: archivedRows, rigMoves }); }, [openRows, archivedRows, rigMoves]);

  // تب‌ها
  const [tab, setTab] = useState("inout"); // "inout" | "rig"

  // باز/بسته
  const [expanded, setExpanded] = useState({
    surface:true,bop:true,choke:true,
    rig_surface:true,rig_bop:true,rig_choke:true,
  });

  // صفحه‌بندی
  const [pages, setPages] = useState({ surface:1, bop:1, choke:1 });
  const [rigPages, setRigPages] = useState({ surface:1, bop:1, choke:1 });
  const [archPage, setArchPage] = useState(1);

  const [selectedRowId, setSelectedRowId] = useState(null);

  // مودال‌ها
  const [showIn, setShowIn] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [rowForExit, setRowForExit] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showArchEdit, setShowArchEdit] = useState(null);

  // دکل↔دکل
  const [showRigModal, setShowRigModal] = useState(false);
  const [editingMove, setEditingMove] = useState(null);

  // گروه‌بندی
  const grouped = useMemo(() => ({
    surface: openRows.filter(x => x.unitId === "surface"),
    bop:     openRows.filter(x => x.unitId === "bop"),
    choke:   openRows.filter(x => x.unitId === "choke"),
  }), [openRows]);

  const movesByUnit = useMemo(() => ({
    surface: rigMoves.filter(m => m.unitId === "surface"),
    bop:     rigMoves.filter(m => m.unitId === "bop"),
    choke:   rigMoves.filter(m => m.unitId === "choke"),
  }), [rigMoves]);

  /* === ورود === */
  const addIn = (payload) => {
    const enterISO = toISO16Safe(payload.enterObj) || toISO16Safe(new Date());
    const row = {
      id: newId(),
      unitId: payload.unitId,
      unitTitle: UNITS[payload.unitId]?.title || "—",
      name: payload.name,
      code: payload.code,
      size: payload.size,
      fromWhere: payload.fromWhere || "",            // واحد ارسالی
      status: (payload.status || "سالم").trim(),
      enterISO,
      techs: [], partsUsed: [], failureDesc: "", repairCost: "",
      note: payload.note || "",
    };
    setOpenRows((p) => [row, ...p]);
    setShowIn(false);
    setPages((pg)=>({...pg, [payload.unitId]: 1}));
  };

  /* === مشخصات/تعمیر === */
  const updateDetails = (id, patch) => {
    setOpenRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch, status: (patch.status || r.status || "").trim() } : r)));
    setDetailRow(null);
  };

  /* === حذف از لیست باز === */
  const deleteOpenRow = (id) => {
    setOpenRows(prev => prev.filter(r => r.id !== id));
    if (selectedRowId === id) setSelectedRowId(null);
  };

  /* === خروج === */
  const startExit = (row) => {
    if ((row.status || "").trim() !== "سالم") return;
    setRowForExit(row); setShowExit(true);
  };
  const commitExit = (extra) => {
    const r = rowForExit; if (!r) return;
    const exitISO = toISO16Safe(extra.exitObj) || toISO16Safe(new Date());
    const archived = {
      ...r,
      exitISO,
      destUnit: extra.destUnit || "",
      destRig: extra.destUnit === "rig" ? extra.destRig || "" : "",
      destContractor: extra.destUnit === "contractor" ? extra.destContractor || "" : "",
      vehicleKind: extra.vehicleKind || "",
      waybillNo: extra.waybillNo || "",
      exitNote: extra.note || "",
    };
    setArchivedRows(p => [archived, ...p]);
    setOpenRows(p => p.filter(x => x.id !== r.id));
    setShowExit(false); setRowForExit(null); setSelectedRowId(null); setArchPage(1);
  };

  /* === دکل↔دکل === */
  const saveRigMove = (payload) => {
    const moveAtISO = payload.moveAtISO || toISO16Safe(payload.moveObj) || toISO16Safe(new Date());
    const clean = { ...payload, moveAtISO };
    if (editingMove) {
      setRigMoves(p => p.map(m => (m.id === editingMove.id ? { ...m, ...clean } : m)));
      setEditingMove(null);
    } else {
      setRigMoves(p => [{ id: newId(), ...clean }, ...p]);
    }
    setShowRigModal(false);
    setRigPages((pg)=>({...pg, [payload.unitId]: 1}));
  };
  const removeRigMove = (id) => setRigMoves(p => p.filter(m => m.id !== id));

  // کمکی صفحه‌بندی
  const slicePage = (arr, page) => {
    const total = arr.length;
    const pagesCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const p = Math.min(Math.max(1, page), pagesCount);
    const start = (p - 1) * PAGE_SIZE;
    return { rows: arr.slice(start, start + PAGE_SIZE), p, pagesCount, total };
  };

  return (
    <div className="dh-page" dir="rtl">
      <div className="dh-card">

        {/* تب‌ها */}
        <div className="segbar">
          <button className={`seg ${tab==="inout" ? "is-on" : ""}`} onClick={()=>setTab("inout")}>ورود و خروج</button>
          <button className={`seg ${tab==="rig"   ? "is-on" : ""}`} onClick={()=>setTab("rig")}>دکل به دکل</button>
        </div>

        {/* محتوای تب‌ها */}
        {tab === "inout" ? (
          <>
            <div className="dh-toolbar">
              <button type="button" className="btn success" onClick={() => setShowIn(true)}>ثبت ورود</button>
              <button type="button" className="btn" onClick={() => setShowArchive(true)}>نمایش آرشیو</button>
              <div className="muted" style={{ marginInlineStart: 8 }}>
                آرشیو: <b>{archivedRows.length}</b> مورد
              </div>
            </div>

            {UNIT_LIST.map((u) => {
              const list = grouped[u.id];
              const { rows, p, pagesCount, total } = slicePage(list, pages[u.id]);

              return (
                <section className="dh-section" key={u.id}>
                  <header className="dh-sec-hdr" onClick={() => setExpanded((e) => ({ ...e, [u.id]: !e[u.id] }))}>
                    <b>{u.title}</b>
                    <span className="muted">({total} ردیف)</span>
                    <span className="chev">{expanded[u.id] ? "▾" : "▸"}</span>
                  </header>

                  {expanded[u.id] && (
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>نام تجهیز</th><th>کد</th><th>سایز</th>
                              <th>تاریخ ورود</th><th>وضعیت</th><th>واحد ارسالی</th><th>عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length ? rows.map((r) => {
                              const healthy = (r.status || "").trim() === "سالم";
                              const isSelected = selectedRowId === r.id;
                              return (
                                <tr
                                  key={r.id}
                                  className={(healthy ? "ok" : "need-fix") + (isSelected ? " is-selected" : "")}
                                  onClick={() => setSelectedRowId((prev) => (prev === r.id ? null : r.id))}
                                >
                                  <td>{r.name}</td>
                                  <td>{r.code}</td>
                                  <td>{r.size || "—"}</td>
                                  <td>{fmtFa(r.enterISO) || "—"}</td>
                                  <td>{r.status}</td>
                                  <td>{r.fromWhere || "—"}</td>
                                  <td className="ops">
                                    <button type="button" className="btn small" onClick={(e)=>{e.stopPropagation(); setDetailRow(r);}}>🛈 مشخصات</button>
                                    <button type="button" className="btn small danger" disabled={!healthy} onClick={(e)=>{e.stopPropagation(); startExit(r);}}>⤴ خروج</button>
                                    <button type="button" className="btn small" onClick={(e)=>{e.stopPropagation(); deleteOpenRow(r.id);}}>حذف</button>
                                  </td>
                                </tr>
                              );
                            }) : <tr><td colSpan={7} className="empty">آیتمی ثبت نشده</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      {pagesCount > 1 && (
                        <div className="pagination">
                          <button className="pg-btn" disabled={p<=1} onClick={()=>setPages(pg=>({...pg,[u.id]: p-1}))}>قبلی</button>
                          <span>صفحه {p} از {pagesCount}</span>
                          <button className="pg-btn" disabled={p>=pagesCount} onClick={()=>setPages(pg=>({...pg,[u.id]: p+1}))}>بعدی</button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </>
        ) : (
          <>
            <div className="dh-toolbar">
              <button type="button" className="btn warn" onClick={() => { setEditingMove(null); setShowRigModal(true); }}>ثبت دکل به دکل</button>
            </div>

            {UNIT_LIST.map((u) => {
              const list = movesByUnit[u.id].slice().sort((a,b)=>String(b.moveAtISO).localeCompare(String(a.moveAtISO)));
              const { rows, p, pagesCount, total } = slicePage(list, rigPages[u.id]);
              const key = `rig_${u.id}`;

              return (
                <section className="dh-section" key={key}>
                  <header className="dh-sec-hdr" onClick={() => setExpanded((e)=> ({...e, [key]: !e[key]}))}>
                    <b>انتقال دکل↔دکل — {u.title}</b>
                    <span className="muted">({total} ردیف)</span>
                    <span className="chev">{expanded[key] ? "▾" : "▸"}</span>
                  </header>

                  {expanded[key] && (
                    <>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>نام تجهیز</th><th>کد</th><th>سایز</th>
                              <th>از دکل</th><th>به دکل</th>
                              <th>تاریخ انتقال</th><th>توضیحات</th><th>عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length ? rows.map((r) => (
                              <tr key={r.id}>
                                <td>{r.name}</td>
                                <td>{r.code}</td>
                                <td>{r.size || "—"}</td>
                                <td>{r.fromRig}</td>
                                <td>{r.toRig}</td>
                                <td>{r.moveAtISO ? fmtFa(r.moveAtISO) : "—"}</td>
                                <td className="muted">{r.note || "—"}</td>
                                <td className="ops">
                                  <button className="btn small solid" onClick={()=>{ setEditingMove(r); setShowRigModal(true); }}>ویرایش</button>
                                  <button className="btn small danger" onClick={()=>removeRigMove(r.id)}>حذف</button>
                                </td>
                              </tr>
                            )) : <tr><td colSpan={8} className="empty">موردی ثبت نشده</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      {pagesCount > 1 && (
                        <div className="pagination">
                          <button className="pg-btn" disabled={p<=1} onClick={()=>setRigPages(pg=>({...pg,[u.id]: p-1}))}>قبلی</button>
                          <span>صفحه {p} از {pagesCount}</span>
                          <button className="pg-btn" disabled={p>=pagesCount} onClick={()=>setRigPages(pg=>({...pg,[u.id]: p+1}))}>بعدی</button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>

      {/* ===== مودال‌ها ===== */}
      {showIn && <InModal onClose={() => setShowIn(false)} onSubmit={addIn} />}
      {detailRow && (
        <DetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onSave={(patch) => updateDetails(detailRow.id, patch)}
        />
      )}
      {showExit && rowForExit && (
        <ExitModal
          row={rowForExit}
          rigs={RIGS}
          onClose={() => { setShowExit(false); setRowForExit(null); }}
          onSubmit={commitExit}
        />
      )}
      {showArchive && (
        <ArchiveModal
          rows={archivedRows}
          onClose={() => setShowArchive(false)}
          onEdit={(row)=> setShowArchEdit(row)}
          page={archPage}
          onPage={(p)=> setArchPage(p)}
          slicePage={slicePage}
        />
      )}
      {showArchEdit && (
        <ArchiveEditModal
          row={showArchEdit}
          rigs={RIGS}
          onClose={()=> setShowArchEdit(null)}
          onSave={(patch)=>{
            setArchivedRows(prev=> prev.map(r=> r.id===showArchEdit.id ? {...r, ...patch} : r));
            setShowArchEdit(null);
          }}
        />
      )}
      {showRigModal && (
        <RigMoveModal
          initial={editingMove}
          onClose={() => { setShowRigModal(false); setEditingMove(null); }}
          onSubmit={saveRigMove}
        />
      )}
    </div>
  );
}

/* ===== Modal ورود ===== */
function InModal({ onClose, onSubmit }) {
  const [unitId, setUnitId] = useState("");
  const [name, setName]   = useState("");
  const [code, setCode]   = useState("");
  const [size, setSize]   = useState("");
  const [enterObj, setEnterObj] = useState(null);
  const [fromWhere, setFromWhere] = useState("");
  const [status, setStatus] = useState("سالم");
  const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(() => (unitId ? getCatalogForUnit(unitId) : []), [unitId]);
  const missing = !unitId || !name.trim() || !code.trim() || !size.trim();

  const submit = () => {
    if (missing) return;
    onSubmit({ unitId, name, code, size, enterObj, fromWhere, status, note });
  };

  return (
    <>
      <div className="dh-backdrop" onClick={onClose}>
        {/* عریض‌تر از حالت پیش‌فرض برای جا شدن 4 ستون */}
        <div className="dh-modal dh-modal--wide" style={{maxWidth:"1100px"}} dir="rtl" onClick={(e) => e.stopPropagation()}>
          <header className="dh-modal__hdr">
            <b>ثبت ورود قطعه (درون‌چاهی)</b>
            <button className="dh-close" onClick={onClose}>✕</button>
          </header>

          <div className="form form--tight">
            {/* انتخاب واحد (عریض) */}
            <div className="row">
              <select className="input unit-wide" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">* انتخاب واحد مقصد</option>
                {UNIT_LIST.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
              </select>
            </div>

            {/* چهار آیتم در یک ردیف: نام + دکمه | کد | سایز | آیکن */}
            <div className="row" style={{gridTemplateColumns:"2fr 1.2fr 1.2fr auto"}}>
              <div className="col with-pick">
                <input className={`input ${!name.trim() ? "err" : ""}`} placeholder="* نام تجهیز"
                  value={name} onChange={(e)=>setName(e.target.value)} disabled={!unitId} />
                
                <small className="req-hint">الزامی</small>
              </div>

              <div className="col">
                <input className={`input ${!code.trim() ? "err" : ""}`} placeholder="* کد تجهیز"
                  value={code} onChange={(e)=>setCode(e.target.value)} disabled={!unitId} />
                <small className="req-hint">الزامی</small>
              </div>

              <div className="col">
                <input className={`input ${!size.trim() ? "err" : ""}`} placeholder="* سایز"
                  value={size} onChange={(e)=>setSize(e.target.value)} disabled={!unitId} />
                <small className="req-hint">الزامی</small>
              </div>
<button type="button" className="pick-btn" title="انتخاب از کاتالوگ"
                  onClick={()=> setPickOpen(true)} disabled={!unitId}>☝️</button>
            </div>

            {/* تاریخ ورود + وضعیت + واحد ارسالی */}
            <div className="row">
              <DatePicker value={enterObj} onChange={(v)=> setEnterObj(asDate(v))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input"
                containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت ورود" />
              <select className="input" value={status} onChange={(e)=> setStatus(e.target.value)}>
                <option value="سالم">سالم</option>
                <option value="نیاز به تعمیر">نیاز به تعمیر</option>
              </select>
              <input className="input" placeholder="واحد ارسالی" value={fromWhere} onChange={(e)=> setFromWhere(e.target.value)} />
            </div>

            <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=> setNote(e.target.value)} />
          </div>

          <footer className="dh-modal__ftr">
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" onClick={submit} disabled={missing}>ثبت ورود</button>
          </footer>
        </div>
      </div>

      <ItemPickerModal
        open={pickOpen}
        onClose={()=> setPickOpen(false)}
        catalog={catalog}
        title={unitId ? `انتخاب تجهیز — ${UNIT_LIST.find((u)=>u.id===unitId)?.title}` : "انتخاب تجهیز"}
        onPick={(it)=>{ setName(it.name || ""); setCode(it.code || "");
          const autoSize = Array.isArray(it.sizes) ? (it.sizes[0] || "") : (it.size || "");
          setSize(autoSize); setPickOpen(false); }}
      />
    </>
  );
}

/* ===== Modal مشخصات/تعمیر ===== */
function DetailModal({ row, onClose, onSave }) {
  const [techs, setTechs] = useState(row.techs || []);
  const [partsUsed, setPartsUsed] = useState(row.partsUsed || []);
  const [failureDesc, setFailureDesc] = useState(row.failureDesc || "");
  const [repairCost, setRepairCost] = useState(row.repairCost || "");
  const [status, setStatus] = useState(row.status || "سالم");

  const toggle = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(x=>x!==value) : [...prev, value]);
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--wide" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>مشخصات/تعمیر — {row.name} ({row.code})</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="form">
          <div className="row">
            <div className="col">
              <div className="label">نام افراد تعمیرات</div>
              <div className="chips">
                {TECHS.map(t=>(
                  <label key={t} className={`chip ${techs.includes(t) ? "on":""}`}>
                    <input type="checkbox" checked={techs.includes(t)} onChange={()=>toggle(techs,setTechs,t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="col">
              <div className="label">قطعات مصرفی</div>
              <div className="chips">
                {CONSUMABLES.map(p=>(
                  <label key={p} className={`chip ${partsUsed.includes(p) ? "on":""}`}>
                    <input type="checkbox" checked={partsUsed.includes(p)} onChange={()=>toggle(partsUsed,setPartsUsed,p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <input className="input" placeholder="هزینه تعمیر (تومان)" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} />
          </div>

          <div className="row">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="سالم">سالم</option>
              <option value="نیاز به تعمیر">نیاز به تعمیر</option>
            </select>
            <div className="col">
              <textarea className="input" placeholder="شرح خرابی / توضیحات" value={failureDesc} onChange={(e) => setFailureDesc(e.target.value)} />
            </div>
            <div className="col" />
          </div>
        </div>

        <footer className="dh-modal__ftr">
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button type="button" className="btn primary" onClick={() => onSave({ techs, partsUsed, failureDesc, repairCost, status })}>
            ذخیره
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===== Modal خروج ===== */
function ExitModal({ row, rigs, onClose, onSubmit }) {
  const [exitObj, setExitObj] = useState(null);
  const [destUnit, setDestUnit] = useState("");
  const [destRig, setDestRig] = useState("");
  const [destContractor, setDestContractor] = useState("");
  const [vehicleKind, setVehicleKind] = useState("");
  const [waybillNo, setWaybillNo] = useState("");
  const [note, setNote] = useState("");

  const canSubmit =
    !!destUnit &&
    (destUnit !== "rig" || !!destRig) &&
    (destUnit !== "contractor" || !!destContractor.trim());

  const submit = () => {
    onSubmit({ exitObj, destUnit, destRig, destContractor, vehicleKind, waybillNo, note });
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--wide" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>ثبت خروج — {row.name} ({row.code})</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="form form--tight">
          <div className="row">
            <DatePicker value={exitObj} onChange={(v)=> setExitObj(asDate(v))}
              calendar={persian} locale={persian_fa} format={faFmt}
              plugins={[<TimePicker position="bottom" />]} inputClass="input"
              containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت خروج (اختیاری)" />

            <select className="input" value={destUnit} onChange={(e)=>{ setDestUnit(e.target.value); setDestRig(""); setDestContractor(""); }}>
              <option value="">* واحد مقصد</option>
              <option value="rig">دکل</option>
              <option value="contractor">پیمانکار</option>
              <option value="other">سایر</option>
            </select>

            <div className="col">
              <div className="label">نوع ماشین</div>
              <div className="seg-mini">
                <button type="button" className={`seg2 ${vehicleKind==="شرکتی"?"on":""}`} onClick={()=> setVehicleKind("شرکتی")}>شرکتی</button>
                <button type="button" className={`seg2 ${vehicleKind==="استیجاری"?"on":""}`} onClick={()=> setVehicleKind("استیجاری")}>استیجاری</button>
              </div>
            </div>
          </div>

          <div className="row">
            {destUnit === "rig" && (
              <select className="input" value={destRig} onChange={(e)=> setDestRig(e.target.value)}>
                <option value="">انتخاب دکل</option>
                {RIGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {destUnit === "contractor" && (
              <input className="input" placeholder="نام پیمانکار" value={destContractor} onChange={(e)=> setDestContractor(e.target.value)} />
            )}
            <input className="input" placeholder="شماره بارنامه" value={waybillNo} onChange={(e)=> setWaybillNo(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات" value={note} onChange={(e)=> setNote(e.target.value)} />
        </div>

        <footer className="dh-modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn danger" disabled={!canSubmit} onClick={submit}>ثبت خروج</button>
        </footer>
      </div>
    </div>
  );
}

/* ===== آرشیو با فیلتر تا‌شونده + خروجی ===== */
function ArchiveModal({ rows, onClose, onEdit, page, onPage, slicePage }) {
  const [qName, setQName] = useState("");
  const [qCode, setQCode] = useState("");
  const [fromObj, setFromObj] = useState(null);
  const [toObj, setToObj] = useState(null);
  const [openList, setOpenList] = useState(false);

  const fromISO = toISO16Safe(fromObj);
  const toISO   = toISO16Safe(toObj);

  const filtered = useMemo(() => rows.filter(r => {
    const okName = !qName || (r.name || "").toLowerCase().includes(qName.toLowerCase());
    const okCode = !qCode || (r.code || "").toLowerCase().includes(qCode.toLowerCase());
    const exitISO = r.exitISO || "";
    const okFrom = !fromISO || (exitISO && exitISO >= fromISO);
    const okTo   = !toISO   || (exitISO && exitISO <= toISO);
    return okName && okCode && okFrom && okTo;
  }), [rows, qName, qCode, fromISO, toISO]);

  const { rows: paged, p, pagesCount, total } = slicePage(filtered, page);

  const exportArchiveCSV = () => {
    const headers = ["نام تجهیز","کد","سایز","واحد مبدأ","تاریخ ورود","تاریخ خروج","واحد مقصد","دکل/پیمانکار","نوع ماشین","شماره بارنامه","یادداشت خروج","افراد تعمیر","مصرفی‌ها","شرح خرابی","هزینه تعمیر"];
    const data = filtered.map(r => {
      const peer = r.destUnit==="rig" ? (r.destRig||"") : r.destUnit==="contractor" ? (r.destContractor||"") : "";
      return {
        "نام تجهیز": r.name||"", "کد": r.code||"", "سایز": r.size||"",
        "واحد مبدأ": r.unitTitle||"", "تاریخ ورود": r.enterISO?fmtFa(r.enterISO):"",
        "تاریخ خروج": r.exitISO?fmtFa(r.exitISO):"", "واحد مقصد": r.destUnit||"",
        "دکل/پیمانکار": peer, "نوع ماشین": r.vehicleKind||"", "شماره بارنامه": r.waybillNo||"",
        "یادداشت خروج": r.exitNote||"", "افراد تعمیر": (r.techs||[]).join("، "),
        "مصرفی‌ها": (r.partsUsed||[]).join("، "), "شرح خرابی": r.failureDesc||"",
        "هزینه تعمیر": r.repairCost||""
      };
    });
    simpleCSV(`archive_${new Date().toISOString().slice(0,10)}.csv`, headers, data);
  };

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--wide" dir="rtl" onClick={(e)=>e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>آرشیو خروج قطعات</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        {/* فیلتر تاشونده */}
        <details className="arch-filter" open={!openList}>
          <summary>فیلتر</summary>
          <div className="form">
            <div className="row">
              <input className="input" placeholder="نام تجهیز..." value={qName} onChange={(e)=> setQName(e.target.value)} />
              <input className="input" placeholder="کد تجهیز..." value={qCode} onChange={(e)=> setQCode(e.target.value)} />
              <div className="col" />
            </div>
            <div className="row">
              <DatePicker value={fromObj} onChange={(v)=> setFromObj(asDate(v))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input"
                containerClassName="rmdp-rtl" placeholder="از تاریخ خروج" />
              <DatePicker value={toObj} onChange={(v)=> setToObj(asDate(v))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input"
                containerClassName="rmdp-rtl" placeholder="تا تاریخ خروج" />
              <div className="col" />
            </div>
            <div className="btnrow" style={{display:"flex",gap:8}}>
              <button className="btn primary" onClick={()=> { onPage(1); setOpenList(true); }}>اعمال فیلتر</button>
              <button className="btn" onClick={()=> { setQName(""); setQCode(""); setFromObj(null); setToObj(null); onPage(1); }}>حذف فیلتر</button>
            </div>
          </div>
        </details>

        {/* نوار ابزار خروجی‌ها */}
        <div className="table-toolbar">
          <ExportButtons onExcel={exportArchiveCSV} onWord={null} />
          <div className="muted" style={{marginInlineStart:"auto"}}>تعداد نتایج: <b>{total}</b></div>
        </div>

        {/* جدول فقط وقتی list باز است */}
        {openList && (
          <>
            <div className="table-wrap" style={{marginTop:8}}>
              <table>
                <thead>
                  <tr>
                    <th>نام تجهیز</th><th>کد</th><th>سایز</th>
                    <th>واحد مبدأ</th><th>تاریخ ورود</th><th>تاریخ خروج</th>
                    <th>واحد مقصد</th><th>دکل/پیمانکار</th><th>نوع ماشین</th>
                    <th>شماره بارنامه</th><th>یادداشت خروج</th><th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length ? paged.map((r)=> {
                    const peer = r.destUnit==="rig" ? (r.destRig||"") : r.destUnit==="contractor" ? (r.destContractor||"") : "";
                    return (
                      <tr key={r.id}>
                        <td>{r.name}</td><td>{r.code}</td><td>{r.size || "—"}</td>
                        <td>{r.unitTitle || "—"}</td>
                        <td>{r.enterISO ? fmtFa(r.enterISO) : "—"}</td>
                        <td>{r.exitISO ? fmtFa(r.exitISO) : "—"}</td>
                        <td>{r.destUnit || "—"}</td>
                        <td>{peer || "—"}</td>
                        <td>{r.vehicleKind || "—"}</td>
                        <td>{r.waybillNo || "—"}</td>
                        <td className="muted">{r.exitNote || "—"}</td>
                        <td className="ops">
                          <button className="btn small solid" onClick={()=> onEdit(r)}>ویرایش</button>
                        </td>
                      </tr>
                    );
                  }) : <tr><td colSpan={12} className="empty">موردی پیدا نشد</td></tr>}
                </tbody>
              </table>
            </div>

            {pagesCount > 1 && (
              <div className="pagination">
                <button className="pg-btn" disabled={p<=1} onClick={()=>onPage(p-1)}>قبلی</button>
                <span>صفحه {p} از {pagesCount}</span>
                <button className="pg-btn" disabled={p>=pagesCount} onClick={()=>onPage(p+1)}>بعدی</button>
              </div>
            )}
          </>
        )}

        <footer className="dh-modal__ftr">
          <button className="btn" onClick={onClose}>بستن</button>
        </footer>
      </div>
    </div>
  );
}

/* ===== ویرایش ردیف آرشیو ===== */
function ArchiveEditModal({ row, rigs, onClose, onSave }) {
  const [exitObj, setExitObj] = useState(row.exitISO ? asDate(row.exitISO) : null);
  const [destUnit, setDestUnit] = useState(row.destUnit || "");
  const [destRig, setDestRig] = useState(row.destRig || "");
  const [destContractor, setDestContractor] = useState(row.destContractor || "");
  const [vehicleKind, setVehicleKind] = useState(row.vehicleKind || "");
  const [waybillNo, setWaybillNo] = useState(row.waybillNo || "");
  const [note, setNote] = useState(row.exitNote || "");

  const canSubmit =
    !!destUnit &&
    (destUnit !== "rig" || !!destRig) &&
    (destUnit !== "contractor" || !!destContractor.trim());

  return (
    <div className="dh-backdrop" onClick={onClose}>
      <div className="dh-modal dh-modal--wide" dir="rtl" onClick={(e)=>e.stopPropagation()}>
        <header className="dh-modal__hdr">
          <b>ویرایش ردیف آرشیو — {row.name} ({row.code})</b>
          <button className="dh-close" onClick={onClose}>✕</button>
        </header>

        <div className="arch-info">
          <div><b>واحد مبدأ:</b> {row.unitTitle || "—"}</div>
          <div><b>سایز:</b> {row.size || "—"}</div>
          <div><b>تاریخ ورود:</b> {row.enterISO ? fmtFa(row.enterISO) : "—"}</div>
          <div><b>وضعیت:</b> {row.status || "—"}</div>
          <div><b>واحد ارسالی:</b> {row.fromWhere || "—"}</div>
          <div><b>افراد تعمیر:</b> {(row.techs||[]).join("، ") || "—"}</div>
          <div><b>مصرفی‌ها:</b> {(row.partsUsed||[]).join("، ") || "—"}</div>
          <div><b>شرح خرابی:</b> {row.failureDesc || "—"}</div>
          <div><b>هزینه تعمیر:</b> {row.repairCost || "—"}</div>
        </div>

        <div className="form form--tight">
          <div className="row">
            <DatePicker value={exitObj} onChange={(v)=> setExitObj(asDate(v))}
              calendar={persian} locale={persian_fa} format={faFmt}
              plugins={[<TimePicker position="bottom" />]} inputClass="input"
              containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت خروج (اختیاری)" />
            <select className="input" value={destUnit} onChange={(e)=> { setDestUnit(e.target.value); setDestRig(""); setDestContractor(""); }}>
              <option value="">* واحد مقصد</option>
              <option value="rig">دکل</option>
              <option value="contractor">پیمانکار</option>
              <option value="other">سایر</option>
            </select>
            <div className="col">
              <div className="label">نوع ماشین</div>
              <div className="seg-mini">
                <button type="button" className={`seg2 ${vehicleKind==="شرکتی"?"on":""}`} onClick={()=> setVehicleKind("شرکتی")}>شرکتی</button>
                <button type="button" className={`seg2 ${vehicleKind==="استیجاری"?"on":""}`} onClick={()=> setVehicleKind("استیجاری")}>استیجاری</button>
              </div>
            </div>
          </div>

          <div className="row">
            {destUnit==="rig" && (
              <select className="input" value={destRig} onChange={(e)=> setDestRig(e.target.value)}>
                <option value="">انتخاب دکل</option>
                {rigs.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {destUnit==="contractor" && (
              <input className="input" placeholder="نام پیمانکار" value={destContractor} onChange={(e)=> setDestContractor(e.target.value)} />
            )}
            <input className="input" placeholder="شماره بارنامه" value={waybillNo} onChange={(e)=> setWaybillNo(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات خروج" value={note} onChange={(e)=> setNote(e.target.value)} />
        </div>

        <footer className="dh-modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn primary" disabled={!canSubmit}
            onClick={()=> onSave({
              exitISO: toISO16Safe(exitObj) || toISO16Safe(new Date()),
              destUnit, destRig, destContractor, vehicleKind, waybillNo, exitNote: note
            })}
          >ذخیره</button>
        </footer>
      </div>
    </div>
  );
}

/* ===== مودال دکل↔دکل ===== */
function RigMoveModal({ initial, onClose, onSubmit }) {
  const [unitId, setUnitId] = useState(initial?.unitId || "");
  const [name, setName] = useState(initial?.name || "");
  const [code, setCode] = useState(initial?.code || "");
  const [size, setSize] = useState(initial?.size || "");
  const [fromRig, setFromRig] = useState(initial?.fromRig || "");
  const [toRig, setToRig] = useState(initial?.toRig || "");
  const [moveObj, setMoveObj] = useState(initial?.moveAtISO ? asDate(initial.moveAtISO) : null);
  const [note, setNote] = useState(initial?.note || "");
  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(() => (unitId ? getCatalogForUnit(unitId) : []), [unitId]);

  const sameRig = fromRig && toRig && fromRig === toRig;
  const missing = !unitId || !name.trim() || !code.trim() || !size.trim() || !fromRig || !toRig || sameRig;

  const submit = () => {
    if (missing) return;
    onSubmit({
      unitId,
      unitTitle: UNIT_LIST.find((u) => u.id === unitId)?.title || "—",
      name, code, size, fromRig, toRig,
      moveObj,
      note,
    });
  };

  return (
    <>
      <div className="dh-backdrop" onClick={onClose}>
        {/* عریض‌تر تا چهار ستون فیلد جا شود */}
        <div className="dh-modal dh-modal--wide" style={{maxWidth:"1100px"}} dir="rtl" onClick={(e) => e.stopPropagation()}>
          <header className="dh-modal__hdr">
            <b>{initial ? "ویرایش انتقال دکل↔دکل" : "ثبت انتقال دکل↔دکل"}</b>
            <button className="dh-close" onClick={onClose}>✕</button>
          </header>

          <div className="form form--tight">
            <div className="row">
              <select className="input unit-wide" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">* انتخاب واحد</option>
                {UNIT_LIST.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
              </select>
            </div>

            {/* چهار آیتم در یک ردیف: نام + دکمه | کد | سایز | آیکن */}
            <div className="row" style={{gridTemplateColumns:"2fr 1.2fr 1.2fr auto"}}>
              <div className="col with-pick">
                <input className={`input ${!name.trim() ? "err":""}`} placeholder="* نام تجهیز"
                  value={name} onChange={(e)=> setName(e.target.value)} disabled={!unitId}/>
               
                <small className="req-hint">الزامی</small>
              </div>

              <div className="col">
                <input className={`input ${!code.trim() ? "err":""}`} placeholder="* کد تجهیز"
                  value={code} onChange={(e)=> setCode(e.target.value)} disabled={!unitId}/>
                <small className="req-hint">الزامی</small>
              </div>

              <div className="col">
                <input className={`input ${!size.trim() ? "err":""}`} placeholder="* سایز"
                  value={size} onChange={(e)=> setSize(e.target.value)} disabled={!unitId}/>
                <small className="req-hint">الزامی</small>
              </div>

           <button type="button" className="pick-btn" title="انتخاب از کاتالوگ"
                  onClick={()=> setPickOpen(true)} disabled={!unitId}>☝️</button>
            </div>

            <div className="row">
              <select className={`input ${!fromRig || sameRig ? "err":""}`} value={fromRig} onChange={(e)=> setFromRig(e.target.value)}>
                <option value="">* از دکل</option>
                {RIGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className={`input ${!toRig || sameRig ? "err":""}`} value={toRig} onChange={(e)=> setToRig(e.target.value)}>
                <option value="">* به دکل</option>
                {RIGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <DatePicker value={moveObj} onChange={(v)=> setMoveObj(asDate(v))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]} inputClass="input"
                containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت انتقال (اختیاری)" />
            </div>

            {sameRig && <div className="alert warn">مبدأ و مقصد نمی‌تواند یکسان باشد.</div>}

            <textarea className="input" placeholder="توضیحات" value={note} onChange={(e)=> setNote(e.target.value)} />
          </div>

          <footer className="dh-modal__ftr">
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" onClick={submit} disabled={missing}>
              {initial ? "ذخیره تغییرات" : "ثبت انتقال"}
            </button>
          </footer>
        </div>
      </div>

      <ItemPickerModal
        open={pickOpen}
        onClose={()=> setPickOpen(false)}
        catalog={catalog}
        title={unitId ? `انتخاب تجهیز — ${UNIT_LIST.find((u)=>u.id===unitId)?.title}` : "انتخاب تجهیز"}
        onPick={(it)=>{ setName(it.name || ""); setCode(it.code || "");
          const autoSize = Array.isArray(it.sizes) ? (it.sizes[0] || "") : (it.size || "");
          setSize(autoSize); setPickOpen(false); }}
      />
    </>
  );
}
