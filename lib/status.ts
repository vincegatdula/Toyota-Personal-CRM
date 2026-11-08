export type Tone =
  | "neutral"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "teal"
  | "slate";

export function pipelineStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "New Prospect":
      return "slate";
    case "Contacted":
    case "Qualified":
      return "blue";
    case "Quotation Given":
    case "Financing Assessment":
      return "purple";
    case "Application Submitted":
      return "amber";
    case "Approved":
      return "teal";
    case "Reserved":
    case "Pending Unit":
      return "amber";
    case "Vehicle Released":
      return "green";
    case "Unresponsive":
    case "Not Ready":
      return "neutral";
    case "Declined/Withdrawn":
    case "Lost":
      return "red";
    default:
      return "neutral";
  }
}

export function financingStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "For assessment":
      return "slate";
    case "Application submitted":
      return "blue";
    case "Approved":
      return "green";
    case "Released":
      return "teal";
    case "Declined":
    case "Customer withdrew":
      return "red";
    case "Pending documents":
    case "Pending unit":
      return "amber";
    default:
      return "neutral";
  }
}

export function reservationStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "Reserved":
      return "blue";
    case "Pending Unit":
    case "Pending Financing":
    case "Pending Docs":
      return "amber";
    case "Ready For Release":
      return "teal";
    case "Released":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "neutral";
  }
}

export function recoveryTone(status: string | null | undefined): Tone {
  switch (status) {
    case "Recovered":
      return "green";
    case "Open":
      return "amber";
    case "Closed":
      return "neutral";
    default:
      return "neutral";
  }
}

export function isActiveStatus(status: string | null | undefined) {
  return ![
    "Vehicle Released",
    "Lost",
    "Declined/Withdrawn",
    "Unresponsive",
    "Not Ready",
  ].includes(status || "");
}
