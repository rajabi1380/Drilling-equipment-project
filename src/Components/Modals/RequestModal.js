// src/Components/Modals/RequestModal.js
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

export default function RequestModal({
  open = false,
  onClose,
  onSubmit,
  catalog = [],
}) {
  const [tab, setTab] = useState("turning"); // turning | inspection
  const [reqType, setReqType] = useState("wo"); // wo | pm | ed

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState("تراشکاری");

  const status =
    tab === "inspection" ? "در انتظار بازرسی" : "در انتظار تعمیر";

  useEffect(() => {
    setUnit(tab === "inspection" ? "بازرسی" : "تراشکاری");
  }, [tab]);

  const [startObj, setStartObj] = useState(null);
  const [endObj, setEndObj] = useState(null);
  const [desc, setDesc] = useState("");

  // فقط برای تبِ تراشکاری
  const [failureName, setFailureName] = useState("");
  const [failureCode, setFailureCode] = useState("");

  // باز/بسته بودن پیکر انتخاب
  const [pickOpen, setPickOpen] = useState(false);

  // اعتبارسنجی ساده
  const touched = useMemo(
    () => ({
      name: !name.trim(),
      code: !code.trim(),
      size: !size.trim(),
    }),
    [name, code, size]
  );
  const invalid = touched.name || touched.code || touched.size;

  const submit = () => {
    if (invalid) return;
    const payload = {
      reqType,
      name,
      code,
      size,
      unit,
      status,
      startObj,
      endObj,
      desc,
      extra: {},
    };
    if (tab === "turning") payload.extra = { failureName, failureCode };
    onSubmit?.(payload);
    onClose?.();
  };

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="جزئیات درخواست"
        size="lg"
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>
              بستن
            </button>
            <button
              type="button"
              className="btn success"
              disabled={invalid}
              onClick={submit}
            >
              ثبت
            </button>
          </>
        }
      >
        <div className="mb-form">
          {/* نوع درخواست و تب‌ها */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span>نوع درخواست:</span>
            {["wo", "pm", "ed"].map((t) => (
              <button
                key={t}
                type="button"
                className={`btn ${reqType === t ? "primary" : ""}`}
                onClick={() => setReqType(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
            <div style={{ marginInlineStart: "auto" }}>
              <div className="btn-group">
                <button
                  type="button"
                  className={`btn ${tab === "turning" ? "primary" : ""}`}
                  onClick={() => setTab("turning")}
                >
                  تراشکاری
                </button>
                <button
                  type="button"
                  className={`btn ${tab === "inspection" ? "primary" : ""}`}
                  onClick={() => setTab("inspection")}
                >
                  بازرسی
                </button>
              </div>
            </div>
          </div>

          {/* نام/کد/سایز + دکمه انتخاب */}
          <div
            className="row"
            style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}
          >
            <div className="col">
              <input
                className={`input ${touched.name ? "err" : ""}`}
                placeholder="* نام تجهیز"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {touched.name && <small className="err-msg">الزامی</small>}
            </div>

            <div className="col">
              <input
                className={`input ${touched.code ? "err" : ""}`}
                placeholder="* کد تجهیز"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {touched.code && <small className="err-msg">الزامی</small>}
            </div>

            <div className="col">
              <input
                className={`input ${touched.size ? "err" : ""}`}
                placeholder="* سایز"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
              {touched.size && <small className="err-msg">الزامی</small>}
            </div>

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

          {/* واحد/وضعیت/شروع */}
          <div className="row">
            <input className="input" value={unit} readOnly disabled />
            <input className="input" value={status} readOnly disabled />
            <DatePicker
              value={startObj}
              onChange={setStartObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ درخواست/شروع"
            />
          </div>

          {/* پایان */}
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <DatePicker
              value={endObj}
              onChange={setEndObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[<TimePicker position="bottom" />]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ پایان عملیات"
            />
            <div className="col" />
            <div className="col" />
          </div>

          {/* فیلدهای خرابی فقط در تراشکاری */}
          {tab === "turning" && (
            <div className="row">
              <input
                className="input"
                placeholder="نام خرابی"
                value={failureName}
                onChange={(e) => setFailureName(e.target.value)}
              />
              <input
                className="input"
                placeholder="کد خرابی"
                value={failureCode}
                onChange={(e) => setFailureCode(e.target.value)}
              />
              <div className="col" />
            </div>
          )}

          <textarea
            className="input"
            placeholder="توضیحات..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
      </ModalBase>

      {/* پیکر انتخاب مشترک (روی کل صفحه رندر می‌شود) */}
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
          if (s0) setSize(s0);
          setPickOpen(false);
        }}
        title="انتخاب از لیست تجهیزات"
      />
    </>
  );
}
