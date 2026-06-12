import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

export type { AuthUser };

// React cache() deduplicates within one render tree — layout + page both call
// requireUser() but getCurrentUser() only runs once per request.
const cachedGetCurrentUser = cache(getCurrentUser);

export async function requireUser(): Promise<AuthUser> {
  const user = await cachedGetCurrentUser();
  if (!user) redirect("/");
  return user;
}
