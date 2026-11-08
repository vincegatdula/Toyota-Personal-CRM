import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function assertLeadOwned(
  supabase: Client,
  ownerId: string,
  leadId: string,
): Promise<void> {
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) {
    throw new Error("That prospect does not exist in your account.");
  }
}

export async function assertReservationOwned(
  supabase: Client,
  ownerId: string,
  reservationId: string,
  leadId: string,
): Promise<void> {
  const { data } = await supabase
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("lead_id", leadId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!data) {
    throw new Error("That reservation does not belong to the selected prospect.");
  }
}
