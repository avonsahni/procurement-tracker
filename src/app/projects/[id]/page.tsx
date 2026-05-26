"use client";

import { use, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import ProjectDetail from "@/components/ProjectDetail";
import LoginForm from "@/components/auth/LoginForm";

// Inner component wrapped in Suspense
function ProjectPageInner({ id }: { id: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = (searchParams.get("view") as "landing" | "purchasing" | "execution") ?? "landing";
  // A new timestamp on every mount forces ProjectDetail to remount (and re-fetch)
  // whenever the user navigates back from the package detail page.
  const [mountKey] = useState(() => Date.now().toString());

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
      <ProjectDetail
        key={`${id}-${mountKey}`}
        projectId={id}
        initialView={initialView}
        onBack={() => router.push("/")}
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
