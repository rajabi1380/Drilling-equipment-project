// File: src/Components/OutModal.jsx

import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import {
  DatePicker,
  TimePicker,
  persian,
  persian_fa,
  faFmt,
} from "../../utils/date";
import { RIGS, FAILURE_CATALOG } from "../../constants/catalog";

// -------------------------------
// نرمال‌سازی کاتالوگ
// -------------------------------
function normalizeCatalog(provider) {
  try {
    if (Array.isArray(provider)) return provider;

    if (typeof provider === "function") {
      let d;
      try {
        d = provider();
      } catch {
        d = [];
      }
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") {
        return Object.values(d).flatMap((v) =>
          Array.isArray(v) ? v : []
        );
      }
      return [];
    }

    if (provider && typeof provider === "object") {
      return Object.values(provider).flatMap((v) =>
        Array.isArray(v) ? v : []
      );
    }

    return [];
  } catch {
    return [];
  }
}

const norm = (v) => String(v || "").trim();

export default function OutModal({
  open = true,
  onClose,
  onSubmit,
  catalogProvider,
  size = "xl",
}) {
  // -------------------------------
  // فیلدهای عمومی
  // -------------------------------
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

  // فقط برای تراشکاری
  const [reqType, setReqType] = useState("WO");
  const [failureId, setFailureId] = useState("");
  const [faultCode, setFaultCode] = useState("");
  const [faultCause, setFaultCause] = useState("");
  const [faultReqDate, setFaultReqDate] = useState("");
  const [repairEndDate, setRepairEndDate] = useState("");

  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(
    () => normalizeCatalog(catalogProvider),
    [catalogProvider]
  );
  const unitOptions = useMemo(
    () => ["بازرسی", "تراشکاری", ...RIGS],
    []
  );

  const destNorm = norm(dest);
  const isTurning = destNorm === "تراشکاری";
  const isInspection = destNorm === "بازرسی";
  const isRigDest = RIGS.includes(destNorm);

  // ✅ پلاگین زمان: به صورت JSX، نه new
  // فقط برای DatePicker اصلی خروج استفاده می‌کنیم
  const timePlugin = useMemo(
    () => <TimePicker position="bottom" />,
    []
  );

  // -------------------------------
  // اعتبارسنجی
  // -------------------------------
  const missing = {
    name: !norm(name),
    code: !norm(code),
    size: !norm(sizeVal),
    count: !count || Number(count) < 1,
    dest: !destNorm,
  };
  const hasError = Object.values(missing).some(Boolean);

  const onPickFailure = (fid) => {
    setFailureId(fid);
    const f = FAILURE_CATALOG.find((x) => x.id === fid);
    if (f) {
      setFaultCode(f.code || "");
      setFaultCause(f.name || "");
    } else {
      setFaultCode("");
      setFaultCause("");
    }
  };

  // -------------------------------
  // ثبت خروج
  // -------------------------------
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
      (!norm(failureId) ||
        !norm(faultCode) ||
        !norm(faultCause) ||
        !norm(reqType) ||
        !norm(faultReqDate))
    ) {
      alert("برای تراشکاری، انتخاب خرابی و نوع درخواست الزامی است.");
      return;
    }

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
      reqType: norm(reqType) || "WO",
      faultCode: norm(faultCode),
      faultCause: norm(faultCause),
      faultReqDate: norm(faultReqDate),
      repairEndDate: norm(repairEndDate),
      failureId: norm(failureId),
    });
  };

  // -------------------------------
  // UI
  // -------------------------------
  if (!open) return null;

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
            <button className="btn" onClick={onClose}>
              بستن
            </button>
            <button
              className="btn success"
              disabled={hasError}
              onClick={submit}
            >
              ثبت
            </button>
          </>
        }
      >
        <div className="mb-form">
          {/* 🧱 نام / کد / سایز / تعداد / نوع درخواست / انتخاب */}
          <div
            className="row"
            style={{
              gridTemplateColumns:
                "1fr 1fr 1fr 0.5fr 0.7fr auto",
            }}
          >
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
              onChange={(e) =>
                setCount(
                  Math.max(1, Number(e.target.value) || 1)
                )
              }
            />

            {isTurning ? (
              <select
                className="input"
                value={reqType}
                onChange={(e) => setReqType(e.target.value)}
              >
                <option value="WO">WO</option>
                <option value="PM">PM</option>
                <option value="EM">EM</option>
              </select>
            ) : (
              <div />
            )}

            <div className="col" style={{ alignItems: "flex-end" }}>
              <button
                type="button"
                className="pick-btn"
                onClick={() => setPickOpen(true)}
              >
                انتخاب
              </button>
            </div>
          </div>

          {/* 📅 تاریخ / وضعیت / مقصد */}
          <div className="row">
            <DatePicker
              value={exitDateObj}
              onChange={setExitDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]} // ✅ این‌بار درست: JSX, نه new
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت خروج"
            />

            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
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
                <option key={u} value={u}>
                  {u}
                </option>
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
                onChange={(e) =>
                  setUnitRequester(e.target.value)
                }
              />
            </div>
          )}

          {/* ⚙️ تراشکاری */}
          {isTurning && (
            <>
              <div className="row">
                <select
                  className="input"
                  value={failureId}
                  onChange={(e) =>
                    onPickFailure(e.target.value)
                  }
                >
                  <option value="">
                    — انتخاب آیتم خرابی —
                  </option>
                  {FAILURE_CATALOG.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                  <option value="_other">
                    سایر (ورود دستی)
                  </option>
                </select>
                <input
                  className="input"
                  placeholder="علت خرابی"
                  value={faultCause}
                  onChange={(e) => {
                    setFailureId(
                      failureId || "_other"
                    );
                    setFaultCause(e.target.value);
                  }}
                />
                <input
                  className="input"
                  placeholder="کد خرابی"
                  value={faultCode}
                  onChange={(e) => {
                    setFailureId(
                      failureId || "_other"
                    );
                    setFaultCode(e.target.value);
                  }}
                />
              </div>

              <div className="row">
                <DatePicker
                  value={
                    faultReqDate
                      ? new Date(faultReqDate)
                      : null
                  }
                  onChange={(d) =>
                    setFaultReqDate(
                      d && d.toDate
                        ? new Date(
                            d.toDate()
                          )
                            .toISOString()
                            .slice(0, 10)
                        : ""
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
                  value={
                    repairEndDate
                      ? new Date(repairEndDate)
                      : null
                  }
                  onChange={(d) =>
                    setRepairEndDate(
                      d && d.toDate
                        ? new Date(
                            d.toDate()
                          )
                            .toISOString()
                            .slice(0, 10)
                        : ""
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
            </>
          )}

          {/* 📝 توضیحات */}
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
          const s0 = Array.isArray(it?.sizes)
            ? it.sizes[0] || ""
            : it?.size || "";
          if (it?.name) setName(it.name);
          if (it?.code) setCode(it.code);
          if (s0) setSizeVal(s0);
          setPickOpen(false);
        }}
      />
    </>
  );
}
