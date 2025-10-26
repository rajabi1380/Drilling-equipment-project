// src/Components/InOut.js
import React, { useEffect, useMemo, useState } from "react";
import "./Inout.css";
import { loadLS, saveLS } from "../utils/ls";
import { toISO16 } from "../utils/date";
import { getCatalogForUnit } from "../constants/catalog";
import InModal from "./Modals/InModal";
import OutModal from "./Modals/OutModal";

const LS_KEY = "inventory_v1";

const buildItemStocks = (rows) => {
  const map = new Map();
  for (const r of rows) {
    if (r.type !== "in" && r.type !== "out") continue;
    const key = `${r.name}|${r.code}|${r.size}`;
    map.set(key, (map.get(key) || 0) + (r.type === "in" ? 1 : -1));
  }
  return Array.from(map.entries()).map(([k, qty]) => {
    const [name, code, size] = k.split("|");
    return { name, code, size, qty: Math.max(0, qty) };
  });
};

export default function InOut() {
  const boot = loadLS(LS_KEY, { ioRows: [], thresholds: {} });
  const [ioRows, setIoRows] = useState(boot.ioRows || []);
  const [thresholds, setThresholds] = useState(boot.thresholds || {});
  const [showIn, setShowIn] = useState(false);
  const [showOut, setShowOut] = useState(false);

  useEffect(() => saveLS(LS_KEY, { ioRows, thresholds }), [ioRows, thresholds]);

  const itemStocks = useMemo(() => buildItemStocks(ioRows), [ioRows]);
  const totalStock = useMemo(
    () => itemStocks.reduce((sum, it) => sum + it.qty, 0),
    [itemStocks]
  );

  const lowStockItems = useMemo(() => {
    return itemStocks.filter((it) => {
      const thrKey = `${it.code}|${it.size}`;
      const thr = thresholds[thrKey] ?? 3;
      return it.qty < thr;
    });
  }, [itemStocks, thresholds]);

  const addIn = (payload) => {
    const enter = toISO16(payload.enterDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      { id: Date.now(), type: "in", name: payload.name, code: payload.code, size: payload.size, enterAtISO: enter },
      ...prev,
    ]);
  };

  const addOut = (payload) => {
    const exit = toISO16(payload.exitDateObj) || new Date().toISOString().slice(0, 16);
    setIoRows((prev) => [
      { id: Date.now(), type: "out", name: payload.name, code: payload.code, size: payload.size, exitAtISO: exit },
      ...prev,
    ]);
  };

  return (
    <div className="io-page" dir="rtl">
      <div className="io-card">
        {/* نوتیفیکیشن کمبود موجودی */}
        {lowStockItems.length > 0 && (
          <div className="alert warn" style={{ marginBottom: 10 }}>
            <div className="alert-title">⚠️ هشدار کمبود موجودی</div>
            <ul>
              {lowStockItems.map((x, i) => (
                <li key={i}>
                  {x.name} / {x.code} / سایز {x.size} → موجودی {x.qty}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="btnrow" style={{ marginBottom: 10 }}>
          <button className="btn success" onClick={() => setShowIn(true)}>
            ثبت ورود تجهیز
          </button>
          <button className="btn danger" onClick={() => setShowOut(true)}>
            ثبت خروج تجهیز
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>نام تجهیز</th>
                <th>کد تجهیز</th>
                <th>سایز</th>
                <th>تعداد فعلی</th>
                <th>حداقل مقدار مجاز</th>
              </tr>
            </thead>
            <tbody>
              {itemStocks.length ? (
                itemStocks.map((it, idx) => {
                  const thrKey = `${it.code}|${it.size}`;
                  const thr = thresholds[thrKey] ?? 3;
                  const low = it.qty < thr;
                  return (
                    <tr key={idx} className={low ? "row-low" : ""}>
                      <td>{it.name}</td>
                      <td>{it.code}</td>
                      <td>{it.size}</td>
                      <td>
                        <span className={`qty-badge ${low ? "is-low" : ""}`}>{it.qty}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={thr}
                          onChange={(e) =>
                            setThresholds((t) => ({ ...t, [thrKey]: Number(e.target.value) }))
                          }
                          style={{ width: 60, textAlign: "center" }}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="empty">
                    هنوز هیچ تجهیزی ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="total-stock">📦 موجودی کل انبار: {totalStock} عدد</div>
      </div>

      {/* مودال ورود */}
      {showIn && (
        <InModal
          onClose={() => setShowIn(false)}
          onSubmit={(p) => {
            addIn(p);
            setShowIn(false);
          }}
          catalogProvider={() => getCatalogForUnit("pipe")}
        />
      )}

      {/* مودال خروج */}
      {showOut && (
        <OutModal
          onClose={() => setShowOut(false)}
          onSubmit={(p) => {
            addOut(p);
            setShowOut(false);
          }}
          catalogProvider={() => getCatalogForUnit("pipe")}
        />
      )}
    </div>
  );
}
