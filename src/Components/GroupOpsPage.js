// src/Components/GroupOpsPage.js
import React, { useEffect, useMemo, useState } from "react";
import ModalBase from "./common/ModalBase";
import "./common/ModalBase.css";
import "./GroupOps.css";
import ExportButtons from "./common/ExportButtons";
import Pagination from "./common/Pagination";
import { DatePicker, TimePicker, persian, persian_fa, parseAnyDate, fmtFa, faFmt } from "../utils/date";
import { RIGS, OPS_UNITS } from "../constants/catalog";
import { loadLS, saveLS } from "../utils/ls";
import { useAuth } from "./Context/AuthContext";

const LS_KEY = "ops_groups_v2";

const UNITS = OPS_UNITS;

const REQ_TYPES = ["بندگیری", "بازرسی لوله", "پشتیبانی", "تعمیر", "سایر"];

function uid() {
  return Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-5);
}

function humanDuration(start, end) {
  const s = parseAnyDate(start)?.getTime();
  const e = parseAnyDate(end)?.getTime();
  if (!s || !e || e < s) return "-";
  const minutes = Math.floor((e - s) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ساعت و ${m} دقیقه`;
  if (h) return `${h} ساعت`;
  return `${m} دقیقه`;
}

/* ---------------------- ویرایش/ایجاد گروه ---------------------- */
function OpsFormModal({ open, onClose, initial, onSave, allowedUnits }) {
  const { isAdmin, currentUnit } = useAuth();
  const timePlugin = useMemo(() => <TimePicker position="bottom" />, []);

  const defaultUnit = isAdmin
    ? initial?.unit || allowedUnits[0] || "downhole"
    : currentUnit || allowedUnits[0];

  const [unit, setUnit] = useState(defaultUnit);
  const [rig, setRig] = useState(initial?.rig || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [reqType, setReqType] = useState(initial?.reqType || REQ_TYPES[0]);
  const [opCode, setOpCode] = useState(initial?.opCode || "");
  const [members, setMembers] = useState(initial?.members || []);
  const [memberInput, setMemberInput] = useState("");
  const [reqAt, setReqAt] = useState(initial?.reqAt ? parseAnyDate(initial.reqAt) : new Date());
  const [startAt, setStartAt] = useState(initial?.startAt ? parseAnyDate(initial.startAt) : null);
  const [endAt, setEndAt] = useState(initial?.endAt ? parseAnyDate(initial.endAt) : null);

  useEffect(() => {
    if (!startAt && reqAt) setStartAt(reqAt);
  }, [startAt, reqAt]);

  const cleanMembers = useMemo(() => members.map((m) => m.trim()).filter(Boolean), [members]);
  const durationLabel = humanDuration(startAt, endAt);

  const valid = unit && rig.trim() && title.trim() && cleanMembers.length >= 1 && reqAt && startAt && reqType;

  const addMember = () => {
    const name = memberInput.trim();
    if (!name) return;
    setMembers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setMemberInput("");
  };

  const removeMember = (name) => setMembers((prev) => prev.filter((m) => m !== name));

  const handleSave = () => {
    if (!valid) return;
    const payload = {
      id: initial?.id || uid(),
      unit,
      rig: rig.trim(),
      title: title.trim(),
      reqType,
      opCode: opCode.trim(),
      members: cleanMembers,
      reqAt: reqAt || new Date(),
      startAt: startAt || reqAt || null,
      endAt: endAt || null,
      status: endAt ? "done" : "open",
      createdAt: initial?.createdAt || new Date(),
    };
    onSave(payload);
  };

  return (
    <ModalBase
      open={open}
      onClose={onClose}
      title={initial ? "ویرایش گروه عملیاتی" : "ثبت گروه عملیاتی جدید"}
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            انصراف
          </button>
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
              onChange={(e) => setUnit(e.target.value)}
              disabled={!isAdmin}
            >
              {(isAdmin ? allowedUnits : [currentUnit]).map((uid) => {
                const u = UNITS.find((x) => x.id === uid);
                return (
                  <option key={uid} value={uid}>
                    {u?.label || uid}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="col">
            <label className="label">نام دکل درخواست‌کننده</label>
            <select className="input" value={rig} onChange={(e) => setRig(e.target.value)}>
              <option value="" disabled>
                انتخاب کنید...
              </option>
              {RIGS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <label className="label">عنوان عملیات</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: بندگیری لوله یا بازرسی دوره‌ای"
            />
          </div>
        </div>

        <div className="row">
          <div className="col">
            <label className="label">نوع درخواست</label>
            <select className="input" value={reqType} onChange={(e) => setReqType(e.target.value)}>
              {REQ_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <label className="label">کد عملیات (اختیاری)</label>
            <input
              className="input"
              value={opCode}
              onChange={(e) => setOpCode(e.target.value)}
              placeholder="OPS-4521"
            />
          </div>
          <div className="col">
            <label className="label">مدت عملیات</label>
            <input className="input" value={durationLabel} readOnly />
          </div>
        </div>

        <div className="row">
          <div className="col">
            <label className="label">تاریخ درخواست</label>
            <DatePicker
              value={reqAt}
              onChange={(d) => setReqAt(d && d.toDate ? d.toDate() : d)}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ/ساعت ثبت درخواست"
            />
          </div>
          <div className="col">
            <label className="label">تاریخ ارسال گروه</label>
            <DatePicker
              value={startAt}
              onChange={(d) => setStartAt(d && d.toDate ? d.toDate() : d)}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ/ساعت اعزام"
            />
          </div>
          <div className="col">
            <label className="label">تاریخ پایان عملیات</label>
            <DatePicker
              value={endAt}
              onChange={(d) => setEndAt(d && d.toDate ? d.toDate() : d)}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ/ساعت پایان"
            />
          </div>
        </div>

        <div className="row">
          <div className="col">
            <label className="label">نام افراد ارسالی به دکل</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
                placeholder="نام و نام‌خانوادگی را وارد و Enter بزنید"
              />
              <button type="button" className="btn" onClick={addMember}>
                افزودن
              </button>
            </div>
            {cleanMembers.length > 0 && (
              <div className="chips" style={{ marginTop: 8 }}>
                {cleanMembers.map((m) => (
                  <span key={m} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {m}
                    <button
                      type="button"
                      className="icon"
                      style={{ width: 22, height: 22 }}
                      onClick={() => removeMember(m)}
                      aria-label="حذف"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {cleanMembers.length === 0 && (
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                حداقل یک نفر باید ثبت شود.
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalBase>
  );
}

/* ---------------------- لیست گروه‌های عملیاتی ---------------------- */
export default function OpsGroupsShared() {
  const { isAdmin, currentUnit } = useAuth();

  const allowedUnits = useMemo(() => (isAdmin ? UNITS.map((u) => u.id) : [currentUnit]), [isAdmin, currentUnit]);

  const unitKey = isAdmin ? LS_KEY : `${LS_KEY}_${currentUnit}`;
  const [rows, setRows] = useState(() => loadLS(unitKey, []));
  useEffect(() => {
    saveLS(unitKey, rows);
  }, [rows, unitKey]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const filtered = useMemo(() => {
    let data = rows.slice().sort((a, b) => (parseAnyDate(b.reqAt) || 0) - (parseAnyDate(a.reqAt) || 0));

    if (!isAdmin) {
      data = data.filter((r) => r.unit === currentUnit);
    }

    const s = q.trim().toLowerCase();
    if (s) {
      data = data.filter((r) => {
        const mem = (r.members || []).join(" ").toLowerCase();
        return (
          (r.title || "").toLowerCase().includes(s) ||
          (r.rig || "").toLowerCase().includes(s) ||
          (r.reqType || "").toLowerCase().includes(s) ||
          (r.opCode || "").toLowerCase().includes(s) ||
          mem.includes(s)
        );
      });
    }

    return data;
  }, [rows, q, isAdmin, currentUnit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const openCreate = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditRow(r);
    setModalOpen(true);
  };

  const remove = (id) => setRows(rows.filter((r) => r.id !== id));

  const saveRow = (payload) => {
    if (!isAdmin && payload.unit !== currentUnit) {
      alert("اجازه ثبت خارج از واحد فعال وجود ندارد.");
      return;
    }

    setRows((prev) => {
      const i = prev.findIndex((x) => x.id === payload.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = payload;
        return next;
      }
      return [payload, ...prev];
    });
    setModalOpen(false);
  };

  const exportHeaders = [
    "عنوان عملیات",
    "نوع درخواست",
    "کد عملیات",
    "نام دکل درخواست‌کننده",
    "واحد",
    "نام افراد ارسالی",
    "تاریخ درخواست",
    "تاریخ ارسال گروه",
    "تاریخ پایان عملیات",
    "مدت عملیات",
    "وضعیت",
  ];

  return (
    <div className="ui-page" style={{ direction: "rtl", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="جستجو در عنوان، دکل، افراد یا نوع درخواست..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 280px", minWidth: 240 }}
        />
        <div className="spacer" />
        <ExportButtons
          variant="compact"
          getExport={() => ({
            filename: "ops-groups",
            title: "گزارش گروه‌های عملیاتی",
            headers: exportHeaders,
            rows: filtered.map((r) => ({
              "عنوان عملیات": r.title,
              "نوع درخواست": r.reqType,
              "کد عملیات": r.opCode,
              "نام دکل درخواست‌کننده": r.rig,
              "واحد": r.unit,
              "نام افراد ارسالی": (r.members || []).join("، "),
              "تاریخ درخواست": fmtFa(r.reqAt),
              "تاریخ ارسال گروه": fmtFa(r.startAt),
              "تاریخ پایان عملیات": fmtFa(r.endAt),
              "مدت عملیات": humanDuration(r.startAt, r.endAt),
              "وضعیت": r.status === "done" ? "اتمام عملیات" : "در حال انجام",
            })),
          })}
        />
        <button className="btn primary" onClick={openCreate}>
          ثبت گروه عملیاتی
        </button>
      </div>

      <div className="table-wrap" style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th>عنوان عملیات</th>
              <th>نوع درخواست</th>
              <th>کد عملیات</th>
              <th>دکل درخواست‌کننده</th>
              <th>واحد</th>
              <th>افراد اعزامی</th>
              <th>تاریخ درخواست</th>
              <th>تاریخ ارسال گروه</th>
              <th>تاریخ پایان عملیات</th>
              <th>مدت</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.length ? (
              paged.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{r.title}</td>
                  <td>{r.reqType}</td>
                  <td>{r.opCode || "-"}</td>
                  <td>{r.rig}</td>
                  <td>{UNITS.find((u) => u.id === r.unit)?.label || r.unit}</td>
                  <td>{(r.members || []).join("، ")}</td>
                  <td>{fmtFa(r.reqAt) || "-"}</td>
                  <td>{fmtFa(r.startAt) || "-"}</td>
                  <td>{fmtFa(r.endAt) || "-"}</td>
                  <td>{humanDuration(r.startAt, r.endAt)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn" onClick={() => openEdit(r)}>
                      ویرایش
                    </button>
                    <button className="btn danger" onClick={() => remove(r.id)} style={{ marginInlineStart: 6 }}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 12, color: "#6b7280" }}>
                  موردی برای نمایش ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10 }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={(p) => setPage(p)}
          showRange={{
            start: filtered.length ? (page - 1) * pageSize + 1 : 0,
            end: Math.min(filtered.length, page * pageSize),
            total: filtered.length,
          }}
        />
      </div>

      {modalOpen && (
        <OpsFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={editRow}
          onSave={saveRow}
          allowedUnits={allowedUnits}
        />
      )}
    </div>
  );
}


