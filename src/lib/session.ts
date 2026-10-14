import { cookies } from "next/headers";
import { createClient, supabaseConfigured } from "./supabase/server";

const COOKIE = "f360_session";

export async function getSessionUserId(): Promise<string | null> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
