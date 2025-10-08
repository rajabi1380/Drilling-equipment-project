// src/Components/Modals/DownholeInModal.jsx
import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";
import { getCatalogForUnit } from "../../constants/catalog";

const asDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export default function DownholeInModal({ open = true, onClose, onSubmit, unitList }) {
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
    onSubmit?.({ unitId, name, code, size, enterObj, fromWhere, status, note });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="ثبت ورود قطعه (درون‌چاهی)"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" onClick={submit} disabled={missing}>ثبت ورود</button>
          </>
        }
      >
        <div className="mb-form">
          <div className="row">
            <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">* انتخاب واحد مقصد</option>
              {(unitList || []).map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
            <div className="col" />
            <div className="col" />
          </div>

          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${!name.trim() ? "err" : ""}`} placeholder="* نام تجهیز"
                     value={name} onChange={(e)=>setName(e.target.value)} disabled={!unitId}/>
              {!name.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${!code.trim() ? "err" : ""}`} placeholder="* کد تجهیز"
                     value={code} onChange={(e)=>setCode(e.target.value)} disabled={!unitId}/>
              {!code.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${!size.trim() ? "err" : ""}`} placeholder="* سایز"
                     value={size} onChange={(e)=>setSize(e.target.value)} disabled={!unitId}/>
              {!size.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems:"flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=> setPickOpen(true)} disabled={!unitId}>انتخاب</button>
            </div>
          </div>

          <div className="row">
            <DatePicker
              value={enterObj}
              onChange={(v)=> setEnterObj(asDate(v))}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت ورود"
            />
            <select className="input" value={status} onChange={(e)=> setStatus(e.target.value)}>
              <option value="سالم">سالم</option>
              <option value="نیاز به تعمیر">نیاز به تعمیر</option>
            </select>
            <input className="input" placeholder="واحد ارسالی" value={fromWhere} onChange={(e)=> setFromWhere(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=> setNote(e.target.value)} />
        </div>
      </ModalBase>

      <ItemPickerModal
        open={pickOpen}
        onClose={()=> setPickOpen(false)}
        catalog={catalog}
        title={unitId ? `انتخاب تجهیز — ${(unitList||[]).find((u)=>u.id===unitId)?.title}` : "انتخاب تجهیز"}
        onPick={(it)=>{ setName(it.name || ""); setCode(it.code || "");
          const autoSize = Array.isArray(it.sizes) ? (it.sizes[0] || "") : (it.size || "");
          setSize(autoSize); setPickOpen(false); }}
      />
    </>
  );
}
