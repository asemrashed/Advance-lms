import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSiteLogoFilePath, SITE_BRAND_NAME } from "@/lib/siteBranding.server";

export type InvoicePdfData = {
  invoiceNumber: string;
  studentName: string;
  studentPhone?: string;
  itemTitle: string;
  entityLabel: string;
  amountBdt: number;
  paidAt: string;
  transactionId: string;
  platformName?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

function formatBdt(amount: number) {
  return `BDT ${amount.toFixed(2)}`;
}

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

export async function buildInvoicePdfBuffer(data: InvoicePdfData) {
  const platform = data.platformName?.trim() || SITE_BRAND_NAME;
  const paidDate = new Date(data.paidAt).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primary = rgb(0, 0.25, 0.63);
  const muted = rgb(0.39, 0.45, 0.53);
  const border = rgb(0.89, 0.91, 0.94);
  const textColor = rgb(0.07, 0.07, 0.07);

  let y = PAGE_HEIGHT - MARGIN;

  try {
    const logoBytes = fs.readFileSync(getSiteLogoFilePath());
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoHeight = 48;
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    y -= logoHeight + 12;
  } catch {
    page.drawText(platform, {
      x: MARGIN,
      y: y - 20,
      size: 20,
      font: fontBold,
      color: primary,
    });
    y -= 36;
  }

  page.drawText("Payment Receipt", {
    x: MARGIN,
    y: y - 4,
    size: 24,
    font: fontBold,
    color: textColor,
  });

  const meta = [
    { label: "Invoice #", value: data.invoiceNumber },
    { label: "Date", value: paidDate },
    { label: "Txn", value: data.transactionId },
  ];
  let metaY = PAGE_HEIGHT - MARGIN;
  for (const row of meta) {
    const label = `${row.label} `;
    const labelWidth = fontBold.widthOfTextAtSize(label, 11);
    page.drawText(label, {
      x: PAGE_WIDTH - MARGIN - 220,
      y: metaY - 12,
      size: 11,
      font: fontBold,
      color: muted,
    });
    page.drawText(row.value, {
      x: PAGE_WIDTH - MARGIN - 220 + labelWidth,
      y: metaY - 12,
      size: 11,
      font,
      color: muted,
    });
    metaY -= 18;
  }

  y -= 36;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: border,
  });
  y -= 28;

  page.drawText("BILLED TO", {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: muted,
  });
  y -= 18;
  page.drawText(data.studentName, {
    x: MARGIN,
    y,
    size: 14,
    font,
    color: textColor,
  });
  y -= 18;
  if (data.studentPhone) {
    page.drawText(data.studentPhone, {
      x: MARGIN,
      y,
      size: 12,
      font,
      color: muted,
    });
    y -= 18;
  }

  y -= 12;
  const tableTop = y;
  const colDescription = MARGIN;
  const colType = 320;
  const colAmount = PAGE_WIDTH - MARGIN - 90;
  const tableWidth = PAGE_WIDTH - MARGIN * 2;

  page.drawText("DESCRIPTION", {
    x: colDescription,
    y: tableTop,
    size: 10,
    font: fontBold,
    color: muted,
  });
  page.drawText("TYPE", {
    x: colType,
    y: tableTop,
    size: 10,
    font: fontBold,
    color: muted,
  });
  page.drawText("AMOUNT", {
    x: colAmount,
    y: tableTop,
    size: 10,
    font: fontBold,
    color: muted,
  });

  y = tableTop - 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: border,
  });
  y -= 22;

  const descriptionLines = wrapText(data.itemTitle, font, 12, colType - colDescription - 16);
  for (const line of descriptionLines) {
    page.drawText(line, {
      x: colDescription,
      y,
      size: 12,
      font,
      color: textColor,
    });
    y -= 16;
  }

  const rowBottom = tableTop - 30 - (descriptionLines.length - 1) * 16;
  page.drawText(data.entityLabel, {
    x: colType,
    y: rowBottom,
    size: 12,
    font,
    color: textColor,
  });
  page.drawText(formatBdt(data.amountBdt), {
    x: colAmount,
    y: rowBottom,
    size: 12,
    font,
    color: textColor,
  });

  y = rowBottom - 18;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: border,
  });
  y -= 24;

  page.drawText("Total paid", {
    x: colDescription,
    y,
    size: 14,
    font: fontBold,
    color: textColor,
  });
  page.drawText(formatBdt(data.amountBdt), {
    x: colAmount,
    y,
    size: 14,
    font: fontBold,
    color: textColor,
  });

  y -= 40;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: border,
  });
  y -= 24;

  const footer = `This document confirms payment received via SSLCommerz on behalf of ${platform}. Keep it for your records.`;
  for (const line of wrapText(footer, font, 11, tableWidth)) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 11,
      font,
      color: muted,
    });
    y -= 14;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
