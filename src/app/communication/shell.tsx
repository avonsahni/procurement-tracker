import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { MessagesSquare } from "lucide-react";

/**
 * Team Hub — Phase 1 scaffold shell.
 *
 * Server component: authenticates via the RLS-scoped server client and
 * renders a placeholder. Phase 2 replaces the body with real channel /
 * thread / message lists fed by server-side queries.
 */
export async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user;
}

export function HubShell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <MessagesSquare className="w-6 h-6 text-blue-600" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-1">{title}</h1>
        <p className="text-sm text-slate-500 mb-4">{subtitle}</p>
        <p className="text-xs text-slate-400">
          Team Hub is being rolled out in phases. The schema is live (Phase 1);
          conversations arrive with Phase 2.
        </p>
      </div>
    </main>
  );
}
