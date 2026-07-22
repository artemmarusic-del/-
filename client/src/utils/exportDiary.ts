import * as XLSX from "xlsx";

export interface ExportRow {
  date: string;
  time: string;
  sugar: string;
  trend: string;
  insulin: string;
  meal: string;
}

/** Данные для шапки документа: чей дневник и за какой период. */
export interface ExportMeta {
  profileName?: string;
  periodLabel?: string;
}

const BRAND_GREEN = "#1A7A5B";
const BRAND_DARK = "#0E5B42";

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

/** Подзаголовок документа: чей дневник, за какой период и когда выгружен. */
function subtitle(meta: ExportMeta = {}): string {
  const parts: string[] = [];
  if (meta.profileName) parts.push(`Профиль: ${meta.profileName}`);
  if (meta.periodLabel) parts.push(`Период: ${meta.periodLabel}`);
  parts.push(`Выгружено: ${new Date().toLocaleString("ru-RU")}`);
  return parts.join(" · ");
}

export function exportToWord(rows: ExportRow[], meta: ExportMeta = {}) {
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
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; }
    h1 { font-size: 16pt; color: ${BRAND_DARK}; margin-bottom: 2pt; }
    .sub { color: #6b7280; font-size: 9pt; margin-top: 0; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-top: 10pt; }
    th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; vertical-align: top; }
    th { background: ${BRAND_GREEN}; color: #fff; }
    .note { margin-top: 12pt; font-size: 8pt; color: #6b7280; }
  </style>
</head>
<body>
  <h1>ХЕ.Дневник — дневник самоконтроля</h1>
  <p class="sub">${escapeHtml(subtitle(meta))}</p>
  <table>
    <thead><tr>${HEADER.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="note">Документ сформирован приложением «ХЕ.Дневник». Не является медицинским заключением.</p>
</body>
</html>`;

  const blob = new Blob(["﻿" + html], { type: "application/msword;charset=utf-8" });
  downloadBlob(blob, `${baseFilename()}.doc`);
}

export function exportToTxt(rows: ExportRow[], meta: ExportMeta = {}) {
  const all = [HEADER, ...rows.map((r) => [r.date, r.time, r.sugar, r.trend, r.insulin, r.meal])];
  const widths = HEADER.map((_, col) => Math.max(...all.map((row) => (row[col] ?? "").length)));
  const lines = all.map((row) => row.map((cell, col) => (cell ?? "").padEnd(widths[col] + 2)).join("").trimEnd());
  lines.splice(1, 0, widths.map((w) => "-".repeat(w + 2)).join("").trimEnd());
  const text =
    `ХЕ.Дневник — дневник самоконтроля\r\n${subtitle(meta)}\r\n\r\n` +
    `${lines.join("\r\n")}\r\n`;
  const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${baseFilename()}.txt`);
}

/**
 * Подгружает pdfmake готовыми файлами из /pdf/ вместо импорта через сборщик.
 *
 * Библиотека со встроенным шрифтом весит около 1.9 МБ, и её обработка при
 * сборке съедала слишком много памяти (бесплатный сервер не справлялся).
 * Готовые файлы лежат у нас же на сайте и подключаются только тогда,
 * когда пользователь действительно выбрал PDF.
 */
let pdfMakePromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Не удалось загрузить ${src}`)));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset.loaded = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    document.head.appendChild(el);
  });
}

async function loadPdfMake(): Promise<any> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      // Порядок важен: vfs_fonts сам регистрируется в уже загруженном pdfMake.
      await loadScript("/pdf/pdfmake.min.js");
      await loadScript("/pdf/vfs_fonts.js");
      const pdfMake = (window as any).pdfMake;
      if (!pdfMake) throw new Error("Библиотека PDF не загрузилась");
      pdfMake.fonts = {
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      };
      return pdfMake;
    })().catch((err) => {
      pdfMakePromise = null; // разрешаем повторную попытку
      throw err;
    });
  }
  return pdfMakePromise;
}

/**
 * PDF — формат «для врача»: фирменная шапка, таблица с повторяющимся
 * заголовком на каждой странице, нумерация страниц.
 * Шрифт Roboto из поставки pdfmake содержит кириллицу.
 */
export async function exportToPdf(rows: ExportRow[], meta: ExportMeta = {}) {
  const pdfMake = await loadPdfMake();

  const body = [
    HEADER.map((h) => ({ text: h, bold: true, color: "#FFFFFF", fontSize: 9 })),
    ...rows.map((r) => [
      { text: r.date, fontSize: 9 },
      { text: r.time, fontSize: 9 },
      { text: r.sugar, fontSize: 10, bold: true, alignment: "center" },
      { text: r.trend, fontSize: 9 },
      { text: r.insulin, fontSize: 9 },
      { text: r.meal, fontSize: 8 },
    ]),
  ];

  const doc = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 30, 28, 40] as [number, number, number, number],
    defaultStyle: { font: "Roboto" },
    content: [
      { text: "ХЕ.Дневник — дневник самоконтроля", fontSize: 16, bold: true, color: BRAND_DARK },
      { text: subtitle(meta), fontSize: 9, color: "#6B7280", margin: [0, 2, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto", "auto", "*"],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? BRAND_GREEN : rowIndex % 2 === 0 ? "#F4FAF7" : null,
          hLineColor: () => "#CBD5E1",
          vLineColor: () => "#CBD5E1",
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
      {
        text: "Документ сформирован приложением «ХЕ.Дневник». Не является медицинским заключением.",
        fontSize: 7,
        color: "#9CA3AF",
        margin: [0, 12, 0, 0],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#9CA3AF",
      margin: [0, 12, 0, 0],
    }),
  };

  pdfMake.createPdf(doc).download(`${baseFilename()}.pdf`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
