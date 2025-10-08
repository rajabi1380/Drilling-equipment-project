import React from "react";
import ModalBase from "../common/ModalBase";

export default function HistoryModal({ open, onClose, target, history = [] }) {
  return (
    <ModalBase
      open={open}
      onClose={onClose}
      title={`تاریخچه تجهیز: ${target?.name || "—"} (${target?.code || "—"})`}
      size="lg"
      footer={<button className="btn" onClick={onClose}>بستن</button>}
    >
      {history.length === 0 ? (
        <div className="empty" style={{ padding: "12px" }}>سابقه‌ای برای این تجهیز یافت نشد.</div>
      ) : (
        <div className="history-list" style={{ display: "grid", gap: 10 }}>
          {history.map((r) => (
            <div key={r.id} className="history-card" style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
              <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="hc-field"><span>شماره دستورکار:</span> <b>{r.orderNo || "—"}</b></div>
                <div className="hc-field"><span>واحد مقصد:</span> {r.unit || "—"}</div>
                <div className="hc-field"><span>نوع درخواست:</span> {(r.reqType || "").toUpperCase()}</div>
              </div>
              <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div className="hc-field"><span>وضعیت:</span> {r.status || "—"}</div>
                <div className="hc-field"><span>شروع:</span> {r.startISO || "—"}</div>
                <div className="hc-field"><span>پایان:</span> {r.endISO || "—"}</div>
              </div>
              <div className="hc-block" style={{ marginTop: 6 }}>
                <div className="hc-title" style={{ fontWeight: 600, marginBottom: 4 }}>توضیحات</div>
                <div className="muted">{r.desc || "—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalBase>
  );
}
