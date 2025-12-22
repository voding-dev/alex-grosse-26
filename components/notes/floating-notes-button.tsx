"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotesPanel } from "./notes-panel";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export function FloatingNotesButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAdminAuth();

  // Only show button when authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[120]",
          "h-12 w-12 sm:h-14 sm:w-14 rounded-full",
          "shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-300",
          "hover:scale-110 hover:shadow-xl",
          "active:scale-95",
          "touch-manipulation",
          "group"
        )}
        style={{ backgroundColor: '#586034', color: '#fff', boxShadow: '0 4px 14px rgba(88, 96, 52, 0.3)' }}
        aria-label="Open notes"
      >
        <StickyNote className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:rotate-12" />
      </button>
      
      <NotesPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

