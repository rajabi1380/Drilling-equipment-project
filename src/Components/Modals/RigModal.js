// File: src/Components/Modals/RigModal.js

import React, { useState, useMemo } from "react";
import ModalBase from "../common/ModalBase";
import { loadLS } from "../../utils/ls";
import { keyOf, splitKey } from "../../utils/Key";

const LS_RIG_INV = "rig_inventory_v1";

function loadRigInventory() {
  try {
    const raw = localStorage.getItem(LS_RIG_INV);
    return raw ? JSON.parse(raw) : { rigs: {} };
  } catch {
    return { rigs: {} };
  }
}

export default function RigModal({ open, onClose, onSubmit, rigs = [], catalogProvider }) {
  const [fromRig, setFromRig] = useState("");
  const [toRig, setToRig] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [note, setNote] = useState("");

  const rigInv = useMemo(() => loadRigInventory(), []);
  const fromList = useMemo(() => rigs || [], [rigs]);
  const toList = useMemo(() => rigs || [], [rigs]);

  const itemsFromRig = useMemo(() => {
    if (!fromRig || !rigInv?.rigs?.[fromRig]) return [];
    const map = rigInv.rigs[fromRig];
    return Object.entries(map)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => ({ ...splitKey(key), qty }));
  }, [fromRig, rigInv]);

  const onAddItem = (item) => {
    const exists = selectedItems.find(
      (i) => keyOf(i.name, i.code, i.size) === keyOf(item.name, item.code, item.size)
    );
    if (!exists) setSelectedItems((prev) => [...prev, { ...item, qty: 1 }]);
  };

  const onQtyChange = (index, value) => {
    const next = [...selectedItems];
    next[index].qty = Math.max(1, Number(value));
    setSelectedItems(next);
  };

  const removeItem = (index) => {
    const next = [...selectedItems];
    next.splice(index, 1);
    setSelectedItems(next);
  };

  const submit = () => {
    if (!fromRig || !toRig || fromRig === toRig || selectedItems.length === 0) {
      alert("لطفاً دکل مبدا، مقصد و اقلام را مشخص کنید.");
      return;
    }

    onSubmit({
      fromRig,
      toRig,
      note,
      items: selectedItems,
      date: new Date().toISOString(),
    });
  };

  return (
    <ModalBase
      open={open}
      onClose={onClose}
      title="📦 انتقال تجهیز بین دکل‌ها"
      size="xl"
      footer={
        <>
          <button className="btn" onClick={onClose}>بستن</button>
          <button className="btn success" onClick={submit}>ثبت انتقال</button>
        </>
      }
    >
      <div className="mb-form">
        <div className="row">
          <select className="input" value={fromRig} onChange={(e) => { setFromRig(e.target.value); setSelectedItems([]); }}>
            <option value="">دکل مبدا</option>
            {fromList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input" value={toRig} onChange={(e) => setToRig(e.target.value)}>
            <option value="">دکل مقصد</option>
            {toList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* نمایش موجودی دکل مبدا */}
        {itemsFromRig.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>کد</th>
                  <th>سایز</th>
                  <th>موجودی</th>
                  <th>انتخاب</th>
                </tr>
              </thead>
              <tbody>
                {itemsFromRig.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.code}</td>
                    <td>{item.size}</td>
                    <td>{item.qty}</td>
                    <td>
                      <button className="btn sm" onClick={() => onAddItem(item)}>+</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* لیست اقلام انتخاب‌شده */}
        {selectedItems.length > 0 && (
          <>
            <h4>📝 لیست اقلام انتخاب‌شده:</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>نام</th>
                    <th>کد</th>
                    <th>سایز</th>
                    <th>تعداد</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.code}</td>
                      <td>{item.size}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => onQtyChange(i, e.target.value)}
                          className="input sm"
                        />
                      </td>
                      <td>
                        <button className="btn danger sm" onClick={() => removeItem(i)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <textarea
          className="input"
          placeholder="توضیحات انتقال..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </ModalBase>
  );
}
