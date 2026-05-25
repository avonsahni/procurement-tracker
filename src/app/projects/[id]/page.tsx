"use client";

import { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import ProjectDetail from "@/components/ProjectDetail";
import LoginForm from "@/components/auth/LoginForm";

// Inner component — needs Suspense because it calls useSearchParams()
function ProjectPageInner({ id }: { id: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory    = searchParams.get("cat")    || undefined;
  const initialQuickFilter = searchParams.get("status") || undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return (
    <main className="min-h-screen bg-slate-50">
      {/*
        key forces a remount (and fresh loadData) whenever the user returns
        from a package page, so analytics + vendor counts are always current.
      */}
      <ProjectDetail
        key={`${id}-${initialCategory ?? ""}-${initialQuickFilter ?? ""}`}
        projectId={id}
        onBack={() => router.push("/")}
        initialCategory={initialCategory}
        initialQuickFilter={initialQuickFilter}
      />
    </main>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <ProjectPageInner id={id} />
    </Suspense>
  );
}
