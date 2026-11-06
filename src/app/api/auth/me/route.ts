import { NextResponse } from "next/server";
import { getAuthenticatedProfile, toAppUser } from "@/lib/auth/server";

export async function GET() {
  try {
    const auth = await getAuthenticatedProfile();
    if (!auth) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ success: true, user: toAppUser(auth.user, auth.profile), role: auth.profile.role });
  } catch {
    return NextResponse.json({ success: false, error: "authentication_unavailable" }, { status: 503 });
  }
}
