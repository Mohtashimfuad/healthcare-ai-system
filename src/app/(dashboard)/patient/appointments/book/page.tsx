"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, Stethoscope, Video, MapPin, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DoctorItem {
  profile_id: string;
  specialty: string;
  hospital: string | null;
  rating: number;
  full_name?: string;
}

interface TimeSlot {
  time: string;
  label: string;
}

type VisitType = "in-person" | "online";
type Step = 1 | 2 | 3 | 4;

const VISIT_TYPES: { value: VisitType; label: string; desc: string; icon: typeof Video }[] = [
  { value: "in-person", label: "In-Person", desc: "Visit the clinic in person", icon: MapPin },
  { value: "online",    label: "Online",    desc: "Video or phone consultation", icon: Video },
];

const STEPS = [
  { num: 1 as Step, label: "Doctor"   },
  { num: 2 as Step, label: "Date"     },
  { num: 3 as Step, label: "Details"  },
  { num: 4 as Step, label: "Confirm"  },
];

export default function BookAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isPending, startTransition] = useTransition();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [specialty, setSpecialty] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [visitType, setVisitType] = useState<VisitType>("in-person");
  const [reason, setReason] = useState("");

  const [booked, setBooked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (specialty) params.set("specialty", specialty);
    fetch(`/api/doctors?${params}`)
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, [specialty]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/doctors/availability?doctor_id=${selectedDoctor.profile_id}&date=${dateStr}`)
      .then((r) => r.json())
      .then((data: { available_slots?: string[] }) => {
        const raw = data.available_slots ?? [];
        setSlots(
          raw.map((t: string) => ({
            time: t,
            label: format(new Date(`2000-01-01T${t}`), "h:mm a"),
          }))
        );
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  function handleBook() {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    setError(null);
    const scheduledAt = new Date(
      `${format(selectedDate, "yyyy-MM-dd")}T${selectedSlot}`
    ).toISOString();

    startTransition(async () => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: selectedDoctor.profile_id,
          scheduled_at: scheduledAt,
          type: visitType,
          reason: reason.trim() || undefined,
        }),
      });
      if (res.ok) {
        setBooked(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Booking failed. Please try again.");
      }
    });
  }

  const today = startOfDay(new Date());
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1));
  const specialties = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))];

  if (booked) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="size-16 text-[#22C55E]" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Appointment booked!</h1>
        <p className="text-[#64748B]">
          Your {visitType} appointment with Dr. {selectedDoctor?.full_name ?? "your doctor"} on{" "}
          {selectedDate ? format(selectedDate, "EEEE, MMMM d") : ""} at{" "}
          {slots.find((s) => s.time === selectedSlot)?.label ?? selectedSlot} is confirmed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={() => router.push("/patient")}>Back to dashboard</Button>
          <Button variant="outline" onClick={() => { setBooked(false); setStep(1); setSelectedDoctor(null); setSelectedDate(null); setSelectedSlot(null); setReason(""); }}>
            Book another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#0EA5E9]">Patient portal</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Book an appointment</h1>
        <p className="mt-1 text-[#64748B]">Find a doctor and pick a time that works for you.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step === s.num
                    ? "bg-[#0EA5E9] text-white"
                    : step > s.num
                    ? "bg-[#22C55E] text-white"
                    : "bg-[#E2E8F0] text-[#64748B]"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-xs font-medium ${step >= s.num ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mt-[-12px] ${step > s.num ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="size-5 text-[#0EA5E9]" />
              Choose a doctor
            </CardTitle>
            <CardDescription>Browse verified specialists on HealthAI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSpecialty("")}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  specialty === "" ? "bg-[#0EA5E9] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                }`}
              >
                All
              </button>
              {specialties.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecialty(s)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    specialty === s ? "bg-[#0EA5E9] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {loadingDoctors ? (
              <div className="flex items-center justify-center py-12 text-[#64748B]">
                <Loader2 className="size-6 animate-spin mr-2" /> Loading doctors…
              </div>
            ) : doctors.length === 0 ? (
              <div className="py-12 text-center text-[#64748B]">
                <User className="size-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium">No doctors found</p>
                <p className="text-sm">Doctors will appear here once they register.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {doctors.map((doc) => (
                  <button
                    key={doc.profile_id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                      selectedDoctor?.profile_id === doc.profile_id
                        ? "border-[#0EA5E9] bg-[#E0F2FE]"
                        : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#0EA5E9]/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0F766E]">
                        <User className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">{doc.full_name ?? "Doctor"}</p>
                        <p className="text-sm text-[#0EA5E9]">{doc.specialty}</p>
                        <p className="mt-0.5 text-xs text-[#64748B]">{doc.hospital ?? "Independent practice"}</p>
                        <p className="mt-1 text-xs font-medium text-[#22C55E]">★ {doc.rating?.toFixed(1) ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button disabled={!selectedDoctor} onClick={() => setStep(2)}>
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-[#0EA5E9]" />
              Pick a date &amp; time
            </CardTitle>
            <CardDescription>
              Booking with Dr. {selectedDoctor?.full_name ?? "your doctor"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-semibold text-[#0F172A] mb-2 block">Select a date</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dateOptions.map((date) => {
                  const isSelected = selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        isSelected
                          ? "border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-sm"
                          : "border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:border-[#0EA5E9]/40"
                      }`}
                    >
                      <span className="text-xs font-medium opacity-70">{format(date, "EEE")}</span>
                      <span className="text-lg font-bold leading-tight">{format(date, "d")}</span>
                      <span className="text-xs opacity-70">{format(date, "MMM")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div>
                <Label className="text-sm font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
                  <Clock className="size-4 text-[#0EA5E9]" />
                  Available slots for {format(selectedDate, "EEE, MMM d")}
                </Label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 py-6 text-[#64748B]">
                    <Loader2 className="size-4 animate-spin" /> Checking availability…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="py-6 text-sm text-[#64748B]">No available slots for this date. Try another day.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          selectedSlot === slot.time
                            ? "border-[#0EA5E9] bg-[#0EA5E9] text-white"
                            : "border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:border-[#0EA5E9]/40"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
              <Button disabled={!selectedDate || !selectedSlot} onClick={() => setStep(3)}>
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Visit details</CardTitle>
            <CardDescription>Tell us how you prefer to meet and your reason for visiting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#0F172A]">Visit type</Label>
              <div className="grid grid-cols-2 gap-3">
                {VISIT_TYPES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setVisitType(value)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      visitType === value
                        ? "border-[#0EA5E9] bg-[#E0F2FE]"
                        : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#0EA5E9]/40"
                    }`}
                  >
                    <Icon className={`size-5 mb-2 ${visitType === value ? "text-[#0EA5E9]" : "text-[#64748B]"}`} />
                    <p className="font-semibold text-sm text-[#0F172A]">{label}</p>
                    <p className="text-xs text-[#64748B]">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-semibold text-[#0F172A]">
                Reason for visit <span className="font-normal text-[#64748B]">(optional)</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Briefly describe your symptoms or reason for visiting…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)}>
                Review &amp; confirm <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-[#22C55E]" />
              Confirm your booking
            </CardTitle>
            <CardDescription>Review the details below before confirming.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] overflow-hidden">
              {[
                { label: "Doctor",     value: `Dr. ${selectedDoctor?.full_name ?? "—"}` },
                { label: "Specialty",  value: selectedDoctor?.specialty ?? "—" },
                { label: "Clinic",     value: selectedDoctor?.hospital ?? "Independent practice" },
                { label: "Date",       value: selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "—" },
                { label: "Time",       value: slots.find((s) => s.time === selectedSlot)?.label ?? selectedSlot ?? "—" },
                { label: "Visit type", value: visitType === "in-person" ? "In-Person" : "Online (video/phone)" },
                ...(reason.trim() ? [{ label: "Reason", value: reason.trim() }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-[#64748B] shrink-0">{label}</span>
                  <span className="text-sm font-medium text-[#0F172A] text-right">{value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-sm font-medium text-[#991B1B]">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isPending}>
                <ChevronLeft className="size-4 mr-1" /> Back
              </Button>
              <Button onClick={handleBook} disabled={isPending}>
                {isPending ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Booking…</>
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
