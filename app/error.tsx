"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-brand">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">
          The page could not be loaded. Your data has not been changed. Try
          again, or contact support if the problem continues.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            <RotateCcw /> Try again
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
