"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link2 } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface PagesUsingTokenProps {
  token: string | null;
  adminEmail?: string;
}

export function PagesUsingToken({ token, adminEmail }: PagesUsingTokenProps) {
  const pages = useQuery(
    api.scheduling.getPagesUsingToken,
    token && adminEmail ? { token, email: adminEmail } : "skip"
  );

  if (!token || !pages || pages.length === 0) {
    return null;
  }

  const getAdminUrl = (page: { type: string; id: string; title: string; slug?: string }) => {
    switch (page.type) {
      case "landing-page":
        return `/admin/landing-pages/${page.id}`;
      case "graphic-designer":
        return "/admin/graphic-designer";
      case "portraits":
        return "/admin/portraits";
      case "design":
        return "/admin/design";
      default:
        return "#";
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-foreground/10">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3 w-3 text-foreground/60" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
          Used On:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={getAdminUrl(page)}
            className="text-xs px-2 py-1 rounded-md border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition-colors font-bold uppercase tracking-wider"
            onClick={(e) => e.stopPropagation()}
          >
            {page.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

interface PagesUsingRequestProps {
  requestId: Id<"schedulingRequests">;
  adminEmail?: string;
}

export function PagesUsingRequest({ requestId, adminEmail }: PagesUsingRequestProps) {
  const token = useQuery(
    api.scheduling.getPublicInviteToken,
    requestId && adminEmail ? { requestId, email: adminEmail } : "skip"
  );

  if (!token) {
    return null;
  }

  return <PagesUsingToken token={token} adminEmail={adminEmail} />;
}

