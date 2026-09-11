import { requireProfile } from "@/lib/supabase/profile";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile("doctor");
  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
