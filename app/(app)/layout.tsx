import { requireUser, getProfile } from "@/lib/auth";
import { getAlertSummary } from "@/lib/data/alerts";
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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px]">
      <Sidebar name={name} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} email={email} alerts={alerts} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
