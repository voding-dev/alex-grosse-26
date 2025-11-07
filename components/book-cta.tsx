"use client";

import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface BookCTAProps {
  stripeUrl?: string;
}

export function BookCTA({ stripeUrl }: BookCTAProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {stripeUrl && (
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.open(stripeUrl, "_blank")}
          className="w-full sm:w-auto"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Deposit
        </Button>
      )}
    </div>
  );
}









