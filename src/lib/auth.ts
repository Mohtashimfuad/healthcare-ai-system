import type { UserRole } from "@/types";

export function isUserRole(value: unknown): value is UserRole {
  return value === "patient" || value === "doctor";
}

export function roleHome(role: unknown): "/patient" | "/doctor" {
  return role === "doctor" ? "/doctor" : "/patient";
}
