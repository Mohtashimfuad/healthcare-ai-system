import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types";
import { roleHome } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function requireProfile(expectedRole?: UserRole): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login?error=missing_profile");
  }

  if (expectedRole && profile.role !== expectedRole) {
    redirect(roleHome(profile.role));
  }

  return profile;
}
