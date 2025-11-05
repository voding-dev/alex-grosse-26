"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Calendar, CreditCard } from "lucide-react";

interface BookCTAProps {
  calUrl?: string;
  stripeUrl?: string;
}

export function BookCTA({ calUrl, stripeUrl }: BookCTAProps) {
  const [showCal, setShowCal] = useState(false);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {calUrl && (
        <Button
          onClick={() => {
            if (calUrl.startsWith("http")) {
              window.open(calUrl, "_blank");
            } else {
              setShowCal(true);
            }
          }}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Book a Call
        </Button>
      )}
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
      {showCal && calUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl bg-background p-4">
            <button
              onClick={() => setShowCal(false)}
              className="absolute right-4 top-4 text-foreground/60 hover:text-foreground"
            >
              ×
            </button>
            <iframe src={calUrl} width="100%" height="600" className="border-0" />
          </div>
        </div>
      )}
    </div>
  );
}






