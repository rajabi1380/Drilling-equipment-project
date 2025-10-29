// src/utils/date.js
import RmdpDatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

// فرمت شمسی + زمان برای ورودی‌ها
export const faFmt = "YYYY/MM/DD HH:mm";

// کمکی: هر ورودی (DateObject | Date | string | number) را به Date معمولی تبدیل می‌کند
export function parseAnyDate(val) {
  if (!val) return null;
  try {
    // اگر DateObject کتابخانه باشد
    if (typeof val === "object" && typeof val.toDate === "function") {
      return new Date(val.toDate());
    }
    // اگر از قبل Date باشد
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    // اگر timestamp یا string باشد
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// تبدیل به ISO دقیقه‌ای (YYYY-MM-DDTHH:mm)
export function toISO16(val) {
  const d = parseAnyDate(val);
  return d ? new Date(d).toISOString().slice(0, 16) : "";
}

// فقط تاریخ (YYYY-MM-DD)
export function toISODate(val) {
  const d = parseAnyDate(val);
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

// فرمت‌کردن رشته/تاریخ به نمایش شمسی
export function fmtFa(val) {
  const d = parseAnyDate(val);
  if (!d) return "";
  const dobj = new DateObject({ date: d, calendar: persian, locale: persian_fa });
  return dobj.format(faFmt);
}

// Re-export ها برای مصرف در صفحات/مدال‌ها
export { RmdpDatePicker as DatePicker, TimePicker, persian, persian_fa };
