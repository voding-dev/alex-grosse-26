"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface AdminTab {
  value: string;
  label: string;
}

interface AdminTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: AdminTab[];
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  gridCols?: number;
}

export function AdminTabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
  maxWidth = "3xl",
  gridCols,
}: AdminTabsProps) {
  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    full: "max-w-full",
  }[maxWidth];

  // Determine grid columns
  const cols = gridCols || tabs.length;
  const gridColsClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
    9: "grid-cols-9",
    10: "grid-cols-10",
  }[cols] || "grid-cols-1";

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("space-y-6", className)}>
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <TabsList 
          className={cn(
            "grid w-full bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1 min-w-max sm:min-w-0",
            maxWidthClass,
            gridColsClass
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2.5 sm:py-3 px-3 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm whitespace-nowrap min-w-fit"
              style={{ fontWeight: '900' }}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

// Export TabsContent for convenience
export { TabsContent };

