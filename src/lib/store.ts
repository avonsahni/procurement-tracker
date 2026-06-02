import type { Project, ProjectSummary, Invoice, CashInflow, CashOutflow } from "./types";

export interface CompanyInfo {
  name: string;
  tagline: string;
  logoUrl?: string;
  contactEmail?: string;
  primaryColor?: string;
  defaultCurrency?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  /** admin = full control; user = edit/add/delete (no project create/delete); viewer = read-only */
  role: "admin" | "user" | "viewer";
  canEdit: boolean;
  orgId?: string;
  orgRole?: "owner" | "admin" | "viewer";
  isPlatformAdmin?: boolean;
  orgStatus?: "trial" | "active" | "paused" | "canceled";
  orgPlan?: "trial" | "starter" | "pro" | "enterprise";
  trialEndsAt?: string | null;
  password?: string;
}

async function api(path: string, opts?: RequestInit) {
  // X-Requested-With prevents CSRF via cross-origin HTML form submissions
  // (browsers block custom headers on cross-origin simple requests).
  const headers = new Headers(opts?.headers);
  headers.set('X-Requested-With', 'fetch');
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }
  return res.json();
}

// Company & Users
export async function getCompanyInfo(): Promise<CompanyInfo> {
  return api('/api/company');
}
export async function updateCompanyInfo(info: CompanyInfo): Promise<void> {
  await api('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(info) });
}
export async function getUsers(): Promise<UserAccount[]> {
  return api('/api/users');
}
export async function addUser(user: Omit<UserAccount, 'id'>): Promise<UserAccount> {
  return api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
}
export async function updateUserRights(id: string, canEdit: boolean): Promise<void> {
  await api(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canEdit }) });
}
export async function updateUser(id: string, updates: { fullName?: string; email?: string; role?: string; canEdit?: boolean; password?: string }): Promise<void> {
  await api(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
}
export async function deleteUser(id: string): Promise<void> {
  await api(`/api/users/${id}`, { method: 'DELETE' });
}

// Projects
export async function fetchProjects(): Promise<Project[]> {
  return api('/api/projects');
}
export async function fetchProject(id: string): Promise<ProjectSummary | undefined> {
  try { return await api(`/api/projects/${id}`); } catch { return undefined; }
}
export interface NewProjectInput {
  name: string;
  client?: string;
  budget?: number;
  address?: string;
  projectType?: string;
  builtUpArea?: string;
  estimatedStartDate?: string | null;
  estimatedDurationMonths?: number | null;
  tenderedCost?: number | null;
  projectManager?: string;
  clientContactName?: string;
  clientContactEmail?: string;
  clientContactPhone?: string;
  projectRemarks?: string;
}
export async function addProject(data: NewProjectInput): Promise<void> {
  await api('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  await api(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
}
export async function deleteProject(id: string): Promise<void> {
  await api(`/api/projects/${id}`, { method: 'DELETE' });
}

// Categories
export async function fetchCategories(): Promise<string[]> {
  return api('/api/categories');
}
export async function addCategory(name: string): Promise<void> {
  await api('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}
export async function updateCategory(oldName: string, newName: string): Promise<void> {
  await api(`/api/categories/${encodeURIComponent(oldName)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
}
export async function deleteCategory(name: string): Promise<void> {
  await api(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

// Packages
export async function fetchPackage(pkgId: string): Promise<any> {
  return api(`/api/packages/${pkgId}`);
}
export async function addPackage(projectId: string, data: { name: string; category: string; origin: string; currency: string }): Promise<void> {
  await api('/api/packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, ...data }) });
}
export async function updatePackage(pkgId: string, updates: any, user?: string): Promise<void> {
  await api(`/api/packages/${pkgId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...updates, user }) });
}
export async function punchAward(_projectId: string, pkgId: string, val: number, vendor: string, user?: string): Promise<void> {
  await api(`/api/packages/${pkgId}/award`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardValue: val, awardedVendor: vendor, user }) });
}
export async function deletePackage(pkgId: string): Promise<void> {
  await api(`/api/packages/${pkgId}`, { method: 'DELETE' });
}

// Vendors
export async function addVendor(pkgId: string, v: { name: string; quoted: number; revised: number }, user: string = 'System'): Promise<void> {
  await api(`/api/packages/${pkgId}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, user }) });
}
export async function updateVendor(pkgId: string, vid: string, updates: any): Promise<void> {
  await api(`/api/packages/${pkgId}/vendors/${vid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
}
export async function deleteVendor(pkgId: string, vid: string, user: string = 'System'): Promise<void> {
  await api(`/api/packages/${pkgId}/vendors/${vid}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user }) });
}
export async function addVendorRevision(pkgId: string, vid: string, data: { amount: number; notes?: string }): Promise<import('./types').VendorRevision> {
  return api(`/api/packages/${pkgId}/vendors/${vid}/revisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export async function deleteVendorRevision(pkgId: string, vid: string, rid: string): Promise<void> {
  await api(`/api/packages/${pkgId}/vendors/${vid}/revisions/${rid}`, { method: 'DELETE' });
}

// Remarks
export async function addRemark(pkgId: string, text: string, user: string = 'User', imageUrls?: string[], imageBytes?: number): Promise<void> {
  await api(`/api/packages/${pkgId}/remarks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, user, imageUrls, imageBytes }) });
}

// Documents
export async function addDocument(pkgId: string, d: { name: string; size: string; sizeBytes?: number; type: string; storagePath?: string }, user: string = 'User'): Promise<void> {
  await api(`/api/packages/${pkgId}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, user }) });
}
export async function deleteDocument(pkgId: string, did: string, user: string = 'System'): Promise<void> {
  await api(`/api/packages/${pkgId}/documents/${did}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user }) });
}

// Invoices (billing)
export async function addInvoice(
  pkgId: string,
  inv: { amount: number; invoiceNumber?: string; invoiceDate?: string; notes?: string }
): Promise<Invoice> {
  return api(`/api/packages/${pkgId}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inv),
  });
}
export async function deleteInvoice(pkgId: string, iid: string): Promise<void> {
  await api(`/api/packages/${pkgId}/invoices/${iid}`, { method: 'DELETE' });
}

// Cash Inflow
export async function addCashInflow(
  pkgId: string,
  data: { onAccount: string; fromParty: string; dateReceived: string; amount: number; remarks?: string }
): Promise<CashInflow> {
  return api(`/api/packages/${pkgId}/cash-inflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
export async function deleteCashInflow(pkgId: string, eid: string): Promise<void> {
  await api(`/api/packages/${pkgId}/cash-inflow/${eid}`, { method: 'DELETE' });
}

// Cash Outflow
export async function addCashOutflow(
  pkgId: string,
  data: { toWhom: string; onAccountOf: string; datePaid: string; amount: number; remarks?: string }
): Promise<CashOutflow> {
  return api(`/api/packages/${pkgId}/cash-outflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
export async function deleteCashOutflow(pkgId: string, eid: string): Promise<void> {
  await api(`/api/packages/${pkgId}/cash-outflow/${eid}`, { method: 'DELETE' });
}

// Milestones
export async function updateMilestoneProgress(pkgId: string, milestoneName: string, progress: number, user?: string): Promise<void> {
  await api(`/api/packages/${pkgId}/milestones`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneName, progress, user }),
  });
}

// Milestone Tasks
export async function addMilestoneTask(
  pkgId: string,
  milestoneName: string,
  name: string,
  startDate?: string,
  endDate?: string,
): Promise<void> {
  await api(`/api/packages/${pkgId}/milestone-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneName, name, startDate: startDate || null, endDate: endDate || null }),
  });
}

export async function updateMilestoneTask(
  pkgId: string,
  taskId: string,
  updates: { name?: string; progress?: number; startDate?: string | null; endDate?: string | null },
): Promise<void> {
  await api(`/api/packages/${pkgId}/milestone-tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteMilestoneTask(pkgId: string, taskId: string): Promise<void> {
  await api(`/api/packages/${pkgId}/milestone-tasks/${taskId}`, { method: 'DELETE' });
}

// Admin
export async function resetTrackerData(): Promise<void> {
  await api('/api/reset', { method: 'POST' });
}
export async function seedTrackerData(): Promise<void> {
  await api('/api/seed', { method: 'POST' });
}
