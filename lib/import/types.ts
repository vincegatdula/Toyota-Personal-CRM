export type IssueSeverity = "error" | "warning" | "info";

export interface ImportIssue {
  severity: IssueSeverity;
  sheet: string;
  row: number | null;
  message: string;
  action: string;
  record?: string;
}

export interface ParsedLead {
  legacyKey: string;
  dateCreated: string | null;
  leadSource: string | null;
  prospectName: string;
  preferredModel: string | null;
  transaction: string | null;
  salesChannel: string | null;
  purchaseTimeline: string | null;
  pipelineStatus: string;
  lastContactDate: string | null;
  nextAction: string | null;
  nextActionDueDate: string | null;
  contactNumber: string | null;
  email: string | null;
  location: string | null;
  remarks: string | null;
  sourceSheet: string;
  sourceRow: number;
  derived: boolean;
  matchConfidence?: "high" | "medium" | null;
}

export interface ParsedFinancing {
  legacyKey: string;
  leadKey: string;
  prospectName: string;
  dateSubmitted: string | null;
  leadSource: string | null;
  preferredModel: string | null;
  bank: string | null;
  applicationStatus: string;
  dateApproval: string | null;
  approvedDp: number | null;
  dateReleased: string | null;
  remarks: string | null;
  sourceRow: number;
}

export interface ParsedReservation {
  legacyKey: string;
  leadKey: string;
  prospectName: string;
  reservationDate: string | null;
  reservedModel: string | null;
  salesChannel: string | null;
  currentStatus: string;
  expectedReleaseDate: string | null;
  lastCustomerUpdate: string | null;
  nextAction: string | null;
  remarks: string | null;
  sourceRow: number;
}

export interface ParsedRelease {
  legacyKey: string;
  leadKey: string;
  prospectName: string;
  releaseDate: string;
  leadSource: string | null;
  transaction: string | null;
  modelReleased: string | null;
  unitsReleased: number;
  bank: string | null;
  remarks: string | null;
  sourceRow: number;
}

export interface ParsedLostSale {
  legacyKey: string;
  leadKey: string;
  prospectName: string;
  dateMarkedLost: string;
  leadSource: string | null;
  preferredModel: string | null;
  pipelineStageWhenLost: string | null;
  primaryLossReason: string | null;
  competitorAlternative: string | null;
  financingPaymentIssue: string | null;
  estimatedUnitsLost: number;
  recoverable: boolean;
  recoveryNextAction: string | null;
  coachingNotes: string | null;
  sourceRow: number;
}

export interface ReferenceLists {
  leadSources: string[];
  transactions: string[];
  banks: string[];
  pipelineStatuses: string[];
  salesChannels: string[];
  financingStatuses: string[];
  lostSaleReasons: string[];
  lostSaleStages: string[];
  reservationStatuses: string[];
  activityTypes: string[];
  recoveryStatuses: string[];
  vehicleModels: string[];
}

export interface ImportPreview {
  filename: string;
  generatedAt: string;
  leads: ParsedLead[];
  financing: ParsedFinancing[];
  reservations: ParsedReservation[];
  releases: ParsedRelease[];
  lostSales: ParsedLostSale[];
  reference: ReferenceLists;
  issues: ImportIssue[];
  summary: {
    pipelineLeads: number;
    derivedLeads: number;
    totalLeads: number;
    financing: number;
    reservations: number;
    releases: number;
    lostSales: number;
    unitsReleased: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface CommitResult {
  batchId: string;
  insertedLeads: number;
  updatedLeads: number;
  skippedLeads: number;
  insertedRecords: number;
  skippedRecords: number;
  errors: ImportIssue[];
}
