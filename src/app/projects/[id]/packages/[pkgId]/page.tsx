"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import PackageDetail from "@/components/PackageDetail";
import { useAuth } from "@/components/auth/AuthContext";
import { useEffect } from "react";

export default function PackagePage({
  params,
}: {
  params: Promise<{ id: string; pkgId: string }>;
}) {
  const { id: projectId, pkgId: packageId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleBack = () => {
    // router.refresh() re-fetches server data so the project page shows fresh totals
    router.refresh();
    router.push(`/projects/${projectId}`);
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
