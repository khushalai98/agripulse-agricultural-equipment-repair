import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return NextResponse.json({ success: false, error: "logout_failed" }, { status: 503 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "logout_failed" }, { status: 503 });
  }
}
