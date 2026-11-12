"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Database,
  Download,
  FileSpreadsheet,
  ListChecks,
  Target,
  UserRound,
  Car,
  ArrowRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ListsManager } from "@/components/settings/lists-manager";
import { ModelsManager } from "@/components/settings/models-manager";
import { TargetsManager } from "@/components/settings/targets-manager";
import { resolveSettingsTab } from "@/lib/settings-tabs";
import type { OptionMap } from "@/lib/data/options";
import type {
  MonthlyTarget,
  Profile,
  VehicleModel,
} from "@/types/database";

export function SettingsTabs({
  profile,
  email,
  avatarUrl,
  options,
  models,
  targets,
  initialYear,
  initialMonth,
  canManageModels,
}: {
  profile: Profile | null;
  email: string;
  avatarUrl?: string | null;
  options: OptionMap;
  models: VehicleModel[];
  targets: MonthlyTarget[];
  initialYear: number;
  initialMonth: number;
  canManageModels: boolean;
}) {
  const period = `${initialYear}-${String(initialMonth).padStart(2, "0")}`;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveSettingsTab(searchParams.get("tab"));

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const nextTab = resolveSettingsTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", nextTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }}
      className="space-y-3"
    >
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">
          <UserRound className="mr-1 h-3.5 w-3.5" /> Profile
        </TabsTrigger>
        <TabsTrigger value="lists">
          <ListChecks className="mr-1 h-3.5 w-3.5" /> Dropdown lists
        </TabsTrigger>
        <TabsTrigger value="models">
          <Car className="mr-1 h-3.5 w-3.5" /> Vehicle models
        </TabsTrigger>
        <TabsTrigger value="targets">
          <Target className="mr-1 h-3.5 w-3.5" /> Targets
        </TabsTrigger>
        <TabsTrigger value="data">
          <Database className="mr-1 h-3.5 w-3.5" /> Data
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileForm profile={profile} email={email} avatarUrl={avatarUrl} />
      </TabsContent>

      <TabsContent value="lists">
        <Card>
          <CardHeader>
            <CardTitle>Dropdown lists</CardTitle>
            <CardDescription>
              Manage the workbook&apos;s reference lists used across every
              module. Order controls how options appear in forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ListsManager options={options} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="models">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle models</CardTitle>
            <CardDescription>
              The model catalogue powers autocomplete in forms and the
              workbook import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelsManager models={models} canManage={canManageModels} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="targets">
        <TargetsManager
          targets={targets}
          initialYear={initialYear}
          initialMonth={initialMonth}
        />
      </TabsContent>

      <TabsContent value="data">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Workbook import</CardTitle>
              <CardDescription>
                Upload the original Excel workbook to preview every mapping,
                then commit. Re-imports update matching legacy records instead
                of duplicating them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild size="sm">
                <Link href="/import">
                  <FileSpreadsheet /> Open import wizard
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Use the same workbook file, not a renamed copy, so legacy keys
                stay stable.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exports</CardTitle>
              <CardDescription>
                Download the full CRM as one workbook, or export individual
                modules for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={`/api/export?type=report&format=xlsx&year=${initialYear}&month=${initialMonth}`}>
                  <Download /> Full workbook (xlsx)
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/export?type=report&format=csv&year=${initialYear}&month=${initialMonth}`}>
                  <Download /> Summary (csv)
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Data model notes</CardTitle>
              <CardDescription>
                Things worth knowing before editing or re-importing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                <li>
                  Records use human-readable codes: prospects C0001, financing
                  F0001, reservations R0001, releases RL0001, lost sales LS0001.
                  Codes are never reused.
                </li>
                <li>
                  Deleting a prospect is blocked while financing, reservation,
                  release, or lost-sale records reference it. Archive prospects
                  instead.
                </li>
                <li>
                  Every table is protected by row-level security. Shared lists
                  and models are admin-managed; personal records remain scoped to
                  the signed-in account unless admin access applies.
                </li>
                <li>
                  Targets are resolved per month: your personal target wins,
                  then the workbook default, then zero.
                </li>
                <li>
                  Period {period} powers exports by default; change the period
                  on the reports page.
                </li>
              </ul>
              <div className="mt-3 flex items-center gap-1.5 text-[11px]">
                <Link href="/reports" className="hover:underline">
                  Open reports
                </Link>
                <ArrowRight className="h-3 w-3" />
                <Link href="/dashboard" className="hover:underline">
                  Open dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
