"use client";

import { use, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PackageDetail from "@/components/PackageDetail";
import { useAuth } from "@/components/auth/AuthContext";

function PackagePageInner({
  projectId,
  packageId,
}: {
  projectId: string;
  packageId: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // "execution" mode: opened from the Execution Dashboard flow
  const mode = searchParams.get("mode") as "purchasing" | "execution" | null;

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleBack = () => {
    router.refresh();
    router.push(`/projects/${projectId}`);
  };

  return (
    <main>
      <PackageDetail
        projectId={projectId}
        packageId={packageId}
        mode={mode ?? "purchasing"}
        onBack={handleBack}
      />
    </main>
  );
}

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string; pkgId: string }>;
}) {
  const { id: projectId, pkgId: packageId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <PackagePageInner projectId={projectId} packageId={packageId} />
    </Suspense>
  );
}
