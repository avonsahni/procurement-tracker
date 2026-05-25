"use client";

import { use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PackageDetail from "@/components/PackageDetail";
import { useAuth } from "@/components/auth/AuthContext";
import { useEffect } from "react";

// Inner component — needs Suspense because it calls useSearchParams()
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

  // Category that was active when the user clicked this package row.
  // Stored in the URL so the back button can restore the exact list view.
  const fromCat = searchParams.get("cat") || "";

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleBack = () => {
    // Invalidate Next.js server cache so the project page shows fresh data
    router.refresh();
    // Navigate one level up: back to the category table, not the category grid
    router.push(
      fromCat
        ? `/projects/${projectId}?cat=${encodeURIComponent(fromCat)}`
        : `/projects/${projectId}`
    );
  };

  return (
    <main>
      <PackageDetail
        projectId={projectId}
        packageId={packageId}
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
