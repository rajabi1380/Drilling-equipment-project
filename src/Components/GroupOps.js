// src/Components/GroupOps.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./DownholeInOut.css";            // پایه (دکمه‌ها، تب‌های تیتر، جدول و …)
import "./GroupOps.css";                 // استایل اختصاصی این صفحه
import { RIGS } from "../constants/catalog";
import { exportCSV, exportDOC } from "../utils/export";

// تقویم شمسی + زمان (همانی که در پروژه داری)
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
  toISO16,
} from "../utils/date";

const LS_KEY = "ops_groups_v6";
const COST_PER_HOUR = 200_000;
const newId = () => Number(`${Date.now()}${Math.floor(Math.random() * 1e3)}`);

/* ===== Tabs header ===== */
function TabsHeader({ tab, setTab }) {
  return (
    <div className="tabs-titlebar" role="tablist" aria-label="گروه‌های عملیاتی">
      <button className={`tabbtn ${tab === "groups" ? "is-on" : ""}`} role="tab" aria-selected={tab === "groups"} onClick={() => setTab("groups")}>گزارش عملیات</button>
      <span className="divider" aria-hidden />
      <button className={`tabbtn ${tab === "members" ? "is-on" : ""}`} role="tab" aria-selected={tab === "members"} onClick={() => setTab("members")}>اعضا</button>
      <span className="divider" aria-hidden />
      <button className={`tabbtn ${tab === "reports" ? "is-on" : ""}`} role="tab" aria-selected={tab === "reports"} onClick={() => setTab("reports")}>گزارش‌ها</button>
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

  /* ---- فیلترهای تب «گزارش عملیات» ---- */
  const [gFilters, setGFilters] = useState({
    name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: ""
  });
  const applyGFilters = (e) => {
    e?.preventDefault?.();
    setGFilters((f) => ({ ...f, fromISO: toISO16(f.fromObj), toISO: toISO16(f.toObj) }));
  };
  const clearGFilters = () => setGFilters({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "" });

  const filteredGroups = useMemo(() => {
    const f = gFilters;
    return groups.filter((g) => {
      const okN = !f.name || (g.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okR = !f.rig || (g.rig || "") === f.rig;
      const okFrom = !f.fromISO || (g.dispatchAtISO && g.dispatchAtISO >= f.fromISO);
      const okTo = !f.toISO || (g.finishAtISO && g.finishAtISO <= f.toISO);
      return okN && okR && okFrom && okTo;
    });
  }, [groups, gFilters]);

  /* ---- فیلترهای تب «گزارش‌ها» ---- */
  const [rFilters, setRFilters] = useState({
    name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: ""
  });
  const applyRFilters = (e) => {
    e?.preventDefault?.();
    setRFilters((f) => ({ ...f, fromISO: toISO16(f.fromObj), toISO: toISO16(f.toObj) }));
  };
  const clearRFilters = () => setRFilters({ name: "", rig: "", fromObj: null, toObj: null, fromISO: "", toISO: "" });

  const filteredForReports = useMemo(() => {
    const f = rFilters;
    return groups.filter((g) => {
      const okN = !f.name || (g.name || "").toLowerCase().includes(f.name.toLowerCase());
      const okR = !f.rig || (g.rig || "") === f.rig;
      const okFrom = !f.fromISO || (g.dispatchAtISO && g.dispatchAtISO >= f.fromISO);
      const okTo = !f.toISO || (g.finishAtISO && g.finishAtISO <= f.toISO);
      return okN && okR && okFrom && okTo;
    });
  }, [groups, rFilters]);

  /* ---- CRUD ---- */
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const startNew = () => { setEditing(null); setShowModal(true); };
  const startEdit = (g) => { setEditing(g); setShowModal(true); };
  const remove = (id) => setGroups((prev) => prev.filter((g) => g.id !== id));

  const saveGroup = (payload) => {
    // نرمال‌سازی اعضا و عدم تکرار نام‌ها (و حذف لیدر از لیست اعضا اگر تکرار بود)
    const uniqMembers = Array.from(new Set(payload.members || [])).filter(n => n !== (payload.lead || ""));
    const clean = { ...payload, members: uniqMembers };
    if (editing) {
      setGroups((prev) => prev.map((g) => (g.id === editing.id ? { ...g, ...clean } : g)));
    } else {
      setGroups((prev) => [{ id: newId(), ...clean }, ...prev]);
    }
    setShowModal(false); setEditing(null);
  };

  /* ---- آمار ---- */
  const statsOf = (g) => {
    const total = (g.tasks || []).length;
    const done = total; // همه کارها پیش‌فرض تکمیل هستند
    const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
    const allDone = total > 0;
    return { total, done, hours, allDone };
  };

  /* ---- تجمیع برای تب گزارش‌ها ---- */
  const peopleAgg = useMemo(() => {
    const map = new Map();
    for (const g of filteredForReports) {
      const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
      const participants = new Set([...(g.members || []), ...(g.lead ? [g.lead] : [])]);
      for (const name of participants) {
        const cur = map.get(name) || { count: 0, hours: 0, cost: 0 };
        const cost = hours * COST_PER_HOUR;
        map.set(name, { count: cur.count + 1, hours: cur.hours + hours, cost: cur.cost + cost });
      }
    }
    return Array.from(map, ([name, v]) => ({ name, ...v }));
  }, [filteredForReports]);

  const peopleMonthly = useMemo(() => {
    const map = new Map();
    for (const g of filteredForReports) {
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
  }, [filteredForReports]);

  const rigsAgg = useMemo(() => {
    const map = new Map();
    for (const g of filteredForReports) {
      const key = g.rig || "—";
      const hours = diffHours(g.dispatchAtISO, g.finishAtISO);
      const cur = map.get(key) || { count: 0, hours: 0 };
      map.set(key, { count: cur.count + 1, hours: cur.hours + hours });
    }
    return Array.from(map, ([rig, v]) => ({ rig, ...v }));
  }, [filteredForReports]);

  /* ---- خروجی‌ها ---- */
  const exportGroupsCSV = () => {
    const rows = filteredGroups.map((g) => ({
      "عنوان گزارش": g.name || "",
      "دکل": g.rig || "",
      "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
      "پایان": g.finishAtISO?.replace("T", " ") || "",
      "لیدر": g.lead || "",
      "اعضا": (g.members || []).join("، "),
      "تعداد موضوع": (g.tasks || []).length,
      "وضعیت": (g.tasks || []).length ? "تکمیل‌شده" : "—",
    }));
    const headers = Object.keys(rows[0] || {
      "عنوان گزارش": "", "دکل": "", "اعزام": "", "پایان": "", "لیدر": "", "اعضا": "", "تعداد موضوع": 0, "وضعیت": ""
    });
    exportCSV(`ops_groups_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };
  const exportGroupsDOC = () => {
    const rows = filteredGroups.map((g) => ({
      "عنوان گزارش": g.name || "",
      "دکل": g.rig || "",
      "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
      "پایان": g.finishAtISO?.replace("T", " ") || "",
      "شرح کارها": (g.tasks || []).map(t => `• ${t.subject}${t.desc ? ` — ${t.desc}` : ""}`).join("\n"),
    }));
    const headers = Object.keys(rows[0] || { "عنوان گزارش": "", "دکل": "", "اعزام": "", "پایان": "", "شرح کارها": "" });
    exportDOC(`ops_groups_${new Date().toISOString().slice(0,10)}.doc`, "گزارش عملیات", headers, rows);
  };

  const exportReportsCSV = () => {
    const rows = filteredForReports.map((g) => {
      const s = statsOf(g);
      return {
        "گزارش": g.name || "",
        "دکل": g.rig || "",
        "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
        "پایان": g.finishAtISO?.replace("T", " ") || "",
        "مدت (ساعت)": s.hours,
        "تعداد موضوع": s.total,
        "وضعیت": s.allDone ? "✅" : "—",
      };
    });
    const headers = Object.keys(rows[0] || {
      "گزارش": "", "دکل": "", "اعزام": "", "پایان": "", "مدت (ساعت)": 0, "تعداد موضوع": 0, "وضعیت": ""
    });
    exportCSV(`ops_reports_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
  };
  const exportReportsDOC = () => {
    const rows = filteredForReports.map((g) => {
      const s = statsOf(g);
      return {
        "گزارش": g.name || "",
        "دکل": g.rig || "",
        "اعزام": g.dispatchAtISO?.replace("T", " ") || "",
        "پایان": g.finishAtISO?.replace("T", " ") || "",
        "مدت (ساعت)": s.hours,
        "موضوع‌ها": (g.tasks || []).map(t => `• ${t.subject}${t.desc ? ` — ${t.desc}` : ""}`).join("\n"),
      };
    });
    const headers = Object.keys(rows[0] || { "گزارش": "", "دکل": "", "اعزام": "", "پایان": "", "مدت (ساعت)": 0, "موضوع‌ها": "" });
    exportDOC(`ops_reports_${new Date().toISOString().slice(0,10)}.doc`, "خلاصه گزارش‌ها", headers, rows);
  };

  return (
    <div className="dh-page" dir="rtl">
      <div className="dh-card">
        <TabsHeader tab={tab} setTab={setTab} />

        {/* ===== تب گزارش عملیات ===== */}
        {tab === "groups" && (
          <>
            {/* فیلترهای بالا + خروجی */}
            <form className="dh-toolbar grp-filter" onSubmit={applyGFilters}>
              <input className="input" placeholder="عنوان گزارش…" value={gFilters.name} onChange={(e) => setGFilters(f => ({ ...f, name: e.target.value }))} />
              <select className="input" value={gFilters.rig} onChange={(e) => setGFilters(f => ({ ...f, rig: e.target.value }))}>
                <option value="">دکل (همه)</option>
                {RIGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <DatePicker
                value={gFilters.fromObj}
                onChange={(v) => setGFilters(f => ({ ...f, fromObj: v }))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl"
              />
              <DatePicker
                value={gFilters.toObj}
                onChange={(v) => setGFilters(f => ({ ...f, toObj: v }))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl"
              />
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

            {/* کارت‌ها */}
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
                      <button className="btn small" onClick={() => startEdit(g)}>ویرایش</button>
                      <button className="btn small danger" onClick={() => remove(g.id)}>حذف</button>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty" style={{ padding: "16px 0" }}>گزارشی ثبت نشده است</div>
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
                      <button className="btn small" onClick={() => {
                        const name = window.prompt("ویرایش نام:", p.name);
                        if (name && name.trim()) setPeople((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: name.trim() } : x)));
                      }}>ویرایش</button>
                      <button className="btn small danger" onClick={() => setPeople((prev) => prev.filter((x) => x.id !== p.id))}>حذف</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={2} className="empty">عضوی وجود ندارد</td></tr>}
              </tbody>
            </table>

            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => {
                const name = window.prompt("نام عضو جدید:");
                if (name && name.trim()) setPeople((prev) => [{ id: newId(), name: name.trim() }, ...prev]);
              }}>افزودن عضو</button>
            </div>
          </div>
        )}

        {/* ===== تب گزارش‌ها ===== */}
        {tab === "reports" && (
          <>
            {/* فیلترهای بالا + خروجی */}
            <form className="dh-toolbar grp-filter" onSubmit={applyRFilters}>
              <input className="input" placeholder="عنوان گزارش…" value={rFilters.name} onChange={(e) => setRFilters(f => ({ ...f, name: e.target.value }))} />
              <select className="input" value={rFilters.rig} onChange={(e) => setRFilters(f => ({ ...f, rig: e.target.value }))}>
                <option value="">دکل (همه)</option>
                {RIGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <DatePicker
                value={rFilters.fromObj}
                onChange={(v) => setRFilters(f => ({ ...f, fromObj: v }))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl"
              />
              <DatePicker
                value={rFilters.toObj}
                onChange={(v) => setRFilters(f => ({ ...f, toObj: v }))}
                calendar={persian} locale={persian_fa} format={faFmt}
                plugins={[<TimePicker position="bottom" />]}
                inputClass="input" containerClassName="rmdp-rtl"
              />
              <button className="btn primary" type="submit">اعمال فیلتر</button>
              {(rFilters.name || rFilters.rig || rFilters.fromObj || rFilters.toObj) && (
                <button className="btn" type="button" onClick={clearRFilters}>حذف فیلتر</button>
              )}
              <div className="io-actions">
                <button type="button" className="btn" onClick={exportReportsCSV}>Excel</button>
                <button type="button" className="btn" onClick={exportReportsDOC}>Word</button>
              </div>
            </form>

            {/* جدول‌های گزارش */}
            <div className="table-wrap" style={{ marginBottom: 10 }}>
              <table>
                <thead>
                  <tr>
                    <th>گزارش</th><th>دکل</th><th>اعزام</th><th>پایان</th><th>مدت (ساعت)</th>
                    <th>تعداد موضوع</th><th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForReports.length ? filteredForReports.map((g) => {
                    const s = statsOf(g);
                    return (
                      <tr key={g.id}>
                        <td>{g.name}</td>
                        <td>{g.rig || "—"}</td>
                        <td>{g.dispatchAtISO ? g.dispatchAtISO.replace("T", " ") : "—"}</td>
                        <td>{g.finishAtISO ? g.finishAtISO.replace("T", " ") : "—"}</td>
                        <td>{s.hours}</td>
                        <td>{s.total}</td>
                        <td style={{ textAlign: "center" }}>{s.allDone ? "✅" : "—"}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={7} className="empty">داده‌ای وجود ندارد</td></tr>}
                </tbody>
              </table>
            </div>

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
                  )) : <tr><td colSpan={4} className="empty">هنوز گزارشی نیست</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
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
    </div>
  );
}

/* ===== Modal ===== */
function GroupModal({ rigs, people, setPeople, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [rig, setRig] = useState(initial?.rig || "");
  const [lead, setLead] = useState(initial?.lead || "");
  const [members, setMembers] = useState(initial?.members || []);

  const [dispatchObj, setDispatchObj] = useState(null);
  const [finishObj, setFinishObj] = useState(null);
  const [dispatchAtISO, setDispatchAtISO] = useState(initial?.dispatchAtISO || "");
  const [finishAtISO, setFinishAtISO] = useState(initial?.finishAtISO || "");

  // tasks: { id, subject, desc } — همگی «تکمیل‌شده»
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

          {/* جدول کارها: موضوع + شرح خرابی + حذف */}
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
                dispatchAtISO,
                finishAtISO,
                tasks: tasks
                  .filter((t) => (t.subject || "").trim().length > 0 || (t.desc || "").trim().length > 0)
                  .map((t) => ({ id: t.id, subject: (t.subject || "").trim(), desc: (t.desc || "").trim(), status: "done" })),
              })
            }
          >ذخیره</button>
        </div>

        {/* انتخاب اعضا (ستونی + دکمه آبی انتخاب) */}
        {showPicker && (
          <div className="dh-backdrop" style={{ background: "rgba(0,0,0,.1)" }} onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}>
            <div className="dh-modal dh-modal--small" role="dialog" aria-modal="true">
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
                        <span>{p.name}</span>
                        {!selected ? (
                          <button type="button" className="btn small primary" onClick={() => toggleMember(p.name)}>انتخاب</button>
                        ) : (
                          <button type="button" className="btn small danger" onClick={() => toggleMember(p.name)}>حذف از لیست</button>
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
                <button className="btn" onClick={() => setShowPicker(false)}>تمام</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
