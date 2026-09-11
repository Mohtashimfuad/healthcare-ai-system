import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Bell,
  Bot,
  Calendar,
  FileText,
  MapPin,
  Pill,
  Plus,
  Users,
  ArrowRight,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard, QuickActionCard, EmptyState, DataTable, StatusBadge } from "@/components/ui/data-display";

export default async function PatientDashboardPage() {
  const profile = await requireProfile("patient");
  const supabase = await createClient();

  const [{ data: appointments }, { data: prescriptions }, { data: reminders }, { data: doctorRows }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", profile.id)
        .order("scheduled_at", { ascending: true })
        .limit(5),
      supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("reminders")
        .select("*")
        .eq("patient_id", profile.id)
        .eq("taken", false)
        .order("dose_time", { ascending: true })
        .limit(5),
      supabase.from("doctor_profiles").select("*").limit(6),
    ]);

  const doctorIds = doctorRows?.map((row) => row.profile_id) ?? [];
  const { data: doctorPeople } =
    doctorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", doctorIds)
      : { data: [] as { id: string; full_name: string }[] };

  const doctors = (doctorRows ?? []).map((row) => ({
    ...row,
    full_name: doctorPeople?.find((person) => person.id === row.profile_id)?.full_name,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#0EA5E9]">Patient portal</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Welcome back, {profile.full_name || "there"}
          </h1>
          <p className="mt-2 text-[#64748B]">
            Book visits, review prescriptions, and keep your care plan in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/patient#appointments">
              <Plus className="w-4 h-4 mr-2" />
              Book Appointment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="size-5" />}
          label="Appointments"
          value={appointments?.length ?? 0}
          color="primary"
        />
        <StatCard
          icon={<Pill className="size-5" />}
          label="Prescriptions"
          value={prescriptions?.length ?? 0}
          color="accent"
        />
        <StatCard
          icon={<Bell className="size-5" />}
          label="Upcoming doses"
          value={reminders?.length ?? 0}
          color="warning"
        />
        <StatCard
          icon={<MapPin className="size-5" />}
          label="Doctors listed"
          value={doctors?.length ?? 0}
          color="accent"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          href="/patient#appointments"
          icon={<Calendar className="size-5" />}
          title="Book appointment"
          description="Match with a specialist by availability."
          color="primary"
        />
        <QuickActionCard
          href="/patient#prescriptions"
          icon={<Bot className="size-5" />}
          title="AI medicine suggestion"
          description="Coming next: report-based AI drafts."
          color="accent"
        />
        <QuickActionCard
          href="/patient#doctors"
          icon={<MapPin className="size-5" />}
          title="Find nearby doctors"
          description="Browse verified specialists."
          color="success"
        />
      </div>

      <section id="appointments" className="scroll-mt-24">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming appointments</CardTitle>
              <CardDescription>Online and in-person visits you have scheduled.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patient#appointments">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appointments && appointments.length > 0 ? (
              <DataTable
                columns={[
                  { key: "type", header: "Type", render: (row) => <span className="capitalize">{row.type} visit</span> },
                  { key: "scheduled_at", header: "Date & Time", render: (row) => format(parseISO(row.scheduled_at), "EEE, MMM d · h:mm a") },
                  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} variant="info" /> },
                ]}
                data={appointments}
                keyExtractor={(row) => row.id}
                emptyIcon={<Calendar className="size-6" />}
              />
            ) : (
              <EmptyState
                icon={<Calendar className="size-6" />}
                title="No appointments yet"
                description="Booking by specialty and availability is the next feature we will add."
                action={{ label: "Book your first visit", href: "/patient#appointments" }}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="prescriptions" className="scroll-mt-24">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Prescriptions</CardTitle>
                <CardDescription>Doctor-approved medicines and AI drafts.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/patient#prescriptions">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {prescriptions && prescriptions.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "medicines", header: "Medicines", render: (row) => `${row.medicines.length} medicine${row.medicines.length === 1 ? "" : "s"}` },
                    { key: "created_at", header: "Date", render: (row) => format(parseISO(row.created_at), "MMM d, yyyy") },
                    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} variant={row.doctor_approved ? "success" : "warning"} /> },
                  ]}
                  data={prescriptions}
                  keyExtractor={(row) => row.id}
                  emptyIcon={<FileText className="size-6" />}
                />
              ) : (
                <EmptyState
                  icon={<FileText className="size-6" />}
                  title="No prescriptions yet"
                  description="After a consultation, approved medicines will show up here."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="reminders" className="scroll-mt-24">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Medicine reminders</CardTitle>
                <CardDescription>Upcoming doses that still need confirmation.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/patient#reminders">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {reminders && reminders.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "dose_time", header: "Time", render: (row) => format(parseISO(row.dose_time), "MMM d · h:mm a") },
                    { key: "status", header: "Status", render: () => <StatusBadge status="due" variant="warning" /> },
                  ]}
                  data={reminders}
                  keyExtractor={(row) => row.id}
                  emptyIcon={<Bell className="size-6" />}
                />
              ) : (
                <EmptyState
                  icon={<Bell className="size-6" />}
                  title="No reminders due"
                  description="Dose alerts will appear once a prescription is approved."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <section id="doctors" className="scroll-mt-24">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Doctors on HealthAI</CardTitle>
              <CardDescription>
                Map-based nearby search comes later. For now, browse registered specialists.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patient#doctors">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {doctors && doctors.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map((doctor) => (
                  <div key={doctor.profile_id} className="rounded-xl border bg-[#F8FAFC] p-4 hover:bg-white transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0F766E]">
                        <Users className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">{doctor.full_name || "Doctor"}</p>
                        <p className="text-sm text-[#0EA5E9]">{doctor.specialty}</p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {doctor.hospital || "Independent practice"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MapPin className="size-6" />}
                title="No doctors listed yet"
                description="When clinicians register, they will appear here for booking."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
