"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Bot,
  Calendar,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  User,
} from "lucide-react";
import type { Profile } from "@/types";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { UserAvatar, RoleBadge } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PATIENT_NAV = [
  { href: "/patient", label: "Overview", icon: LayoutDashboard },
  { href: "/patient/appointments/book", label: "Book Appointment", icon: Calendar },
  { href: "/patient/ai-suggest", label: "AI Suggest", icon: Bot },
  { href: "/patient#reminders", label: "Reminders", icon: Bell },
  { href: "/patient#doctors", label: "Find Doctors", icon: MapPin },
];

const DOCTOR_NAV = [
  { href: "/doctor", label: "Overview", icon: LayoutDashboard },
  { href: "/doctor#appointments", label: "Appointments", icon: Calendar },
  { href: "/doctor#prescriptions", label: "Prescriptions", icon: Bot },
  { href: "/doctor#patients", label: "Patients", icon: User },
];

export function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const nav = profile.role === "doctor" ? DOCTOR_NAV : PATIENT_NAV;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href={profile.role === "doctor" ? "/doctor" : "/patient"} className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0EA5E9] to-[#14B8A6] text-white shadow-sm">
              <HeartPulse className="size-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#0F172A]">HealthAI</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#F1F5F9]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-[#0F172A]">{profile.full_name || "Account"}</p>
              <RoleBadge role={profile.role} />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl">
                  <UserAvatar name={profile.full_name} role={profile.role} size="sm" className="h-9 w-9" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 border-b">
                  <p className="text-sm font-semibold text-[#0F172A]">{profile.full_name || "Account"}</p>
                  <p className="text-xs text-[#64748B] truncate">{profile.role === "doctor" ? "Medical Doctor" : "Patient"}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={profile.role === "doctor" ? "/doctor" : "/patient"} className="flex w-full items-center gap-2">
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="flex w-full items-center gap-2">
                    <User className="size-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <SignOutButton />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 bg-white">
            <nav className="flex flex-col gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
