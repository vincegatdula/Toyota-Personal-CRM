export const APP_NAME = "Personal Toyota CRM";
export const APP_SUBTITLE = "Automotive Sales & Marketing Workspace";
export const BRAND_NAME = "Toyota";

export const OPTION_CATEGORIES = {
  leadSource: "lead_source",
  transactionType: "transaction_type",
  financingBank: "financing_bank",
  pipelineStatus: "pipeline_status",
  salesChannel: "sales_channel",
  financingStatus: "financing_status",
  lostSaleReason: "lost_sale_reason",
  lostSaleStage: "lost_sale_stage",
  reservationStatus: "reservation_status",
  activityType: "activity_type",
  recoveryStatus: "recovery_status",
} as const;

export type OptionCategory =
  (typeof OPTION_CATEGORIES)[keyof typeof OPTION_CATEGORIES];

export const OPTION_CATEGORY_LABELS: Record<string, string> = {
  lead_source: "Lead sources",
  transaction_type: "Transaction types",
  financing_bank: "Financing banks / channels",
  pipeline_status: "Pipeline statuses",
  sales_channel: "Sales channels",
  financing_status: "Financing application statuses",
  lost_sale_reason: "Lost-sale reasons",
  lost_sale_stage: "Lost-sale pipeline stages",
  reservation_status: "Reservation statuses",
  activity_type: "Activity types",
  recovery_status: "Recovery statuses",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/prospects", label: "Prospects", icon: "Users" },
  { href: "/pipeline", label: "Pipeline", icon: "KanbanSquare" },
  { href: "/financing", label: "Financing", icon: "Landmark" },
  { href: "/reservations", label: "Reservations & Units", icon: "CalendarClock" },
  { href: "/releases", label: "Vehicle Releases", icon: "Car" },
  { href: "/lost-sales", label: "Lost Sales", icon: "TrendingDown" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

export const PIPELINE_STATUS_FALLBACK = [
  "New Prospect",
  "Contacted",
  "Qualified",
  "Quotation Given",
  "Financing Assessment",
  "Application Submitted",
  "Approved",
  "Reserved",
  "Pending Unit",
  "Vehicle Released",
  "Unresponsive",
  "Not Ready",
  "Declined/Withdrawn",
  "Lost",
];

export const LEAD_SOURCE_FALLBACK = [
  "Online",
  "Client Referrals",
  "Personal Network (KKK)",
  "Previous Inquiries/reactivated leads",
  "Outside Display activities",
  "Field/saturation",
  "Corporate sales",
  "Repeat Clients",
];

export const TRANSACTION_FALLBACK = ["Cash", "Financing", "Bank PO", "Government PO"];

export const SALES_CHANNEL_FALLBACK = [
  "In-house financing",
  "Cash",
  "Bank referral (external)",
  "Corporate sales",
  "Government sales",
  "Other",
];

export const FINANCING_STATUS_FALLBACK = [
  "For assessment",
  "Application submitted",
  "Approved",
  "Declined",
  "Customer withdrew",
  "Pending documents",
  "Pending unit",
  "Released",
];

export const RESERVATION_STATUS_FALLBACK = [
  "Reserved",
  "Pending Unit",
  "Pending Financing",
  "Pending Docs",
  "Ready For Release",
  "Released",
  "Cancelled",
];

export const LOST_SALE_REASON_FALLBACK = [
  "Price / total cost too high",
  "Financing declined",
  "Financing not affordable / monthly payment",
  "Customer chose competitor",
  "Customer chose another model/brand",
  "No unit available / delivery too late",
  "Customer postponed purchase",
  "Customer stopped responding",
  "Trade-in / down payment issue",
  "Product / model mismatch",
  "Lost to another dealership",
  "Customer bought elsewhere",
  "Duplicate / invalid lead",
  "Other (specify in notes)",
];

export const LOST_SALE_STAGE_FALLBACK = [
  "New Prospect",
  "Contacted",
  "Qualified",
  "Quotation Given",
  "Financing Assessment",
  "Application Submitted",
  "Approved",
  "Reserved",
  "Pending Unit",
  "Other",
];

export const ACTIVITY_TYPE_FALLBACK = [
  "Phone call",
  "Messenger conversation",
  "SMS",
  "Customer visit",
  "Quotation sent",
  "Follow-up attempt",
  "Financing update",
  "Status change",
  "Note",
  "Other",
];

export const ACTIVE_PIPELINE_STATUSES = [
  "New Prospect",
  "Contacted",
  "Qualified",
  "Quotation Given",
  "Financing Assessment",
  "Application Submitted",
  "Approved",
  "Reserved",
  "Pending Unit",
];

export const CLOSED_PIPELINE_STATUSES = [
  "Vehicle Released",
  "Unresponsive",
  "Not Ready",
  "Declined/Withdrawn",
  "Lost",
];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const REPORTABLE_LEAD_SOURCES = LEAD_SOURCE_FALLBACK;

export const SUCCESS_STATUSES = ["Vehicle Released", "Released", "Approved", "Recovered"];
