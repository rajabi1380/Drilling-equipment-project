// src/utils/notify.js
import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook: useNotify
 * نمایش نوتیف‌های عمومی + هشدار کمبود موجودی چندتایی
 * 🔹 نوتیف هشدار تا زمان رفع همه کمبودها باقی می‌ماند
 */
export function useNotify(defaultTimeout = 3500) {
  const [notify, setNotify] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]); // تجهیزات دارای کمبود
  const timerRef = useRef(null);

  /** 📢 نمایش نوتیف عمومی */
  const show = useCallback(
    (msg, type = "info", persistent = false) => {
      if (notify?.msg === msg && notify?.type === type) return;

      setNotify({ msg, type, persistent });

      // اگر نوتیف ماندگار نیست، بعد از timeout پاک می‌شود
      if (!persistent) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setNotify(null);
          timerRef.current = null;
        }, defaultTimeout);
      }
    },
    [defaultTimeout, notify]
  );

  /** 🧹 پاک کردن نوتیف دستی */
const clear = useCallback(() => {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;

  // اول فقط پیام رو پاک کن
  setNotify(null);

  // بعد از کمی تأخیر، لیست کمبودها رو پاک کن تا re-render ناگهانی نشه
  setTimeout(() => setLowStockItems([]), 250);
}, []);


  /**
   * ⚠️ بررسی تجهیزات با کمبود موجودی
   * @param {Array} items - لیست تجهیزات با فیلد total
   * @param {number} min - حداقل مجاز
   */
const checkLowStock = useCallback(
  (items = [], min = 10) => {
    if (!Array.isArray(items)) return;

    const lows = items.filter((x) => Number(x.total || 0) < min);

    if (lows.length > 0) {
      const msg =
        lows.length === 1
          ? `⚠️ موجودی تجهیز «${lows[0].name}» کمتر از حد مجاز (${min}) است (فعلی: ${lows[0].total})`
          : `⚠️ تعداد ${lows.length} تجهیز دارای موجودی کمتر از حد مجاز (${min}) هستند.`;

      // فقط اگر پیام جدید با قبلی فرق داره، setNotify بزن
      if (notify?.msg !== msg || notify?.type !== "warn") {
        setNotify({ msg, type: "warn", persistent: true });
      }
    } else if (notify?.type === "warn") {
      // اگر قبلاً هشدار بوده ولی حالا رفع شده، پاکش کن
      setNotify(null);
    }
  },
  [notify]
);


  // پاک‌سازی تایمر هنگام خروج از کامپوننت
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    notify,       // وضعیت فعلی نوتیف
    show,         // نمایش پیام عمومی
    clear,        // پاک کردن دستی
    checkLowStock // بررسی تجهیزات دارای کمبود
  };
}
