// src/Components/DownholeInOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./DownholeInOut.css";

/* استایل و مودال‌های مشترک */
import ModalBase from "./common/ModalBase";

/* دکمه‌های خروجی (CSV / Word) */
import ExportButtons from "./common/ExportButtons";

/* ⬇️ مدال‌های جداگانه */
import DownholeInModal from "./Modals/DownholeInModal";
import DownholeRigModal from "./Modals/DownholeRigModal";

/* utils محلی شما */
import { loadLS, saveLS } from "../utils/ls";
import { DatePicker, TimePicker, persian, persian_fa, faFmt, fmtFa } from "../utils/date";

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
      unitTitle: UNIT_LIST.find(u=>u.id===payload.unitId)?.title || "—",
      name: payload.name,
      code: payload.code,
      size: payload.size,
      fromWhere: payload.fromWhere || "",
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

  /* === دکل↔دکل — با دو زمان جدید === */
  const saveRigMove = (payload) => {
    const requestAtISO = toISO16Safe(payload?.requestObj) || "";
    const arriveAtISO  = toISO16Safe(payload?.arriveObj)  || "";
    const clean = { ...payload, requestAtISO, arriveAtISO };

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

  /* ===== فیلتر سراسریِ تب دکل↔دکل ===== */
  const [rigFilter, setRigFilter] = useState({
    unitId: "",
    qName: "", qCode: "", fromRig: "", toRig: "",
    reqFrom: null, reqTo: null, arrFrom: null, arrTo: null,
  });
  const [rigFilterOn, setRigFilterOn] = useState(false);

  const reqFromISO = toISO16Safe(rigFilter.reqFrom);
  const reqToISO   = toISO16Safe(rigFilter.reqTo);
  const arrFromISO = toISO16Safe(rigFilter.arrFrom);
  const arrToISO   = toISO16Safe(rigFilter.arrTo);

  const applyRigPredicate = (arr) => {
    if (!rigFilterOn) return arr;
    const qn = rigFilter.qName.trim().toLowerCase();
    const qc = rigFilter.qCode.trim().toLowerCase();
    const fr = rigFilter.fromRig.trim();
    const tr = rigFilter.toRig.trim();

    return arr.filter(m => {
      const nameOk = !qn || (m.name||"").toLowerCase().includes(qn);
      const codeOk = !qc || (m.code||"").toLowerCase().includes(qc);
      const fromOk = !fr || (m.fromRig||"") === fr;
      const toOk   = !tr || (m.toRig||"") === tr;

      const rISO = m.requestAtISO || "";
      const aISO = m.arriveAtISO  || "";

      const reqFromOk = !reqFromISO || (rISO && rISO >= reqFromISO);
      const reqToOk   = !reqToISO   || (rISO && rISO <= reqToISO);
      const arrFromOk = !arrFromISO || (aISO && aISO >= arrFromISO);
      const arrToOk   = !arrToISO   || (aISO && aISO <= arrToISO);

      return nameOk && codeOk && fromOk && toOk && reqFromOk && reqToOk && arrFromOk && arrToOk;
    });
  };

  // کمک برای انتخاب واحد فعال در تب دکل↔دکل
  const rigUnitsToRender = useMemo(() => {
    if (!rigFilterOn || !rigFilter.unitId) return UNIT_LIST;
    return UNIT_LIST.filter(u => u.id === rigFilter.unitId);
  }, [rigFilterOn, rigFilter.unitId]);

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
              const list = grouped[u.id] || [];
              const { rows, p, pagesCount, total } = slicePage(list, pages[u.id] || 1);

              return (
                <section className="dh-section" key={u.id}>
                  <header className="dh-sec-hdr" onClick={() => setExpanded((e) => ({ ...e, [u.id]: !e[u.id] }))}>
                    <b>{u.title}</b>
                    <span className="muted">({total} ردیف)</span>
                    <span className="chev">{expanded[u.id] ? "▾" : "▸"}</span>
                  </header>

                  {expanded[u.id] && (
                    <>
                      {/* خروجی مخصوص همین واحد از لیست باز */}
                      <div className="table-toolbar">
                        <ExportButtons
                          variant="compact"
                          getExport={()=>{
                            const headers = ["نام تجهیز","کد","سایز","تاریخ ورود","وضعیت","واحد ارسالی","یادداشت"];
                            const rows = list.map(r => ({
                              "نام تجهیز": r.name||"",
                              "کد": r.code||"",
                              "سایز": r.size||"",
                              "تاریخ ورود": r.enterISO ? fmtFa(r.enterISO) : "",
                              "وضعیت": r.status || "",
                              "واحد ارسالی": r.fromWhere || "",
                              "یادداشت": r.note || ""
                            }));
                            return {
                              filename: `open_${u.id}_${new Date().toISOString().slice(0,10)}`,
                              title: `لیست باز — ${u.title}`,
                              headers, rows
                            };
                          }}
                        />
                      </div>

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

            {/* نوار فیلتر سراسری دکل↔دکل */}
            <div className="io-filter" style={{marginTop:8}}>
              <div className="io-filter__fields" style={{gridTemplateColumns:"repeat(6, 1fr)"}}>
                <select className="input" value={rigFilter.unitId}
                        onChange={e=>setRigFilter(s=>({...s,unitId:e.target.value}))}>
                  <option value="">واحد (همه)</option>
                  {UNIT_LIST.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                </select>
                <input className="input" placeholder="نام تجهیز..." value={rigFilter.qName}
                       onChange={e=>setRigFilter(s=>({...s,qName:e.target.value}))}/>
                <input className="input" placeholder="کد..." value={rigFilter.qCode}
                       onChange={e=>setRigFilter(s=>({...s,qCode:e.target.value}))}/>
                <select className="input" value={rigFilter.fromRig}
                        onChange={e=>setRigFilter(s=>({...s,fromRig:e.target.value}))}>
                  <option value="">از دکل (همه)</option>
                  {RIGS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <select className="input" value={rigFilter.toRig}
                        onChange={e=>setRigFilter(s=>({...s,toRig:e.target.value}))}>
                  <option value="">به دکل (همه)</option>
                  {RIGS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
                <div className="f-item">
                  <div className="btnrow" style={{display:"flex",gap:8}}>
                    <button className="btn primary" onClick={()=> setRigFilterOn(true)}>اعمال فیلتر</button>
                    <button className="btn" onClick={()=>{
                      setRigFilter({ unitId:"", qName:"", qCode:"", fromRig:"", toRig:"", reqFrom:null, reqTo:null, arrFrom:null, arrTo:null });
                      setRigFilterOn(false);
                    }}>حذف فیلتر</button>

                    {/* خروجی‌های دکل↔دکل (کل نتایج/با فیلترهای جاری) */}
                    <ExportButtons
                      variant="compact"
                      getExport={()=>{
                        const units = rigUnitsToRender; // بر اساس انتخاب واحد
                        const all = units.flatMap(u =>
                          (applyRigPredicate(movesByUnit[u.id] || []))
                            .map(m => ({ unitTitle: u.title, ...m }))
                        );
                        const headers = ["واحد","نام تجهیز","کد","سایز","از دکل","به دکل","تاریخ/ساعت درخواست","تاریخ/ساعت رسیدن","توضیحات"];
                        const rows = all.map(r => ({
                          "واحد": r.unitTitle || "",
                          "نام تجهیز": r.name || "",
                          "کد": r.code || "",
                          "سایز": r.size || "",
                          "از دکل": r.fromRig || "",
                          "به دکل": r.toRig || "",
                          "تاریخ/ساعت درخواست": r.requestAtISO ? fmtFa(r.requestAtISO) : "",
                          "تاریخ/ساعت رسیدن":   r.arriveAtISO  ? fmtFa(r.arriveAtISO)  : "",
                          "توضیحات": r.note || "",
                        }));
                        const unitSuffix = rigFilterOn && rigFilter.unitId
                          ? `_${rigFilter.unitId}` : "_all";
                        return {
                          filename: `rig_moves${unitSuffix}_${new Date().toISOString().slice(0,10)}`,
                          title: "گزارش انتقال دکل↔دکل",
                          headers, rows
                        };
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="muted" style={{display:"flex",gap:8,alignItems:"center"}}>
                <span>فیلتر فعال: <b>{rigFilterOn ? "بله" : "خیر"}</b></span>
              </div>
            </div>

            {rigUnitsToRender.map((u) => {
              const list = applyRigPredicate(movesByUnit[u.id] || [])
                .slice()
                .sort((a,b)=>{
                  const ak = String(b.requestAtISO || b.arriveAtISO || "");
                  const bk = String(a.requestAtISO || a.arriveAtISO || "");
                  return ak.localeCompare(bk);
                });
              const { rows, p, pagesCount, total } = slicePage(list, rigPages[u.id] || 1);
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
                      {/* خروجی مخصوص همین واحد */}
                      <div className="table-toolbar">
                        <ExportButtons
                          variant="compact"
                          getExport={()=>{
                            const headers = ["نام تجهیز","کد","سایز","از دکل","به دکل","تاریخ/ساعت درخواست","تاریخ/ساعت رسیدن","توضیحات"];
                            const rows = list.map(r => ({
                              "نام تجهیز": r.name || "",
                              "کد": r.code || "",
                              "سایز": r.size || "",
                              "از دکل": r.fromRig || "",
                              "به دکل": r.toRig || "",
                              "تاریخ/ساعت درخواست": r.requestAtISO ? fmtFa(r.requestAtISO) : "",
                              "تاریخ/ساعت رسیدن":   r.arriveAtISO  ? fmtFa(r.arriveAtISO)  : "",
                              "توضیحات": r.note || "",
                            }));
                            return {
                              filename: `rig_moves_${u.id}_${new Date().toISOString().slice(0,10)}`,
                              title: `انتقال دکل↔دکل — ${u.title}`,
                              headers, rows
                            };
                          }}
                        />
                      </div>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>نام تجهیز</th><th>کد</th><th>سایز</th>
                              <th>از دکل</th><th>به دکل</th>
                              <th>تاریخ و ساعت درخواست</th>
                              <th>تاریخ و ساعت رسیدن</th>
                              <th>توضیحات</th><th>عملیات</th>
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
                                <td>{r.requestAtISO ? fmtFa(r.requestAtISO) : "—"}</td>
                                <td>{r.arriveAtISO  ? fmtFa(r.arriveAtISO)  : "—"}</td>
                                <td className="muted">{r.note || "—"}</td>
                                <td className="ops">
                                  <button className="btn small solid" onClick={()=>{ setEditingMove(r); setShowRigModal(true); }}>ویرایش</button>
                                  <button className="btn small danger" onClick={()=>removeRigMove(r.id)}>حذف</button>
                                </td>
                              </tr>
                            )) : <tr><td colSpan={9} className="empty">موردی ثبت نشده</td></tr>}
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
      {showIn && (
        <DownholeInModal
          open
          onClose={() => setShowIn(false)}
          onSubmit={addIn}
          unitList={UNIT_LIST}
          catalogProvider={getCatalogForUnit}
        />
      )}

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
        <DownholeRigModal
          open
          initial={editingMove}
          onClose={() => { setShowRigModal(false); setEditingMove(null); }}
          onSubmit={saveRigMove}
          unitList={UNIT_LIST}
        />
      )}
    </div>
  );
}

/* ========================= Modals (داخلی) ========================= */

/* مشخصات/تعمیر */
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
    <ModalBase
      open
      onClose={onClose}
      title={`مشخصات/تعمیر — ${row.name} (${row.code})`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>بستن</button>
          <button type="button" className="btn primary" onClick={() => onSave({ techs, partsUsed, failureDesc, repairCost, status })}>
            ذخیره
          </button>
        </>
      }
    >
      <div className="mb-form">
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
    </ModalBase>
  );
}

/* خروج */
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
    <ModalBase
      open
      onClose={onClose}
      title={`ثبت خروج — ${row.name} (${row.code})`}
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn danger" disabled={!canSubmit} onClick={submit}>ثبت خروج</button>
        </>
      }
    >
      <div className="mb-form">
        <div className="row">
          <DatePicker value={exitObj} onChange={setExitObj}
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
    </ModalBase>
  );
}

/* آرشیو با فیلتر + خروجی */
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

  return (
    <ModalBase
      open
      onClose={onClose}
      title="آرشیو خروج قطعات"
      size="lg"
      footer={<button className="btn" onClick={onClose}>بستن</button>}
    >
      {/* فیلتر تاشونده */}
      <details className="arch-filter" open={!openList}>
        <summary>فیلتر</summary>
        <div className="mb-form">
          <div className="row">
            <input className="input" placeholder="نام تجهیز..." value={qName} onChange={(e)=> setQName(e.target.value)} />
            <input className="input" placeholder="کد تجهیز..." value={qCode} onChange={(e)=> setQCode(e.target.value)} />
            <div className="col" />
          </div>
          <div className="row">
            <DatePicker value={fromObj} onChange={setFromObj}
              calendar={persian} locale={persian_fa} format={faFmt}
              plugins={[<TimePicker position="bottom" />]} inputClass="input"
              containerClassName="rmdp-rtl" placeholder="از تاریخ خروج" />
            <DatePicker value={toObj} onChange={setToObj}
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
        <ExportButtons
          getExport={()=>{
            const headers = ["نام تجهیز","کد","سایز","واحد مبدأ","تاریخ ورود","تاریخ خروج","واحد مقصد","دکل/پیمانکار","نوع ماشین","شماره بارنامه","یادداشت خروج","افراد تعمیر","مصرفی‌ها","شرح خرابی","هزینه تعمیر"];
            const rows = filtered.map(r => {
              const peer = r.destUnit==="rig" ? (r.destRig||"") :
                           r.destUnit==="contractor" ? (r.destContractor||"") : "";
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
            return {
              filename: `archive_${new Date().toISOString().slice(0,10)}`,
              title: "گزارش آرشیو خروج قطعات",
              headers, rows
            };
          }}
        />
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
    </ModalBase>
  );
}

/* ویرایش ردیف آرشیو */
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
    <ModalBase
      open
      onClose={onClose}
      title={`ویرایش ردیف آرشیو — ${row.name} (${row.code})`}
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>انصراف</button>
          <button className="btn primary" disabled={!canSubmit}
            onClick={()=> onSave({
              exitISO: toISO16Safe(exitObj) || toISO16Safe(new Date()),
              destUnit, destRig, destContractor, vehicleKind, waybillNo, exitNote: note
            })}
          >ذخیره</button>
        </>
      }
    >
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

      <div className="mb-form">
        <div className="row">
          <DatePicker value={exitObj} onChange={setExitObj}
            calendar={persian} locale={persian_fa} format={faFmt}
            plugins={[<TimePicker position="bottom" />]} inputClass="input"
            containerClassName="rmdp-rtl" placeholder="تاریخ و ساعت خروج (اختیاری)" />
          <select className="input" value={destUnit} onChange={(e)=> { setDestUnit(e.target.value); setDestRig(""); setDestContractor(""); }}>
            <option value="">* واحد مقصد</option>
            <option value="rig">دکل</option>
            <option value="contractor">پیمانکار</option>
            <option value="other">سایر</option>
          </select>
          <div className="col" />
        </div>

        <div className="row">
          {destUnit==="rig" && (
            <select className="input" value={destRig} onChange={(e)=> setDestRig(e.target.value)}>
              <option value="">انتخاب دکل</option>
              {RIGS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {destUnit==="contractor" && (
            <input className="input" placeholder="نام پیمانکار" value={destContractor} onChange={(e)=> setDestContractor(e.target.value)} />
          )}
          <input className="input" placeholder="شماره بارنامه" value={waybillNo} onChange={(e)=> setWaybillNo(e.target.value)} />
        </div>

        <textarea className="input" placeholder="توضیحات خروج" value={note} onChange={(e)=> setNote(e.target.value)} />
      </div>
    </ModalBase>
  );
}
