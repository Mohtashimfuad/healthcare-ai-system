"use client";

import * as React from "react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: { value: number; label: string };
  color?: "primary" | "accent" | "success" | "warning";
  className?: string;
}

const colorStyles = {
  primary: "bg-[#E0F2FE] text-[#0369A1]",
  accent: "bg-[#CCFBF1] text-[#0F766E]",
  success: "bg-[#DCFCE7] text-[#166534]",
  warning: "bg-[#FEF3C7] text-[#92400E]",
};

export function StatCard({ icon, label, value, trend, color = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="flex items-center gap-4 pt-0">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", colorStyles[color])}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-extrabold text-[#0F172A] truncate">{value}</p>
          <p className="text-xs font-medium text-[#64748B] truncate">{label}</p>
          {trend && (
            <p className="text-xs font-medium text-[#22C55E] mt-0.5 flex items-center gap-1">
              <span className="text-[10px]">▲</span>
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color?: "primary" | "accent" | "success";
  className?: string;
}

export function QuickActionCard({ href, icon, title, description, color = "primary", className }: QuickActionCardProps) {
  const gradientColor =
    color === "primary"
      ? "from-[#0EA5E9] to-[#0369A1]"
      : color === "success"
      ? "from-[#22C55E] to-[#15803D]"
      : "from-[#14B8A6] to-[#0369A1]";

  return (
    <a href={href} className="block">
      <Card className={cn("h-full transition-all hover:shadow-lg hover:-translate-y-0.5", className)}>
        <CardContent className="flex gap-3 pt-0">
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr", gradientColor, "text-white")}>
            {icon}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A]">{title}</p>
            <p className="text-sm text-[#64748B]">{description}</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]">
        {icon}
      </div>
      <p className="font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[#64748B]">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0EA5E9] hover:text-[#0369A1] hover:underline"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}

interface DataTableProps<T> {
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  emptyIcon,
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon || <span className="text-2xl">📭</span>}
        title="No records found"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            {columns.map((col) => (
              <th key={col.key} className="h-10 px-3 text-left font-medium text-[#64748B]">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]/50">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3 text-[#0F172A]">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function StatusBadge({ status, variant = "default", className }: StatusBadgeProps) {
  const variants = {
    default: "bg-[#E0F2FE] text-[#0369A1]",
    success: "bg-[#DCFCE7] text-[#166534]",
    warning: "bg-[#FEF3C7] text-[#92400E]",
    danger: "bg-[#FEE2E2] text-[#991B1B]",
    info: "bg-[#CCFBF1] text-[#0F766E]",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}>
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}