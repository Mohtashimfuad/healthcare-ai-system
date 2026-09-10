"use client";

import { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "doctor" ? "doctor" : "patient";

  const [role, setRole] = useState<"patient" | "doctor">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync role if search param changes
  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "doctor" || r === "patient") {
      setRole(r);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Verify role in user profile or metadata
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const userRole =
          (profile as { role?: string } | null)?.role ||
          (data.user.user_metadata?.role as string) ||
          role;

        // Redirect based on role or to dashboard
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred during login.";
      setErrorMsg(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
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
          Secure portal for clinical operations & patient care
        </p>
      </div>

      <Card className="border-[#E2E8F0] shadow-xl shadow-[#0F172A]/5 bg-white">
        <CardHeader className="space-y-2 pb-4 text-center">
          <CardTitle className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm text-[#64748B]">
            Sign in to access your medical records & consultations
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* ── ROLE SWITCHER (Patient vs Doctor) ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Select Account Type
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

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder={
                    role === "doctor" ? "doctor.name@hospital.org" : "patient@example.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                  Password
                </Label>
                <a
                  href="#"
                  className="text-xs text-[#0EA5E9] hover:text-[#0369A1] transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
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
                  Signing In...
                </>
              ) : (
                <>
                  Sign In as {role === "doctor" ? "Doctor" : "Patient"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="pt-2 pb-6 border-t border-[#E2E8F0] flex flex-col items-center gap-2">
          <p className="text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register?role=${role}`}
              className="font-semibold text-[#0EA5E9] hover:text-[#0369A1] underline underline-offset-4"
            >
              Register as {role === "doctor" ? "Doctor" : "Patient"}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#CCFBF1] selection:text-[#0369A1]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
