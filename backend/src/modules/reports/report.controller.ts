import type { Context } from "hono";
import { ReportService } from "./report.service";
import {
  buildTransactionPdf,
  buildTransactionExcel,
  buildOccupancyPdf,
  buildOccupancyExcel,
  fileResponse,
} from "./export.service";
import { ok, okList } from "@/shared/utils/response";
import { BadRequestError } from "@/shared/errors";

const service = new ReportService();

export async function transactions(c: Context) {
  const query = c.req.query();
  const format = query.format;
  const result = await service.transactions(query);

  if (format) {
    const buffer =
      format === "pdf"
        ? await buildTransactionPdf(result.data, "Transaction Report")
        : format === "excel"
          ? await buildTransactionExcel(result.data, "Transaction Report")
          : null;
    if (!buffer) throw new BadRequestError("Unsupported format");
    return fileResponse(
      c,
      buffer,
      `transactions-${Date.now()}.${format === "excel" ? "xlsx" : format}`,
      format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf"
    );
  }

  return okList(c, result.data, result.meta);
}

export async function transactionSummary(c: Context) {
  const data = await service.transactionSummary(c.req.query());
  return ok(c, data);
}

export async function occupancy(c: Context) {
  const query = c.req.query();
  const format = query.format;
  const rows = await service.occupancy(query);

  if (format) {
    const buffer =
      format === "pdf" ? await buildOccupancyPdf(rows) : format === "excel" ? await buildOccupancyExcel(rows) : null;
    if (!buffer) throw new BadRequestError("Unsupported format");
    return fileResponse(
      c,
      buffer,
      `occupancy-${Date.now()}.${format === "excel" ? "xlsx" : format}`,
      format === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf"
    );
  }

  return ok(c, rows);
}

export async function revenueByMonth(c: Context) {
  const year = Number(c.req.query("year")) || new Date().getUTCFullYear();
  const data = await service.revenueByMonth(year);
  return ok(c, data);
}