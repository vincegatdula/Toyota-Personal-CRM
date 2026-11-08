"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  RotateCcw,
  Upload,
  XCircle,
} from "lucide-react";
import {
  commitWorkbookImportAction,
  previewWorkbookImport,
  type CommitActionResult,
  type PreviewResult,
} from "@/app/actions/import";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/shared/stat-card";
import { formatDateTime, formatNumber, pluralize } from "@/lib/format";
import type { ImportIssue, ImportPreview } from "@/lib/import/types";
import type { CommitResult } from "@/lib/import/types";

function severityTone(severity: ImportIssue["severity"]) {
  if (severity === "error") return "red" as const;
  if (severity === "warning") return "amber" as const;
  return "blue" as const;
}

function IssueIcon({ severity }: { severity: ImportIssue["severity"] }) {
  if (severity === "error") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
  if (severity === "warning")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
  return <Info className="h-3.5 w-3.5 text-blue-600" />;
}

function IssueList({ issues }: { issues: ImportIssue[] }) {
  const [filter, setFilter] = useState<"all" | ImportIssue["severity"]>("all");
  const filtered = filter === "all" ? issues : issues.filter((issue) => issue.severity === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import review</CardTitle>
        <CardDescription>
          Warnings and information explain decisions made while reading the
          workbook. Errors would be skipped on commit.
        </CardDescription>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(["all", "error", "warning", "info"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${
                filter === value
                  ? "border-brand bg-red-50 text-brand"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {value}
              {value === "all"
                ? ` ${issues.length}`
                : ` ${issues.filter((issue) => issue.severity === value).length}`}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] space-y-1.5 overflow-auto pr-1">
          {filtered.length ? (
            filtered.map((issue, index) => (
              <div
                key={`${issue.sheet}-${issue.row}-${index}`}
                className="rounded-lg border border-border p-2"
              >
                <div className="flex items-start gap-2">
                  <IssueIcon severity={issue.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">
                      {issue.record ? `${issue.record} · ` : ""}
                      {issue.sheet}
                      {issue.row ? ` row ${issue.row}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{issue.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Action: {issue.action}
                    </p>
                  </div>
                  <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              No {filter === "all" ? "" : `${filter} `}issues.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewSummary({ preview }: { preview: ImportPreview }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Prospects" value={formatNumber(preview.summary.totalLeads)} hint={`${preview.summary.pipelineLeads} pipeline · ${preview.summary.derivedLeads} derived`} tone="brand" />
        <StatCard label="Financing apps" value={formatNumber(preview.summary.financing)} />
        <StatCard label="Reservations" value={formatNumber(preview.summary.reservations)} />
        <StatCard label="Releases" value={formatNumber(preview.summary.releases)} hint={`${preview.summary.unitsReleased} ${pluralize(preview.summary.unitsReleased, "unit")}`} tone="positive" />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-[11px]">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{preview.filename}</span>
        <span className="text-muted-foreground">
          analyzed {formatDateTime(preview.generatedAt)}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Badge tone="red">{preview.summary.errors} errors</Badge>
          <Badge tone="amber">{preview.summary.warnings} warnings</Badge>
          <Badge tone="blue">{preview.summary.info} info</Badge>
          <Badge tone="neutral">{preview.summary.lostSales} lost sales</Badge>
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prospects to import</CardTitle>
          <CardDescription>
            Derived prospects were created from financing, reservation,
            release, or lost-sale rows that had no pipeline match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[360px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Kind</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.leads.map((lead) => (
                  <TableRow key={lead.legacyKey}>
                    <TableCell className="whitespace-normal">
                      <span className="block text-[12px] font-medium">
                        {lead.prospectName}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {lead.sourceSheet} row {lead.sourceRow}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal text-[11px]">
                      {lead.leadSource ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal text-[11px]">
                      {lead.pipelineStatus}
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal text-[11px]">
                      {lead.preferredModel ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">
                      {lead.dateCreated ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge tone={lead.derived ? "amber" : "green"}>
                        {lead.derived ? "Derived" : "Pipeline"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <IssueList issues={preview.issues} />
    </div>
  );
}

function CommitSummary({
  result,
  filename,
}: {
  result: CommitResult;
  filename: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import complete
        </CardTitle>
        <CardDescription>
          {filename} · batch {result.batchId.slice(0, 8)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Prospects added" value={result.insertedLeads} tone="positive" />
          <StatCard label="Prospects updated" value={result.updatedLeads} />
          <StatCard label="Records added" value={result.insertedRecords} tone="positive" />
          <StatCard label="Skipped" value={result.skippedRecords + result.skippedLeads} hint={`${result.skippedLeads} leads, ${result.skippedRecords} records`} />
        </div>
        {result.errors.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
            {result.errors.length} {pluralize(result.errors.length, "row")} could not be
            committed. See the import batch for details.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/prospects">View prospects</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/import">Import again</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CommitActionResult | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setResult(null);
    setPreviewError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response: PreviewResult = await previewWorkbookImport(formData);
      if (!response.ok || !response.preview) {
        setPreviewError(response.error ?? "Could not analyze the workbook.");
      } else {
        setPreview(response.preview);
      }
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Could not analyze the workbook.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onCommit() {
    if (!preview) return;
    if (
      !window.confirm(
        "Commit this import? Existing matching records will be enriched, not duplicated.",
      )
    ) {
      return;
    }
    setCommitting(true);
    setPreviewError(null);
    try {
      const response = await commitWorkbookImportAction(preview);
      setResult(response);
      if (!response.ok) {
        setPreviewError(response.error ?? "The import could not be completed.");
      }
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "The import could not be completed.",
      );
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setPreviewError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result?.ok && result.result) {
    return (
      <CommitSummary
        result={result.result}
        filename={preview?.filename ?? "Workbook"}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Upload the workbook</CardTitle>
          <CardDescription>
            Select the original{" "}
            <span className="font-medium">Personal Toyota CRM.xlsx</span> file.
            Nothing is written until you review the preview and commit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFile}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-input bg-secondary/40 p-3 text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-[12px] file:text-white"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Maximum 10 MB. The preview is generated in memory and not stored.
            </p>
            <div className="flex items-center gap-1.5">
              {uploading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing workbook…
                </span>
              ) : null}
              {(preview || result) && !uploading ? (
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw /> Start over
                </Button>
              ) : null}
            </div>
          </div>
          {previewError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {previewError}
            </p>
          ) : null}
          {result && !result.ok ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {result.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <>
          <PreviewSummary preview={preview} />
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
            <p className="text-[11px] text-muted-foreground">
              Committing writes {preview.summary.totalLeads} prospects and{" "}
              {preview.summary.financing +
                preview.summary.reservations +
                preview.summary.releases +
                preview.summary.lostSales}{" "}
              related records.
            </p>
            <Button type="button" size="sm" onClick={onCommit} disabled={committing}>
              {committing ? <Loader2 className="animate-spin" /> : <Upload />}
              {committing ? "Committing…" : "Commit import"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
