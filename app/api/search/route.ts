import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

interface SearchResult {
  id: string;
  type: string;
  code: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const raw = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const term = raw.replace(/[,()%_]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const like = `%${term}%`;
  const owner = user.id;

  const [leads, financing, reservations, releases, lost] = await Promise.all([
    supabase
      .from("leads")
      .select("id, lead_code, prospect_name, preferred_model, pipeline_status, lead_source, contact_number, email")
      .eq("owner_id", owner)
      .or(
        [
          `prospect_name.ilike.${like}`,
          `lead_code.ilike.${like}`,
          `preferred_model.ilike.${like}`,
          `contact_number.ilike.${like}`,
          `email.ilike.${like}`,
        ].join(","),
      )
      .limit(6),
    supabase
      .from("financing_applications")
      .select("id, financing_code, lead_id, bank, application_status, preferred_model, remarks")
      .eq("owner_id", owner)
      .or(
        [
          `financing_code.ilike.${like}`,
          `bank.ilike.${like}`,
          `preferred_model.ilike.${like}`,
          `remarks.ilike.${like}`,
        ].join(","),
      )
      .limit(4),
    supabase
      .from("reservations")
      .select("id, reservation_code, lead_id, reserved_model, current_status, remarks")
      .eq("owner_id", owner)
      .or(
        [
          `reservation_code.ilike.${like}`,
          `reserved_model.ilike.${like}`,
          `remarks.ilike.${like}`,
        ].join(","),
      )
      .limit(4),
    supabase
      .from("vehicle_releases")
      .select("id, release_code, lead_id, model_released, transaction, bank, remarks")
      .eq("owner_id", owner)
      .or(
        [
          `release_code.ilike.${like}`,
          `model_released.ilike.${like}`,
          `bank.ilike.${like}`,
          `remarks.ilike.${like}`,
        ].join(","),
      )
      .limit(4),
    supabase
      .from("lost_sales")
      .select("id, lost_code, lead_id, primary_loss_reason, preferred_model, competitor_alternative")
      .eq("owner_id", owner)
      .or(
        [
          `lost_code.ilike.${like}`,
          `primary_loss_reason.ilike.${like}`,
          `competitor_alternative.ilike.${like}`,
          `preferred_model.ilike.${like}`,
        ].join(","),
      )
      .limit(4),
  ]);

  const leadIds = [
    ...new Set(
      [
        ...(financing.data ?? []),
        ...(reservations.data ?? []),
        ...(releases.data ?? []),
        ...(lost.data ?? []),
      ].map((row) => row.lead_id),
    ),
  ];

  const names = new Map<string, { name: string; code: string }>();
  if (leadIds.length) {
    const { data } = await supabase
      .from("leads")
      .select("id, prospect_name, lead_code")
      .eq("owner_id", owner)
      .in("id", leadIds);
    for (const row of data ?? []) {
      names.set(row.id, { name: row.prospect_name, code: row.lead_code });
    }
  }

  const results: SearchResult[] = [];

  for (const row of leads.data ?? []) {
    results.push({
      id: row.id,
      type: "Prospect",
      code: row.lead_code,
      title: row.prospect_name,
      subtitle: [row.lead_code, row.pipeline_status, row.preferred_model]
        .filter(Boolean)
        .join(" · "),
      href: `/prospects/${row.id}`,
    });
  }

  for (const row of financing.data ?? []) {
    const lead = names.get(row.lead_id);
    results.push({
      id: row.id,
      type: "Financing",
      code: row.financing_code,
      title: `${row.financing_code} · ${lead?.name ?? "Financing"}`,
      subtitle: [row.bank, row.application_status, row.preferred_model]
        .filter(Boolean)
        .join(" · "),
      href: `/financing/${row.id}/edit`,
    });
  }

  for (const row of reservations.data ?? []) {
    const lead = names.get(row.lead_id);
    results.push({
      id: row.id,
      type: "Reservation",
      code: row.reservation_code,
      title: `${row.reservation_code} · ${lead?.name ?? "Reservation"}`,
      subtitle: [row.reserved_model, row.current_status].filter(Boolean).join(" · "),
      href: `/reservations/${row.id}/edit`,
    });
  }

  for (const row of releases.data ?? []) {
    const lead = names.get(row.lead_id);
    results.push({
      id: row.id,
      type: "Release",
      code: row.release_code,
      title: `${row.release_code} · ${lead?.name ?? "Release"}`,
      subtitle: [row.model_released, row.transaction, row.bank]
        .filter(Boolean)
        .join(" · "),
      href: `/releases/${row.id}/edit`,
    });
  }

  for (const row of lost.data ?? []) {
    const lead = names.get(row.lead_id);
    results.push({
      id: row.id,
      type: "Lost sale",
      code: row.lost_code,
      title: `${row.lost_code} · ${lead?.name ?? "Lost sale"}`,
      subtitle: [row.primary_loss_reason, row.preferred_model]
        .filter(Boolean)
        .join(" · "),
      href: `/lost-sales/${row.id}/edit`,
    });
  }

  return NextResponse.json({ results });
}
