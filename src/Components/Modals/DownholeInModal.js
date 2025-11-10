// // src/Components/Modals/InModal.jsx
// import React, { useMemo, useState } from "react";
// import ModalBase from "../common/ModalBase";
// import ItemPickerModal from "../common/ItemPickerModal";
// import { DatePicker, TimePicker, persian, persian_fa, faFmt } from "../../utils/date";
// import { getCatalogForUnit } from "../../constants/catalog"; // ← برای فیلتر کاتالوگ بر اساس واحد

// export default function InModal({ open = true, onClose, onSubmit }) {
//   // واحد مقصد
//   const [unitId, setUnitId] = useState("");

//   // فیلدها
//   const [name, setName] = useState("");
//   const [code, setCode] = useState("");
//   const [size, setSize] = useState("");
//   const [enterDateObj, setEnterDateObj] = useState(null);
//   const [status, setStatus] = useState("—");
//   const [fromWhere, setFromWhere] = useState("");
//   const [note, setNote] = useState("");

//   // پیکر انتخاب
//   const [pickOpen, setPickOpen] = useState(false);

//   // کاتالوگ فقط وقتی واحد انتخاب شده باشد
//   const catalog = useMemo(() => (unitId ? getCatalogForUnit(unitId) : []), [unitId]);

//   // اعتبارسنجی
//   const missing = {
//     unit: !unitId,
//     name: !name.trim(),
//     code: !code.trim(),
//     size: !size.trim(),
//   };
//   const hasError = missing.unit || missing.name || missing.code || missing.size;

//   const submit = () => {
//     if (hasError) return;
//     onSubmit({
//       unitId,
//       name,
//       code,
//       size,
//       enterDateObj,
//       status,
//       fromWhere,
//       note,
//     });
//   };

//   // لیست واحدها (طبق خواسته شما)
//   const UNIT_LIST = [
//     { id: "bop",     title: "کنترل فوران" },
//     { id: "surface", title: "ابزار سطحی" },
//     { id: "choke",   title: "شبکه کاهنده" },
//   ];

//   return (
//     <>
//       <ModalBase
//         open={open}
//         onClose={onClose}
//         title="ثبت ورود"
//         size="lg"
//         footer={
//           <>
//             <button className="btn" onClick={onClose}>انصراف</button>
//             <button className="btn success" disabled={hasError} onClick={submit}>ثبت ورود</button>
//           </>
//         }
//       >
//         <div className="mb-form">
//           {/* ردیف ۰: واحد مقصد */}
//           <div className="row">
//             <select
//               className={`input ${missing.unit ? "err is-placeholder" : ""}`}
//               value={unitId}
//               onChange={(e) => {
//                 setUnitId(e.target.value);
//                 // پاک‌سازی فیلدهای وابسته به واحد
//                 setName(""); setCode(""); setSize("");
//               }}
//             >
//               <option value="" disabled>  انتخاب واحد </option>
//               {UNIT_LIST.map(u => (
//                 <option key={u.id} value={u.id}>{u.title}</option>
//               ))}
//             </select>
//             <div className="col" />
//             <div className="col" />
//           </div>
//           {missing.unit && <small className="err-msg">انتخاب واحد  الزامی است</small>}

//           {/* ردیف ۱: نام/کد/سایز + دکمه انتخاب (بعد از سایز) */}
//           <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
//             <div className="col">
//               <input
//                 className={`input ${missing.name ? "err" : ""}`}
//                 placeholder="* نام تجهیز"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 disabled={!unitId}
//               />
//               {missing.name && <small className="err-msg">الزامی</small>}
//             </div>
//             <div className="col">
//               <input
//                 className={`input ${missing.code ? "err" : ""}`}
//                 placeholder="* کد تجهیز"
//                 value={code}
//                 onChange={(e) => setCode(e.target.value)}
//                 disabled={!unitId}
//               />
//               {missing.code && <small className="err-msg">الزامی</small>}
//             </div>
//             <div className="col">
//               <input
//                 className={`input ${missing.size ? "err" : ""}`}
//                 placeholder="* سایز"
//                 value={size}
//                 onChange={(e) => setSize(e.target.value)}
//                 disabled={!unitId}
//               />
//               {missing.size && <small className="err-msg">الزامی</small>}
//             </div>
//             <div className="col" style={{ alignItems: "flex-end" }}>
//               <button
//                 type="button"
//                 className="pick-btn"
//                 onClick={() => setPickOpen(true)}
//                 disabled={!unitId}                 // ← فقط بعد از انتخاب واحد فعال می‌شود
//                 title={unitId ? "انتخاب از کاتالوگ" : "ابتدا واحد مقصد را انتخاب کنید"}
//               >
//                 انتخاب
//               </button>
//               <small style={{ visibility: "hidden" }}>.</small>
//             </div>
//           </div>

//           {/* ردیف ۲: تاریخ/وضعیت/مبدأ */}
//           <div className="row">
//             <DatePicker
//               value={enterDateObj}
//               onChange={setEnterDateObj}
//               calendar={persian}
//               locale={persian_fa}
//               format={faFmt}
//               plugins={[<TimePicker position="bottom" />]}
//               inputClass="input"
//               containerClassName="rmdp-rtl"
//               placeholder="تاریخ و ساعت ورود"
//             />
//             <select
//               className="input"
//               value={status}
//               onChange={(e) => setStatus(e.target.value)}
//             >
//               <option>  نیاز به  تعمیر </option>
//               <option> سالم</option>
//               <option>—</option>
//             </select>
//             <input
//               className="input"
//               placeholder="واحد ارسالی"
//               value={fromWhere}
//               onChange={(e) => setFromWhere(e.target.value)}
//             />
//           </div>

//           {/* توضیحات */}
//           <textarea
//             className="input"
//             placeholder="توضیحات..."
//             value={note}
//             onChange={(e) => setNote(e.target.value)}
//           />
//         </div>
//       </ModalBase>

//       {/* لیست انتخاب تجهیز — بر اساس واحد انتخاب‌شده */}
//       <ItemPickerModal
//         open={pickOpen}
//         onClose={() => setPickOpen(false)}
//         catalog={catalog}                      // ← فقط آیتم‌های همان واحد
//         title={
//           unitId
//             ? `انتخاب تجهیز — ${UNIT_LIST.find(u => u.id === unitId)?.title || ""}`
//             : "انتخاب تجهیز"
//         }
//         onPick={(it) => {
//           const s0 = Array.isArray(it?.sizes) ? (it.sizes[0] || "") : (it?.size || "");
//           if (it?.name) setName(it.name);
//           if (it?.code) setCode(it.code);
//           if (s0) setSize(s0);
//           setPickOpen(false);
//         }}
//       />
//     </>
//   );
// }
