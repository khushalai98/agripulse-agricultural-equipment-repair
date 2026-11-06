import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone, village_city, district, state, pin_code")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return null;

  return { supabase, user, profile };
}

export function toAppUser(user: { id: string; email?: string | null }, profile: {
  id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  village_city: string | null;
  district: string | null;
  state: string | null;
  pin_code: string | null;
}) {
  const name = profile.full_name || user.email || "AgriPulse user";
  return {
    id: profile.id,
    email: user.email || "",
    phone: profile.phone || "",
    role: profile.role === "technician" ? "technician" : "farmer",
    name,
    nameHi: name,
    isNewUser: false,
    address: {
      villageOrCity: profile.village_city || "",
      district: profile.district || "",
      state: profile.state || "",
      pinCode: profile.pin_code || undefined,
    },
    villageOrArea: [profile.village_city, profile.district].filter(Boolean).join(", "),
  };
}
