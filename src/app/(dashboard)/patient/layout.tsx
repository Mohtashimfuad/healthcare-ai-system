import { requireProfile } from "@/lib/supabase/profile";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("patient");
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
