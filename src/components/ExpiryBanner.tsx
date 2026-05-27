"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

interface ExpiryBannerProps {
  onExport?: () => void;
}

export default function ExpiryBanner({ onExport }: ExpiryBannerProps) {
  const { user, isOrgBlocked } = useAuth();

  if (!isOrgBlocked) return null;

  const isAdmin = user?.role === "admin";

  const message =
    user?.orgStatus === "paused"
      ? "Your organisation has been paused. All data is in read-only mode."
      : user?.orgStatus === "canceled"
      ? "Your subscription has been canceled. All data is in read-only mode."
      : "Your free trial has expired. All data is in read-only mode.";

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium truncate">
          {message}
          {isAdmin && (
            <span className="font-normal text-amber-700 ml-1">
              You can still export your data.
            </span>
          )}
          {!isAdmin && (
            <span className="font-normal text-amber-700 ml-1">
              Contact your administrator.
            </span>
          )}
        </p>
      </div>
      {isAdmin && onExport && (
        <button
          onClick={onExport}
          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Data
        </button>
      )}
    </div>
  );
}
