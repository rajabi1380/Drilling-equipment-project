import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";

function normalizeCatalog(provider){
  try{
    if(Array.isArray(provider)) return provider;
    if(typeof provider==="function"){
      let d; try{ d=provider(); }catch{ d=[]; }
      if(Array.isArray(d)) return d;
      if(d && typeof d==="object") return Object.values(d).flatMap(v=>Array.isArray(v)?v:[]);
      return [];
    }
    if(provider && typeof provider==="object") return Object.values(provider).flatMap(v=>Array.isArray(v)?v:[]);
    return [];
  }catch{ return []; }
}

export default function RigModal({ open=true, rigs=[], onClose, onSubmit, catalogProvider }){
  const [name,setName]=useState("");
  const [code,setCode]=useState("");
  const [size,setSize]=useState("");

  const [reqAtObj,setReqAtObj]=useState(null);
  const [arriveAtObj,setArriveAtObj]=useState(null);
  const [rigFrom,setRigFrom]=useState("");
  const [rigTo,setRigTo]=useState("");
  const [requester,setRequester]=useState("");
  const [inspector,setInspector]=useState("");
  const [inspectAtObj,setInspectAtObj]=useState(null);
  const [note,setNote]=useState("");

  const [pickOpen,setPickOpen]=useState(false);
  const catalog = useMemo(()=>normalizeCatalog(catalogProvider),[catalogProvider]);

  const baseMissing = { name:!name.trim(), code:!code.trim(), size:!size.trim() };
  const rigsMissing = (!rigFrom || !rigTo);
  const rigsEqual = rigFrom && rigTo && rigFrom === rigTo;
  const hasError = baseMissing.name || baseMissing.code || baseMissing.size || rigsMissing || rigsEqual;

  const submit=()=>{
    if(hasError) return;
    onSubmit({ name, code, size, reqAtObj, arriveAtObj, rigFrom, rigTo, requester, inspector, inspectAtObj, note });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="ثبت دکل به دکل"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn warn" disabled={hasError} onClick={submit}>ثبت دکل به دکل</button>
          </>
        }
      >
        <div className="mb-form">
          {/* نام/کد/سایز + انتخاب */}
          <div className="row" style={{ gridTemplateColumns:"1fr 1fr 1fr auto" }}>
            <div className="col">
              <input className={`input ${baseMissing.name?"err":""}`} placeholder="* نام تجهیز" value={name} onChange={(e)=>setName(e.target.value)} />
              {baseMissing.name && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${baseMissing.code?"err":""}`} placeholder="* کد تجهیز" value={code} onChange={(e)=>setCode(e.target.value)} />
              {baseMissing.code && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col">
              <input className={`input ${baseMissing.size?"err":""}`} placeholder="* سایز" value={size} onChange={(e)=>setSize(e.target.value)} />
              {baseMissing.size && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems:"flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=>setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          {/* تاریخ‌ها + دکل‌ها */}
          <div className="row">
            <DatePicker
              value={reqAtObj}
              onChange={setReqAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت درخواست"
            />
            <DatePicker
              value={arriveAtObj}
              onChange={setArriveAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت رسیدن"
            />
            <select className={`input ${(!rigFrom || rigsEqual) ? "err" : ""}`} value={rigFrom} onChange={(e)=>setRigFrom(e.target.value)}>
              <option value="">دکل مبدأ</option>
              {rigs.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="row">
            <select className={`input ${(!rigTo || rigsEqual) ? "err" : ""}`} value={rigTo} onChange={(e)=>setRigTo(e.target.value)}>
              <option value="">دکل مقصد</option>
              {rigs.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="input" placeholder="نام درخواست‌کننده" value={requester} onChange={(e)=>setRequester(e.target.value)} />
            <input className="input" placeholder="نام بازرس" value={inspector} onChange={(e)=>setInspector(e.target.value)} />
          </div>

          {/* پیام خطای یکسانی دکل‌ها (بدون برچسب «الزامی») */}
          {rigsEqual && (
            <div className="mb-alert warn" role="alert">
              مبدأ و مقصد نمی‌تواند یکسان باشد.
            </div>
          )}

          <div className="row">
            <DatePicker
              value={inspectAtObj}
              onChange={setInspectAtObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ بازرسی (اختیاری)"
            />
            <div className="col" />
            <div className="col" />
          </div>

          <textarea className="input" placeholder="توضیحات..." value={note} onChange={(e)=>setNote(e.target.value)} />
        </div>
      </ModalBase>

      {/* لیست تجهیزات (زیرمدال) */}
      <ItemPickerModal
        open={pickOpen}
        onClose={()=>setPickOpen(false)}
        catalog={catalog}
        onPick={(it)=>{
          const s0 = Array.isArray(it?.sizes) ? (it.sizes[0]||"") : (it?.size||"");
          if(it?.name) setName(it.name);
          if(it?.code) setCode(it.code);
          if(s0) setSize(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
