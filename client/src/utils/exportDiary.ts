import * as XLSX from "xlsx";

export interface ExportRow {
  date: string;
  time: string;
  sugar: string;
  trend: string;
  insulin: string;
  meal: string;
}

const HEADER = ["Дата", "Время", "Сахар, ммоль/л", "Тенденция", "Инсулин", "Приём пищи"];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function baseFilename(): string {
  return `дневник_${new Date().toISOString().slice(0, 10)}`;
}

export function exportToExcel(rows: ExportRow[]) {
  const data = rows.map((r) => [
    r.date,
    r.time,
    r.sugar ? Number(r.sugar) : "",
    r.trend,
    r.insulin,
    r.meal,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([HEADER, ...data]);
  ws["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 16 }, { wch: 20 }, { wch: 45 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Дневник");
  XLSX.writeFile(wb, `${baseFilename()}.xlsx`);
}

export function exportToWord(rows: ExportRow[]) {
  const tableRows = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.time)}</td>
        <td style="text-align:center">${escapeHtml(r.sugar)}</td>
        <td>${escapeHtml(r.trend)}</td>
        <td>${escapeHtml(r.insulin)}</td>
        <td>${escapeHtml(r.meal)}</td>
      </tr>`
    )
    .join("\n");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8" />
  <title>Дневник самоконтроля</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; }
    h1 { font-size: 16pt; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; }
    th, td { border: 1px solid #999; padding: 4pt 6pt; text-align: left; vertical-align: top; }
    th { background: #e8f5f0; }
  </style>
</head>
<body>
  <h1>Дневник самоконтроля</h1>
  <p>Выгружено: ${new Date().toLocaleString("ru-RU")}</p>
  <table>
    <thead><tr>${HEADER.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(["﻿" + html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${baseFilename()}.doc`);
}

export function exportToTxt(rows: ExportRow[]) {
  const all = [HEADER, ...rows.map((r) => [r.date, r.time, r.sugar, r.trend, r.insulin, r.meal])];
  const widths = HEADER.map((_, col) => Math.max(...all.map((row) => (row[col] ?? "").length)));
  const lines = all.map((row) => row.map((cell, col) => (cell ?? "").padEnd(widths[col] + 2)).join("").trimEnd());
  lines.splice(1, 0, widths.map((w) => "-".repeat(w + 2)).join("").trimEnd());
  const text = `Дневник самоконтроля (выгружено ${new Date().toLocaleString("ru-RU")})\r\n\r\n${lines.join("\r\n")}\r\n`;
  const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${baseFilename()}.txt`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
