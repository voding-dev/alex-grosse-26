"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Hero editor as the default admin page
    router.replace("/admin/website-editor/hero");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-foreground/60 uppercase tracking-wider text-sm font-medium">
          Loading...
        </p>
      </div>
    </div>
  );
}
