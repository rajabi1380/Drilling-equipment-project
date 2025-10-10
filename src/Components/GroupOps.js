// src/Components/GroupOps.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./DownholeInOut.css";
import "./GroupOps.css";
import { RIGS } from "../constants/catalog";
import { exportCSV, exportDOC } from "../utils/export";

// تقویم شمسی + زمان
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  toISO16,
} from "../utils/date";

const LS_KEY = "ops_groups_v11"; // خروجی کامل + مودال اعضای سفید/کاستوم
const COST_PER_HOUR = 200_000;
const newId = () => Number(`${Date.now()}${Math.floor(Math.random() * 1e3)}`);

function TabsHeader({ tab, setTab }) {
  return (
    <div className="tabs-titlebar" role="tablist" aria-label="گروه‌های عملیاتی">
      <button className={`tabbtn ${tab === "groups" ? "is-on" : ""}`} onClick={() => setTab("groups")}>گزارش عملیات</button>
      <span className="divider" aria-hidden />
      <button className={`tabbtn ${tab === "members" ? "is-on" : ""}`} onClick={() => setTab("members")}>اعضا</button>
      <span className="divider" aria-hidden />
      <button className={`tabbtn ${tab === "reports" ? "is-on" : ""}`} onClick={() => setTab("reports")}>گزارش‌ها</button>
    </div>
  );
}

/* ===== Utils ===== */
const diffHours = (startISO, endISO) => {
  if (!startISO || !endISO) return 0;
  const s = new Date(startISO), e = new Date(endISO);
  const ms = e - s;
  return !isFinite(ms) || ms <= 0 ? 0 : Math.round(ms / 36e5);
};
const monthKey = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso); if (isNaN(+d)) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const money = (n) => n.toLocaleString("fa-IR", { maximumFractionDigits: 0 });

/* ===== Main ===== */
export default function GroupOps() {
  const boot = JSON.parse(localStorage.getItem(LS_KEY) || `{"groups":[],"people":[]}`);
  const [groups, setGroups] = useState(boot.groups || []);
  const [people, setPeople] = useState(
    boot.people || [
      { id: 1, name: "محسن جلالی‌زاده" },
      { id: 2, name: "هومن رجبی" },
      { id: 3, name: "حسین کریمی" },
      { id: 4, name: "مهدی نامدار" },
    ]
  );
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify({ groups, people })); }, [groups, people]);

  const [tab, setTab] = useState("groups");

  /* ==== فیلترهای تب «گزارش عملیات» ==== */
  const [gFilters, setGFilters] = useState({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "" });
  const applyGFilters = (e) => { e?.preventDefault?.(); setGFilters(f => ({ ...f, fromISO: toISO16(f.fromObj), toISO: toISO16(f.toObj) })); };
  const clearGFilters = () => setGFilters({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "" });

  const filteredGroups = useMemo(() => {
    const base = groups.filter(g => !g.archived);
    const f = gFilters;
    return base.filter((g) => {
      const okN = !f.name || (g.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okR = !f.rig || (g.rig || "") === f.rig;
      const okFrom = !f.fromISO || (g.dispatchAtISO && g.dispatchAtISO >= f.fromISO);
      const okTo = !f.toISO || (g.finishAtISO && g.finishAtISO <= f.toISO);
      return okN && okR && okFrom && okTo;
    });
  }, [groups, gFilters]);

  /* ==== فیلترهای تب «گزارش‌ها» ==== */
  const [rFilters, setRFilters] = useState({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "", applied: false });
  const applyRFilters = (e) => { e?.preventDefault?.(); setRFilters(f => ({ ...f, fromISO: toISO16(f.fromObj), toISO: toISO16(f.toObj), applied: true })); };
  const clearRFilters = () => setRFilters({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "", applied: false });

  const archivedFiltered = useMemo(() => {
    const base = groups.filter(g => g.archived);
    const f = rFilters;
    return base.filter((g) => {
      const okN = !f.name || (g.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okR = !f.rig || (g.rig || "") === f.rig;
      const okFrom = !f.fromISO || (g.dispatchAtISO && g.dispatchAtISO >= f.fromISO);
      const okTo = !f.toISO || (g.finishAtISO && g.finishAtISO <= f.toISO);
      return okN && okR && okFrom && okTo;
    });
  }, [groups, rFilters]);

  /* ==== CRUD ==== */
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const startNew = () => { setEditing(null); setShowModal(true); };
  const startEdit = (g) => { setEditing(g); setShowModal(true); };
  const remove = (id) => setGroups(prev => prev.filter(g => g.id !== id));
  const archive = (id) => setGroups(prev => prev.map(g => g.id === id ? { ...g, archived: true } : g));

  const saveGroup = (payload) => {
    const uniqMembers = Array.from(new Set(payload.members || [])).filter(n => n !== (payload.lead || ""));
    const clean = { ...payload, members: uniqMembers, archived: payload.archived ?? false };
    if (editing) setGroups(prev => prev.map(g => g.id === editing.id ? { ...g, ...clean } : g));
    else setGroups(prev => [{ id: newId(), ...clean }, ...prev ]);
    setShowModal(false); setEditing(null);
  };

  /* ==== آمار ==== */
  const statsOf = (g) => {
    const total = (g.tasks || []).length;
    const done = total;
    const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
    const allDone = total > 0;
    return { total, done, hours, allDone };
  };

  /* ==== تجمیع گزارش‌ها ==== */
  const peopleAgg = useMemo(() => {
    const map = new Map();
    for (const g of archivedFiltered) {
      const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
      const participants = new Set([...(g.members || []), ...(g.lead ? [g.lead] : [])]);
      for (const name of participants) {
        const cur = map.get(name) || { count: 0, hours: 0, cost: 0 };
        const cost = hours * COST_PER_HOUR;
        map.set(name, { count: cur.count + 1, hours: cur.hours + hours, cost: cur.cost + cost });
      }
    }
    return Array.from(map, ([name, v]) => ({ name, ...v }));
  }, [archivedFiltered]);

  const peopleMonthly = useMemo(() => {
    const map = new Map();
    for (const g of archivedFiltered) {
      const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
      const m = monthKey(g.dispatchAtISO);
      const participants = new Set([...(g.members || []), ...(g.lead ? [g.lead] : [])]);
      for (const name of participants) {
        const key = `${name}|${m}`;
        const cur = map.get(key) || { name, month: m, count: 0, hours: 0, cost: 0 };
        const cost = hours * COST_PER_HOUR;
        map.set(key, { name, month: m, count: cur.count + 1, hours: cur.hours + hours, cost: cur.cost + cost });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.name.localeCompare(b.name, "fa")));
  }, [archivedFiltered]);

  const rigsAgg = useMemo(() => {
    const map = new Map();
    for (const g of archivedFiltered) {
      const key = g.rig || "—";
      const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
      const cur = map.get(key) || { count: 0, hours: 0 };
      map.set(key, { count: cur.count + 1, hours: cur.hours + hours });
    }
    return Array.from(map, ([rig, v]) => ({ rig, ...v }));
  }, [archivedFiltered]);

  /* ==== خروجی‌ها: تب «گزارش عملیات» ==== */
  const exportGroupsCSV = () => {
    const rows = filteredGroups.map((g) => ({
      "عنوان گزارش": g.name || "",
      "دکل": g.rig || "",
      "نوع خودرو": g.vehicleType || "",
      "مالکیت خودرو": g.vehicleOwner || "",
      "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
      "پایان": g.finishAtISO?.replace("T", " ") || "",
      "لیدر": g.lead || "",
      "اعضا": (g.members || []).join("، "),
      "تعداد موضوع": (g.tasks || []).length,
      "وضعیت": (g.tasks || []).length ? "تکمیل‌شده" : "—",
    }));
    const headers = Object.keys(rows[0] || {});
    exportCSV(`ops_groups_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };
  const exportGroupsDOC = () => {
    const rows = filteredGroups.map((g) => ({
      "عنوان گزارش": g.name || "",
      "دکل": g.rig || "",
      "نوع خودرو": g.vehicleType || "",
      "مالکیت خودرو": g.vehicleOwner || "",
      "اعضا": (g.members || []).join("، "),
      "لیدر": g.lead || "",
      "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
      "پایان": g.finishAtISO?.replace("T", " ") || "",
      "شرح کارها": (g.tasks || []).map(t => `• ${t.subject}${t.desc ? ` — ${t.desc}` : ""}`).join("\n"),
    }));
    const headers = Object.keys(rows[0] || {});
    exportDOC(`ops_groups_${new Date().toISOString().slice(0,10)}.doc`, "گزارش عملیات (فعال)", headers, rows);
  };

  /* ==== خروجی‌ها: تب «گزارش‌ها» (کامل + تجمیعی) ==== */
  const exportReportsAllCSV = () => {
    const rows = [];
    archivedFiltered.forEach((g) => {
      const s = statsOf(g);
      const base = {
        "ID عملیات": g.id,
        "عنوان گزارش": g.name || "",
        "دکل": g.rig || "",
        "نوع خودرو": g.vehicleType || "",
        "مالکیت خودرو": g.vehicleOwner || "",
        "اعضا": (g.members || []).join("، "),
        "لیدر": g.lead || "",
        "اعزام": g.dispatchAtISO ? g.dispatchAtISO.replace("T"," ") : "",
        "پایان": g.finishAtISO ? g.finishAtISO.replace("T"," ") : "",
        "مدت (ساعت)": s.hours,
        "تعداد موضوع": s.total,
      };
      if ((g.tasks || []).length) {
        g.tasks.forEach(t => {
          rows.push({ ...base, "ID کار": t.id, "موضوع کار": t.subject || "", "شرح کار": t.desc || "" });
        });
      } else {
        rows.push({ ...base, "ID کار":"", "موضوع کار":"", "شرح کار":"" });
      }
    });
    const headers = Object.keys(rows[0] || {});
    exportCSV(`ops_reports_full_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };
  const exportReportsAllDOC = () => {
    const rows = archivedFiltered.map((g) => {
      const s = statsOf(g);
      return {
        "عنوان گزارش": g.name || "",
        "دکل": g.rig || "",
        "وسیله": `${g.vehicleType||"—"} / ${g.vehicleOwner||"—"}`,
        "اعضا": (g.members||[]).join("، "),
        "لیدر": g.lead || "",
        "اعزام": g.dispatchAtISO ? g.dispatchAtISO.replace("T"," ") : "",
        "پایان": g.finishAtISO ? g.finishAtISO.replace("T"," ") : "",
        "مدت (ساعت)": s.hours,
        "کارها": (g.tasks||[]).length
          ? (g.tasks||[]).map(t => `• ${t.subject}${t.desc?` — ${t.desc}`:""}`).join("\n")
          : "—"
      };
    });
    const headers = Object.keys(rows[0] || {});
    exportDOC(`ops_reports_full_${new Date().toISOString().slice(0,10)}.doc`, "جزئیات کامل عملیاتِ بایگانی‌شده", headers, rows);
  };

  const exportReportsCSV = () => {
    const rows = peopleMonthly.map(r => ({
      "ماه": r.month, "نام نفر": r.name, "تعداد مأموریت": r.count, "ساعات": r.hours, "هزینه (تومان)": r.cost
    }));
    const headers = Object.keys(rows[0] || {});
    exportCSV(`ops_reports_agg_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };
  const exportReportsDOC = () => {
    const rows = [
      { بخش: "افراد (کل)", داده: peopleAgg.map(r => `${r.name}: ${r.count} مأموریت، ${r.hours} ساعت، هزینه ${money(r.cost)} تومان`).join("\n") },
      { بخش: "افراد بر حسب ماه", داده: peopleMonthly.map(r => `${r.month} | ${r.name}: ${r.count} مأموریت، ${r.hours} ساعت، ${money(r.cost)} تومان`).join("\n") },
      { بخش: "دکل‌ها", داده: rigsAgg.map(r => `${r.rig}: ${r.count} مأموریت، ${r.hours} ساعت`).join("\n") },
    ];
    exportDOC(`ops_reports_agg_${new Date().toISOString().slice(0,10)}.doc`, "گزارش‌های بایگانی‌شده (تجمیعی)", ["بخش","داده"], rows);
  };

  /* ====== state و منطق مدال نام عضو (Add/Edit) ====== */
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingPersonId, setEditingPersonId] = useState(null); // null => افزودن

  const openAddMember = () => { setEditingPersonId(null); setNameDraft(""); setShowNamePrompt(true); };
  const openEditMember = (p) => { setEditingPersonId(p.id); setNameDraft(p.name || ""); setShowNamePrompt(true); };
  const saveNamePrompt = () => {
    const val = (nameDraft || "").trim();
    if (!val) { setShowNamePrompt(false); return; }
    if (editingPersonId == null) {
      setPeople(prev => [{ id: newId(), name: val }, ...prev]);
    } else {
      setPeople(prev => prev.map(x => x.id === editingPersonId ? { ...x, name: val } : x));
    }
    setShowNamePrompt(false);
  };

  return (
    <div className="dh-page" dir="rtl">
      <div className="dh-card">
        <TabsHeader tab={tab} setTab={setTab} />

        {/* ===== تب گزارش عملیات ===== */}
        {tab === "groups" && (
          <>
            <form className="dh-toolbar grp-filter" onSubmit={applyGFilters}>
              <input className="input" style={{minWidth:180}} placeholder="عنوان گزارش…" value={gFilters.name} onChange={(e) => setGFilters(f => ({ ...f, name: e.target.value }))} />
              <select className="input" value={gFilters.rig} onChange={(e) => setGFilters(f => ({ ...f, rig: e.target.value }))}>
                <option value="">دکل (همه)</option>
                {RIGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <DatePicker value={gFilters.fromObj} onChange={(v) => setGFilters(f => ({ ...f, fromObj: v }))} calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" />
              <DatePicker value={gFilters.toObj} onChange={(v) => setGFilters(f => ({ ...f, toObj: v }))} calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" />
              <button className="btn primary" type="submit">اعمال فیلتر</button>
              {(gFilters.name || gFilters.rig || gFilters.fromObj || gFilters.toObj) && (
                <button className="btn" type="button" onClick={clearGFilters}>حذف فیلتر</button>
              )}
              <div className="io-actions">
                <button type="button" className="btn" onClick={exportGroupsCSV}>Excel</button>
                <button type="button" className="btn" onClick={exportGroupsDOC}>Word</button>
              </div>
              <div style={{ marginInlineStart: "auto" }}>
                <button className="btn primary" type="button" onClick={startNew}>ثبت گزارش جدید</button>
              </div>
            </form>

            <div className="grp-grid">
              {filteredGroups.length ? filteredGroups.map((g) => {
                const s = statsOf(g);
                return (
                  <div className="grp-card" key={g.id}>
                    <div className="grp-hdr">
                      <b className="grp-title">{g.name}</b>
                      <span className="muted">{g.rig || "—"}</span>
                    </div>

                    <div className="grp-row"><span className="muted">لیدر:</span><span>{g.lead || "—"}</span></div>
                    <div className="grp-row"><span className="muted">اعضا:</span><span>{(g.members || []).join("، ") || "—"}</span></div>
                    <div className="grp-row"><span className="muted">وسیله:</span><span>{(g.vehicleType || "—") + " / " + (g.vehicleOwner || "—")}</span></div>

                    <div className="grp-row"><span className="muted">اعزام:</span><span>{g.dispatchAtISO ? g.dispatchAtISO.replace("T", " ") : "—"}</span></div>
                    <div className="grp-row"><span className="muted">پایان:</span><span>{g.finishAtISO ? g.finishAtISO.replace("T", " ") : "—"}</span></div>
                    <div className="grp-row"><span className="muted">مدت مأموریت:</span><span>{s.hours} ساعت</span></div>

                    <div className="grp-kpi">
                      <div className="kpi-badge">موضوع‌ها: {s.total}</div>
                      <div className="kpi-badge solid">تکمیل‌شده: {s.done}</div>
                      {s.allDone ? (
                        <div className="kpi-badge" style={{ borderColor: "#16a34a", color: "#16a34a" }}>وضعیت: ✅</div>
                      ) : (
                        <div className="kpi-badge" style={{ borderColor: "#f59e0b", color: "#b45309" }}>وضعیت: در جریان</div>
                      )}
                    </div>

                    <div className="grp-actions">
                      <button className="btn small btn-edit" onClick={() => startEdit(g)}>ویرایش</button>
                      <button className="btn small btn-archive" onClick={() => archive(g.id)}>بایگانی</button>
                      <button className="btn small btn-delete" onClick={() => remove(g.id)}>حذف</button>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty" style={{ padding: "16px 0" }}>فعلاً گزارشی مطابق فیلتر نیست</div>
              )}
            </div>
          </>
        )}

        {/* ===== تب اعضا ===== */}
        {tab === "members" && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>نام</th><th>عملیات</th></tr></thead>
              <tbody>
                {people.length ? people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="ops">
                      <button className="btn small" onClick={() => openEditMember(p)}>ویرایش</button>
                      <button className="btn small danger" onClick={() => setPeople((prev) => prev.filter((x) => x.id !== p.id))}>حذف</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={2} className="empty">عضوی وجود ندارد</td></tr>}
              </tbody>
            </table>

            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={openAddMember}>افزودن عضو</button>
            </div>
          </div>
        )}

        {/* ===== تب گزارش‌ها ===== */}
        {tab === "reports" && (
          <>
            <form className="dh-toolbar grp-filter" onSubmit={applyRFilters}>
              <input className="input" style={{minWidth:180}} placeholder="عنوان گزارش…" value={rFilters.name} onChange={(e) => setRFilters(f => ({ ...f, name: e.target.value }))} />
              <select className="input" value={rFilters.rig} onChange={(e) => setRFilters(f => ({ ...f, rig: e.target.value }))}>
                <option value="">دکل (همه)</option>
                {RIGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <DatePicker value={rFilters.fromObj} onChange={(v) => setRFilters(f => ({ ...f, fromObj: v }))} calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" />
              <DatePicker value={rFilters.toObj} onChange={(v) => setRFilters(f => ({ ...f, toObj: v }))} calendar={persian} locale={persian_fa} format={faFmt} plugins={[<TimePicker position="bottom" />]} inputClass="input" containerClassName="rmdp-rtl" />
              <button className="btn primary" type="submit">اعمال فیلتر</button>
              {(rFilters.name || rFilters.rig || rFilters.fromObj || rFilters.toObj) && (
                <button className="btn" type="button" onClick={clearRFilters}>حذف فیلتر</button>
              )}
              <div className="io-actions">
                <button type="button" className="btn" onClick={exportReportsCSV} disabled={!rFilters.applied}>Excel (تجمیعی)</button>
                <button type="button" className="btn" onClick={exportReportsDOC} disabled={!rFilters.applied}>Word (تجمیعی)</button>
                <button type="button" className="btn primary" onClick={exportReportsAllCSV} disabled={!rFilters.applied}>Excel (کامل)</button>
                <button type="button" className="btn primary" onClick={exportReportsAllDOC} disabled={!rFilters.applied}>Word (کامل)</button>
              </div>
            </form>

            {!rFilters.applied ? (
              <div className="empty" style={{padding:"14px 0"}}>
                برای مشاهده جداول تجمیعی یا گرفتن خروجی کامل، فیلتر را تنظیم و «اعمال فیلتر» را بزنید.
              </div>
            ) : (
              <>
                <div className="table-wrap" style={{ marginBottom: 10 }}>
                  <table>
                    <thead><tr><th>نام نفر</th><th>تعداد مأموریت</th><th>ساعات</th><th>هزینه (تومان)</th></tr></thead>
                    <tbody>
                      {peopleAgg.length ? peopleAgg.map((r) => (
                        <tr key={r.name}>
                          <td>{r.name}</td>
                          <td>{r.count}</td>
                          <td>{r.hours}</td>
                          <td>{money(r.cost)}</td>
                        </tr>
                      )) : <tr><td colSpan={4} className="empty">داده‌ای وجود ندارد</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap" style={{ marginBottom: 10 }}>
                  <table>
                    <thead><tr><th>ماه</th><th>نام نفر</th><th>تعداد مأموریت</th><th>ساعات</th><th>هزینه (تومان)</th></tr></thead>
                    <tbody>
                      {peopleMonthly.length ? peopleMonthly.map((r, idx) => (
                        <tr key={idx}>
                          <td>{r.month}</td>
                          <td>{r.name}</td>
                          <td>{r.count}</td>
                          <td>{r.hours}</td>
                          <td>{money(r.cost)}</td>
                        </tr>
                      )) : <tr><td colSpan={5} className="empty">داده‌ای وجود ندارد</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead><tr><th>دکل</th><th>تعداد مأموریت</th><th>مجموع ساعات</th></tr></thead>
                    <tbody>
                      {rigsAgg.length ? rigsAgg.map((r) => (
                        <tr key={r.rig}>
                          <td>{r.rig}</td>
                          <td>{r.count}</td>
                          <td>{r.hours}</td>
                        </tr>
                      )) : <tr><td colSpan={3} className="empty">داده‌ای وجود ندارد</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* مودال ثبت/ویرایش گزارش */}
      {showModal && (
        <GroupModal
          rigs={RIGS}
          people={people}
          setPeople={setPeople}
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={saveGroup}
        />
      )}

      {/* مودال افزودن/ویرایش نام عضو (سفید و کاستوم) */}
      {showNamePrompt && (
        <NamePrompt
          title={editingPersonId == null ? "نام عضو جدید:" : "ویرایش نام عضو:"}
          value={nameDraft}
          onChange={setNameDraft}
          onCancel={() => setShowNamePrompt(false)}
          onSave={saveNamePrompt}
        />
      )}
    </div>
  );
}

/* ===== Modal ===== */
function GroupModal({ rigs, people, setPeople, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [rig, setRig] = useState(initial?.rig || "");
  const [lead, setLead] = useState(initial?.lead || "");
  const [members, setMembers] = useState(initial?.members || []);

  const [vehicleType, setVehicleType] = useState(initial?.vehicleType || "");
  const [vehicleOwner, setVehicleOwner] = useState(initial?.vehicleOwner || "");

  const [dispatchObj, setDispatchObj] = useState(null);
  const [finishObj, setFinishObj] = useState(null);
  const [dispatchAtISO, setDispatchAtISO] = useState(initial?.dispatchAtISO || "");
  const [finishAtISO, setFinishAtISO] = useState(initial?.finishAtISO || "");

  // tasks: { id, subject, desc } — همگی «done»
  const [tasks, setTasks] = useState(
    (initial?.tasks || []).length
      ? initial.tasks.map(t => ({ id: t.id, subject: t.subject ?? t.title ?? "", desc: t.desc ?? "" }))
      : [{ id: newId(), subject: "", desc: "" }]
  );
  const addTask = () => setTasks(prev => [...prev, { id: newId(), subject: "", desc: "" }]);
  const updateTask = (id, patch) => setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  // انتخاب اعضا
  const [showPicker, setShowPicker] = useState(false);
  const [quickMember, setQuickMember] = useState("");
  const toggleMember = (n) => setMembers(prev => (prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]));
  const addQuickMember = () => {
    const n = (quickMember || "").trim(); if (!n) return;
    setPeople(prev => [{ id: newId(), name: n }, ...prev]);
    setMembers(prev => (prev.includes(n) ? prev : [...prev, n]));
    setQuickMember("");
  };

  const can = name.trim().length > 0 && rig && (finishAtISO && dispatchAtISO);

  return (
    <div className="dh-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dh-modal dh-modal--wide" role="dialog" aria-modal="true">
        <div className="dh-modal__hdr">
          <div><b>{initial ? "ویرایش گزارش عملیات" : "ثبت گزارش عملیات"}</b></div>
          <button className="dh-close" onClick={onClose}>✕</button>
        </div>

        <div className="form form--tight">
          <div className="row">
            <div className="col">
              <input className="input req" placeholder="* عنوان گزارش" value={name} onChange={(e) => setName(e.target.value)} />
              <span className="req-hint">ورود این فیلد الزامی است</span>
            </div>
            <div className="col">
              <select className="input req" value={rig} onChange={(e) => setRig(e.target.value)}>
                <option value="">* دکل</option>
                {rigs.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="req-hint">ورود این فیلد الزامی است</span>
            </div>
            <div className="col">
              <select className="input" value={lead} onChange={(e) => setLead(e.target.value)}>
                <option value="">لیدر (اختیاری)</option>
                {people.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* خودرو */}
          <div className="row">
            <div className="col">
              <div className="label">نوع خودرو</div>
              <select className="input" value={vehicleType} onChange={(e)=>setVehicleType(e.target.value)}>
                <option value="">— انتخاب کنید —</option>
                <option value="سواری">سواری</option>
                <option value="وانت">وانت</option>
              </select>
            </div>
            <div className="col">
              <div className="label">مالکیت خودرو</div>
              <select className="input" value={vehicleOwner} onChange={(e)=>setVehicleOwner(e.target.value)}>
                <option value="">— انتخاب کنید —</option>
                <option value="شرکتی">شرکتی</option>
                <option value="استیجاری">استیجاری</option>
              </select>
            </div>
            <div className="col"></div>
          </div>

          <div className="row">
            <div className="col">
              <div className="label">اعضا</div>
              <button type="button" className="btn" onClick={() => setShowPicker(true)}>انتخاب اعضا</button>
              {members.length > 0 && <div className="muted" style={{ marginTop: 6 }}>انتخاب‌شده: {members.join("، ")}</div>}
            </div>

            <div className="col">
              <div className="label">تاریخ و ساعت اعزام *</div>
              <DatePicker
                value={dispatchObj}
                onChange={(v) => { setDispatchObj(v); setDispatchAtISO(toISO16(v)); }}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input req" containerClassName="rmdp-rtl"
              />
              <span className="req-hint">ورود این فیلد الزامی است</span>
            </div>

            <div className="col">
              <div className="label">تاریخ و ساعت پایان *</div>
              <DatePicker
                value={finishObj}
                onChange={(v) => { setFinishObj(v); setFinishAtISO(toISO16(v)); }}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input req" containerClassName="rmdp-rtl"
              />
              <span className="req-hint">ورود این فیلد الزامی است</span>
            </div>
          </div>

          {/* جدول کارها */}
          <div className="row">
            <div className="col" style={{ gridColumn: "1 / -1" }}>
              <div className="label">موضوع‌های عملیات (وضعیت: تکمیل‌شده)</div>
              <div className="table-wrap" style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "38%" }}>موضوع کار</th>
                      <th style={{ width: "52%" }}>شرح خرابی / توضیحات کار</th>
                      <th style={{ width: 150 }}>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length ? tasks.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <textarea
                            className="input"
                            style={{ height: 80 }}
                            value={t.subject}
                            onChange={(e) => updateTask(t.id, { subject: e.target.value })}
                            placeholder="مثلاً: تعویض پکینگ، سرویس پمپ، تعمیر شیر اصلی…"
                          />
                        </td>
                        <td>
                          <textarea
                            className="input"
                            style={{ height: 100 }}
                            value={t.desc}
                            onChange={(e) => updateTask(t.id, { desc: e.target.value })}
                            placeholder="شرح خرابی، مراحل انجام کار، قطعات مصرفی و …"
                          />
                        </td>
                        <td className="ops">
                          <span className="done-pill">تکمیل‌شده ✓</span>
                          <button className="btn small danger" onClick={() => removeTask(t.id)}>حذف</button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="empty">موضوعی ثبت نشده</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 6 }}>
                <button className="btn" onClick={addTask}>➕ افزودن کار</button>
              </div>
            </div>
          </div>
        </div>

        <div className="dh-modal__ftr">
          <button className="btn" onClick={onClose}>انصراف</button>
          <button
            className="btn primary"
            disabled={!can}
            onClick={() =>
              onSave({
                name: name.trim(),
                rig,
                lead,
                members,
                vehicleType,
                vehicleOwner,
                dispatchAtISO,
                finishAtISO,
                tasks: tasks
                  .filter((t) => (t.subject || "").trim().length > 0 || (t.desc || "").trim().length > 0)
                  .map((t) => ({ id: t.id, subject: (t.subject || "").trim(), desc: (t.desc || "").trim(), status: "done" })),
                archived: false,
              })
            }
          >ذخیره</button>
        </div>

        {/* انتخاب اعضا — سفید و کاستوم */}
        {showPicker && (
          <div className="dh-backdrop member-modal" onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}>
            <div className="dh-modal dh-modal--small member-card" role="dialog" aria-modal="true">
              <div className="dh-modal__hdr">
                <div><b>انتخاب اعضا</b></div>
                <button className="dh-close" onClick={() => setShowPicker(false)}>✕</button>
              </div>

              <div className="form">
                <ul className="member-list">
                  {people.map((p) => {
                    const selected = members.includes(p.name);
                    return (
                      <li key={p.id} className="member-item">
                        <span className="member-name">{p.name}</span>
                        {!selected ? (
                          <button type="button" className="btn primary member-choose" onClick={() => toggleMember(p.name)}>انتخاب</button>
                        ) : (
                          <button type="button" className="btn danger member-choose" onClick={() => toggleMember(p.name)}>حذف از لیست</button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="with-pick" style={{ gap: 8, marginTop: 8 }}>
                  <input className="input input--sm" placeholder="افزودن سریع عضو جدید…" value={quickMember} onChange={(e) => setQuickMember(e.target.value)} />
                  <button type="button" className="btn" onClick={addQuickMember}>افزودن</button>
                </div>
              </div>

              <div className="dh-modal__ftr">
                <button className="btn primary" onClick={() => setShowPicker(false)}>تمام</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==== مدال نام عضو (افزودن/ویرایش) – سفید و کاستوم ==== */
function NamePrompt({ title, value, onChange, onCancel, onSave }) {
  return (
    <div
      className="dh-backdrop member-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="dh-modal dh-modal--small member-card" role="dialog" aria-modal="true">
        <div className="dh-modal__hdr">
          <div><b>{title}</b></div>
          <button className="dh-close" onClick={onCancel}>✕</button>
        </div>

        <div className="form" style={{ paddingTop: 16 }}>
          <input
            autoFocus
            className="input"
            placeholder="مثلاً: علی رضایی"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>

        <div className="dh-modal__ftr" style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
          <button className="btn primary" onClick={onSave}>ذخیره</button>
          <button className="btn" onClick={onCancel}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
