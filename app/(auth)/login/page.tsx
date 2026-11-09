import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#171717] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full border border-white/10"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] tracking-wide text-white/70 uppercase">
            <BrandMark className="h-5 w-5 rounded-md border border-white/10" imageClassName="p-0.5" />
            Toyota sales workspace
          </div>
          <h2 className="mt-8 max-w-md text-[34px] leading-tight font-semibold tracking-tight">
            Every prospect, application, and release in one place.
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-white/65">
            Replace the spreadsheet with a focused CRM: follow-ups that do not
            slip, financing tracked to approval, reservations monitored to
            release, and losses reviewed instead of forgotten.
          </p>
        </div>
        <div className="relative grid max-w-md grid-cols-3 gap-3 text-[12px]">
          {[
            ["Pipeline", "Follow-ups and outcomes"],
            ["Financing", "Banks, TFS, approvals"],
            ["Releases", "Targets and closing ratio"],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="font-medium text-white/90">{title}</p>
              <p className="mt-1 text-white/50">{copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <BrandMark className="h-8 w-8 border border-border/60" />
          <div>
            <p className="text-[13px] font-semibold">{APP_NAME}</p>
            <p className="text-[10px] text-muted-foreground">{APP_SUBTITLE}</p>
          </div>
        </div>

        {params.error ? (
          <p className="mb-4 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {params.error}
          </p>
        ) : null}

        <LoginForm next={params.next} />

        <Link
          href="/setup"
          className="mt-8 text-[11px] text-muted-foreground underline-offset-4 hover:underline"
        >
          Setting up the CRM for the first time?
        </Link>
      </div>
    </div>
  );
}
