"use client";

import * as React from "react";
import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string;
  image?: string;
  role?: "patient" | "doctor";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function UserAvatar({ name, image, role, size = "default", className }: UserAvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = role === "doctor" ? "bg-[#CCFBF1] text-[#0F766E]" : "bg-[#E0F2FE] text-[#0369A1]";

  return (
    <Avatar className={cn(size === "sm" ? "data-[size=sm]:size-8" : size === "lg" ? "data-[size=lg]:size-12" : "", className)}>
      {image ? (
        <AvatarImage src={image} alt={name || "User"} />
      ) : (
        <AvatarFallback className={bgColor}>{initials || (role === "doctor" ? "Dr" : "Pt")}</AvatarFallback>
      )}
    </Avatar>
  );
}

export function RoleBadge({ role }: { role: "patient" | "doctor" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        role === "doctor"
          ? "bg-[#CCFBF1] text-[#0F766E]"
          : "bg-[#E0F2FE] text-[#0369A1]"
      }`}
    >
      {role === "doctor" ? "Doctor" : "Patient"}
    </span>
  );
}