import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Car, Database, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/utils";

export const metadata: Metadata = { title: "Setup" };

const STEPS = [
  {
    icon: Database,
    title: "Create a Supabase project",
    copy: "Open supabase.com, create a project, and wait for the database to finish provisioning.",
  },
  {
    icon: KeyRound,
    title: "Copy the API credentials",
    copy: "Project Settings → API. You need the project URL, the anon key, and the service role key.",
  },
  {
    icon: CheckCircle2,
    title: "Add the environment variables",
    copy: "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
  },
  {
    icon: Database,
    title: "Run the migrations",
    copy: "In the Supabase SQL editor, run these migrations in order: supabase/migrations/0001_schema.sql, supabase/migrations/0002_rls.sql, supabase/migrations/0003_seed_lists.sql, supabase/migrations/0004_security_hardening.sql.",
  },
  {
    icon: Car,
    title: "Create your account and import",
    copy: "Restart the dev server, create the owner account, then open Import to load the Excel workbook with a preview before committing.",
  },
];

export default function SetupPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Car className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold">{APP_NAME}</p>
          <p className="text-[10px] text-muted-foreground">First-run setup</p>
        </div>
      </div>

      <h1 className="text-[26px] font-semibold tracking-tight">
        {configured ? "Almost ready" : "Connect your Supabase project"}
      </h1>
      <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
        {configured
          ? "Supabase credentials are present. Create an account or sign in to start using the CRM."
          : "This app stores everything in your own Supabase project. It cannot run until the credentials are configured."}
      </p>

      <div className="mt-6 space-y-2">
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <CardHeader className="flex-row items-start gap-3 p-3.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold">
                {index + 1}
              </span>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <step.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {step.title}
                </CardTitle>
                <p className="mt-1 text-[12px] text-muted-foreground">{step.copy}</p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader className="p-3.5">
          <CardTitle className="text-[12px]">Environment variables</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-0">
          <pre className="overflow-x-auto rounded-lg bg-[#171717] p-3 text-[11px] leading-relaxed text-white/80">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_TIMEZONE=Asia/Manila`}
          </pre>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-2">
        {configured ? (
          <Button asChild>
            <Link href="/login">Continue to sign in</Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">I have already configured it</Link>
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {configured ? "Credentials detected." : "No credentials detected yet."}
        </span>
      </div>
    </div>
  );
}
