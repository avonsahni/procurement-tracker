"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { LogOut, User, Shield, ChevronDown, Download, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

/**
 * User avatar button + dropdown menu.
 * Shows user name, username/role badge, Sign Out, and Download My Data (GDPR).
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const res = await apiFetch('/api/user/data-export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      alert('Failed to download your data. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const initial = user?.fullName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 group"
        title="User menu"
      >
        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs border border-blue-200 group-hover:bg-blue-100 transition">
          {initial}
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">@{user?.username}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                user?.role === "admin"
                  ? "bg-violet-50 text-violet-700 border border-violet-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}>
                {user?.role === "admin" ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                {user?.role === "admin" ? "Admin" : "Viewer"}
              </span>
              {user?.canEdit && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Can Edit
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1.5 space-y-0.5">
            {/* GDPR: Download My Data */}
            <button
              onClick={handleDownloadData}
              disabled={downloading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition text-left disabled:opacity-50"
            >
              {downloading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />
              }
              {downloading ? 'Preparing…' : 'Download My Data'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* GDPR note */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              "Download My Data" exports all personal data we hold for your account (GDPR Art. 20).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
