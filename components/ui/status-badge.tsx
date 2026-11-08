import { Badge } from "@/components/ui/badge";
import {
  financingStatusTone,
  pipelineStatusTone,
  recoveryTone,
  reservationStatusTone,
} from "@/lib/status";

export function PipelineBadge({ status }: { status: string | null }) {
  return <Badge tone={pipelineStatusTone(status)}>{status || "—"}</Badge>;
}

export function FinancingBadge({ status }: { status: string | null }) {
  return <Badge tone={financingStatusTone(status)}>{status || "—"}</Badge>;
}

export function ReservationBadge({ status }: { status: string | null }) {
  return <Badge tone={reservationStatusTone(status)}>{status || "—"}</Badge>;
}

export function RecoveryBadge({ status }: { status: string | null }) {
  return <Badge tone={recoveryTone(status)}>{status || "—"}</Badge>;
}
