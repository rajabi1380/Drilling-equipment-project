// src/pages/OpsGroupsShared.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModalBase from "./common/ModalBase";
import "./common/ModalBase.css";
import ItemPickerModal from "./common/ItemPickerModal";
import ExportButtons from "./common/ExportButtons";
import Pagination from "./common/Pagination";
import { DatePicker, TimePicker, persian, persian_fa, parseAnyDate, fmtFa } from "../utils/date";
import { getCatalogForUnit, RIGS } from "../constants/catalog";
import { loadLS, saveLS } from "../utils/ls";
import { useAuth } from "./Context/AuthContext";

const LS_KEY = "ops_groups_v2";
const ARCHIVE_LS_KEY = "ops_groups_archive";

const UNITS = [
  { id: "downhole", label: "درون‌چاهی" },
  { id: "surface", label: "برون‌چاهی" },
  { id: "pipe", label: "تعمیرات و نگهداری لوله" },
];

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

/* ---------------------- فرم مدال ---------------------- */
function OpsFormModal({ open, onClose, initial, onSave, allowedUnits }) {
  const { isAdmin, currentUnit } = useAuth();

  const defaultUnit = isAdmin
    ? initial?.unit || allowedUnits[0] || "downhole"
    : currentUnit || allowedUnits[0];

  const [unit, setUnit] = useState(defaultUnit);
  const [rig, setRig] = useState(initial?.rig || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [members, setMembers] = useState(initial?.members || []);
  const [memberInput, setMemberInput] = useState("");
  const [reqAt, setReqAt] = useState(initial?.reqAt ? parseAnyDate(initial.reqAt) : new Date());
  const [startAt, setStartAt] = useState(initial?.startAt ? parseAnyDate(initial.startAt) : null);
  const [endAt, setEndAt] = useState(initial?.endAt ? parseAnyDate(initial.endAt) : null);

  const valid = unit && rig && title && members.length >= 3 && members.length <= 4;

  const handleSave = () => {
    if (!valid) return;
    const payload = {
      id: initial?.id || uid(),
      unit,
      rig,
      title,
      members,
      reqAt: reqAt || new Date(),
      startAt: startAt || null,
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
      title={initial ? "ویرایش عملیات" : "ثبت عملیات جدید"}
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
            <label className="label">دکل</label>
            <select className="input" value={rig} onChange={(e) => setRig(e.target.value)}>
              <option value="" disabled>
                انتخاب دکل…
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
              placeholder="مثلاً: عملیات در محل"
            />
          </div>
        </div>
      </div>
    </ModalBase>
  );
}

/* ---------------------- صفحه اصلی ---------------------- */
export default function OpsGroupsShared() {
  const { isAdmin, currentUnit } = useAuth();

  const allowedUnits = useMemo(() => (isAdmin ? UNITS.map((u) => u.id) : [currentUnit]), [isAdmin, currentUnit]);
  const allowedSet = useMemo(() => new Set(allowedUnits), [allowedUnits]);

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

    const s = q.trim();
    if (s) {
      data = data.filter((r) => {
        const mem = (r.members || []).join(" ");
        return (r.title || "").includes(s) || (r.rig || "").includes(s) || mem.includes(s);
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
      alert("شما مجاز به ثبت عملیات برای این واحد نیستید.");
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

  return (
    <div className="ui-page" style={{ direction: "rtl", padding: 12 }}>
      {/* فیلتر و دکمه‌ها */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          placeholder="جستجو..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="spacer" />
        <button className="btn primary" onClick={openCreate}>
          ثبت عملیات جدید
        </button>
        <ExportButtons
          getExport={() => ({
            filename: "ops-groups",
            title: "گزارش گروه‌های عملیاتی",
            headers: ["کد", "واحد", "دکل", "عنوان", "اعضا", "تاریخ درخواست", "شروع", "پایان", "مدت", "وضعیت"],
            rows: filtered.map((r) => ({
              کد: r.id,
              واحد: r.unit,
              دکل: r.rig,
              عنوان: r.title,
              اعضا: (r.members || []).join("، "),
              تاریخ_درخواست: fmtFa(r.reqAt),
              شروع: fmtFa(r.startAt),
              پایان: fmtFa(r.endAt),
              مدت: humanDuration(r.startAt, r.endAt),
              وضعیت: r.status === "done" ? "پایان‌یافته" : "در حال انجام",
            })),
          })}
        />
      </div>

      {/* جدول */}
      <div className="table-wrap" style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th>کد</th>
              <th>واحد</th>
              <th>دکل</th>
              <th>عنوان</th>
              <th>اعضا</th>
              <th>درخواست</th>
              <th>شروع</th>
              <th>پایان</th>
              <th>مدت</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {paged.length ? (
              paged.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{r.id}</td>
                  <td>{r.unit}</td>
                  <td>{r.rig}</td>
                  <td>{r.title}</td>
                  <td>{(r.members || []).join("، ")}</td>
                  <td>{fmtFa(r.reqAt)}</td>
                  <td>{r.startAt ? fmtFa(r.startAt) : "—"}</td>
                  <td>{r.endAt ? fmtFa(r.endAt) : "—"}</td>
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
                <td colSpan={10} style={{ textAlign: "center", padding: 12, color: "#6b7280" }}>
                  هیچ موردی یافت نشد.
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
