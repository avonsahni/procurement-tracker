export type Stage =
  | "Spec Received"
  | "RFQ Float"
  | "Technical Negotiation"
  | "Commercial Negotiation"
  | "Award";

export const STAGES: Stage[] = [
  "Spec Received",
  "RFQ Float",
  "Technical Negotiation",
  "Commercial Negotiation",
  "Award",
];

export type Origin = "Domestic" | "Import";
export type Currency = "INR" | "USD" | "GBP" | "EUR";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export interface Vendor {
  id: string;
  name: string;
  quotedAmount: number;
  revisedAmount: number;
}

export interface AuditEntry {
  id: string;
  user: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface Remark {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  category: string;
  origin: Origin;
  currency: Currency;
  currentStage: Stage;
  rfqFloatDate?: string;
  awardDate?: string;
  awardValue?: number;
  awardedVendorId?: string;
  vendors: Vendor[];
  auditTrail: AuditEntry[];
  remarks: Remark[];
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  status: "Active" | "On Hold" | "Completed";
  packages: Package[];
  createdAt: string;
  updatedAt: string;
}

export function formatCurrency(amount: number, currency: Currency = "INR"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return symbol + amount.toLocaleString(locale);
}
