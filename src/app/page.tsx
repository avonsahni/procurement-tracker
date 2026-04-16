"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import Dashboard from "@/components/Dashboard";
import ProjectDetail from "@/components/ProjectDetail";
import LoginForm from "@/components/auth/LoginForm";

export default function Home() {
  const { user, loading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return <LoginForm />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {selectedProjectId ? (
        <ProjectDetail 
          projectId={selectedProjectId} 
          onBack={() => setSelectedProjectId(null)} 
        />
      ) : (
        <Dashboard 
          onSelectProject={(id: string) => setSelectedProjectId(id)} 
        />
      )}
    </main>
  );
}
