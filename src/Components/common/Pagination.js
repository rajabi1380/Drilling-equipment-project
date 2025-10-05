import React from "react";
// import "./Pagination.css"; 

export default function Pagination({
  page,
  totalPages,
  onChange,
  dir = "rtl",
  showRange, // {start, end, total} (اختیاری)
}) {
  const goFirst = () => onChange(1);
  const goPrev  = () => onChange(Math.max(1, page - 1));
  const goNext  = () => onChange(Math.min(totalPages, page + 1));
  const goLast  = () => onChange(totalPages);

  return (
    <div className="pagi" dir={dir}>
      <button className="btn" onClick={goFirst} disabled={page === 1}>« اول</button>
      <button className="btn" onClick={goPrev}  disabled={page === 1}>‹ قبلی</button>
      <span className="muted">{page}/{totalPages || 1}</span>
      <button className="btn" onClick={goNext} disabled={page === totalPages || totalPages === 0}>بعدی ›</button>
      <button className="btn" onClick={goLast} disabled={page === totalPages || totalPages === 0}>آخر »</button>
      {showRange && (
        <span className="muted">
          {showRange.total
            ? `${showRange.start}–${showRange.end} از ${showRange.total}`
            : "0 از 0"}
        </span>
      )}
    </div>
  );
}
