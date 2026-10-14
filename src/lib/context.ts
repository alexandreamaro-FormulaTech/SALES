import "server-only";

import { redirect } from "next/navigation";
import { getDb } from "./db";
import { getSessionUserId } from "./session";
import { supabaseConfigured } from "./supabase/server";
import type { DB, Profile, Role } from "./types";

export async function requireContext(): Promise<{ db: DB; user: Profile; role: Role }> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const db = await getDb();
  const user = db.profiles.find((profile) => profile.id === userId && profile.isActive);
  const role = user ? db.roles.find((item) => item.id === user.roleId) : undefined;
  if (!user || !role) {
    if (supabaseConfigured()) redirect("/sem-vinculo");
    redirect("/api/logout");
  }
  return { db, user, role };
}
