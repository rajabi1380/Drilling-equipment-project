// OpsGroupsShared.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModalBase from "./common/ModalBase";
import "./common/ModalBase.css";
import ItemPickerModal from "./common/ItemPickerModal";
import ExportButtons from "./common/ExportButtons";
import Pagination from "./common/Pagination";

import { DatePicker, TimePicker, persian, persian_fa, parseAnyDate, fmtFa } from "../utils/date";
import { getCatalogForUnit, RIGS } from "../constants/catalog";
import { loadLS, saveLS } from "../utils/ls";

// ————————————————— تنظیمات —————————————————
const LS_KEY = "ops_groups_v2";
const ARCHIVE_LS_KEY = "ops_groups_archive";

const UNITS = [
  { id: "downhole", label: "درون‌چاهی" },
  { id: "surface",  label: "برون‌چاهی" },
  { id: "pipe",     label: "تعمیرات و نگهداری لوله" },
];

const VEHICLE_TYPES = ["وانت", "وانت دوکابین", "کامیونت", "تریلی", "SUV"];
const VEHICLE_OWNERSHIP = ["سازمانی", "پیمانکار", "اجاره‌ای"];
const DISTANCE_FLAGS = ["نزدیک", "دور"];

// 👥 اعضای پیشنهادی بر اساس واحد
const TEAM_BY_UNIT = {
  downhole: ["هومن", "حسن", "صدف"],
  surface: ["مریم", "محسن"],
  pipe: ["همیار پلیس", "هستی"],
};

function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-5);
}

function humanDuration(start, end) {
  const s = parseAnyDate(start)?.getTime();
  const e = parseAnyDate(end)?.getTime();
  if (!s || !e || e < s) return "—";
  const minutes = Math.floor((e - s) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}ساعت و ${m}دقیقه`;
  if (h) return `${h}ساعت`;
  return `${m}دقیقه`;
}

/** -----------------------------------------------------------------
 *  کاتالوگ قطعات هر واحد
 *  ----------------------------------------------------------------- */
const UNIT_CATALOG_KEYS = {
  downhole: ["downhole", "bop", "choke"],
  surface:  ["surface"],
  pipe:     ["pipe"],
};

function mergeCatalogs(keys = []) {
  const map = new Map();
  keys.forEach(k => {
    const arr = (getCatalogForUnit(k) || []);
    arr.forEach(item => {
      const code = item?.code || `${item?.name}-${item?.size || ""}`;
      if (!map.has(code)) map.set(code, item);
    });
  });
  return Array.from(map.values());
}

function getUnitCatalog(unitId) {
  const direct = getCatalogForUnit(unitId) || [];
  if (direct.length) return direct;
  const keys = UNIT_CATALOG_KEYS[unitId] || [unitId];
  return mergeCatalogs(keys);
}

function suggestMembers(unitId) {
  return TEAM_BY_UNIT[unitId] || [];
}

// ————————————————— فرم مدال —————————————————
function OpsFormModal({ open, onClose, initial, onSave }) {
  const [unit, setUnit] = useState(initial?.unit || "downhole");
  const [rig, setRig] = useState(initial?.rig || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType || "");
  const [vehicleOwner, setVehicleOwner] = useState(initial?.vehicleOwner || "");
  const [distance, setDistance] = useState(initial?.distance || "نزدیک");

  const [reqAt, setReqAt] = useState(initial?.reqAt ? new Date(initial.reqAt) : new Date());
  const [startAt, setStartAt] = useState(initial?.startAt ? new Date(initial.startAt) : null);
  const [endAt, setEndAt] = useState(initial?.endAt ? new Date(initial.endAt) : null);

  const [members, setMembers] = useState(initial?.members || []);
  const [memberInput, setMemberInput] = useState("");

  const [items, setItems] = useState(initial?.items || []); // {name, code, size, qty}
  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(() => getUnitCatalog(unit), [unit]);
  const canAddItems = unit === "downhole" || unit === "surface" || unit === "pipe";

  const addMember = (nameFromChip) => {
    const v = (nameFromChip ?? memberInput).trim();
    if (!v) return;
    if (!members.includes(v)) setMembers([...members, v]);
    setMemberInput("");
  };
  const toggleChip = (name) => {
    if (members.includes(name)) setMembers(members.filter((m) => m !== name));
    else addMember(name);
  };
  const removeMember = (name) => setMembers(members.filter((m) => m !== name));

  const addItem = (it) => {
    const exist = items.find((x) => x.code === it.code);
    if (exist) {
      setItems(items.map((x) => (x.code === it.code ? { ...x, qty: (x.qty || 1) + 1 } : x)));
    } else {
      const size = Array.isArray(it?.sizes) ? it.sizes[0] : it?.size || "";
      setItems([...items, { name: it.name, code: it.code, size, qty: 1 }]);
    }
  };
  const setQty = (code, qty) => {
    const v = Math.max(1, Number(qty) || 1);
    setItems(items.map((x) => (x.code === code ? { ...x, qty: v } : x)));
  };
  const removeItem = (code) => setItems(items.filter((x) => x.code !== code));

  const valid = unit && rig && title && members.length >= 3 && members.length <= 4;

  const handleSave = () => {
    if (!valid) return;
    const payload = {
      id: initial?.id || uid(),
      unit,
      rig,
      title,
      vehicleType,
      vehicleOwner,
      distance,
      reqAt: reqAt || new Date(),
      startAt: startAt || null,
      endAt: endAt || null,
      members,
      items,
      status: endAt ? "done" : "open",
      createdAt: initial?.createdAt || new Date(),
    };
    onSave(payload);
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title={initial ? "ویرایش عملیات" : "ثبت عملیات جدید"}
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn primary" onClick={handleSave} disabled={!valid}>
              ذخیره
            </button>
          </>
        }
      >
        <div className="mb-form">
          <div className="row">
            <div className="col">
              <label className="label">واحد</label>
              <select
                className="input"
                value={unit}
                onChange={(e) => { setUnit(e.target.value); }}
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
            <div className="col">
              <label className="label">دکل درخواست‌کننده</label>
              <select className="input" value={rig} onChange={(e) => setRig(e.target.value)}>
                <option value="" disabled>انتخاب دکل…</option>
                {RIGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col">
              <label className="label">عنوان عملیات</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: تعویض شیلنگ فشارقوی" />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label className="label">نوع خودرو</label>
              <select className="input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="" disabled>انتخاب…</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col">
              <label className="label">مالکیت خودرو</label>
              <select className="input" value={vehicleOwner} onChange={(e) => setVehicleOwner(e.target.value)}>
                <option value="" disabled>انتخاب…</option>
                {VEHICLE_OWNERSHIP.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col">
              <label className="label">فاصله دکل</label>
              <select className="input" value={distance} onChange={(e) => setDistance(e.target.value)}>
                {DISTANCE_FLAGS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-alert warn">
            نکته: اگر نیاز به حمل قطعه هست، از بخش «اقلام همراه» زیر، موارد موردنیاز را از انبار همان واحد انتخاب کن.
          </div>

          <div className="row">
            <div className="col">
              <label className="label">تاریخ درخواست</label>
              <DatePicker
                value={reqAt}
                onChange={(v) => setReqAt(v?.toDate?.() || v)}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker key="t" position="bottom" />]}
              />
            </div>
            <div className="col">
              <label className="label">شروع عملیات</label>
              <DatePicker
                value={startAt}
                onChange={(v) => setStartAt(v?.toDate?.() || v)}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker key="t" position="bottom" />]}
              />
            </div>
            <div className="col">
              <label className="label">پایان عملیات</label>
              <DatePicker
                value={endAt}
                onChange={(v) => setEndAt(v?.toDate?.() || v)}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD HH:mm"
                plugins={[<TimePicker key="t" position="bottom" />]}
              />
            </div>
          </div>

          {/* اعضای گروه */}
          <div className="section">
            <div className="label" style={{ marginBottom: 8 }}>اعضای گروه (۳ تا ۴ نفر)</div>

            {/* چیپ‌های انتخابی بر اساس واحد */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {suggestMembers(unit).map((name) => {
                const active = members.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={`chip ${active ? "on" : ""}`}
                    onClick={() => toggleChip(name)}
                    title={active ? "حذف از گروه" : "افزودن به گروه"}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* ورودی افزودن دستی */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                className={`input ${members.length < 3 || members.length > 4 ? "err" : ""}`}
                placeholder="نام عضو دیگر…"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMember()}
              />
              <button className="btn" onClick={() => addMember()}>افزودن</button>
              <span className="muted">تعداد فعلی: {members.length}</span>
            </div>

            {/* لیست اعضای انتخاب‌شده */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {members.map((m) => (
                <span key={m} className="badge" style={{ background: "#fff" }}>
                  {m}
                  <button className="btn small" style={{ marginInlineStart: 6 }} onClick={() => removeMember(m)}>
                    حذف
                  </button>
                </span>
              ))}
            </div>

            {(members.length < 3 || members.length > 4) && (
              <div className="err-msg" style={{ marginTop: 6 }}>
                گروه باید بین ۳ تا ۴ نفر باشد.
              </div>
            )}
          </div>

          {/* اقلام همراه از انبار همان واحد */}
          {canAddItems && (
            <div className="section">
              <div className="label" style={{ marginBottom: 8 }}>
                اقلام همراه (درخواست از انبار {UNITS.find(u=>u.id===unit)?.label})
              </div>
              <button className="btn" onClick={() => setPickOpen(true)}>انتخاب قطعه</button>
              <div className="mb-form" style={{ marginTop: 8 }}>
                <div className="row">
                  <div className="col" style={{ gridColumn: "1 / -1" }}>
                    <div className="table-wrap">
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th>نام</th>
                            <th>کد</th>
                            <th>سایز</th>
                            <th>تعداد</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {items.length ? items.map((it) => (
                            <tr key={it.code}>
                              <td>{it.name}</td>
                              <td>{it.code}</td>
                              <td>{it.size || "—"}</td>
                              <td>
                                <input
                                  className="input"
                                  type="number"
                                  min={1}
                                  value={it.qty}
                                  onChange={(e) => setQty(it.code, e.target.value)}
                                  style={{ width: 90 }}
                                />
                              </td>
                              <td>
                                <button className="btn danger" onClick={() => removeItem(it.code)}>حذف</button>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="muted">موردی ثبت نشده.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalBase>

      {/* انتخاب تجهیزات از کاتالوگ واحد */}
      <ItemPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        catalog={catalog}
        title="انتخاب تجهیزات/اقلام"
        onPick={(it) => { addItem(it); setPickOpen(false); }}
      />
    </>
  );
}

// ————————————————— صفحه اصلی لیست —————————————————
export default function OpsGroupsShared() {
  const [rows, setRows] = useState(() => loadLS(LS_KEY, []));
  useEffect(() => { saveLS(LS_KEY, rows); }, [rows]);

  // فیلترها
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // صفحه‌بندی
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let data = rows.slice().sort((a,b)=> (parseAnyDate(b.reqAt) - parseAnyDate(a.reqAt)));
    if (unit !== "all") data = data.filter(r => r.unit === unit);
    if (status !== "all") data = data.filter(r => r.status === status);
    if (from) data = data.filter(r => parseAnyDate(r.reqAt) >= parseAnyDate(from));
    if (to) data = data.filter(r => parseAnyDate(r.reqAt) <= parseAnyDate(to));
    const s = q.trim();
    if (s) {
      data = data.filter(r =>
        (r.title || "").includes(s) ||
        (r.rig || "").includes(s) ||
        (r.members || []).join(" ").includes(s)
      );
    }
    return data;
  }, [rows, unit, status, from, to, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const paged = useMemo(() => filtered.slice((page-1)*pageSize, page*pageSize), [filtered, page]);

  const openCreate = () => { setEditRow(null); setModalOpen(true); };
  const openEdit = (r) => { setEditRow(r); setModalOpen(true); };
  const remove = (id) => setRows(rows.filter(r => r.id !== id));

  const saveRow = (payload) => {
    setRows(prev => {
      const i = prev.findIndex(x => x.id === payload.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = payload;
        return next;
      }
      return [payload, ...prev];
    });
    setModalOpen(false);
  };

  // 🗂️ بایگانی: فقط پایان‌یافته + حذف از لیست زنده + هدایت به گزارشات
// جایگزینِ نسخه‌ی قبلیِ archiveAndGo
const archiveAndGo = (row) => {
  if (row?.status !== "done") return; // فقط پایان‌یافته

  try {
    // 1) افزودن به آرشیو (بدون تکرار)
    const arch = loadLS(ARCHIVE_LS_KEY, []);
    const exists = arch.find((x) => x.id === row.id);
    const archivedRow = { ...row, archivedAt: new Date().toISOString() };
    const newArchive = exists ? arch : [archivedRow, ...arch];
    saveLS(ARCHIVE_LS_KEY, newArchive);

    // 2) حذف از لیست زنده
    const newLive = rows.filter((r) => r.id !== row.id);
    setRows(newLive);
    saveLS(LS_KEY, newLive);
  } catch (e) {
    // می‌تونی لاگ بگیری/Toast نشان بدهی
  }
};

  const getExportPack = () => {
    const headers = ["کد", "واحد", "دکل", "عنوان عملیات", "اعضا", "تاریخ درخواست", "شروع", "پایان", "مدت", "فاصله", "وضعیت"];
    const rowsX = filtered.map(r => ({
      "کد": r.id,
      "واحد": UNITS.find(u=>u.id===r.unit)?.label || r.unit,
      "دکل": r.rig,
      "عنوان عملیات": r.title,
      "اعضا": (r.members || []).join("، "),
      "تاریخ درخواست": fmtFa(r.reqAt),
      "شروع": r.startAt ? fmtFa(r.startAt) : "",
      "پایان": r.endAt ? fmtFa(r.endAt) : "",
      "مدت": humanDuration(r.startAt, r.endAt),
      "فاصله": r.distance || "",
      "وضعیت": r.status === "done" ? "پایان‌یافته" : "در حال انجام",
    }));
    return { filename: "ops-groups", title: "گزارش گروه‌های عملیاتی", headers, rows: rowsX };
  };

  return (
    <div className="ui-page" style={{ direction: "rtl", padding: 12 }}>
      {/* نوار بالایی */}
      <div className="ui-topbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg">
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="all">همه واحدها</option>
            {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">در حال انجام</option>
            <option value="done">پایان‌یافته</option>
          </select>
        </div>

        <div className="seg">
          <div style={{ width: 200 }}>
            <DatePicker
              value={from}
              onChange={(v) => setFrom(v?.toDate?.() || v)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="input"
              placeholder="از تاریخ…"
            />
          </div>
          <div style={{ width: 200 }}>
            <DatePicker
              value={to}
              onChange={(v) => setTo(v?.toDate?.() || v)}
              calendar={persian}
              locale={persian_fa}
              format="YYYY/MM/DD"
              inputClass="input"
              placeholder="تا تاریخ…"
            />
          </div>
        </div>

        <div className="seg" style={{ flex: 1, minWidth: 220 }}>
          <input className="input" placeholder="جستجو (عنوان/دکل/اعضا)" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>

        <div className="spacer" />

        <button className="btn primary" onClick={openCreate}>ثبت عملیات جدید</button>

        <ExportButtons
          getExport={getExportPack}
          variant="compact"
          label="خروجی:"
        />
      </div>

      {/* لیست */}
      <div className="table-wrap" style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: 8, textAlign: "right" }}>کد</th>
              <th style={{ padding: 8, textAlign: "right" }}>واحد</th>
              <th style={{ padding: 8, textAlign: "right" }}>دکل</th>
              <th style={{ padding: 8, textAlign: "right" }}>عنوان عملیات</th>
              <th style={{ padding: 8, textAlign: "right" }}>اعضا</th>
              <th style={{ padding: 8, textAlign: "right" }}>درخواست</th>
              <th style={{ padding: 8, textAlign: "right" }}>شروع</th>
              <th style={{ padding: 8, textAlign: "right" }}>پایان</th>
              <th style={{ padding: 8, textAlign: "right" }}>مدت</th>
              <th style={{ padding: 8, textAlign: "right" }}>فاصله</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {paged.length ? paged.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{r.id}</td>
                <td style={{ padding: 8 }}>{UNITS.find(u=>u.id===r.unit)?.label || r.unit}</td>
                <td style={{ padding: 8 }}>{r.rig}</td>
                <td style={{ padding: 8 }}>{r.title}</td>
                <td style={{ padding: 8 }}>{(r.members || []).join("، ")}</td>
                <td style={{ padding: 8 }}>{fmtFa(r.reqAt)}</td>
                <td style={{ padding: 8 }}>{r.startAt ? fmtFa(r.startAt) : "—"}</td>
                <td style={{ padding: 8 }}>{r.endAt ? fmtFa(r.endAt) : "—"}</td>
                <td style={{ padding: 8 }}>{humanDuration(r.startAt, r.endAt)}</td>
                <td style={{ padding: 8 }}>{r.distance || "—"}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                  <span className="muted" style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: r.status === "done" ? "#dcfce7" : "#eef2ff",
                    marginInlineEnd: 8,
                    display: "inline-block"
                  }}>
                    {r.status === "done" ? "پایان‌یافته" : "در حال انجام"}
                  </span>
                  <button className="btn" onClick={() => openEdit(r)}>ویرایش</button>
              {r.status === "done" && (
  <button
    className="btn"
    style={{ marginInlineStart: 6 }}
    onClick={() => archiveAndGo(r)}
    title="بایگانی"
  >
    بایگانی
  </button>
)}

                  <button className="btn danger" onClick={() => remove(r.id)} style={{ marginInlineStart: 6 }}>
                    حذف
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={11} style={{ padding: 12, textAlign: "center", color: "#6b7280" }}>هیچ موردی یافت نشد.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* صفحه‌بندی */}
      <div style={{ marginTop: 10 }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p)=>setPage(p)}
          showRange={{
            start: filtered.length ? (page-1)*pageSize + 1 : 0,
            end: Math.min(filtered.length, page*pageSize),
            total: filtered.length
          }}
        />
      </div>

      {/* مدال ثبت/ویرایش */}
      {modalOpen && (
        <OpsFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={editRow}
          onSave={saveRow}
        />
      )}
    </div>
  );
}
