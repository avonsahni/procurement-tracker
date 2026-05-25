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

  // Restore the view state the user came from:
  // - ?cat=X   → category table view for that category
  // - ?status=X → quick-filter view (all / awarded / in-progress)
  const fromCat    = searchParams.get("cat")    || "";
  const fromStatus = searchParams.get("status") || "";

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleBack = () => {
    // Invalidate Next.js server cache so the project page shows fresh data
    router.refresh();
    // Navigate back to whichever list view the user came from
    if (fromCat) {
      router.push(`/projects/${projectId}?cat=${encodeURIComponent(fromCat)}`);
    } else if (fromStatus) {
      router.push(`/projects/${projectId}?status=${encodeURIComponent(fromStatus)}`);
    } else {
      router.push(`/projects/${projectId}`);
    }
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
