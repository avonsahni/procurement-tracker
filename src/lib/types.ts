export const EXECUTION_MILESTONES = [
  "Mobilisation",
  "Preliminaries",
  "Procurement",
  "Installation",
  "Testing and Commissioning",
  "Handover",
] as const;

export type ExecutionMilestoneName = typeof EXECUTION_MILESTONES[number];

export const MILESTONE_WEIGHTS: Record<ExecutionMilestoneName, number> = {
  "Mobilisation":             5,
  "Preliminaries":            5,
  "Procurement":             30,
  "Installation":            40,
  "Testing and Commissioning": 5,
  "Handover":                 5,
};

/** Sum of all weights — used as the denominator for weighted completion %. */
export const TOTAL_MILESTONE_WEIGHT = (Object.values(MILESTONE_WEIGHTS) as number[]).reduce((a, b) => a + b, 0);

export interface MilestoneTask {
  id: string;
  milestoneName: string;
  name: string;
  description?: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  createdBy?: string;
  createdAt: string;
}

export interface PackageMilestone {
  id: string;
  milestoneName: string;
  displayOrder: number;
  progress: number;
  completedAt?: string;
  completedBy?: string;
  tasks?: MilestoneTask[];
}

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
export type Currency = "INR" | "USD" | "GBP" | "EUR" | "JPY" | "AED" | "SGD";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  AED: "د.إ",
  SGD: "S$",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  INR: "Indian Rupee (₹)",
  USD: "US Dollar ($)",
  GBP: "British Pound (£)",
  EUR: "Euro (€)",
  JPY: "Japanese Yen (¥)",
  AED: "UAE Dirham (د.إ)",
  SGD: "Singapore Dollar (S$)",
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
  userId?: string;
  imageUrls?: string[];
}

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  storagePath: string;
}

export interface Invoice {
  id: string;
  amount: number;
  invoiceNumber: string;
  invoiceDate: string;
  notes: string;
  user: string;
  createdAt: string;
}

export interface CashInflow {
  id: string;
  onAccount: string;
  fromParty: string;
  dateReceived: string;
  amount: number;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashOutflow {
  id: string;
  toWhom: string;
  onAccountOf: string;
  datePaid: string;
  amount: number;
  remarks?: string;
  createdBy: string;
  createdAt: string;
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
  invoices: Invoice[];
  cashInflow: CashInflow[];
  cashOutflow: CashOutflow[];
  milestones: PackageMilestone[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  status: "Active" | "Paused" | "On Hold" | "Completed";
  isSample?: boolean;
  // extended project details
  address?: string;
  projectType?: string;
  builtUpArea?: string;
  estimatedStartDate?: string;
  estimatedDurationMonths?: number;
  tenderedCost?: number;
  projectManager?: string;
  clientContactName?: string;
  clientContactEmail?: string;
  clientContactPhone?: string;
  projectRemarks?: string;
  packages: Package[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export function formatCurrency(amount: number, currency: Currency = "INR"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const sign = amount < 0 ? "-" : "";
  const abs  = Math.abs(amount);
  return sign + symbol + Math.round(abs).toLocaleString("en-US");
}

/** Shape returned by assembleProjectSummary — packages include billing/vendor aggregates */
export interface PackageSummary {
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
  milestones: PackageMilestone[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  // summary-only aggregates
  billedAmount: number;
  vendorCount: number;
  milestonesProgressSum: number;
  totalMilestones: number;
  totalInflowAmount: number;
  totalOutflowAmount: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  client: string;
  budget: number;
  status: 'Active' | 'Paused' | 'On Hold' | 'Completed';
  isSample?: boolean;
  // extended project details
  address?: string;
  projectType?: string;
  builtUpArea?: string;
  estimatedStartDate?: string;
  estimatedDurationMonths?: number;
  tenderedCost?: number;
  projectManager?: string;
  clientContactName?: string;
  clientContactEmail?: string;
  clientContactPhone?: string;
  projectRemarks?: string;
  packages: PackageSummary[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
