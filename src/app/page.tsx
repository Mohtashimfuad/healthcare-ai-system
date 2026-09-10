import Link from "next/link";
import {
  Activity,
  Bot,
  Calendar,
  Bell,
  MapPin,
  ShieldCheck,
  Stethoscope,
  User,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight,
  HeartPulse,
  CheckCircle2,
  Users,
  Building2,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col selection:bg-[#CCFBF1] selection:text-[#0369A1]">
      {/* ─────────────────────────────────────────────────────────────
          NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center text-white shadow-md shadow-[#0EA5E9]/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#0369A1] via-[#0EA5E9] to-[#14B8A6] bg-clip-text text-transparent">
                HealthAI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0369A1]">
                Medical OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
            <a href="#features" className="hover:text-[#0EA5E9] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#0EA5E9] transition-colors">
              How It Works
            </a>
            <a href="#specialties" className="hover:text-[#0EA5E9] transition-colors">
              Specialists
            </a>
            <a href="#security" className="hover:text-[#0EA5E9] transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 text-[#0369A1] hover:text-[#0EA5E9] hover:bg-[#E0F2FE]/50 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-[#0EA5E9] text-white hover:bg-[#0369A1] shadow-sm transition-all"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Background decorative gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none opacity-40 blur-3xl -z-10">
          <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-[#0EA5E9]/40 mix-blend-multiply filter" />
          <div className="absolute top-10 right-1/4 w-72 h-72 rounded-full bg-[#14B8A6]/40 mix-blend-multiply filter" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CCFBF1] text-[#0369A1] text-xs sm:text-sm font-semibold mb-8 shadow-xs border border-[#14B8A6]/20">
              <Sparkles className="w-4 h-4 text-[#14B8A6]" />
              <span>Next-Gen Medical Intelligence & Telehealth</span>
            </div>

            {/* Hero Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.15]">
              AI-Powered <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-[#0EA5E9] via-[#0369A1] to-[#14B8A6] bg-clip-text text-transparent">
                Healthcare Platform
              </span>
            </h1>

            {/* Short Description */}
            <p className="mt-6 text-lg sm:text-xl text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              Connecting patients with certified medical professionals through intelligent symptom
              analysis, digital prescriptions, automated dosage schedules, and instant clinic discovery.
            </p>

            {/* ── TWO BIG BUTTONS (Patient / Doctor) ── */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
              <Link
                href="/login?role=patient"
                className="w-full sm:w-1/2 flex items-center justify-between gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0369A1] text-white font-semibold text-base shadow-lg shadow-[#0EA5E9]/25 hover:shadow-xl hover:shadow-[#0EA5E9]/35 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/15 backdrop-blur-xs">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-[#CCFBF1] font-normal uppercase tracking-wider">
                      Portal
                    </div>
                    <div>Login as Patient</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/login?role=doctor"
                className="w-full sm:w-1/2 flex items-center justify-between gap-3 px-6 py-4 rounded-xl bg-white border-2 border-[#14B8A6] text-[#0369A1] font-semibold text-base shadow-lg shadow-[#14B8A6]/10 hover:bg-[#CCFBF1]/20 hover:border-[#0EA5E9] hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#CCFBF1] text-[#14B8A6]">
                    <Stethoscope className="w-5 h-5 text-[#14B8A6]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-[#64748B] font-normal uppercase tracking-wider">
                      Physicians
                    </div>
                    <div>Login as Doctor</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#14B8A6] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Quick Register Link */}
            <p className="mt-4 text-sm text-[#64748B]">
              New to HealthAI?{" "}
              <Link
                href="/register"
                className="font-medium text-[#0EA5E9] hover:text-[#0369A1] underline underline-offset-4"
              >
                Create an account
              </Link>{" "}
              in less than 2 minutes.
            </p>
          </div>

          {/* ── HERO METRICS & LIVE PREVIEW ── */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="p-1 rounded-2xl bg-gradient-to-b from-[#0EA5E9]/20 via-[#14B8A6]/10 to-transparent">
              <div className="rounded-[14px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xl shadow-[#0F172A]/5 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
                <div className="flex flex-col items-center text-center pt-4 md:pt-0">
                  <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-[#0F172A]">50,000+</span>
                  <span className="text-xs font-medium text-[#64748B] mt-1">
                    Registered Patients
                  </span>
                </div>

                <div className="flex flex-col items-center text-center pt-4 md:pt-0">
                  <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#14B8A6] flex items-center justify-center mb-2">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-[#0F172A]">1,200+</span>
                  <span className="text-xs font-medium text-[#64748B] mt-1">
                    Certified Doctors
                  </span>
                </div>

                <div className="flex flex-col items-center text-center pt-4 md:pt-0">
                  <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0EA5E9] flex items-center justify-center mb-2">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-[#0F172A]">99.2%</span>
                  <span className="text-xs font-medium text-[#64748B] mt-1">
                    Prescription Accuracy
                  </span>
                </div>

                <div className="flex flex-col items-center text-center pt-4 md:pt-0">
                  <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#22C55E] flex items-center justify-center mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-extrabold text-[#0F172A]">100%</span>
                  <span className="text-xs font-medium text-[#64748B] mt-1">
                    HIPAA & RLS Secure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FEATURES SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#0EA5E9] mb-3">
              Comprehensive Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Intelligent Tools Built for Patients & Clinicians
            </p>
            <p className="mt-4 text-base sm:text-lg text-[#64748B]">
              From intelligent triage to digital treatment fulfillment, every module is designed
              for accuracy, safety, and seamless communication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: AI Medicine Suggestion */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0EA5E9] hover:shadow-xl hover:shadow-[#0EA5E9]/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0EA5E9] to-[#0369A1] text-white flex items-center justify-center mb-5 shadow-md shadow-[#0EA5E9]/20 group-hover:scale-110 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#0EA5E9] transition-colors">
                  AI Medicine Suggestion
                </h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  State-of-the-art clinical AI synthesizes patient symptoms, medical reports, and
                  known allergies to generate instant, doctor-approved medication suggestions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center text-xs font-semibold text-[#0369A1]">
                <span>Doctor-reviewed safety checks</span>
              </div>
            </div>

            {/* Feature 2: Online Appointment */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#14B8A6] hover:shadow-xl hover:shadow-[#14B8A6]/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#0369A1] text-white flex items-center justify-center mb-5 shadow-md shadow-[#14B8A6]/20 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#14B8A6] transition-colors">
                  Online Appointment
                </h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Book flexible teleconsultations or in-person clinic visits. Real-time slot availability,
                  automated calendar syncing, and status updates right in your dashboard.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center text-xs font-semibold text-[#14B8A6]">
                <span>Online & physical visits</span>
              </div>
            </div>

            {/* Feature 3: Medicine Reminder */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0EA5E9] hover:shadow-xl hover:shadow-[#0EA5E9]/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0EA5E9] to-[#14B8A6] text-white flex items-center justify-center mb-5 shadow-md shadow-[#0EA5E9]/20 group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#0EA5E9] transition-colors">
                  Medicine Reminder
                </h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Never miss a scheduled dose. Automatically converts approved doctor prescriptions
                  into personalized time-stamped alerts with one-tap adherence confirmation.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center text-xs font-semibold text-[#0369A1]">
                <span>Automated dosage tracking</span>
              </div>
            </div>

            {/* Feature 4: Find Nearby Doctor */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#14B8A6] hover:shadow-xl hover:shadow-[#14B8A6]/5 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#14B8A6] to-[#22C55E] text-white flex items-center justify-center mb-5 shadow-md shadow-[#14B8A6]/20 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#14B8A6] transition-colors">
                  Find Nearby Doctor
                </h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Locate verified specialists and hospitals near your coordinates. Filter by
                  medical specialty, user ratings, distance, and immediate consultation slots.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center text-xs font-semibold text-[#22C55E]">
                <span>GPS & specialty matching</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          HOW IT WORKS
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#14B8A6] mb-3">
              Simple 3-Step Journey
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Care Delivered Seamlessly
            </p>
            <p className="mt-4 text-base text-[#64748B]">
              Experience an integrated workflow engineered for faster recoveries and clinical peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0369A1] font-bold flex items-center justify-center text-lg mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Sign Up & Log Symptoms</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Create a patient or doctor profile. Upload laboratory reports or input symptoms to receive
                preliminary AI triage summaries.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#14B8A6] font-bold flex items-center justify-center text-lg mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Book & Consult Specialist</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Connect virtually or physically with verified doctors. Clinicians review AI notes and
                issue customized, signed digital prescriptions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0EA5E9] font-bold flex items-center justify-center text-lg mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-3">Automated Reminders & Follow-up</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Get notified on your mobile device for every dose. Doctors monitor patient adherence
                and schedule timely follow-ups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          ROLE PORTAL SPOTLIGHT (DOCTOR & PATIENT)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Patient Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#E0F2FE]/60 via-white to-white border border-[#0EA5E9]/20 shadow-lg shadow-[#0EA5E9]/5 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0EA5E9]/10 text-[#0369A1] text-xs font-bold uppercase mb-6">
                  <User className="w-3.5 h-3.5" /> For Patients
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-4">
                  Take Control of Your Health Journey
                </h3>
                <p className="text-sm sm:text-base text-[#64748B] mb-6 leading-relaxed">
                  Access your medical records, check symptoms anytime with AI, schedule visits with
                  trusted doctors, and receive timely pill alerts.
                </p>
                <ul className="space-y-3 mb-8 text-sm text-[#0F172A]">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                    <span>Instant AI triage and drug interaction safety alerts</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                    <span>One-click digital appointments with top specialists</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                    <span>Personalized daily dosage reminders</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/login?role=patient"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0EA5E9] text-white font-semibold text-sm hover:bg-[#0369A1] shadow-md transition-colors"
              >
                Access Patient Portal
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Doctor Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#CCFBF1]/40 via-white to-white border border-[#14B8A6]/20 shadow-lg shadow-[#14B8A6]/5 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14B8A6]/10 text-[#0369A1] text-xs font-bold uppercase mb-6">
                  <Stethoscope className="w-3.5 h-3.5" /> For Doctors
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-4">
                  Empower Your Practice with AI Assist
                </h3>
                <p className="text-sm sm:text-base text-[#64748B] mb-6 leading-relaxed">
                  Manage patient consultations, receive AI draft prescriptions, publish availability
                  schedules, and improve clinical outcomes with less paperwork.
                </p>
                <ul className="space-y-3 mb-8 text-sm text-[#0F172A]">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />
                    <span>AI-assisted prescription drafts with instant approval flow</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />
                    <span>Real-time calendar & appointment status management</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#14B8A6] shrink-0" />
                    <span>Patient history, report OCR, and allergy visibility</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/login?role=doctor"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#14B8A6] text-white font-semibold text-sm hover:bg-[#0369A1] shadow-md transition-colors"
              >
                Access Doctor Portal
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          CALL TO ACTION (FOOTER CTA)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-[#0369A1] via-[#0EA5E9] to-[#14B8A6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Experience Modern Healthcare?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#CCFBF1] max-w-2xl mx-auto">
            Join thousands of patients and licensed physicians streamlining diagnosis, treatment,
            and daily health monitoring.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?role=patient"
              className="px-8 py-3.5 rounded-xl bg-white text-[#0369A1] font-bold text-sm hover:bg-[#F8FAFC] shadow-lg transition-all"
            >
              Sign Up as Patient
            </Link>
            <Link
              href="/register?role=doctor"
              className="px-8 py-3.5 rounded-xl bg-[#0369A1]/40 border border-white/30 text-white font-bold text-sm hover:bg-white/10 shadow-lg transition-all"
            >
              Join as Medical Doctor
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12 text-[#64748B] text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center text-white">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-[#0F172A]">HealthAI</span>
              <span className="text-xs text-[#64748B]">
                © {new Date().getFullYear()} HealthAI Inc. All rights reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#64748B]">
              <a href="#" className="hover:text-[#0EA5E9] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-[#0EA5E9] transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-[#0EA5E9] transition-colors">
                HIPAA Compliance
              </a>
              <a href="#" className="hover:text-[#0EA5E9] transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
