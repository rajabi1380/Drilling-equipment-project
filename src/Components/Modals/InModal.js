import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";

/* ورودی کاتالوگ را به آرایه تبدیل می‌کند (آرایه/تابع/آبجکت‌های چندبخشی) */
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
  const [enterDateObj, setEnterDateObj] = useState(null);
  const [status, setStatus] = useState("—");
  const [fromWhere, setFromWhere] = useState("");
  const [note, setNote] = useState("");

  const [pickOpen, setPickOpen] = useState(false);
  const catalog = useMemo(() => normalizeCatalog(catalogProvider), [catalogProvider]);

  const missing = { name: !name.trim(), code: !code.trim(), size: !size.trim() };
  const hasError = missing.name || missing.code || missing.size;

  const submit = () => {
    if (hasError) return;
    onSubmit({ name, code, size, enterDateObj, status, fromWhere, note });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="ثبت ورود"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn success" disabled={hasError} onClick={submit}>ثبت ورود</button>
          </>
        }
      >
        <div className="mb-form">
          {/* ردیف اصلی: نام/کد/سایز + دکمه انتخاب (پس از سایز) */}
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${missing.name ? "err" : ""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=>setName(e.target.value)} />
              {missing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${missing.code ? "err" : ""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=>setCode(e.target.value)} />
              {missing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${missing.size ? "err" : ""}`} placeholder="* سایز" value={size} onChange={(e)=>setSize(e.target.value)} />
              {missing.size && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems: "flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=>setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          {/* تاریخ/وضعیت/مبدأ */}
          <div className="row">
            <DatePicker
              value={enterDateObj}
              onChange={setEnterDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت ورود"
            />
            <select className="input"  value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>
            <input className="input" placeholder="واحد ارسالی  " value={fromWhere} onChange={(e)=>setFromWhere(e.target.value)} />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
      </ModalBase>

      {/* لیست انتخاب تجهیز */}
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
