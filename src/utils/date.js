// src/utils/date.js
import ReactDatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePickerPlugin from "react-multi-date-picker/plugins/time_picker";

// قالب نمایشی مشترک
export const faFmt = "YYYY/MM/DD HH:mm";

// تبدیل DateObject (از react-multi-date-picker) به ISO yyyy-mm-ddThh:mm
export const toISO16 = (dObj) => (dObj ? new Date(dObj.toDate()).toISOString().slice(0, 16) : "");

// نمایش تاریخ/ساعت میلادی ذخیره‌شده (ISO) به شمسی-فارسی
export const fmtFa = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(d).replace(",", "");
};

// ری‌اکسپورت‌ها برای یک‌دست‌بودن ایمپورت‌ها
export const DatePicker = ReactDatePicker;
export const TimePicker = TimePickerPlugin;
export { persian, persian_fa };
