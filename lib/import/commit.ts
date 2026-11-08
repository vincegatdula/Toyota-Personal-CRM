import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommitResult, ImportIssue, ImportPreview } from "./types";
import type { Database, Json } from "@/types/database";
import { dateOnlyToNoonISOString, todayISO } from "@/lib/dates";

type Client = SupabaseClient<Database>;

function xx(date: string | null | undefined, fallback: string | null = null) {
  return date || fallback;
}

export async function commitWorkbookImport(
  supabase: Client,
  ownerId: string,
  preview: ImportPreview,
): Promise<CommitResult> {
  const errors: ImportIssue[] = [];
  let insertedLeads = 0;
  let updatedLeads = 0;
  let skippedLeads = 0;
  let insertedRecords = 0;
  let skippedRecords = 0;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      owner_id: ownerId,
      filename: preview.filename,
      record_counts: {},
      issues: [],
      created_by: ownerId,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(
      `Could not create the import batch: ${batchError?.message || "unknown error"}`,
    );
  }
  const batchId = batch.id;

  // Existing legacy keys for idempotency.
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("id, legacy_key")
    .eq("owner_id", ownerId)
    .not("legacy_key", "is", null);

  const leadMap = new Map<string, string>();
  for (const row of existingLeads ?? []) {
    if (row.legacy_key) leadMap.set(row.legacy_key, row.id);
  }

  for (const lead of preview.leads) {
    const existingId = leadMap.get(lead.legacyKey);
    if (existingId) {
      const { error } = await supabase
        .from("leads")
        .update({
          contact_number: lead.contactNumber ?? undefined,
          email: lead.email ?? undefined,
          location: lead.location ?? undefined,
          remarks: lead.remarks ?? undefined,
          import_batch_id: batchId,
        })
        .eq("id", existingId)
        .eq("owner_id", ownerId);
      if (error) {
        errors.push({
          severity: "error",
          sheet: lead.sourceSheet,
          row: lead.sourceRow,
          message: `Could not enrich existing prospect "${lead.prospectName}": ${error.message}`,
          action: "Existing prospect was kept. Re-run the import to retry.",
          record: lead.prospectName,
        });
      } else {
        updatedLeads += 1;
      }
      skippedLeads += 1;
      continue;
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        owner_id: ownerId,
        date_created: xx(lead.dateCreated, todayISO())!,
        lead_source: lead.leadSource,
        prospect_name: lead.prospectName,
        preferred_model: lead.preferredModel,
        transaction: lead.transaction,
        sales_channel: lead.salesChannel,
        purchase_timeline: lead.purchaseTimeline,
        pipeline_status: lead.pipelineStatus,
        last_contact_date: lead.lastContactDate,
        next_action: lead.nextAction,
        next_action_due_date: lead.nextActionDueDate,
        contact_number: lead.contactNumber,
        email: lead.email,
        location: lead.location,
        remarks: lead.remarks,
        legacy_key: lead.legacyKey,
        import_batch_id: batchId,
        lost_at:
          lead.pipelineStatus === "Lost"
            ? dateOnlyToNoonISOString(lead.dateCreated)
            : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      errors.push({
        severity: "error",
        sheet: lead.sourceSheet,
        row: lead.sourceRow,
        message: `Could not import prospect "${lead.prospectName}": ${error?.message || "unknown error"}`,
        action: "Row skipped. Nothing else was discarded silently.",
        record: lead.prospectName,
      });
      continue;
    }
    leadMap.set(lead.legacyKey, data.id);
    insertedLeads += 1;
  }

  // Financing -----------------------------------------------------------------
  const { data: existingFin } = await supabase
    .from("financing_applications")
    .select("legacy_key")
    .eq("owner_id", ownerId)
    .not("legacy_key", "is", null);
  const finKeys = new Set((existingFin ?? []).map((r) => r.legacy_key));

  for (const record of preview.financing) {
    if (finKeys.has(record.legacyKey)) {
      skippedRecords += 1;
      continue;
    }
    const leadId = leadMap.get(record.leadKey);
    if (!leadId) {
      errors.push({
        severity: "error",
        sheet: "Financing Tracker",
        row: record.sourceRow,
        message: `Financing application for "${record.prospectName}" has no linked prospect.`,
        action: "Skipped. Re-import after reviewing the prospect match.",
        record: record.prospectName,
      });
      continue;
    }
    const { error } = await supabase.from("financing_applications").insert({
      owner_id: ownerId,
      lead_id: leadId,
      date_submitted: record.dateSubmitted,
      lead_source: record.leadSource,
      preferred_model: record.preferredModel,
      bank: record.bank,
      application_status: record.applicationStatus,
      date_approval: record.dateApproval,
      approved_dp: record.approvedDp,
      date_released: record.dateReleased,
      remarks: record.remarks,
      legacy_key: record.legacyKey,
      import_batch_id: batchId,
    });
    if (error) {
      errors.push({
        severity: "error",
        sheet: "Financing Tracker",
        row: record.sourceRow,
        message: `Could not import financing application for "${record.prospectName}": ${error.message}`,
        action: "Row skipped.",
        record: record.prospectName,
      });
      continue;
    }
    finKeys.add(record.legacyKey);
    insertedRecords += 1;
  }

  // Reservations --------------------------------------------------------------
  const { data: existingRes } = await supabase
    .from("reservations")
    .select("legacy_key")
    .eq("owner_id", ownerId)
    .not("legacy_key", "is", null);
  const resKeys = new Set((existingRes ?? []).map((r) => r.legacy_key));

  for (const record of preview.reservations) {
    if (resKeys.has(record.legacyKey)) {
      skippedRecords += 1;
      continue;
    }
    const leadId = leadMap.get(record.leadKey);
    if (!leadId) {
      errors.push({
        severity: "error",
        sheet: "Reservations & Units",
        row: record.sourceRow,
        message: `Reservation for "${record.prospectName}" has no linked prospect.`,
        action: "Skipped.",
        record: record.prospectName,
      });
      continue;
    }
    const { error } = await supabase.from("reservations").insert({
      owner_id: ownerId,
      lead_id: leadId,
      reservation_date: xx(record.reservationDate, todayISO()),
      reserved_model: record.reservedModel,
      sales_channel: record.salesChannel,
      current_status: record.currentStatus,
      expected_release_date: record.expectedReleaseDate,
      last_customer_update: record.lastCustomerUpdate,
      next_action: record.nextAction,
      remarks: record.remarks,
      legacy_key: record.legacyKey,
      import_batch_id: batchId,
    });
    if (error) {
      errors.push({
        severity: "error",
        sheet: "Reservations & Units",
        row: record.sourceRow,
        message: `Could not import reservation for "${record.prospectName}": ${error.message}`,
        action: "Row skipped.",
        record: record.prospectName,
      });
      continue;
    }
    resKeys.add(record.legacyKey);
    insertedRecords += 1;
  }

  // Releases ------------------------------------------------------------------
  const { data: existingRel } = await supabase
    .from("vehicle_releases")
    .select("legacy_key")
    .eq("owner_id", ownerId)
    .not("legacy_key", "is", null);
  const relKeys = new Set((existingRel ?? []).map((r) => r.legacy_key));

  for (const record of preview.releases) {
    if (relKeys.has(record.legacyKey)) {
      skippedRecords += 1;
      continue;
    }
    const leadId = leadMap.get(record.leadKey);
    if (!leadId) {
      errors.push({
        severity: "error",
        sheet: "Release Log",
        row: record.sourceRow,
        message: `Release for "${record.prospectName}" has no linked prospect.`,
        action: "Skipped.",
        record: record.prospectName,
      });
      continue;
    }
    const { error } = await supabase.from("vehicle_releases").insert({
      owner_id: ownerId,
      lead_id: leadId,
      release_date: record.releaseDate,
      transaction: record.transaction,
      model_released: record.modelReleased,
      units_released: record.unitsReleased,
      bank: record.bank,
      remarks: record.remarks,
      legacy_key: record.legacyKey,
      import_batch_id: batchId,
    });
    if (error) {
      errors.push({
        severity: "error",
        sheet: "Release Log",
        row: record.sourceRow,
        message: `Could not import release for "${record.prospectName}": ${error.message}`,
        action:
          error.code === "23505"
            ? "A matching release already exists, so it was not double-counted."
            : "Row skipped.",
        record: record.prospectName,
      });
      continue;
    }
    relKeys.add(record.legacyKey);
    insertedRecords += 1;
    await supabase
      .from("leads")
      .update({ pipeline_status: "Vehicle Released", last_contact_date: record.releaseDate })
      .eq("id", leadId)
      .eq("owner_id", ownerId)
      .neq("pipeline_status", "Vehicle Released");
  }

  // Lost sales ----------------------------------------------------------------
  const { data: existingLost } = await supabase
    .from("lost_sales")
    .select("legacy_key")
    .eq("owner_id", ownerId)
    .not("legacy_key", "is", null);
  const lostKeys = new Set((existingLost ?? []).map((r) => r.legacy_key));

  for (const record of preview.lostSales) {
    if (lostKeys.has(record.legacyKey)) {
      skippedRecords += 1;
      continue;
    }
    const leadId = leadMap.get(record.leadKey);
    if (!leadId) {
      errors.push({
        severity: "error",
        sheet: "Lost Sale",
        row: record.sourceRow,
        message: `Lost sale for "${record.prospectName}" has no linked prospect.`,
        action: "Skipped.",
        record: record.prospectName,
      });
      continue;
    }
    const { error } = await supabase.from("lost_sales").insert({
      owner_id: ownerId,
      lead_id: leadId,
      date_marked_lost: record.dateMarkedLost,
      lead_source: record.leadSource,
      preferred_model: record.preferredModel,
      pipeline_stage_when_lost: record.pipelineStageWhenLost,
      primary_loss_reason: record.primaryLossReason,
      competitor_alternative: record.competitorAlternative,
      financing_payment_issue: record.financingPaymentIssue,
      estimated_units_lost: record.estimatedUnitsLost,
      recoverable: record.recoverable,
      recovery_next_action: record.recoveryNextAction,
      coaching_notes: record.coachingNotes,
      legacy_key: record.legacyKey,
      import_batch_id: batchId,
    });
    if (error) {
      errors.push({
        severity: "error",
        sheet: "Lost Sale",
        row: record.sourceRow,
        message: `Could not import lost sale for "${record.prospectName}": ${error.message}`,
        action: "Row skipped.",
        record: record.prospectName,
      });
      continue;
    }
    lostKeys.add(record.legacyKey);
    insertedRecords += 1;
    const lostAt = dateOnlyToNoonISOString(record.dateMarkedLost);
    if (lostAt) {
      await supabase
        .from("leads")
        .update({ lost_at: lostAt })
        .eq("id", leadId)
        .eq("owner_id", ownerId)
        .is("lost_at", null);
    }
  }

  const recordCounts = {
    insertedLeads,
    updatedLeads,
    skippedLeads,
    insertedRecords,
    skippedRecords,
    errors: errors.length,
    sourceSummary: preview.summary,
  };

  await supabase
    .from("import_batches")
    .update({
      record_counts: recordCounts,
      issues: [...preview.issues, ...errors] as unknown as Json,
    })
    .eq("id", batchId)
    .eq("owner_id", ownerId);

  return {
    batchId,
    insertedLeads,
    updatedLeads,
    skippedLeads,
    insertedRecords,
    skippedRecords,
    errors,
  };
}
