import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

export type { AuthUser };

/**
 * Route guard for communication pages. Uses the app's full session validation
 * (single-session check included) rather than the raw Supabase auth check.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}
