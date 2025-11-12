"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CampaignsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to email marketing page with campaigns tab
    router.replace("/admin/email-marketing?tab=campaigns");
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center">
        <p className="text-foreground/60">Redirecting to campaigns...</p>
      </div>
    </div>
  );
}

