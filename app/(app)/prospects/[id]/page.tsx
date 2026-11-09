import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Car,
  CheckCircle2,
  Edit,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FinancingBadge,
  PipelineBadge,
  RecoveryBadge,
  ReservationBadge,
} from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityForm } from "@/components/prospects/activity-form";
import { getLeadDetail } from "@/lib/data/leads";
import { getOptions } from "@/lib/data/options";
import { getProfileMap, listAssignableProfiles, profileLabel } from "@/lib/data/profiles";
import { getAuthContext } from "@/lib/auth";
import { ReassignLeadCard } from "@/components/prospects/reassign-lead-card";
import {
  completeFollowUp,
  setLeadArchived,
  updateNextAction,
} from "@/app/actions/leads";
import {
  formatApprovedDp,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { isOverdue, nowLocalInput } from "@/lib/dates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getLeadDetail(id);
  return {
    title: detail ? detail.lead.prospect_name : "Prospect",
  };
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[12px]">{value || "—"}</dd>
    </div>
  );
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getAuthContext();
  const [detail, options, owners, profileMap] = await Promise.all([
    getLeadDetail(id),
    getOptions(),
    context.isAdmin ? listAssignableProfiles() : Promise.resolve([]),
    context.isAdmin ? getProfileMap() : Promise.resolve(new Map()),
  ]);
  if (!detail) notFound();
  const { lead, activities, financing, reservations, releases, lostSales } = detail;
  const openFollowUp =
    lead.next_action_due_date && !lead.next_action_completed_at;

  return (
    <div className="page-container">
      <PageHeader
        eyebrow={lead.lead_code}
        title={lead.prospect_name}
        description={[lead.lead_source, lead.preferred_model, lead.location, context.isAdmin ? `Owner: ${profileLabel(profileMap.get(lead.owner_id), lead.owner_id)}` : null]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/prospects/${lead.id}/edit`}>
                <Edit /> Edit
              </Link>
            </Button>
            <form action={setLeadArchived}>
              <input type="hidden" name="id" value={lead.id} />
              <input
                type="hidden"
                name="archived"
                value={lead.is_archived ? "0" : "1"}
              />
              <Button type="submit" size="sm" variant="outline">
                {lead.is_archived ? <ArchiveRestore /> : <Archive />}
                {lead.is_archived ? "Restore" : "Archive"}
              </Button>
            </form>
          </>
        }
      />

      {lead.is_archived ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <Archive className="h-4 w-4" />
          This prospect is archived. Restore it to bring it back into the active
          pipeline.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between p-3.5">
              <CardTitle>Prospect details</CardTitle>
              <PipelineBadge status={lead.pipeline_status} />
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <dl className="grid gap-3 sm:grid-cols-3">
                <Detail label="Date created" value={formatDate(lead.date_created)} />
                <Detail label="Lead source" value={lead.lead_source} />
                <Detail label="Preferred model" value={lead.preferred_model} />
                <Detail label="Transaction" value={lead.transaction} />
                <Detail label="Sales channel" value={lead.sales_channel} />
                <Detail
                  label="Purchase timeline"
                  value={formatDate(lead.purchase_timeline)}
                />
                <Detail
                  label="Last contact"
                  value={formatDate(lead.last_contact_date)}
                />
                <Detail label="Contact number" value={lead.contact_number} />
                <Detail label="Email" value={lead.email} />
              </dl>
              {lead.remarks ? (
                <div className="mt-3 rounded-lg bg-secondary/60 px-3 py-2">
                  <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Remarks
                  </p>
                  <p className="mt-1 text-[12px] whitespace-pre-wrap">
                    {lead.remarks}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between p-3.5">
              <CardTitle>Financing applications</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/financing/new?leadId=${lead.id}`}>
                  <Plus /> Add
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 p-3.5 pt-0">
              {financing.length ? (
                financing.map((application) => (
                  <Link
                    key={application.id}
                    href={`/financing/${application.id}/edit`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 hover:bg-secondary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium">
                        {application.financing_code}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {application.bank || "Bank not set"}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {formatDate(application.date_submitted)} ·
                        Approval {formatDate(application.date_approval)} · DP{" "}
                        {formatApprovedDp(application.approved_dp)}
                      </p>
                    </div>
                    <FinancingBadge status={application.application_status} />
                  </Link>
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No financing applications yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between p-3.5">
              <CardTitle>Reservations & units</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/reservations/new?leadId=${lead.id}`}>
                  <Plus /> Add
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 p-3.5 pt-0">
              {reservations.length ? (
                reservations.map((reservation) => (
                  <Link
                    key={reservation.id}
                    href={`/reservations/${reservation.id}/edit`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 hover:bg-secondary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium">
                        {reservation.reservation_code}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {reservation.reserved_model || "Model not set"}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Reserved {formatDate(reservation.reservation_date)} ·
                        Expected release {formatDate(reservation.expected_release_date)}
                      </p>
                    </div>
                    <ReservationBadge status={reservation.current_status} />
                  </Link>
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No reservations yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between p-3.5">
              <CardTitle>Vehicle releases</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/releases/new?leadId=${lead.id}`}>
                  <Plus /> Add
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 p-3.5 pt-0">
              {releases.length ? (
                releases.map((release) => (
                  <Link
                    key={release.id}
                    href={`/releases/${release.id}/edit`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 hover:bg-secondary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium">
                        {release.release_code}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {release.model_released || "Model not set"}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(release.release_date)} · {release.units_released}{" "}
                        unit{release.units_released === 1 ? "" : "s"} ·{" "}
                        {release.bank || "No bank"}
                      </p>
                    </div>
                    <Badge tone="green">Released</Badge>
                  </Link>
                ))
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No vehicle releases yet.
                </p>
              )}
            </CardContent>
          </Card>

          {lostSales.length ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between p-3.5">
                <CardTitle>Lost-sale record</CardTitle>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/lost-sales">
                    <TrendingDown /> View all
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 p-3.5 pt-0">
                {lostSales.map((lost) => (
                  <div
                    key={lost.id}
                    className="rounded-lg border border-border/70 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium">
                        {lost.primary_loss_reason || "Reason not set"}
                      </p>
                      <RecoveryBadge status={lost.recovery_status} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Marked lost {formatDate(lost.date_marked_lost)} ·{" "}
                      {lost.recoverable ? "Recoverable" : "Not recoverable"} ·
                      Stage {lost.pipeline_stage_when_lost || "—"}
                    </p>
                    {lost.recovery_next_action ? (
                      <p className="mt-1 text-[11px]">
                        Next: {lost.recovery_next_action}
                      </p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center justify-between p-3.5">
              <CardTitle>Activity timeline</CardTitle>
              <span className="text-[10px] text-muted-foreground">
                {activities.length} {activities.length === 1 ? "entry" : "entries"}
              </span>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              {activities.length ? (
                <ol className="relative space-y-3 border-l border-border pl-4">
                  {activities.map((activity) => (
                    <li key={activity.id} className="relative">
                      <span className="absolute top-1 -left-[21px] h-2 w-2 rounded-full border-2 border-card bg-stone-400" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{activity.activity_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(activity.activity_at)}
                        </span>
                      </div>
                      {activity.summary ? (
                        <p className="mt-1 text-[12px] font-medium">
                          {activity.summary}
                        </p>
                      ) : null}
                      {activity.notes ? (
                        <p className="mt-0.5 text-[12px] whitespace-pre-wrap text-muted-foreground">
                          {activity.notes}
                        </p>
                      ) : null}
                      {activity.outcome ? (
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          Outcome: {activity.outcome}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Log the first call, message, or note to start the history."
                  className="border-0 bg-transparent py-6"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3.5">
              <CardTitle>Next action</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              {lead.next_action ? (
                <div className="mb-3">
                  <p className="text-[13px] font-medium">{lead.next_action}</p>
                  <p
                    className={
                      lead.next_action_completed_at
                        ? "text-[11px] text-emerald-700"
                        : isOverdue(lead.next_action_due_date)
                          ? "text-[11px] font-medium text-red-700"
                          : "text-[11px] text-muted-foreground"
                    }
                  >
                    {lead.next_action_completed_at
                      ? `Completed ${formatDateTime(lead.next_action_completed_at)}`
                      : `Due ${formatDate(lead.next_action_due_date)}`}
                  </p>
                  {openFollowUp ? (
                    <form action={completeFollowUp} className="mt-2">
                      <input type="hidden" name="id" value={lead.id} />
                      <Button type="submit" size="sm" variant="outline" className="w-full">
                        <CheckCircle2 /> Mark follow-up complete
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : (
                <p className="mb-3 text-[12px] text-muted-foreground">
                  No next action set. Add one so this prospect does not go cold.
                </p>
              )}

              <form
                action={updateNextAction}
                className="space-y-2 border-t border-border pt-3"
              >
                <input type="hidden" name="id" value={lead.id} />
                <div className="space-y-1">
                  <Label htmlFor="next_action">Next action</Label>
                  <Input
                    id="next_action"
                    name="next_action"
                    defaultValue={lead.next_action ?? ""}
                    placeholder="e.g. Follow up on bank approval"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="next_action_due_date">Due date</Label>
                  <Input
                    id="next_action_due_date"
                    name="next_action_due_date"
                    type="date"
                    defaultValue={lead.next_action_due_date ?? ""}
                  />
                </div>
                <Button type="submit" size="sm" className="w-full">
                  Update next action
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3.5">
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3.5 pt-0 text-[12px]">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {lead.contact_number ? (
                  <a href={`tel:${lead.contact_number}`} className="hover:underline">
                    {lead.contact_number}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No number</span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email</span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {lead.location || (
                  <span className="text-muted-foreground">No location</span>
                )}
              </p>
            </CardContent>
          </Card>

          {context.isAdmin ? (
            <ReassignLeadCard leadId={lead.id} currentOwnerId={lead.owner_id} owners={owners} />
          ) : null}
          <Card>
            <CardHeader className="p-3.5">
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 p-3.5 pt-0">
              <Button asChild size="sm" variant="outline">
                <Link href={`/financing/new?leadId=${lead.id}`}>
                  <Landmark /> Financing
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/reservations/new?leadId=${lead.id}`}>
                  <CalendarClock /> Reserve
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/releases/new?leadId=${lead.id}`}>
                  <Car /> Release
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/lost-sales/new?leadId=${lead.id}`}>
                  <TrendingDown /> Lost
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3.5">
              <CardTitle>Log activity</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <ActivityForm
                leadId={lead.id}
                options={options}
                now={nowLocalInput()}
              />
            </CardContent>
          </Card>

          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/prospects">
              <FileText /> Back to prospects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
