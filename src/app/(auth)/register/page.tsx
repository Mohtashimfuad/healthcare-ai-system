"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HeartPulse,
  User,
  Stethoscope,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Phone,
  Building2,
  Award,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { roleHome } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/specialties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

function RegisterForm({ defaultRole }: { defaultRole: "patient" | "doctor" }) {
  const router = useRouter();

  const [role, setRole] = useState<"patient" | "doctor">(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState<string>(SPECIALTIES[0]);
  const [hospital, setHospital] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const metadata = {
        role,
        full_name: fullName,
        phone: phone || null,
        ...(role === "doctor"
          ? {
              specialty,
              hospital: hospital || null,
            }
          : {}),
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Profile is created via database trigger or we create it here
        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            role,
            full_name: fullName,
            phone: phone || null,
          });
        }

        if (role === "doctor" && hospital) {
          await supabase.from("doctor_profiles").upsert({
            profile_id: data.user.id,
            specialty,
            hospital: hospital || null,
            availability_slots: [],
            rating: 0,
          });
        } else if (role === "doctor") {
          await supabase.from("doctor_profiles").upsert({
            profile_id: data.user.id,
            specialty,
            hospital: null,
            availability_slots: [],
            rating: 0,
          });
        }

        if (data.session) {
          router.push(roleHome(role));
          router.refresh();
          return;
        }

        // Email confirmation flow
        setSuccessMsg(
          "Registration successful! Please check your email inbox to verify your account before logging in."
        );
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred during registration.";
      setErrorMsg(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      {/* Brand logo link */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0EA5E9] to-[#14B8A6] flex items-center justify-center text-white shadow-md shadow-[#0EA5E9]/20 group-hover:scale-105 transition-transform">
            <HeartPulse className="w-5 h-5" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#0369A1] via-[#0EA5E9] to-[#14B8A6] bg-clip-text text-transparent">
            HealthAI
          </span>
        </Link>
        <p className="text-sm text-[#64748B] mt-2">
          Join our certified healthcare network as a patient or medical doctor
        </p>
      </div>

      <Card className="border-[#E2E8F0] shadow-xl shadow-[#0F172A]/5 bg-white">
        <CardHeader className="space-y-2 pb-4 text-center">
          <CardTitle className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Create an Account
          </CardTitle>
          <CardDescription className="text-sm text-[#64748B]">
            Sign up to start consulting, managing prescriptions, and scheduling care
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* ── ROLE SWITCHER (Patient vs Doctor) ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Choose Your Role
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                  role === "patient"
                    ? "bg-[#0EA5E9] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-white/60"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Patient</span>
              </button>

              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                  role === "doctor"
                    ? "bg-[#14B8A6] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-white/60"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Doctor</span>
              </button>
            </div>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#0F172A] text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#0F172A]">Verification email sent</p>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{successMsg}</p>
                <Link
                  href="/login"
                  className="inline-block mt-3 text-xs font-bold text-[#0EA5E9] hover:underline"
                >
                  Proceed to Login →
                </Link>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-[#0F172A]">
                  Full Name {role === "doctor" && "(e.g., Dr. Jane Smith)"}
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="fullName"
                    type="text"
                    required
                    placeholder={role === "doctor" ? "Dr. Jane Smith" : "John Doe"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20"
                  />
                </div>
              </div>

              {/* Doctor-Specific Fields: Specialty & Hospital */}
              {role === "doctor" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty" className="text-sm font-medium text-[#0F172A]">
                      Medical Specialty
                    </Label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full h-8 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0F172A] outline-none focus:border-[#14B8A6] focus:ring-3 focus:ring-[#14B8A6]/20 transition-all"
                      >
                        {SPECIALTIES.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hospital" className="text-sm font-medium text-[#0F172A]">
                      Hospital / Clinic
                    </Label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="hospital"
                        type="text"
                        placeholder="City General Hospital"
                        value={hospital}
                        onChange={(e) => setHospital(e.target.value)}
                        className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#14B8A6] focus:ring-[#14B8A6]/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-[#0F172A]">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                  Create Password (min. 6 chars)
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 text-sm font-bold text-white shadow-md transition-all ${
                  role === "doctor"
                    ? "bg-[#14B8A6] hover:bg-[#0369A1]"
                    : "bg-[#0EA5E9] hover:bg-[#0369A1]"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    Complete Registration as {role === "doctor" ? "Doctor" : "Patient"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-6 border-t border-[#E2E8F0] flex flex-col items-center gap-2">
          <p className="text-sm text-[#64748B]">
            Already have an account?{" "}
            <Link
              href={`/login?role=${role}`}
              className="font-semibold text-[#0EA5E9] hover:text-[#0369A1] underline underline-offset-4"
            >
              Log in as {role === "doctor" ? "Doctor" : "Patient"}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const defaultRole: "patient" | "doctor" = roleParam === "doctor" ? "doctor" : "patient";

  return <RegisterForm key={roleParam || "default"} defaultRole={defaultRole} />;
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#CCFBF1] selection:text-[#0369A1]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
          </div>
        }
      >
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
