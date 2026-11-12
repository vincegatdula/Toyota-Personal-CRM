import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminUsersManager } from "@/components/settings/admin-users-manager";
import { getSession, isCrmAdmin } from "@/lib/auth";
import { createAvatarSignedUrl } from "@/lib/avatar";
import { listProfilesForAdmin } from "@/lib/admin-users";
import { currentPeriod } from "@/lib/dates";
import type { Profile } from "@/types/database";

export const metadata: Metadata = { title: "User Management" };

export default async function UserManagementPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isCrmAdmin((profile as Profile | null)?.role)) {
    redirect("/dashboard");
  }

  const period = currentPeriod();
  const adminProfiles = await Promise.all(
    (await listProfilesForAdmin()).map(async (row) => ({
      ...row,
      avatar_signed_url: await createAvatarSignedUrl(row.avatar_url, row.id),
    })),
  );

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        description="Create accounts, manage roles and profiles, reset passwords, and set individual monthly targets for team members."
      />
      <AdminUsersManager
        profiles={adminProfiles}
        initialYear={period.year}
        initialMonth={period.month}
        currentUserId={user.id}
      />
    </div>
  );
}
