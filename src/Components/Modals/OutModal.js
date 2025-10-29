import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";
import { RIGS, FAILURE_CATALOG } from "../../constants/catalog";

function normalizeCatalog(provider){
  try{
    if(Array.isArray(provider)) return provider;
    if(typeof provider === "function"){
      let d; try{ d = provider(); }catch{ d = []; }
      if(Array.isArray(d)) return d;
      if(d && typeof d==="object") return Object.values(d).flatMap(v=>Array.isArray(v)?v:[]);
      return [];
    }
    if(provider && typeof provider==="object") return Object.values(provider).flatMap(v=>Array.isArray(v)?v:[]);
    return [];
  }catch{ return []; }
}

export default function OutModal({
  open = true,
  onClose,
  onSubmit,
  catalogProvider,
  size = "xl",
}) {
  const [name,setName]=useState("");
  const [code,setCode]=useState("");
  const [sizeVal,setSizeVal]=useState("");
  const [exitDateObj,setExitDateObj]=useState(null);

  // وضعیت تجهیز
  const [status,setStatus]=useState("—"); // "بازرسی شده" | "تعمیر شده" | "—"

  // واحد مقصد: بازرسی + تراشکاری + دکل‌ها از کاتالوگ
  const unitOptions = useMemo(() => ["بازرسی", "تراشکاری", ...RIGS], []);
  const [dest,setDest]=useState("تراشکاری");

  const [note,setNote]=useState("");

  // فیلدهای مخصوص وقتی dest === "تراشکاری"
  const [reqType,setReqType]=useState("WO"); // WO | PM | EM
  const [failureId,setFailureId]=useState(""); // از لیست
  const [faultCode,setFaultCode]=useState("");
  const [faultCause,setFaultCause]=useState("");
  const [faultReqDate,setFaultReqDate]=useState("");   // YYYY-MM-DD
  const [repairEndDate,setRepairEndDate]=useState(""); // YYYY-MM-DD

  const [pickOpen,setPickOpen]=useState(false);
  const catalog = useMemo(()=>normalizeCatalog(catalogProvider),[catalogProvider]);
  const isTurning = dest === "تراشکاری";

  const missing={name:!name.trim(), code:!code.trim(), size:!sizeVal.trim()};
  const hasError = missing.name || missing.code || missing.size;

  // انتخاب خرابی از کاتالوگ
  const onPickFailure = (fid) => {
    setFailureId(fid);
    const f = FAILURE_CATALOG.find(x => x.id === fid);
    if (f) {
      setFaultCode(f.code);
      setFaultCause(f.name);
    } else {
      setFaultCode("");
      setFaultCause("");
    }
  };

  const submit=()=>{
    if(hasError) return;
    if(isTurning && (!failureId || !faultCode || !faultCause || !reqType || !faultReqDate)){
      alert("برای «تراشکاری» انتخاب خرابی از لیست (یا سایر) و تکمیل نوع درخواست و تاریخ شروع/درخواست الزامی است");
      return;
    }
    onSubmit({
      name, code, size: sizeVal,
      exitDateObj, status, dest, note,
      // فقط در صورت تراشکاری استفاده می‌شود (برای ساخت WO)
      reqType, faultCode, faultCause,
      faultReqDate, repairEndDate,
      failureId,
    });
  };

  const timePlugin = useMemo(() => <TimePicker position="bottom" />, []);

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="ثبت خروج"
        size={size}
        style={{ maxWidth: 1180 }}
        footer={
          <>
            <button className="btn" onClick={onClose}>بستن</button>
            <button className="btn success" disabled={hasError} onClick={submit}>ثبت</button>
          </>
        }
      >
        <div className="mb-form">
          {/* نام/کد/سایز + انتخاب از کاتالوگ */}
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${missing.name?"err":""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=>setName(e.target.value)} />
              {missing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${missing.code?"err":""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=>setCode(e.target.value)} />
              {missing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${missing.size?"err":""}`} placeholder="* سایز" value={sizeVal} onChange={(e)=>setSizeVal(e.target.value)} />
              {missing.size && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems:"flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=>setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          {/* تاریخ/وضعیت/واحد مقصد */}
          <div className="row">
            <DatePicker
              value={exitDateObj}
              onChange={setExitDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت خروج"
            />

            <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option>بازرسی شده</option>
              <option>تعمیر شده</option>
              <option>—</option>
            </select>

            <select className="input" value={dest} onChange={(e)=>setDest(e.target.value)}>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* فیلدهای وابسته به «تراشکاری» */}
          {isTurning && (
            <>
              <div className="row">
                {/* انتخاب خرابی از لیست */}
                <select className="input" value={failureId} onChange={(e)=>onPickFailure(e.target.value)}>
                  <option value="">— انتخاب آیتم خرابی —</option>
                  {FAILURE_CATALOG.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                  <option value="_other">سایر (ورود دستی)</option>
                </select>

                {/* اگر سایر انتخاب شد، ورودی دستی باز می‌ماند */}
                <input
                  className="input"
                  placeholder="علت خرابی"
                  value={faultCause}
                  onChange={(e)=>{ setFailureId("_other"); setFaultCause(e.target.value); }}
                />
                <input
                  className="input"
                  placeholder="کد خرابی"
                  value={faultCode}
                  onChange={(e)=>{ setFailureId("_other"); setFaultCode(e.target.value); }}
                />
              </div>

              <div className="row">
                <div className="seg">
                  {["PM","EM","WO"].map(t=>(
                    <button key={t} type="button" className={`seg-btn ${reqType===t?"active":""}`} onClick={()=>setReqType(t)}>{t}</button>
                  ))}
                </div>

                <DatePicker
                  value={faultReqDate ? new Date(faultReqDate) : null}
                  onChange={(d)=>setFaultReqDate(d ? new Date(d.toDate()).toISOString().slice(0,10) : "")}
                  calendar={persian} locale={persian_fa} format="YYYY/MM/DD"
                  inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ شروع/درخواست *"
                />

                <DatePicker
                  value={repairEndDate ? new Date(repairEndDate) : null}
                  onChange={(d)=>setRepairEndDate(d ? new Date(d.toDate()).toISOString().slice(0,10) : "")}
                  calendar={persian} locale={persian_fa} format="YYYY/MM/DD"
                  inputClass="input" containerClassName="rmdp-rtl" placeholder="تاریخ پایان عملیات"
                />
              </div>
            </>
          )}

          <textarea className="input" placeholder="توضیحات…" value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
      </ModalBase>

      {/* انتخاب از کاتالوگ تجهیز */}
      <ItemPickerModal
        open={pickOpen}
        onClose={()=>setPickOpen(false)}
        catalog={catalog}
        onPick={(it)=>{
          const s0 = Array.isArray(it?.sizes) ? (it.sizes[0]||"") : (it?.size||"");
          if(it?.name) setName(it.name);
          if(it?.code) setCode(it.code);
          if(s0) setSizeVal(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
