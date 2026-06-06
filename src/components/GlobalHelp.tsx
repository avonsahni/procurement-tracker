"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import HelpGuide from "@/components/HelpGuide";

// Sitewide floating Help button. Mounted once in the root layout so the
// User Guide is reachable from every authenticated page — not just the main
// dashboard. Hidden on the public landing/login screens (no signed-in user).
export default function GlobalHelp() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading || !user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Help & User Guide"
        aria-label="Help & User Guide"
        className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 transition print:hidden"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      {open && <HelpGuide onClose={() => setOpen(false)} />}
    </>
  );
}
