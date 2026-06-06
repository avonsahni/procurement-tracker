"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import HelpGuide from "@/components/HelpGuide";

// Header Help icon. Drop into any page's header bar to open the User Guide.
// Mirrors the original dashboard header button styling so it sits consistently
// alongside the other header controls on every page.
export default function HelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Help & User Guide"
        aria-label="Help & User Guide"
        className={
          className ??
          "p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
        }
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && <HelpGuide onClose={() => setOpen(false)} />}
    </>
  );
}
