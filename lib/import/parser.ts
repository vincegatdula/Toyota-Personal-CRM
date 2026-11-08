import * as XLSX from "xlsx";
import { toDateOnly } from "@/lib/dates";
import type {
  ImportIssue,
  ParsedFinancing,
  ParsedLead,
  ParsedLostSale,
  ParsedRelease,
  ParsedReservation,
  ReferenceLists,
} from "./types";
import {
  LEAD_SOURCE_FALLBACK,
  TRANSACTION_FALLBACK,
  SALES_CHANNEL_FALLBACK,
  PIPELINE_STATUS_FALLBACK,
  FINANCING_STATUS_FALLBACK,
  LOST_SALE_REASON_FALLBACK,
  LOST_SALE_STAGE_FALLBACK,
  RESERVATION_STATUS_FALLBACK,
  ACTIVITY_TYPE_FALLBACK,
} from "@/lib/constants";

const PIPELINE_SHEET = "Prospect Pipeline";
const FINANCING_SHEET = "Financing Tracker";
const RESERVATIONS_SHEET = "Reservations & Units";
const RELEASES_SHEET = "Release Log";
const LOST_SHEET = "Lost Sale";
const LISTS_SHEET = "Lists & Targets";

const KNOWN_BANKS = [
  "PSBANK",
  "STERLING",
  "RCBC",
  "TFS",
  "BPI",
  "EWB",
  "BOC",
  "PNB",
  "SBC",
  "BDO",
  "CBS",
  "BMI",
  "LDB",
];

type Cell = XLSX.CellObject | undefined;

function cellValue(cell: Cell): string | null {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  const raw = cell.v;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
  }
  return String(raw);
}

function cellActionValue(cell: Cell): string | null {
  const value = cellValue(cell);
  if (!value) return null;
  return ["-", "—", "–", "n/a", "N/A"].includes(value) ? null : value;
}

function cellNumber(cell: Cell): number | null {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  if (typeof cell.v === "number") return Number.isFinite(cell.v) ? cell.v : null;
  const cleaned = String(cell.v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  // Excel's epoch is 1899-12-30 (accounts for the 1900 leap-year bug).
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cellDate(cell: Cell): string | null {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === "") return null;
  const raw = cell.v;
  if (raw instanceof Date) return toDateOnly(raw);
  if (typeof raw === "number") {
    const d = excelSerialToDate(raw);
    return d ? toDateOnly(d) : null;
  }
  const text = String(raw).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return toDateOnly(text.slice(0, 10));
  const direct = toDateOnly(text);
  if (direct) return direct;
  // Handles "Oct 20", "Oct 20, 2026" etc. (defaults to 2026 when no year)
  const withYear = /,\s*\d{4}/.test(text) ? text : `${text}, 2026`;
  return toDateOnly(withYear);
}

function extractModelCell(cell: Cell): string | null {
  if (!cell) return null;
  if (cell.f) {
    const matches = String(cell.f).match(/"([^"]*)"\s*\)\s*$/);
    if (matches?.[1] && matches[1].trim()) return matches[1].trim();
  }
  return cellValue(cell);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferBank(text: string | null): string | null {
  if (!text) return null;
  const upper = text.toUpperCase();
  for (const bank of KNOWN_BANKS) {
    const re = new RegExp(`(^|[^A-Z0-9])${bank}([^A-Z0-9]|$)`);
    if (re.test(upper)) return bank;
  }
  return null;
}

function readLists(wb: XLSX.WorkBook): ReferenceLists {
  const sheet = wb.Sheets[LISTS_SHEET];
  const fallback: ReferenceLists = {
    leadSources: LEAD_SOURCE_FALLBACK,
    transactions: TRANSACTION_FALLBACK,
    pipelineStatuses: PIPELINE_STATUS_FALLBACK,
    salesChannels: SALES_CHANNEL_FALLBACK,
    financingStatuses: FINANCING_STATUS_FALLBACK,
    lostSaleReasons: LOST_SALE_REASON_FALLBACK,
    lostSaleStages: LOST_SALE_STAGE_FALLBACK,
    reservationStatuses: RESERVATION_STATUS_FALLBACK,
    activityTypes: ACTIVITY_TYPE_FALLBACK,
    recoveryStatuses: ["Open", "Recovered", "Closed"],
    banks: [],
    vehicleModels: [],
  };
  if (!sheet) return fallback;

  const readColumn = (col: string, from: number, to: number) => {
    const out: string[] = [];
    for (let row = from; row <= to; row += 1) {
      const cell = sheet[`${col}${row}`] as Cell;
      const value = cellValue(cell);
      if (value && value !== "-") out.push(value);
    }
    return out;
  };

  const models: string[] = [];
  for (let row = 40; row <= 206; row += 1) {
    const cell = sheet[`B${row}`] as Cell;
    const value = extractModelCell(cell);
    if (value) models.push(value);
  }

  return {
    leadSources: readColumn("B", 7, 14).length
      ? readColumn("B", 7, 14)
      : fallback.leadSources,
    transactions: readColumn("C", 7, 10).length
      ? readColumn("C", 7, 10)
      : fallback.transactions,
    banks: readColumn("D", 7, 19),
    pipelineStatuses: readColumn("E", 7, 20).length
      ? readColumn("E", 7, 20)
      : fallback.pipelineStatuses,
    salesChannels: readColumn("F", 7, 12).length
      ? readColumn("F", 7, 12)
      : fallback.salesChannels,
    financingStatuses: readColumn("G", 7, 14).length
      ? readColumn("G", 7, 14)
      : fallback.financingStatuses,
    lostSaleReasons: readColumn("H", 7, 20).length
      ? readColumn("H", 7, 20)
      : fallback.lostSaleReasons,
    lostSaleStages: readColumn("I", 7, 16).length
      ? readColumn("I", 7, 16)
      : fallback.lostSaleStages,
    reservationStatuses: RESERVATION_STATUS_FALLBACK,
    activityTypes: ACTIVITY_TYPE_FALLBACK,
    recoveryStatuses: ["Open", "Recovered", "Closed"],
    vehicleModels: models,
  };
}

export interface RawWorkbook {
  filename: string;
  leads: ParsedLead[];
  financing: ParsedFinancing[];
  reservations: ParsedReservation[];
  releases: ParsedRelease[];
  lostSales: ParsedLostSale[];
  reference: ReferenceLists;
  issues: ImportIssue[];
}

export function parseWorkbook(
  buffer: Buffer | ArrayBuffer,
  filename = "Personal Toyota CRM.xlsx",
): RawWorkbook {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const wb = XLSX.read(data, {
    type: buffer instanceof ArrayBuffer ? "array" : "buffer",
    cellDates: true,
    cellFormula: true,
  });

  const issues: ImportIssue[] = [];
  const leads: ParsedLead[] = [];
  const financing: ParsedFinancing[] = [];
  const reservations: ParsedReservation[] = [];
  const releases: ParsedRelease[] = [];
  const lostSales: ParsedLostSale[] = [];
  const reference = readLists(wb);

  const channels = new Set(reference.salesChannels.map((c) => c.toLowerCase()));

  // --------------------------------------------------------------------------
  // Prospect Pipeline
  // --------------------------------------------------------------------------
  const pipeline = wb.Sheets[PIPELINE_SHEET];
  if (!pipeline) {
    issues.push({
      severity: "error",
      sheet: PIPELINE_SHEET,
      row: null,
      message: `Worksheet "${PIPELINE_SHEET}" was not found.`,
      action: "Confirm the workbook is the original Personal Toyota CRM file.",
    });
  } else {
    for (let row = 7; row <= 160; row += 1) {
      const name = cellValue(pipeline[`D${row}`] as Cell);
      if (!name) continue;
      const rawTransaction = cellValue(pipeline[`F${row}`] as Cell);
      const lead: ParsedLead = {
        legacyKey: `pipeline:${row}`,
        dateCreated: cellDate(pipeline[`B${row}`] as Cell),
        leadSource: cellValue(pipeline[`C${row}`] as Cell),
        prospectName: name,
        preferredModel: cellValue(pipeline[`E${row}`] as Cell),
        transaction: rawTransaction,
        salesChannel:
          rawTransaction && channels.has(rawTransaction.toLowerCase())
            ? rawTransaction
            : null,
        purchaseTimeline: cellDate(pipeline[`G${row}`] as Cell),
        pipelineStatus:
          cellValue(pipeline[`H${row}`] as Cell) || "New Prospect",
        lastContactDate: cellDate(pipeline[`I${row}`] as Cell),
        nextAction: cellActionValue(pipeline[`J${row}`] as Cell),
        nextActionDueDate: cellDate(pipeline[`K${row}`] as Cell),
        contactNumber: null,
        email: null,
        location: null,
        remarks: null,
        sourceSheet: PIPELINE_SHEET,
        sourceRow: row,
        derived: false,
      };
      if (!lead.dateCreated) {
        issues.push({
          severity: "warning",
          sheet: PIPELINE_SHEET,
          row,
          message: `Prospect "${name}" has no readable Date Created.`,
          action: "Imported with the workbook date fallback; review after import.",
          record: name,
        });
      }
      if (rawTransaction && !reference.transactions.includes(rawTransaction)) {
        issues.push({
          severity: "info",
          sheet: PIPELINE_SHEET,
          row,
          message: `Transaction "${rawTransaction}" is a sales-channel value in the workbook, not one of the four transaction types.`,
          action:
            "Preserved verbatim in the lead transaction field and also captured as the sales channel.",
          record: name,
        });
      }
      leads.push(lead);
    }
  }

  // --------------------------------------------------------------------------
  // Financing Tracker
  // --------------------------------------------------------------------------
  const finSheet = wb.Sheets[FINANCING_SHEET];
  if (!finSheet) {
    issues.push({
      severity: "error",
      sheet: FINANCING_SHEET,
      row: null,
      message: `Worksheet "${FINANCING_SHEET}" was not found.`,
      action: "Confirm the workbook is the original file.",
    });
  } else {
    for (let row = 7; row <= 50; row += 1) {
      const name = cellValue(finSheet[`D${row}`] as Cell);
      if (!name) continue;
      const remarks = cellValue(finSheet[`J${row}`] as Cell);
      const inferredBank = inferBank(remarks);
      const approvedDp = cellNumber(finSheet[`H${row}`] as Cell);
      if (inferredBank) {
        issues.push({
          severity: "info",
          sheet: FINANCING_SHEET,
          row,
          message: `Bank "${inferredBank}" inferred for ${name} from the remarks column.`,
          action: "Review the financing bank after import.",
          record: name,
        });
      }
      financing.push({
        legacyKey: `financing:${row}`,
        leadKey: "",
        prospectName: name,
        dateSubmitted: cellDate(finSheet[`B${row}`] as Cell),
        leadSource: cellValue(finSheet[`C${row}`] as Cell),
        preferredModel: cellValue(finSheet[`E${row}`] as Cell),
        bank: inferredBank,
        applicationStatus:
          cellValue(finSheet[`F${row}`] as Cell) || "Application submitted",
        dateApproval: cellDate(finSheet[`G${row}`] as Cell),
        approvedDp,
        dateReleased: cellDate(finSheet[`I${row}`] as Cell),
        remarks,
        sourceRow: row,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Reservations & Units
  // --------------------------------------------------------------------------
  const resSheet = wb.Sheets[RESERVATIONS_SHEET];
  if (!resSheet) {
    issues.push({
      severity: "error",
      sheet: RESERVATIONS_SHEET,
      row: null,
      message: `Worksheet "${RESERVATIONS_SHEET}" was not found.`,
      action: "Confirm the workbook is the original file.",
    });
  } else {
    for (let row = 7; row <= 50; row += 1) {
      const name = cellValue(resSheet[`E${row}`] as Cell);
      if (!name) continue;
      reservations.push({
        legacyKey: `reservation:${row}`,
        leadKey: "",
        prospectName: name,
        reservationDate: cellDate(resSheet[`B${row}`] as Cell),
        reservedModel: cellValue(resSheet[`F${row}`] as Cell),
        salesChannel: cellValue(resSheet[`G${row}`] as Cell),
        currentStatus:
          cellValue(resSheet[`H${row}`] as Cell) || "Reserved",
        expectedReleaseDate: cellDate(resSheet[`I${row}`] as Cell),
        lastCustomerUpdate: cellValue(resSheet[`J${row}`] as Cell),
        nextAction: cellActionValue(resSheet[`K${row}`] as Cell),
        remarks: null,
        sourceRow: row,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Release Log
  // --------------------------------------------------------------------------
  const relSheet = wb.Sheets[RELEASES_SHEET];
  if (!relSheet) {
    issues.push({
      severity: "error",
      sheet: RELEASES_SHEET,
      row: null,
      message: `Worksheet "${RELEASES_SHEET}" was not found.`,
      action: "Confirm the workbook is the original file.",
    });
  } else {
    for (let row = 7; row <= 50; row += 1) {
      const name = cellValue(relSheet[`C${row}`] as Cell);
      if (!name) continue;
      const releaseDate = cellDate(relSheet[`B${row}`] as Cell);
      if (!releaseDate) {
        issues.push({
          severity: "error",
          sheet: RELEASES_SHEET,
          row,
          message: `Release for "${name}" has no readable release date.`,
          action: "Skipped this release row. Fix the date in Excel and re-import.",
          record: name,
        });
        continue;
      }
      const units = cellNumber(relSheet[`G${row}`] as Cell);
      releases.push({
        legacyKey: `release:${row}`,
        leadKey: "",
        prospectName: name,
        releaseDate,
        leadSource: cellValue(relSheet[`D${row}`] as Cell),
        transaction: cellValue(relSheet[`E${row}`] as Cell),
        modelReleased: cellValue(relSheet[`F${row}`] as Cell),
        unitsReleased: units && units > 0 ? Math.floor(units) : 1,
        bank: cellValue(relSheet[`H${row}`] as Cell),
        remarks: cellValue(relSheet[`I${row}`] as Cell),
        sourceRow: row,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Lost Sale
  // --------------------------------------------------------------------------
  const lostSheet = wb.Sheets[LOST_SHEET];
  if (!lostSheet) {
    issues.push({
      severity: "error",
      sheet: LOST_SHEET,
      row: null,
      message: `Worksheet "${LOST_SHEET}" was not found.`,
      action: "Confirm the workbook is the original file.",
    });
  } else {
    for (let row = 7; row <= 50; row += 1) {
      const name = cellValue(lostSheet[`D${row}`] as Cell);
      if (!name) continue;
      const dateMarkedLost = cellDate(lostSheet[`B${row}`] as Cell);
      if (!dateMarkedLost) {
        issues.push({
          severity: "error",
          sheet: LOST_SHEET,
          row,
          message: `Lost sale for "${name}" has no readable date marked lost.`,
          action: "Skipped this lost-sale row. Fix the date and re-import.",
          record: name,
        });
        continue;
      }
      const recoverableRaw = (cellValue(lostSheet[`K${row}`] as Cell) || "")
        .toUpperCase()
        .trim();
      const units = cellNumber(lostSheet[`J${row}`] as Cell);
      lostSales.push({
        legacyKey: `lost:${row}`,
        leadKey: "",
        prospectName: name,
        dateMarkedLost,
        leadSource: cellValue(lostSheet[`C${row}`] as Cell),
        preferredModel: cellValue(lostSheet[`E${row}`] as Cell),
        pipelineStageWhenLost: cellValue(lostSheet[`F${row}`] as Cell),
        primaryLossReason: cellValue(lostSheet[`G${row}`] as Cell),
        competitorAlternative: cellValue(lostSheet[`H${row}`] as Cell),
        financingPaymentIssue: cellValue(lostSheet[`I${row}`] as Cell),
        estimatedUnitsLost: units && units >= 0 ? units : 1,
        recoverable: ["Y", "YES", "TRUE"].includes(recoverableRaw),
        recoveryNextAction: cellValue(lostSheet[`L${row}`] as Cell),
        coachingNotes: cellValue(lostSheet[`M${row}`] as Cell),
        sourceRow: row,
      });
    }
  }

  // Basic duplicate detection within the pipeline itself.
  const seen = new Map<string, ParsedLead>();
  for (const lead of leads) {
    const key = lead.prospectName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const existing = seen.get(key);
    if (existing) {
      issues.push({
        severity: "warning",
        sheet: PIPELINE_SHEET,
        row: lead.sourceRow,
        message: `Duplicate prospect name "${lead.prospectName}" also appears on row ${existing.sourceRow}.`,
        action:
          "Both rows are imported; related records will link to the first occurrence. Merge duplicates manually if needed.",
        record: lead.prospectName,
      });
    } else {
      seen.set(key, lead);
    }
  }

  return {
    filename,
    leads,
    financing,
    reservations,
    releases,
    lostSales,
    reference,
    issues,
  };
}

export function makeDerivedLead(
  name: string,
  options: {
    leadSource?: string | null;
    preferredModel?: string | null;
    pipelineStatus?: string;
    dateCreated?: string | null;
    sourceSheet: string;
    sourceRow: number;
    reason: string;
  },
): ParsedLead {
  return {
    legacyKey: `derived:${options.sourceSheet}:${options.sourceRow}:${slug(name)}`,
    dateCreated: options.dateCreated || null,
    leadSource: options.leadSource || null,
    prospectName: name,
    preferredModel: options.preferredModel || null,
    transaction: null,
    salesChannel: null,
    purchaseTimeline: null,
    pipelineStatus: options.pipelineStatus || "New Prospect",
    lastContactDate: null,
    nextAction: null,
    nextActionDueDate: null,
    contactNumber: null,
    email: null,
    location: null,
    remarks: options.reason,
    sourceSheet: options.sourceSheet,
    sourceRow: options.sourceRow,
    derived: true,
    matchConfidence: null,
  };
}
