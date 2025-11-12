import { useState, useRef, useCallback, useEffect } from "react";

export function useNotify(defaultTimeout = 3500) {
  const [notify, setNotify] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const timerRef = useRef(null);

  const show = useCallback((msg, type = "info", persistent = false) => {
    if (notify?.msg === msg && notify?.type === type) return;
    setNotify({ msg, type, persistent });
    if (!persistent) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setNotify(null);
        timerRef.current = null;
      }, defaultTimeout);
    }
  }, [defaultTimeout, notify]);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setNotify(null);
    setLowStockItems([]); // حالا منطقیه چون واقعا ازش استفاده می‌کنیم
  }, []);

  const checkLowStock = useCallback((items = [], min = 10) => {
    if (!Array.isArray(items)) return;
    const lows = items.filter((x) => Number(x.total || 0) < min);
    setLowStockItems(lows); // ✅ اینجا ست می‌کنیم

    if (lows.length > 0) {
      const msg =
        lows.length === 1
          ? `⚠️ موجودی تجهیز «${lows[0].name}» کمتر از حد مجاز (${min}) است (فعلی: ${lows[0].total})`
          : `⚠️ تعداد ${lows.length} تجهیز دارای موجودی کمتر از حد مجاز (${min}) هستند.`;
      if (notify?.msg !== msg || notify?.type !== "warn") {
        setNotify({ msg, type: "warn", persistent: true });
      }
    } else if (notify?.type === "warn") {
      setNotify(null);
    }
  }, [notify]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { notify, show, clear, checkLowStock, lowStockItems }; // ← برگردان
}
