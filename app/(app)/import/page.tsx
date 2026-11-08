import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ImportWizard } from "@/components/import/import-wizard";
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
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { ImportBatch } from "@/types/database";

export const metadata: Metadata = { title: "Import workbook" };

function counts(batch: ImportBatch) {
  const value = batch.record_counts;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { leads: 0, records: 0, errors: 0 };
  }
  const map = value as Record<string, unknown>;
  const insertedLeads = Number(map.insertedLeads ?? 0);
  const updatedLeads = Number(map.updatedLeads ?? 0);
  const insertedRecords = Number(map.insertedRecords ?? 0);
  const errors = Number(map.errors ?? 0);
  return { leads: insertedLeads + updatedLeads, records: insertedRecords, errors };
}

export default async function ImportPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");

  const { data: batches } = await supabase
    .from("import_batches")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        eyebrow="Migration"
        title="Import the original workbook"
        description="Preview every prospect, financing application, reservation, release, and lost sale before writing anything. Re-running the same workbook updates legacy records safely."
      />

      <ImportWizard />

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>Recent import batches</CardTitle>
          <CardDescription>
            Every commit is logged with its counts and issues for auditability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batches?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Prospects</TableHead>
                  <TableHead className="text-right">Related records</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Batch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const summary = counts(batch as ImportBatch);
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="whitespace-nowrap text-[11px]">
                        {formatDateTime(batch.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-[12px]">
                        {batch.filename}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {summary.leads}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {summary.records}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.errors ? (
                          <Badge tone="amber">{summary.errors}</Badge>
                        ) : (
                          <Badge tone="green">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {batch.id.slice(0, 8)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-[12px] text-muted-foreground">
              No imports yet. Your first commit will appear here.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle>What the import does</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-[12px] text-muted-foreground">
            <li>
              Prospects come from the Prospect Pipeline sheet. Financing,
              reservation, release, and lost-sale rows without a pipeline match
              are created as derived prospects so nothing is dropped.
            </li>
            <li>
              Fuzzy name matching links sheets after normalizing case,
              spacing, and middle names. Ambiguous matches always create a
              derived prospect and raise a review issue rather than guessing.
            </li>
            <li>
              Financing bank is inferred from remarks when the sheet omits it
              (for example, TFS or BPI); the inference is recorded as an info
              issue.
            </li>
            <li>
              Legacy keys make re-imports idempotent. Existing prospects are
              enriched with contact details and remarks; related records with a
              matching key are skipped.
            </li>
            <li>
              All dropdown lists, vehicle models, and default monthly targets
              are seeded by the database migration, not by this import.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
