import RmdpDatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

// فرمت شمسی + زمان برای ورودی‌ها
export const faFmt = "YYYY/MM/DD HH:mm";

// تبدیل DateObject کتابخانه به ISO دقیقه‌ای (YYYY-MM-DDTHH:mm)
export const toISO16 = (dateObj) =>
  dateObj ? new Date(dateObj.toDate()).toISOString().slice(0, 16) : "";

// فرمت‌کردن رشته ISO به نمایش شمسی
export const fmtFa = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dobj = new DateObject({ date: d, calendar: persian, locale: persian_fa });
  return dobj.format(faFmt);
};

// Re-export ها برای مصرف در صفحات
export { RmdpDatePicker as DatePicker, TimePicker, persian, persian_fa };
