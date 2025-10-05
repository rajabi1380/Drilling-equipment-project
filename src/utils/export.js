// CSV / Word export helpers — UTF-8 + BOM برای نمایش صحیح فارسی در Excel

const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadBlob = (filename, mime, data) => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Excel via CSV
export const exportCSV = (filename, headers, rows) => {
  const head = headers.map(csvEscape).join(",") + "\n";
  const body = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")).join("\n");
  const bom = "\uFEFF"; // برای فارسی
  downloadBlob(filename, "text/csv;charset=utf-8", bom + head + body);
};

// Word via HTML table
export const exportDOC = (filename, title, headers, rows) => {
  const headCells = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = rows.map(
    (r) => `<tr>${headers.map((h) => `<td>${r[h] == null ? "" : String(r[h])}</td>`).join("")}</tr>`
  ).join("");

  const html = `
<html>
<head>
<meta charset="utf-8" />
<style>
body{font-family:Tahoma,Arial,sans-serif;direction:rtl}
h3{margin:0 0 10px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;font-size:13px}
thead th{background:#f3f4f6}
</style>
</head>
<body>
<h3>${title}</h3>
<table>
<thead><tr>${headCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body>
</html>`;
  downloadBlob(filename, "application/msword", html);
};
