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
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="text-center">
        <p className="uppercase tracking-wider text-sm font-medium" style={{ color: '#888' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
