// src/utils/date.js
import RMDatePicker from "react-multi-date-picker";
import TimePickerPlugin from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export const DatePicker = RMDatePicker;
export const TimePicker = TimePickerPlugin;
export { persian, persian_fa };

export const faFmt = "YYYY/MM/DD HH:mm";

export function toISO16(dObj) {
  return dObj ? new Date(dObj.toDate()).toISOString().slice(0, 16) : "";
}

export function fmtFa(iso) {
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
}
