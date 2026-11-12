import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-brand">
          <Compass className="h-5 w-5" />
        </span>
        <h1 className="mt-3 text-lg font-semibold">Page not found</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          The record or page you are looking for does not exist, or it belongs to
          another account.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/prospects">View prospects</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
