// src/Components/Modals/RequestModal.js

import React, { useEffect, useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";

export default function RequestModal({
  open = false,
  onClose,
  onSubmit,
  catalog = [],
}) {
  const [tab, setTab] = useState("turning");      // turning | inspection
  const [reqType, setReqType] = useState("wo");   // wo | pm | ed

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

  // فقط برای تب تراشکاری
  const [failureName, setFailureName] = useState("");
  const [failureCode, setFailureCode] = useState("");

  const [pickOpen, setPickOpen] = useState(false);

  // ✅ استفاده درست از پلاگین
  const timePlugin = useMemo(
    () => <TimePicker position="bottom" />,
    []
  );

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
    if (invalid) {
      alert("نام، کد و سایز را تکمیل کنید.");
      return;
    }

    onSubmit?.({
      tab,
      reqType,
      name,
      code,
      size,
      unit,
      status,
      startObj,
      endObj,
      desc,
      failureName,
      failureCode,
    });
  };

  const normalizedCatalog = useMemo(
    () =>
      Array.isArray(catalog)
        ? catalog
        : [],
    [catalog]
  );

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="درخواست کار"
        size="lg"
        footer={
          <>
            <button className="btn" onClick={onClose}>
              انصراف
            </button>
            <button
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
          {/* تب‌ها */}
          <div className="row">
            <div className="col">
              <div className="tabs">
                <button
                  className={tab === "turning" ? "tab active" : "tab"}
                  onClick={() => setTab("turning")}
                >
                  تراشکاری
                </button>
                <button
                  className={tab === "inspection" ? "tab active" : "tab"}
                  onClick={() => setTab("inspection")}
                >
                  بازرسی
                </button>
              </div>
            </div>
          </div>

          {/* نام / کد / سایز + انتخاب */}
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
            </div>
            <div className="col">
              <input
                className={`input ${touched.code ? "err" : ""}`}
                placeholder="* کد تجهیز"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="col">
              <input
                className={`input ${touched.size ? "err" : ""}`}
                placeholder="* سایز"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            <div className="col">
              <button
                className="btn sm"
                type="button"
                onClick={() => setPickOpen(true)}
              >
                انتخاب
              </button>
            </div>
          </div>

          {/* واحد، تاریخ‌ها */}
          <div className="row">
            <div className="col">
              <label>واحد</label>
              <input
                className="input"
                value={unit}
                readOnly
              />
            </div>
            <div className="col">
              <label>تاریخ شروع</label>
              <DatePicker
                value={startObj}
                onChange={setStartObj}
                calendar={persian}
                locale={persian_fa}
                format={faFmt}
                plugins={[timePlugin]}
                inputClass="input"
                placeholder="تاریخ شروع"
              />
            </div>
            <div className="col">
              <label>تاریخ پایان</label>
              <DatePicker
                value={endObj}
                onChange={setEndObj}
                calendar={persian}
                locale={persian_fa}
                format={faFmt}
                plugins={[timePlugin]}
                inputClass="input"
                placeholder="تاریخ پایان"
              />
            </div>
          </div>

          {/* برای تراشکاری: اطلاعات خرابی */}
          {tab === "turning" && (
            <div className="row">
              <div className="col">
                <label>کد خرابی</label>
                <input
                  className="input"
                  value={failureCode}
                  onChange={(e) => setFailureCode(e.target.value)}
                />
              </div>
              <div className="col">
                <label>شرح خرابی</label>
                <input
                  className="input"
                  value={failureName}
                  onChange={(e) => setFailureName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* توضیحات */}
          <div className="row">
            <div className="col">
              <label>توضیحات</label>
              <textarea
                className="input"
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>
        </div>
      </ModalBase>

      <ItemPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        catalog={normalizedCatalog}
        title="انتخاب از لیست تجهیزات"
        onPick={(item) => {
          setPickOpen(false);
          if (item?.name) setName(item.name);
          if (item?.code) setCode(item.code);
          if (item?.size) setSize(item.size);
        }}
      />
    </>
  );
}
