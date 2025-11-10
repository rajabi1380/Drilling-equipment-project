// src/Components/Modals/InModal.js
import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";
import { RIGS } from "../../constants/catalog";

function normalizeCatalog(provider) {
  try {
    if (Array.isArray(provider)) return provider;
    if (typeof provider === "function") {
      let data; try { data = provider(); } catch { data = []; }
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object") return Object.values(data).flatMap(v => Array.isArray(v) ? v : []);
      return [];
    }
    if (provider && typeof provider === "object") return Object.values(provider).flatMap(v => Array.isArray(v) ? v : []);
    return [];
  } catch { return []; }
}

export default function InModal({ open = true, onClose, onSubmit, catalogProvider }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [count, setCount] = useState(1);
  const [enterDateObj, setEnterDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [fromWhere, setFromWhere] = useState("");
  const [billNo, setBillNo] = useState("");
  const [note, setNote] = useState("");

  const [pickOpen, setPickOpen] = useState(false);
  const catalog = useMemo(() => normalizeCatalog(catalogProvider), [catalogProvider]);

  const unitOptions = useMemo(() => ["تراشکاری", "بازرسی", ...RIGS], []);
  const isRig = RIGS.includes(fromWhere);
  const isInspection = fromWhere === "بازرسی";
  const isTurning = fromWhere === "تراشکاری";

  const timePlugin = useMemo(() => <TimePicker position="bottom" />, []);
  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim(), count: count < 1, fromWhere: !fromWhere.trim() };
  const hasError = Object.values(missing).some(Boolean);

  const submit = () => {
    if (hasError) {
      alert("لطفاً فیلدهای الزامی را کامل کنید.");
      return;
    }

    if ((isRig || isTurning || isInspection) && !billNo.trim()) {
      alert("شماره بارنامه را وارد کنید.");
      return;
    }

    onSubmit({ name, code, size, count, enterDateObj, status, fromWhere, billNo, note });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="📥 ثبت ورود تجهیز"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" disabled={hasError} onClick={submit}>ثبت ورود</button>
          </>
        }
      >
        <div className="mb-form">
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=>setName(e.target.value)} />
            </div>
            <div className="col">
              <input className={`input ${missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=>setCode(e.target.value)} />
            </div>
            <div className="col">
              <input className={`input ${missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e)=>setSize(e.target.value)} />
            </div>
            <div className="col" style={{ alignItems: "flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=>setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          <div className="row">
            <input
              type="number"
              min="1"
              className={`input ${missing.count ? "err" : ""}`}
              placeholder="* تعداد"
              value={count}
              onChange={(e)=>setCount(Number(e.target.value))}
            />

            <DatePicker
              value={enterDateObj}
              onChange={setEnterDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت ورود"
            />

            <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="—">وضعیت</option>
              <option value="تعمیر شده">تعمیر شده</option>
              <option value="بازرسی شده">بازرسی شده</option>
               <option value="بازرسی شده"> </option>
            </select>
          </div>

          <div className="row">
            <select className={`input ${missing.fromWhere ? "err" : ""}`} value={fromWhere} onChange={(e)=>setFromWhere(e.target.value)}>
              <option value="">* واحد ارسال‌کننده</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {(isRig || isTurning || isInspection) && (
              <input className="input" placeholder="شماره بارنامه *" value={billNo} onChange={(e)=>setBillNo(e.target.value)} />
            )}
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
      </ModalBase>

      <ItemPickerModal
        open={pickOpen}
        onClose={()=>setPickOpen(false)}
        catalog={catalog}
        onPick={(it)=>{
          const s0 = Array.isArray(it?.sizes) ? (it.sizes[0]||"") : (it?.size||"");
          if (it?.name) setName(it.name);
          if (it?.code) setCode(it.code);
          if (s0) setSize(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
