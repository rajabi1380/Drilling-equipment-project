import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";

function normalizeCatalog(provider){
  try{
    if(Array.isArray(provider)) return provider;
    if(typeof provider === "function"){
      let d; try{ d=provider(); }catch{ d=[]; }
      if(Array.isArray(d)) return d;
      if(d && typeof d==="object") return Object.values(d).flatMap(v=>Array.isArray(v)?v:[]);
      return [];
    }
    if(provider && typeof provider==="object") return Object.values(provider).flatMap(v=>Array.isArray(v)?v:[]);
    return [];
  }catch{ return []; }
}

export default function OutModal({ open=true, onClose, onSubmit, catalogProvider }){
  const [name,setName]=useState("");
  const [code,setCode]=useState("");
  const [size,setSize]=useState("");
  const [exitDateObj,setExitDateObj]=useState(null);
  const [status,setStatus]=useState("—");
  const [dest,setDest]=useState("");
  const [carrier,setCarrier]=useState("");
  const [planNo,setPlanNo]=useState("");
  const [driver,setDriver]=useState("");
  const [bandgiri,setBandgiri]=useState(false);
  const [note,setNote]=useState("");
  const [pickOpen,setPickOpen]=useState(false);

  const catalog = useMemo(()=>normalizeCatalog(catalogProvider),[catalogProvider]);

  const missing={name:!name.trim(), code:!code.trim(), size:!size.trim()};
  const hasError = missing.name || missing.code || missing.size;

  const submit=()=>{
    if(hasError) return;
    onSubmit({ name, code, size, exitDateObj, status, dest, carrier, planNo, driver, bandgiri, note });
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="ثبت خروج"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>انصراف</button>
            <button className="btn danger" disabled={hasError} onClick={submit}>ثبت خروج</button>
          </>
        }
      >
        <div className="mb-form">
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
              <input className={`input ${missing.size?"err":""}`} placeholder="* سایز" value={size} onChange={(e)=>setSize(e.target.value)} />
              {missing.size && <small className="err-msg">الزامی</small>}
            </div>
            <div className="col" style={{ alignItems:"flex-end" }}>
              <button type="button" className="pick-btn" onClick={()=>setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          <div className="row">
            <DatePicker
              value={exitDateObj}
              onChange={setExitDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت خروج"
            />
            <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option>تعمیر شده</option>
              <option>بازرسی شده</option>
              <option>—</option>
            </select>
            <label className="input" style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="checkbox" checked={bandgiri} onChange={(e)=>setBandgiri(e.target.checked)} /> بندگیری
            </label>
          </div>

          <div className="row">
            <input className="input" placeholder="مقصد" value={dest} onChange={(e)=>setDest(e.target.value)} />
            <input className="input" placeholder="مشخصات حمل‌کننده" value={carrier} onChange={(e)=>setCarrier(e.target.value)} />
            <input className="input" placeholder="شماره برنامه" value={planNo} onChange={(e)=>setPlanNo(e.target.value)} />
          </div>

          <div className="row" style={{ gridTemplateColumns:"1fr 1fr 1fr" }}>
            <input className="input" placeholder="راننده" value={driver} onChange={(e)=>setDriver(e.target.value)} />
            <div className="col" />
            <div className="col" />
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
          if(it?.name) setName(it.name);
          if(it?.code) setCode(it.code);
          if(s0) setSize(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
