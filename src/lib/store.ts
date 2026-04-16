"use client";

import { v4 as uuidv4 } from "uuid";
import type { Project, Package, Vendor, AuditEntry, Remark, Document, Stage, Origin, Currency } from "./types";

function ts(): string { return new Date().toISOString(); }
const DATA_KEY = "procurement_tracker_v4_data";
const CATS_KEY = "procurement_tracker_v4_categories";
const COMPANY_KEY = "procurement_tracker_v4_company";
const USERS_KEY = "procurement_tracker_v4_users";

export interface CompanyInfo {
    name: string;
    tagline: string;
    logoUrl?: string;
    contactEmail?: string;
    primaryColor?: string;
}

export interface UserAccount {
    id: string;
    username: string;
    fullName: string;
    role: "admin" | "user";
    canEdit: boolean;
    password?: string;
}

let projects: Project[] = [];
let categories: string[] = [];
let companyInfo: CompanyInfo = { name: "Procurement Tracker", tagline: "Enterprise Source of Truth" };
let userAccounts: UserAccount[] = [];

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(DATA_KEY, JSON.stringify(projects));
    localStorage.setItem(CATS_KEY, JSON.stringify(categories));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(companyInfo));
    localStorage.setItem(USERS_KEY, JSON.stringify(userAccounts));
  }
}

export function fetchAllData() {
    if (typeof window === "undefined") return;
    const savedProjects = localStorage.getItem(DATA_KEY);
    projects = savedProjects ? JSON.parse(savedProjects) : [];
    const savedCats = localStorage.getItem(CATS_KEY);
    categories = savedCats ? JSON.parse(savedCats) : ["Civil", "Electrical", "Mechanical", "Instrumentation", "Services"];
    const savedCompany = localStorage.getItem(COMPANY_KEY);
    companyInfo = savedCompany ? JSON.parse(savedCompany) : { name: "Procurement Tracker", tagline: "Enterprise Source of Truth" };
    const savedUsers = localStorage.getItem(USERS_KEY);
    userAccounts = savedUsers ? JSON.parse(savedUsers) : [
        { id: "admin-1", username: "admin", fullName: "System Admin", role: "admin", canEdit: true, password: "admin123" },
        { id: "viewer-1", username: "viewer", fullName: "Guest Viewer", role: "user", canEdit: false, password: "admin123" }
    ];
}

// Company & Users
export function getCompanyInfo() { fetchAllData(); return companyInfo; }
export function updateCompanyInfo(info: CompanyInfo) { companyInfo = info; persist(); }
export function getUsers() { fetchAllData(); return userAccounts; }
export function addUser(user: Omit<UserAccount, 'id'>) { userAccounts.push({ ...user, id: uuidv4() }); persist(); }
export function updateUserRights(id: string, canEdit: boolean) { const u = userAccounts.find(x => x.id === id); if(u) { u.canEdit = canEdit; persist(); } }
export function deleteUser(id: string) { userAccounts = userAccounts.filter(u => u.id !== id); persist(); }

// Core Entities
export function fetchProjects() { fetchAllData(); return projects; }
export function fetchProject(id: string) { fetchAllData(); return projects.find(p => p.id === id); }
export function addProject(name: string, client: string, budget: number) { 
    projects.push({ id: uuidv4(), name, client, budget, status: "Active", packages: [], createdAt: ts(), updatedAt: ts() }); 
    persist(); 
}
export function updateProject(id: string, updates: any) { 
    const p = projects.find(x => x.id === id); 
    if(p) { Object.assign(p, updates); p.updatedAt = ts(); persist(); } 
}
export function deleteProject(id: string) { projects = projects.filter(p => p.id !== id); persist(); }

export function fetchCategories() { fetchAllData(); return categories; }
export function addCategory(name: string) { if(!categories.includes(name)) { categories.push(name); persist(); } }
export function updateCategory(old: string, next: string) { 
    const i = categories.indexOf(old); 
    if(i !== -1) { 
        categories[i] = next; 
        projects.forEach(p => p.packages.forEach(pkg => { if(pkg.category === old) pkg.category = next; }));
        persist(); 
    } 
}
export function deleteCategory(name: string) { categories = categories.filter(c => c !== name); persist(); }

// Packages
export function addPackage(projectId: string, data: any) {
    const p = projects.find(x => x.id === projectId);
    if(!p) return;
    p.packages.push({
        id: uuidv4(), name: data.name, description: "", category: data.category, origin: data.origin, currency: data.currency,
        currentStage: "Spec Received", vendors: [], auditTrail: [], remarks: [], documents: [], createdAt: ts(), updatedAt: ts()
    });
    persist();
}
export function updatePackage(pkgId: string, updates: any) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) {
            if(updates.currentStage) pkg.currentStage = updates.currentStage;
            if(updates.awardValue) pkg.awardValue = updates.awardValue;
            if(updates.awardedVendorId) pkg.awardedVendorId = updates.awardedVendorId;
            pkg.updatedAt = ts();
        }
    });
    persist();
}
export function punchAward(projectId: string, pkgId: string, val: number, vendor: string) {
    updatePackage(pkgId, { awardValue: val, awardedVendorId: vendor, currentStage: "Award" });
}
export function deletePackage(pkgId: string) {
    projects.forEach(p => { p.packages = p.packages.filter(pk => pk.id !== pkgId); });
    persist();
}

// Package Details
export function addVendor(pkgId: string, v: any) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) pkg.vendors.push({ id: uuidv4(), name: v.name, quotedAmount: v.quoted, revisedAmount: v.revised });
    });
    persist();
}
export function updateVendor(pkgId: string, vid: string, updates: any) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) { const v = pkg.vendors.find(x => x.id === vid); if(v) Object.assign(v, updates); }
    });
    persist();
}
export function deleteVendor(pkgId: string, vid: string) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) pkg.vendors = pkg.vendors.filter(v => v.id !== vid);
    });
    persist();
}
export function addRemark(pkgId: string, text: string) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) pkg.remarks.push({ id: uuidv4(), user: "Current User", text, timestamp: ts() });
    });
    persist();
}
export function addDocument(pkgId: string, d: any) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) pkg.documents.push({ id: uuidv4(), name: d.name, size: d.size, type: d.type, uploadedBy: "User", uploadedAt: ts() });
    });
    persist();
}
export function deleteDocument(pkgId: string, did: string) {
    projects.forEach(p => {
        const pkg = p.packages.find(pk => pk.id === pkgId);
        if(pkg) pkg.documents = pkg.documents.filter(d => d.id !== did);
    });
    persist();
}

export function resetTrackerData() { projects = []; persist(); }
