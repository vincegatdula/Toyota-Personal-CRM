"use client";

import { useActionState, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthState = {};

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState(
    mode === "signin" ? signIn : signUp,
    initialState,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to your workspace" : "Create your account"}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {mode === "signin"
            ? "Use the account tied to this CRM."
            : "The first account becomes the CRM owner. After setup, new accounts need an invitation."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
              mode === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-3.5">
        <input type="hidden" name="next" value={next || "/dashboard"} />
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              placeholder="Juan Dela Cruz"
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "signup" ? 8 : undefined}
            placeholder="••••••••"
          />
        </div>

        {state.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : mode === "signin" ? (
            <LogIn />
          ) : (
            <UserPlus />
          )}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        Your data is private to this account. Nothing is shared publicly.
      </p>
    </div>
  );
}
