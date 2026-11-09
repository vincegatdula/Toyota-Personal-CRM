import { requireUser, getProfile } from "@/lib/auth";
import { getAlertSummary } from "@/lib/data/alerts";
import { createAvatarSignedUrl } from "@/lib/avatar";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  const [profile, alerts] = await Promise.all([getProfile(), getAlertSummary()]);
  const name =
    profile?.full_name || user.email?.split("@")[0] || "Marketing Professional";
  const email = profile?.email || user.email || "";
  const avatarUrl = await createAvatarSignedUrl(profile?.avatar_url, user.id);
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
      <Sidebar name={name} email={email} avatarUrl={avatarUrl} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} email={email} avatarUrl={avatarUrl} alerts={alerts} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
