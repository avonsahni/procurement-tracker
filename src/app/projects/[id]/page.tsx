"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import ProjectDetail from "@/components/ProjectDetail";
import LoginForm from "@/components/auth/LoginForm";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

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
      <ProjectDetail projectId={id} onBack={() => router.push("/")} />
    </main>
  );
}
