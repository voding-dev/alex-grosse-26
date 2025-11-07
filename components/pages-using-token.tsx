"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

interface PagesUsingTokenProps {
  token: string | null;
  adminEmail?: string;
  textColor?: string;
}

export function PagesUsingToken({ token, adminEmail, textColor }: PagesUsingTokenProps) {
  const router = useRouter();
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

  const handlePageClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(url);
  };

  // Helper to convert rgba string to hex or use as-is
  const getColorWithOpacity = (color: string, opacity: number): string => {
    // If it's already an rgba string, extract RGB and apply new opacity
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
      }
    }
    // If it's a hex color, convert to rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Default fallback
    return color;
  };

  // Use provided textColor or default to white with opacity
  const defaultTextColor = textColor || 'rgba(255, 255, 255, 0.7)';
  const defaultBorderColor = textColor ? getColorWithOpacity(textColor, 0.1) : 'rgba(255, 255, 255, 0.1)';
  const defaultBgColor = textColor ? getColorWithOpacity(textColor, 0.1) : 'rgba(255, 255, 255, 0.1)';
  const defaultBorderColorHover = textColor ? getColorWithOpacity(textColor, 0.2) : 'rgba(255, 255, 255, 0.2)';
  const defaultBgColorHover = textColor ? getColorWithOpacity(textColor, 0.2) : 'rgba(255, 255, 255, 0.2)';

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: defaultBorderColor }}>
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5" style={{ color: defaultTextColor }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: defaultTextColor }}>
          Used On:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => {
          const url = getAdminUrl(page);
          return (
            <div
              key={page.id}
              role="button"
              tabIndex={0}
              className="text-xs px-3 py-1.5 rounded-full border font-bold uppercase tracking-wider transition-colors cursor-pointer"
              style={{
                borderColor: defaultBorderColorHover,
                backgroundColor: defaultBgColor,
                color: textColor || 'rgba(255, 255, 255, 0.9)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = defaultBgColorHover;
                e.currentTarget.style.borderColor = textColor ? getColorWithOpacity(textColor, 0.3) : 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = defaultBgColor;
                e.currentTarget.style.borderColor = defaultBorderColorHover;
              }}
              onClick={(e) => handlePageClick(e, url)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePageClick(e as any, url);
                }
              }}
            >
              {page.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PagesUsingRequestProps {
  requestId: Id<"schedulingRequests">;
  adminEmail?: string;
  textColor?: string;
}

export function PagesUsingRequest({ requestId, adminEmail, textColor }: PagesUsingRequestProps) {
  const token = useQuery(
    api.scheduling.getPublicInviteToken,
    requestId && adminEmail ? { requestId, email: adminEmail } : "skip"
  );

  if (!token) {
    return null;
  }

  return <PagesUsingToken token={token} adminEmail={adminEmail} textColor={textColor} />;
}

