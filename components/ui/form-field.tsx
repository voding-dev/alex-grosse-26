"use client";

import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
  description?: string;
}

export function FormField({ 
  label, 
  required, 
  error, 
  children, 
  className = "",
  description 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-foreground/50">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600/80 font-medium">{error}</p>
      )}
    </div>
  );
}

