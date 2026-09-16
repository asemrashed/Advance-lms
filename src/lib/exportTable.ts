import * as XLSX from "xlsx";

export type ExportRow = (string | number)[];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export a simple table as an .xlsx workbook. */
export function exportRowsToExcel(
  filename: string,
  headers: string[],
  rows: ExportRow[],
  sheetName = "Sheet1",
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const out = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

/** Export a simple table as a paginated PDF via pdf-lib (dynamic import). */
export async function exportRowsToPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: ExportRow[],
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 792; // A4 landscape-ish (points)
  const pageHeight = 612;
  const margin = 40;
  const rowHeight = 20;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / headers.length;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawText = (
    text: string,
    x: number,
    yy: number,
    useBold = false,
    size = 9,
  ) => {
    const clipped = text.length > 28 ? `${text.slice(0, 27)}…` : text;
    page.drawText(clipped, {
      x,
      y: yy,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  page.drawText(title, { x: margin, y, size: 14, font: bold });
  y -= 28;

  const drawHeaderRow = () => {
    headers.forEach((h, i) => drawText(h, margin + i * colWidth, y, true));
    y -= rowHeight;
    page.drawLine({
      start: { x: margin, y: y + 6 },
      end: { x: pageWidth - margin, y: y + 6 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  drawHeaderRow();

  for (const row of rows) {
    if (y < margin + rowHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeaderRow();
    }
    row.forEach((cell, i) =>
      drawText(String(cell ?? ""), margin + i * colWidth, y),
    );
    y -= rowHeight;
  }

  const bytes = await pdf.save();
  triggerDownload(
    new Blob([bytes as unknown as ArrayBuffer], { type: "application/pdf" }),
    filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
  );
}
