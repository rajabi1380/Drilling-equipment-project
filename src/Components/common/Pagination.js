// src/Components/common/Pagination.js
import React from "react";

export default function Pagination({
  page,
  totalPages,
  onChange,          // API قدیمی: صفحهٔ مقصد
  onFirst, onPrev, onNext, onLast, // API جدید: هندلرهای جدا
  dir = "rtl",
  showRange,        // {start, end, total}
}) {
  const goFirst = () => onFirst ? onFirst() : onChange?.(1);
  const goPrev  = () => onPrev  ? onPrev()  : onChange?.(Math.max(1, page - 1));
  const goNext  = () => onNext  ? onNext()  : onChange?.(Math.min(totalPages || 1, page + 1));
  const goLast  = () => onLast  ? onLast()  : onChange?.(totalPages || 1);

  return (
    <div className="pagi" dir={dir}>
      <button className="btn" onClick={goFirst} disabled={page === 1}>« اول</button>
      <button className="btn" onClick={goPrev}  disabled={page === 1}>‹ قبلی</button>
      <span className="muted">{page}/{totalPages || 1}</span>
      <button className="btn" onClick={goNext} disabled={page === totalPages || (totalPages || 1) === 1}>بعدی ›</button>
      <button className="btn" onClick={goLast} disabled={page === totalPages || (totalPages || 1) === 1}>آخر »</button>
      {showRange && (
        <span className="muted">
          {showRange.total ? `${showRange.start}–${showRange.end} از ${showRange.total}` : "0 از 0"}
        </span>
      )}
    </div>
  );
}
