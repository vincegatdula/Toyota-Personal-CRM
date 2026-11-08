import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getSession, isCrmAdmin } from "@/lib/auth";
import {
  getAllOptions,
  getAllVehicleModels,
  getMonthlyTargets,
} from "@/lib/data/options";
import { currentPeriod } from "@/lib/dates";
import type { Profile } from "@/types/database";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");

  const [profileRes, options, models, targets] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getAllOptions(),
    getAllVehicleModels(),
    getMonthlyTargets(),
  ]);
  const period = currentPeriod();
  const profile = (profileRes.data as Profile | null) ?? null;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Manage your profile, dropdown lists, vehicle models, monthly targets, and data."
      />
      <SettingsTabs
        profile={profile}
        email={user.email ?? ""}
        options={options}
        models={models}
        targets={targets}
        initialYear={period.year}
        initialMonth={period.month}
        canManageModels={isCrmAdmin(profile?.role)}
      />
    </div>
  );
}
