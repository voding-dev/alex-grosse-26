"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function FormSection({ 
  title, 
  description, 
  children, 
  className = "",
  collapsible = false,
  defaultOpen = true
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b border-foreground/10 pb-3">
        <h3 className="text-base font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs text-foreground/50 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

