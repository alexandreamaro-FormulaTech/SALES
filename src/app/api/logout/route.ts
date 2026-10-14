import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSession } from "@/lib/session";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
