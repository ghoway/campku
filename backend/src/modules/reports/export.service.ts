import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { Context } from "hono";

export function buildTransactionPdf(rows: any[], title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown();

    doc.fontSize(9).text(`Generated: ${new Date().toISOString()}`, { align: "right" });
    doc.moveDown();

    const headers = ["Code", "Guest", "Property", "Check-in", "Check-out", "Total (Rp)"];
    const tableTop = doc.y;

    const colWidths = [110, 90, 110, 80, 80, 90];
    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, 40 + colWidths.slice(0, i).reduce((a, w) => a + w, 0), tableTop, {
        width: colWidths[i],
      });
    });
    doc.moveDown();
    doc.font("Helvetica");

    for (const row of rows) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const cellTop = doc.y;
      const cells = [
        row.bookingCode ?? "",
        row.guestName ?? "",
        row.property?.name ?? "",
        row.checkIn ? (row.checkIn instanceof Date ? row.checkIn.toISOString().slice(0, 10) : String(row.checkIn).slice(0, 10)) : "",
        row.checkOut ? (row.checkOut instanceof Date ? row.checkOut.toISOString().slice(0, 10) : String(row.checkOut).slice(0, 10)) : "",
        Number(row.grandTotal ?? 0).toLocaleString("id-ID"),
      ];
      cells.forEach((c, i) => {
        doc.text(c, 40 + colWidths.slice(0, i).reduce((a, w) => a + w, 0), cellTop, { width: colWidths[i] });
      });
      doc.moveDown();
    }

    doc.end();
  });
}

export async function buildTransactionExcel(rows: any[], title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.slice(0, 31));

  ws.columns = [
    { header: "Booking Code", key: "code", width: 20 },
    { header: "Guest", key: "guest", width: 25 },
    { header: "Property", key: "property", width: 25 },
    { header: "Check-in", key: "checkIn", width: 15 },
    { header: "Check-out", key: "checkOut", width: 15 },
    { header: "Method", key: "method", width: 15 },
    { header: "Total (Rp)", key: "total", width: 20 },
  ];

  ws.getRow(1).font = { bold: true };

  for (const row of rows) {
    const paymentMethods = row.payments?.map((p: any) => p.method).join(", ") ?? "";
    ws.addRow({
      code: row.bookingCode ?? "",
      guest: row.guestName ?? "",
      property: row.property?.name ?? "",
      checkIn: row.checkIn instanceof Date ? row.checkIn.toISOString().slice(0, 10) : String(row.checkIn ?? "").slice(0, 10),
      checkOut: row.checkOut instanceof Date ? row.checkOut.toISOString().slice(0, 10) : String(row.checkOut ?? "").slice(0, 10),
      method: paymentMethods,
      total: Number(row.grandTotal ?? 0),
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildOccupancyExcel(rows: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Occupancy");

  ws.columns = [
    { header: "Property", key: "propertyName", width: 25 },
    { header: "Total Units", key: "totalUnits", width: 12 },
    { header: "Occupied Unit-Nights", key: "occupiedUnitNights", width: 22 },
    { header: "Available Unit-Nights", key: "availableUnitNights", width: 24 },
    { header: "Occupancy Rate (%)", key: "occupancyRate", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function buildOccupancyPdf(rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("Occupancy Report", { align: "center" });
    doc.moveDown();

    const headers = ["Property", "Total Units", "Occupied", "Available", "Rate (%)"];
    const colWidths = [160, 80, 80, 90, 80];
    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, 40 + colWidths.slice(0, i).reduce((a, w) => a + w, 0), doc.y, { width: colWidths[i] });
    });
    doc.font("Helvetica");
    doc.moveDown();

    for (const r of rows) {
      if (doc.y > 700) doc.addPage();
      const cells = [r.propertyName, String(r.totalUnits), String(r.occupiedUnitNights), String(r.availableUnitNights), String(r.occupancyRate)];
      cells.forEach((c, i) => {
        doc.text(c, 40 + colWidths.slice(0, i).reduce((a, w) => a + w, 0), doc.y, { width: colWidths[i] });
      });
      doc.moveDown();
    }

    doc.end();
  });
}

export function fileResponse(c: Context, buf: Buffer, filename: string, mime: string) {
  c.header("Content-Type", mime);
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Content-Length", String(buf.length));
  return c.body(new Uint8Array(buf));
}