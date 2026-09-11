import { format, parseISO } from "date-fns";
import { Bot, Calendar, Stethoscope, Users, Plus, ArrowRight } from "lucide-react";
import { requireProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard, EmptyState, DataTable, StatusBadge } from "@/components/ui/data-display";

export default async function DoctorDashboardPage() {
  const profile = await requireProfile("doctor");
  const supabase = await createClient();

  const [{ data: doctorProfile }, { data: appointments }, { data: prescriptions }] =
    await Promise.all([
      supabase
        .from("doctor_profiles")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", profile.id)
        .order("scheduled_at", { ascending: true })
        .limit(8),
      supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", profile.id)
        .eq("doctor_approved", false)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const uniquePatients = new Set(appointments?.map((item) => item.patient_id) ?? []).size;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#14B8A6]">Doctor portal</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            {profile.full_name || "Doctor"}
          </h1>
          <p className="mt-2 text-[#64748B]">
            {doctorProfile?.specialty || "General Physician"}
            {doctorProfile?.hospital ? ` · ${doctorProfile.hospital}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/doctor#appointments">
              <Plus className="w-4 h-4 mr-2" />
              Manage Schedule
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="size-5" />}
          label="Scheduled visits"
          value={appointments?.length ?? 0}
          color="primary"
        />
        <StatCard
          icon={<Bot className="size-5" />}
          label="Pending AI drafts"
          value={prescriptions?.length ?? 0}
          color="warning"
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Patients in queue"
          value={uniquePatients}
          color="accent"
        />
        <StatCard
          icon={<Stethoscope className="size-5" />}
          label="Rating"
          value={Number((doctorProfile?.rating ?? 0).toFixed(1))}
          color="success"
        />
      </div>

      <section id="appointments" className="scroll-mt-24">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Appointment queue</CardTitle>
              <CardDescription>Confirm, complete, or follow up on booked visits.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/doctor#appointments">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {appointments && appointments.length > 0 ? (
              <DataTable
                columns={[
                  { key: "type", header: "Type", render: (row) => <span className="capitalize">{row.type} consultation</span> },
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
                description="When patients book a slot, they will appear in this queue."
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
                <CardTitle>AI drafts to review</CardTitle>
                <CardDescription>
                  Approve or edit medicine suggestions before they reach the patient.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href="/doctor#prescriptions">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </CardHeader>
            <CardContent>
              {prescriptions && prescriptions.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "medicines", header: "Medicines", render: (row) => `${row.medicines.length} suggested medicine${row.medicines.length === 1 ? "" : "s"}` },
                    { key: "created_at", header: "Created", render: (row) => format(parseISO(row.created_at), "MMM d, yyyy") },
                    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} variant="warning" /> },
                  ]}
                  data={prescriptions}
                  keyExtractor={(row) => row.id}
                  emptyIcon={<Bot className="size-6" />}
                />
              ) : (
                <EmptyState
                  icon={<Bot className="size-6" />}
                  title="Nothing waiting for review"
                  description="AI prescription drafts will land here after a consultation."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="patients" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Practice snapshot</CardTitle>
              <CardDescription>Availability and profile used for patient matching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b py-2">
                <span className="text-[#64748B]">Specialty</span>
                <span className="font-medium text-[#0F172A]">{doctorProfile?.specialty || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b py-2">
                <span className="text-[#64748B]">Clinic</span>
                <span className="font-medium text-[#0F172A]">{doctorProfile?.hospital || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b py-2">
                <span className="text-[#64748B]">Open slots</span>
                <span className="font-medium text-[#0F172A]">{doctorProfile?.availability_slots.length ?? 0} configured</span>
              </div>
              <p className="pt-2 text-[#64748B]">
                Slot editing and in-person map pins will be added with the booking system.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
