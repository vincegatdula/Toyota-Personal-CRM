"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { updateLeadStatus } from "@/app/actions/leads";
import { PipelineBadge } from "@/components/ui/status-badge";
import type { Lead } from "@/types/database";
import { isOverdue } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PipelineBoard({
  leads,
  statuses,
}: {
  leads: Lead[];
  statuses: string[];
}) {
  const [items, setItems] = useState(leads);
  const [previousLeads, setPreviousLeads] = useState(leads);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  if (leads !== previousLeads) {
    setPreviousLeads(leads);
    setItems(leads);
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((lead) =>
      [lead.prospect_name, lead.preferred_model, lead.lead_code, lead.lead_source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, query]);

  function move(id: string, status: string) {
    const lead = items.find((item) => item.id === id);
    if (!lead || lead.pipeline_status === status) return;
    const previous = lead.pipeline_status;
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, pipeline_status: status } : item,
      ),
    );
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("id", id);
        data.set("status", status);
        await updateLeadStatus(data);
        toast.success(`Moved ${lead.prospect_name} to ${status}`);
      } catch {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, pipeline_status: previous } : item,
          ),
        );
        toast.error("Could not move the prospect. Please try again.");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter this board…"
            className="h-8 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-[12px] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Drag a card between columns, or use the status menu.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3">
        {statuses.map((status) => {
          const columnLeads = filtered.filter(
            (lead) => lead.pipeline_status === status,
          );
          return (
            <div
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOverColumn(null);
                if (dragging) move(dragging, status);
                setDragging(null);
              }}
              className={cn(
                "flex w-[264px] shrink-0 flex-col rounded-xl border border-border bg-[#f4f3f1] p-2",
                overColumn === status && "border-brand/40 bg-red-50/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="truncate text-[11px] font-semibold tracking-wide text-stone-600 uppercase">
                  {status}
                </span>
                <span className="rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                  {columnLeads.length}
                </span>
              </div>

              <div className="flex min-h-24 flex-col gap-1.5">
                {columnLeads.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.02)] active:cursor-grabbing",
                      dragging === lead.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <Link
                        href={`/prospects/${lead.id}`}
                        className="min-w-0 text-[12px] font-medium hover:underline"
                      >
                        {lead.prospect_name}
                      </Link>
                      <span className="shrink-0 text-[9px] text-muted-foreground">
                        {lead.lead_code}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {lead.preferred_model || "No model"} ·{" "}
                      {lead.lead_source || "No source"}
                    </p>
                    {lead.next_action ? (
                      <p className="mt-1.5 rounded bg-secondary/70 px-1.5 py-1 text-[10px]">
                        <span className="font-medium">{lead.next_action}</span>
                        <span
                          className={cn(
                            "ml-1",
                            isOverdue(lead.next_action_due_date)
                              ? "font-medium text-red-700"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatDate(lead.next_action_due_date)}
                        </span>
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <PipelineBadge status={lead.pipeline_status} />
                      <select
                        aria-label={`Change status for ${lead.prospect_name}`}
                        value={lead.pipeline_status}
                        onChange={(event) => move(lead.id, event.target.value)}
                        className="h-6 max-w-[108px] rounded border border-input bg-card px-1 text-[9px]"
                      >
                        {statuses.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
                {!columnLeads.length ? (
                  <p className="rounded-lg border border-dashed border-border px-2 py-4 text-center text-[10px] text-muted-foreground">
                    Drop a prospect here
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
