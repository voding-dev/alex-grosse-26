"use client";

import Link from "next/link";
import { X } from "lucide-react";

export function CloseButton() {
  return (
    <Link
      href="/"
      className="fixed left-6 top-[105px] z-50 flex h-8 w-8 items-center justify-center text-white transition-opacity hover:opacity-80"
      aria-label="Back to home"
    >
      <X className="h-8 w-8 stroke-[3]" />
    </Link>
  );
}

