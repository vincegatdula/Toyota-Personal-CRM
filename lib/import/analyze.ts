import { makeDerivedLead, parseWorkbook, type RawWorkbook } from "./parser";
import type {
  ImportIssue,
  ImportPreview,
  ParsedLead,
} from "./types";

const SUFFIXES = new Set([
  "jr",
  "sr",
  "ii",
  "iii",
  "iv",
  "mr",
  "mrs",
  "ms",
  "dr",
  "engr",
]);

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameTokens(value: string) {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token && !SUFFIXES.has(token));
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prevDiag = temp;
    }
  }
  return prev[b.length];
}

export function nameSimilarity(a: string, b: string) {
  const tokensA = nameTokens(a);
  const tokensB = nameTokens(b);
  if (!tokensA.length || !tokensB.length) return 0;
  const joinedA = tokensA.join(" ");
  const joinedB = tokensB.join(" ");
  if (joinedA === joinedB) return 1;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const minLen = Math.min(setA.size, setB.size);
  const maxLen = Math.max(setA.size, setB.size);
  const jaccard = intersection / (setA.size + setB.size - intersection);

  let containment = 0;
  if (intersection === minLen && minLen >= 2) {
    containment = 0.8 + 0.19 * (intersection / maxLen);
  }

  const sortedA = [...setA].sort().join(" ");
  const sortedB = [...setB].sort().join(" ");
  const lev =
    1 - levenshtein(sortedA, sortedB) / Math.max(sortedA.length, sortedB.length || 1);

  return Math.max(jaccard * 0.9, containment, lev * 0.95);
}

function modelCore(value: string | null | undefined) {
  return (value || "")
    .toUpperCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bPC\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushModelIssue(
  issues: ImportIssue[],
  args: {
    sheet: string;
    row: number;
    name: string;
    leadModel: string | null;
    recordModel: string | null;
    recordLabel: string;
  },
) {
  const { leadModel, recordModel } = args;
  if (!leadModel || !recordModel) return;
  if (leadModel.trim().toUpperCase() === recordModel.trim().toUpperCase()) return;
  if (modelCore(leadModel) === modelCore(recordModel)) {
    issues.push({
      severity: "info",
      sheet: args.sheet,
      row: args.row,
      message: `${args.recordLabel} model "${recordModel}" differs from the lead's preferred model "${leadModel}" only by package notation.`,
      action:
        "Kept the exact model string from each worksheet, as required by the migration rules.",
      record: args.name,
    });
    return;
  }
  issues.push({
    severity: "warning",
    sheet: args.sheet,
    row: args.row,
    message: `${args.recordLabel} model "${recordModel}" does not match the lead's preferred model "${leadModel}".`,
    action:
      "Linked to the matched lead and preserved both model strings. Review whether this is a legitimate model change or a data-entry variance.",
    record: args.name,
  });
}

interface Candidate {
  lead: ParsedLead;
  tokens: string[];
}

function bestMatch(
  candidates: Candidate[],
  name: string,
): { lead: ParsedLead; score: number; ambiguous: boolean } | null {
  const scored = candidates
    .map((candidate) => ({
      lead: candidate.lead,
      score: nameSimilarity(name, candidate.lead.prospectName),
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  const top = scored[0];
  if (top.score < 0.9) return null;
  const second = scored[1];
  const ambiguous = Boolean(second && top.score - second.score < 0.04);
  return { lead: top.lead, score: top.score, ambiguous };
}

export function analyzeWorkbook(
  buffer: Buffer | ArrayBuffer,
  filename?: string,
): ImportPreview {
  const raw: RawWorkbook = parseWorkbook(buffer, filename);
  const issues: ImportIssue[] = [...raw.issues];
  const leads: ParsedLead[] = [...raw.leads];
  const candidates: Candidate[] = leads.map((lead) => ({
    lead,
    tokens: nameTokens(lead.prospectName),
  }));

  const derivedByKey = new Map<string, ParsedLead>();

  function resolveLead(args: {
    name: string;
    sheet: string;
    row: number;
    leadSource?: string | null;
    preferredModel?: string | null;
    fallbackStatus: string;
    fallbackDate?: string | null;
    recordLabel: string;
  }): string {
    const match = bestMatch(candidates, args.name);
    if (match && !match.ambiguous) {
      if (match.score < 1) {
        issues.push({
          severity: "info",
          sheet: args.sheet,
          row: args.row,
          message: `${args.recordLabel} "${args.name}" matched prospect "${match.lead.prospectName}" (${Math.round(match.score * 100)}% name similarity).`,
          action:
            "Linked automatically. Confirm this is the same customer in the prospect profile.",
          record: args.name,
        });
      }
      pushModelIssue(issues, {
        sheet: args.sheet,
        row: args.row,
        name: args.name,
        leadModel: match.lead.preferredModel,
        recordModel: args.preferredModel ?? null,
        recordLabel: args.recordLabel,
      });
      return match.lead.legacyKey;
    }

    if (match?.ambiguous) {
      issues.push({
        severity: "warning",
        sheet: args.sheet,
        row: args.row,
        message: `${args.recordLabel} "${args.name}" is ambiguous: more than one prospect matched closely.`,
        action:
          "Imported as a new prospect so no customer is linked incorrectly. Review and merge manually if needed.",
        record: args.name,
      });
    }

    const normalized = normalizeName(args.name);
    const derivedKey = `derived:${normalized}`;
    const existingDerived = derivedByKey.get(derivedKey);
    if (existingDerived) return existingDerived.legacyKey;

    const derived = makeDerivedLead(args.name, {
      leadSource: args.leadSource,
      preferredModel: args.preferredModel,
      pipelineStatus: args.fallbackStatus,
      dateCreated: args.fallbackDate,
      sourceSheet: args.sheet,
      sourceRow: args.row,
      reason: `Auto-created during migration from ${args.sheet} row ${args.row} because no prospect record matched confidently.`,
    });
    derived.legacyKey = derivedKey;
    derivedByKey.set(derivedKey, derived);
    leads.push(derived);
    candidates.push({ lead: derived, tokens: nameTokens(derived.prospectName) });

    if (!match) {
      issues.push({
        severity: "warning",
        sheet: args.sheet,
        row: args.row,
        message: `${args.recordLabel} "${args.name}" has no matching prospect in the Prospect Pipeline.`,
        action:
          "Created a new prospect record from this row and linked the record to it, so no history is lost.",
        record: args.name,
      });
    }
    return derived.legacyKey;
  }

  // Financing
  for (const record of raw.financing) {
    record.leadKey = resolveLead({
      name: record.prospectName,
      sheet: "Financing Tracker",
      row: record.sourceRow,
      leadSource: record.leadSource,
      preferredModel: record.preferredModel,
      fallbackStatus:
        record.applicationStatus === "Released"
          ? "Vehicle Released"
          : record.applicationStatus === "Approved"
            ? "Approved"
            : "Application Submitted",
      fallbackDate: record.dateSubmitted,
      recordLabel: "Financing application for",
    });
  }

  // Reservations
  for (const record of raw.reservations) {
    const status =
      record.currentStatus === "Released"
        ? "Vehicle Released"
        : record.currentStatus === "Cancelled"
          ? "Declined/Withdrawn"
          : record.currentStatus === "Pending Unit"
            ? "Pending Unit"
            : "Reserved";
    record.leadKey = resolveLead({
      name: record.prospectName,
      sheet: "Reservations & Units",
      row: record.sourceRow,
      leadSource: null,
      preferredModel: record.reservedModel,
      fallbackStatus: status,
      fallbackDate: record.reservationDate,
      recordLabel: "Reservation for",
    });
  }

  // Releases
  const releaseKeys = new Set<string>();
  for (const record of raw.releases) {
    record.leadKey = resolveLead({
      name: record.prospectName,
      sheet: "Release Log",
      row: record.sourceRow,
      leadSource: record.leadSource,
      preferredModel: record.modelReleased,
      fallbackStatus: "Vehicle Released",
      fallbackDate: record.releaseDate,
      recordLabel: "Vehicle release for",
    });
    const dupKey = `${record.leadKey}|${record.releaseDate}|${(record.modelReleased || "").toUpperCase()}`;
    if (releaseKeys.has(dupKey)) {
      issues.push({
        severity: "error",
        sheet: "Release Log",
        row: record.sourceRow,
        message: `Duplicate release entry for "${record.prospectName}" on ${record.releaseDate} for ${record.modelReleased}.`,
        action:
          "The app will skip the duplicate release to prevent double-counting sales.",
        record: record.prospectName,
      });
    }
    releaseKeys.add(dupKey);
  }

  // Lost sales
  for (const record of raw.lostSales) {
    record.leadKey = resolveLead({
      name: record.prospectName,
      sheet: "Lost Sale",
      row: record.sourceRow,
      leadSource: record.leadSource,
      preferredModel: record.preferredModel,
      fallbackStatus: "Lost",
      fallbackDate: record.dateMarkedLost,
      recordLabel: "Lost sale for",
    });
  }

  const unitsReleased = raw.releases.reduce(
    (sum, record) => sum + record.unitsReleased,
    0,
  );
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  const severityOrder = { error: 0, warning: 1, info: 2 };
  issues.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.sheet.localeCompare(b.sheet) ||
      (a.row ?? 0) - (b.row ?? 0),
  );

  return {
    filename: raw.filename,
    generatedAt: new Date().toISOString(),
    leads,
    financing: raw.financing,
    reservations: raw.reservations,
    releases: raw.releases,
    lostSales: raw.lostSales,
    reference: raw.reference,
    issues,
    summary: {
      pipelineLeads: raw.leads.length,
      derivedLeads: leads.length - raw.leads.length,
      totalLeads: leads.length,
      financing: raw.financing.length,
      reservations: raw.reservations.length,
      releases: raw.releases.length,
      lostSales: raw.lostSales.length,
      unitsReleased,
      errors,
      warnings,
      info,
    },
  };
}

