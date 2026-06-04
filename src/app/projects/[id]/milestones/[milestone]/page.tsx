"use client";

import { use, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import MilestonePackagesView from "@/components/MilestonePackagesView";

function MilestonePageInner({
  projectId,
  milestone,
}: {
  projectId: string;
  milestone: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <MilestonePackagesView
        projectId={projectId}
        milestone={milestone}
        onBack={() => router.back()}
        onOpenPackage={(pkgId) => router.push(`/projects/${projectId}/packages/${pkgId}?mode=execution`)}
      />
    </main>
  );
}

export default function MilestonePage({
  params,
}: {
  params: Promise<{ id: string; milestone: string }>;
}) {
  const { id, milestone } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <MilestonePageInner projectId={id} milestone={decodeURIComponent(milestone)} />
    </Suspense>
  );
}
