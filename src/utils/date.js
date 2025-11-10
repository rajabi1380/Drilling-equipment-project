// src/utils/date.js

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

export const faFmt = "YYYY/MM/DD HH:mm";

export function parseAnyDate(val) {
  if (!val) return null;
  try {
    if (typeof val === "object" && typeof val.toDate === "function") {
      return new Date(val.toDate());
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function toISO16(val) {
  const d = parseAnyDate(val);
  return d ? new Date(d).toISOString().slice(0, 16) : "";
}

export function toISODate(val) {
  const d = parseAnyDate(val);
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function fmtFa(val) {
  const d = parseAnyDate(val);
  if (!d) return "";
  const dobj = new DateObject({ date: d, calendar: persian, locale: persian_fa });
  return dobj.format(faFmt);
}

// فقط خود کامپوننت‌ها؛ هیچ new، هیچ instance سراسری
export { DatePicker, TimePicker, persian, persian_fa };
