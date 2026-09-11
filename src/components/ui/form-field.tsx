"use client";

import * as React from "react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel" | "number" | "date";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  value = "",
  onChange,
  onBlur,
  as = "input",
  options = [],
}: FormFieldProps) {
  const id = `form-field-${name}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-[#0F172A]">
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </Label>

      {as === "select" ? (
        <Select onValueChange={(val) => onChange && onChange(val ? String(val) : "")}>
          <SelectTrigger
            id={id}
            disabled={disabled}
            className={cn(
              "bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20",
              error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : as === "textarea" ? (
        <Textarea
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
          )}
        />
      ) : (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "bg-[#F8FAFC] border-[#E2E8F0] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
          )}
        />
      )}

      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#64748B]">{hint}</p>}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
        {description && <p className="text-sm text-[#64748B] mt-1">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}