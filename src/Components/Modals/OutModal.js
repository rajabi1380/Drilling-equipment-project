// File: src/Components/OutModal.jsx

import React, { useEffect, useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
} from "../../utils/date";
import { RIGS } from "../../constants/catalog";

/* -------- helpers -------- */
function normalizeCatalog(provider) {
  try {
    if (Array.isArray(provider)) return provider;
    if (typeof provider === "function") {
      let d;
      try { d = provider(); } catch { d = []; }
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") return Object.values(d).flatMap(v => Array.isArray(v) ? v : []);
      return [];
    }
    if (provider && typeof provider === "object") {
      return Object.values(provider).flatMap(v => Array.isArray(v) ? v : []);
    }
    return [];
  } catch { return []; }
}
const norm = (v) => String(v || "").trim();

/* کد خرابی تصادفی */
const genFaultCode = () => {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FC-${y}${m}${day}-${rand}`;
};

/* تشخیص لوله بودن تجهیز */
const isPipeEquip = (name = "", code = "") => {
  const n = norm(name).toLowerCase();
  const c = norm(code).toLowerCase();
  return n.includes("لوله") || c.includes("pipe");
};

/* فقط حروف انگلیسی/عدد/ . و - مجاز باشند */
const sanitizeEngNum = (v) => v.replace(/[^A-Za-z0-9.\- ]/g, "");

export default function OutModal({
  open = true,
  onClose,
  onSubmit,
  catalogProvider,
  size = "xl",
}) {
  /* -------- common fields -------- */
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sizeVal, setSizeVal] = useState("");
  const [count, setCount] = useState(1);
  const [exitDateObj, setExitDateObj] = useState(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("—");
  const [dest, setDest] = useState("");
  const [billNo, setBillNo] = useState("");
  const [unitRequester, setUnitRequester] = useState("");

  /* -------- turning only -------- */
  const [reqType, setReqType] = useState("WO");
  const [faultCode, setFaultCode] = useState("");
  // علت خرابی: base + suffix → ترکیب می‌شود
  const [faultBase, setFaultBase] = useState("");     // grade | pin | box
  const [faultSuffix, setFaultSuffix] = useState(""); // مثل E یا 39
  const [faultReqDate, setFaultReqDate] = useState("");
  const [repairEndDate, setRepairEndDate] = useState("");

  /* طول لوله (فقط برای لوله) */
  const [pipeLength, setPipeLength] = useState("");

  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(() => normalizeCatalog(catalogProvider), [catalogProvider]);
  const unitOptions = useMemo(() => ["بازرسی", "تراشکاری", ...RIGS], []);
  const destNorm = norm(dest);
  const isTurning = destNorm === "تراشکاری";
  const isInspection = destNorm === "بازرسی";
  const isRigDest = RIGS.includes(destNorm);
  const timePlugin = useMemo(() => <TimePicker position="bottom" />, []);

  /* وقتی تراشکاری شد، اگر کد خرابی خالی بود، بساز */
  useEffect(() => {
    if (isTurning && !norm(faultCode)) setFaultCode(genFaultCode());
  }, [isTurning, faultCode]);

  /* اگر suffix تغییر کرد، فقط کاراکتر مجاز بماند */
  const onChangeSuffix = (v) => {
    const cleaned = sanitizeEngNum(v).replace(/\s+/g, " ").trimStart();
    setFaultSuffix(cleaned.slice(0, 16)); // محدودیت طول منطقی
  };

  /* -------- validation -------- */
  const missing = {
    name: !norm(name),
    code: !norm(code),
    size: !norm(sizeVal),
    count: !count || Number(count) < 1,
    dest: !destNorm,
  };
  const hasError = Object.values(missing).some(Boolean);

  /* علت نهایی به شکل "<base> <suffix>" */
  const finalFaultCause = norm(
    [faultBase, faultSuffix].filter(Boolean).join(" ")
  );

  /* -------- submit -------- */
  const submit = () => {
    if (hasError) {
      alert("لطفاً فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    if (isRigDest && !norm(billNo)) {
      alert("شماره بارنامه برای ارسال به دکل الزامی است.");
      return;
    }
    if (isInspection && !norm(unitRequester)) {
      alert("نام واحد درخواست‌کننده الزامی است.");
      return;
    }
    if (
      isTurning &&
      (!norm(reqType) || !norm(faultReqDate) || !finalFaultCause)
    ) {
      alert("برای تراشکاری، علت خرابی (base + suffix)، نوع درخواست و تاریخ شروع الزامی است.");
      return;
    }

    const finalFaultCode = isTurning ? (norm(faultCode) || genFaultCode()) : "";

    onSubmit({
      name: norm(name),
      code: norm(code),
      size: norm(sizeVal),
      count: Number(count) || 1,
      exitDateObj: exitDateObj || null,
      status: norm(status) || "—",
      dest: destNorm,
      note: norm(note),
      billNo: norm(billNo),
      unitRequester: norm(unitRequester),

      // turning
      reqType: norm(reqType) || "WO",
      faultCode: finalFaultCode,
      faultCause: finalFaultCause, // ← اینجا مقدار ترکیبی می‌رود مثل "pin 39"
      faultReqDate: norm(faultReqDate),
      repairEndDate: norm(repairEndDate),

      // pipe
      pipeLength: isPipeEquip(name, code) ? norm(pipeLength) : "",
    });
  };

  if (!open) return null;

  const pipeActive = isPipeEquip(name, code);
  const suffixPlaceholder =
    faultBase === "grade" ? "مثلاً E" :
    faultBase === "pin"   ? "مثلاً 39" :
    faultBase === "box"   ? "مثلاً NC38" : "پسوند (E / 39 / …)";

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="📤 ثبت خروج تجهیز"
        size={size}
        style={{ maxWidth: 1200 }}
        footer={
          <>
            <button className="btn" onClick={onClose}>بستن</button>
            <button className="btn success" disabled={hasError} onClick={submit}>ثبت</button>
          </>
        }
      >
        <div className="mb-form">
          {/* نام / کد / سایز / تعداد / نوع درخواست / انتخاب */}
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr 0.6fr 0.7fr auto" }}>
            <input
              className={`input ${missing.name ? "err" : ""}`}
              placeholder="* نام تجهیز"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className={`input ${missing.code ? "err" : ""}`}
              placeholder="* کد تجهیز"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className={`input ${missing.size ? "err" : ""}`}
              placeholder="* سایز"
              value={sizeVal}
              onChange={(e) => setSizeVal(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className={`input ${missing.count ? "err" : ""}`}
              placeholder="* تعداد"
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            />

            {isTurning ? (
              <select className="input" value={reqType} onChange={(e) => setReqType(e.target.value)}>
                <option value="WO">WO</option>
                <option value="PM">PM</option>
                <option value="EM">EM</option>
              </select>
            ) : (
              <div />
            )}

            <div className="col" style={{ alignItems: "flex-end" }}>
              <button type="button" className="pick-btn" onClick={() => setPickOpen(true)}>انتخاب</button>
            </div>
          </div>

          {/* طول لوله */}
          {pipeActive && (
            <div className="row">
              <input
                type="number"
                min={0}
                className="input"
                placeholder="طول لوله (متر)"
                value={pipeLength}
                onChange={(e) => setPipeLength(e.target.value)}
              />
            </div>
          )}

          {/* تاریخ / وضعیت / مقصد */}
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
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="—">وضعیت</option>
              <option value="بازرسی شده">بازرسی شده</option>
              <option value="تعمیر شده">تعمیر شده</option>
              <option value="بندگیری شده">بندگیری شده</option>
              <option value="سالم">سالم</option>
            </select>
            <select
              className={`input ${missing.dest ? "err" : ""}`}
              value={dest}
              onChange={(e) => setDest(e.target.value)}
            >
              <option value="">مقصد...</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {isRigDest && (
            <div className="row">
              <input
                className="input"
                placeholder="شماره بارنامه *"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </div>
          )}

          {isInspection && (
            <div className="row">
              <input
                className="input"
                placeholder="نام واحد درخواست‌کننده *"
                value={unitRequester}
                onChange={(e) => setUnitRequester(e.target.value)}
              />
            </div>
          )}

          {/* تراشکاری: علت خرابی base + suffix، کد خرابی رندوم */}
          {isTurning && (
            <>
              <div className="row" style={{ gridTemplateColumns: "0.9fr 1.1fr 1fr" }}>
                <select
                  className="input"
                  value={faultBase}
                  onChange={(e) => setFaultBase(e.target.value)}
                >
                  <option value="">— پایه علت (grade/pin/box) —</option>
                  <option value="grade">grade</option>
                  <option value="pin">pin</option>
                  <option value="box">box</option>
                </select>

                <input
                  className="input"
                  placeholder={suffixPlaceholder}
                  value={faultSuffix}
                  onChange={(e) => onChangeSuffix(e.target.value)}
                />

                {/* <input
                  className="input"
                  placeholder="کد خرابی (خودکار)"
                  value={faultCode}
                  onChange={(e) => setFaultCode(sanitizeEngNum(e.target.value).toUpperCase().slice(0, 18))}
                /> */}
              </div>

              {/* تاریخ‌ها */}
              <div className="row">
                <DatePicker
                  value={faultReqDate ? new Date(faultReqDate) : null}
                  onChange={(d) =>
                    setFaultReqDate(
                      d && d.toDate ? new Date(d.toDate()).toISOString().slice(0, 10) : ""
                    )
                  }
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  inputClass="input"
                  containerClassName="rmdp-rtl"
                  placeholder="تاریخ شروع/درخواست *"
                />

                <DatePicker
                  value={repairEndDate ? new Date(repairEndDate) : null}
                  onChange={(d) =>
                    setRepairEndDate(
                      d && d.toDate ? new Date(d.toDate()).toISOString().slice(0, 10) : ""
                    )
                  }
                  calendar={persian}
                  locale={persian_fa}
                  format="YYYY/MM/DD"
                  inputClass="input"
                  containerClassName="rmdp-rtl"
                  placeholder="تاریخ پایان عملیات"
                />
              </div>

              {/* پیش‌نمایش علت ترکیبی (اختیاری) */}
              <div className="row">
                <input disabled className="input" value={finalFaultCause} placeholder="پیش‌نمایش علت خرابی (مثلاً: grade E)" />
              </div>
            </>
          )}

          {/* توضیحات */}
          <div className="row">
            <textarea
              className="input"
              placeholder="توضیحات…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </ModalBase>

      <ItemPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        catalog={catalog}
        onPick={(it) => {
          const s0 = Array.isArray(it?.sizes) ? (it.sizes[0] || "") : (it?.size || "");
          if (it?.name) setName(it.name);
          if (it?.code) setCode(it.code);
          if (s0) setSizeVal(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
