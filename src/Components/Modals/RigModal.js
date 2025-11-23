import React, { useMemo, useState } from "react";
import ModalBase from "../common/ModalBase";
import ItemPickerModal from "../common/ItemPickerModal";
import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";

function normalizeCatalog(provider) {
  try {
    if (Array.isArray(provider)) return provider;
    if (typeof provider === "function") {
      const d = provider();
      if (Array.isArray(d)) return d;
      if (d && typeof d === "object") return Object.values(d).flatMap((v) => (Array.isArray(v) ? v : []));
      return [];
    }
    if (provider && typeof provider === "object") {
      return Object.values(provider).flatMap((v) => (Array.isArray(v) ? v : []));
    }
    return [];
  } catch {
    return [];
  }
}

const norm = (v) => String(v || "").trim();

const toISO16Safe = (v) => {
  if (!v) return "";
  if (typeof v?.toDate === "function") {
    try { return new Date(v.toDate()).toISOString().slice(0, 16); } catch {}
  }
  if (v instanceof Date) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
};

export default function RigModal({ open, onClose, onSubmit, rigs = [], catalogProvider }) {
  const [fromRig, setFromRig] = useState("");
  const [toRig, setToRig] = useState("");
  const [requestDateObj, setRequestDateObj] = useState(null);
  const [arriveDateObj, setArriveDateObj] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sizeVal, setSizeVal] = useState("");
  const [count, setCount] = useState(1);
  const [billNo, setBillNo] = useState("");
  const [note, setNote] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  const catalog = useMemo(() => normalizeCatalog(catalogProvider), [catalogProvider]);
  const timePlugin = useMemo(() => <TimePicker position="bottom" />, []);

  const onPickItem = (item) => {
    const s0 = Array.isArray(item?.sizes) ? (item.sizes[0] || "") : (item?.size || "");
    if (item?.name) setName(item.name);
    if (item?.code) setCode(item.code);
    if (s0) setSizeVal(s0);
    setPickOpen(false);
  };

  const submit = () => {
    if (!fromRig || !toRig || fromRig === toRig) {
      alert("دکل مبدا و مقصد را به‌درستی انتخاب کنید.");
      return;
    }
    if (!norm(name) || !norm(code) || !norm(sizeVal)) {
      alert("نام، کد و سایز تجهیز الزامی است.");
      return;
    }
    if (!count || Number(count) < 1) {
      alert("تعداد باید حداقل 1 باشد.");
      return;
    }

    const requestAtISO = toISO16Safe(requestDateObj) || new Date().toISOString().slice(0, 16);
    const arriveAtISO = toISO16Safe(arriveDateObj) || "";

    onSubmit({
      fromRig,
      toRig,
      requestAtISO,
      arriveAtISO,
      name: norm(name),
      code: norm(code),
      size: norm(sizeVal),
      count: Number(count) || 1,
      billNo: norm(billNo),
      note: norm(note),
      items: [
        {
          name: norm(name),
          code: norm(code),
          size: norm(sizeVal),
          qty: Number(count) || 1,
        },
      ],
    });
  };

  if (!open) return null;

  return (
    <>
      <ModalBase
        open={open}
        onClose={onClose}
        title="🚚 جابه‌جایی تجهیز بین دکل‌ها"
        size="xl"
        footer={
          <>
            <button className="btn" onClick={onClose}>بستن</button>
            <button className="btn success" onClick={submit}>ثبت جابه‌جایی</button>
          </>
        }
      >
        <div className="mb-form">
          {/* نام / کد / سایز / تعداد / انتخاب */}
          <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr 0.6fr auto" }}>
            <input className="input" placeholder="* نام تجهیز" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="* کد تجهیز" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="input" placeholder="* سایز" value={sizeVal} onChange={(e) => setSizeVal(e.target.value)} />
            <input
              type="number"
              min={1}
              className="input"
              placeholder="* تعداد"
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            />
            <div className="col" style={{ alignItems: "flex-end" }}>
              <button type="button" className="pick-btn" onClick={() => setPickOpen(true)}>
                انتخاب
              </button>
            </div>
          </div>

          {/* مبدا / مقصد دکل */}
          <div className="row">
            <select
              className="input"
              value={fromRig}
              onChange={(e) => {
                setFromRig(e.target.value);
                setName("");
                setCode("");
                setSizeVal("");
              }}
            >
              <option value="">* دکل مبدا</option>
              {rigs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={toRig}
              onChange={(e) => setToRig(e.target.value)}
            >
              <option value="">* دکل مقصد</option>
              {rigs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* تاریخ درخواست / رسید مقصد */}
          <div className="row">
            <DatePicker
              value={requestDateObj}
              onChange={setRequestDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="* تاریخ و ساعت درخواست"
            />
            <DatePicker
              value={arriveDateObj}
              onChange={setArriveDateObj}
              calendar={persian}
              locale={persian_fa}
              format={faFmt}
              plugins={[timePlugin]}
              inputClass="input"
              containerClassName="rmdp-rtl"
              placeholder="تاریخ و ساعت رسیدن به مقصد"
            />
          </div>

          {/* توضیحات و بارنامه */}
          <div className="row">
            <textarea
              className="input"
              placeholder="توضیحات..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          <div className="row">
            <input
              className="input"
              placeholder="شماره بارنامه (اختیاری)"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
            />
          </div>
        </div>
      </ModalBase>

      <ItemPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        catalog={catalog}
        onPick={onPickItem}
      />
    </>
  );
}
