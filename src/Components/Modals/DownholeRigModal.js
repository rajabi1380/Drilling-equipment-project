// src/Components/Modals/DownholeRigModal.jsx
import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";
import { getCatalogForUnit, RIGS } from "../../constants/catalog";

const asDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export default function DownholeRigModal({
  open = true,
  onClose,
  onSubmit,
  unitList,
  initial // اختیاری: برای ویرایش
}) {
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
    onSubmit?.({
      unitId,
      unitTitle: (unitList || []).find((u) => u.id === unitId)?.title || "—",
      name, code, size, fromRig, toRig, moveObj, note,
    });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title={initial ? "ویرایش انتقال دکل↔دکل" : "ثبت انتقال دکل↔دکل"}
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" onClick={submit} disabled={missing}>
              {initial ? "ذخیره تغییرات" : "ثبت انتقال"}
            </button>
          </>
        }
      >
        <div className="mb-form">
          <div className="row">
            <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">* انتخاب واحد</option>
              {(unitList || []).map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
            <div className="col" />
            <div className="col" />
          </div>

          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${!name.trim() ? "err":""}`} placeholder="* نام تجهیز"
                     value={name} onChange={(e)=> setName(e.target.value)} disabled={!unitId}/>
              {!name.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${!code.trim() ? "err":""}`} placeholder="* کد تجهیز"
                     value={code} onChange={(e)=> setCode(e.target.value)} disabled={!unitId}/>
              {!code.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${!size.trim() ? "err":""}`} placeholder="* سایز"
                     value={size} onChange={(e)=> setSize(e.target.value)} disabled={!unitId}/>
              {!size.trim() && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems:"flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=> setPickOpen(true)} disabled={!unitId}>انتخاب</button>
            </div>
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

          {sameRig && <div className="mb-alert warn">مبدأ و مقصد نمی‌تواند یکسان باشد.</div>}

          <textarea className="input" placeholder="توضیحات" value={note} onChange={(e)=> setNote(e.target.value)} />
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
