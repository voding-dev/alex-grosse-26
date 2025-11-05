"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectCover } from "./project-cover";
import { ProjectCardCarousel } from "./project-card-carousel";

interface PortfolioProjectCardProps {
  id: string;
  slug: string;
  title: string;
  clientName: string;
  isPortfolio: boolean;
}

export function PortfolioProjectCard({ id, slug, title, clientName, isPortfolio }: PortfolioProjectCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Link
      href={isPortfolio ? `/portfolio/${slug}` : `/project/${slug}`}
      className="group relative aspect-[4/3] overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Default cover image (shown when not hovering) */}
      <ProjectCover
        projectId={id}
        className="transition-opacity duration-300 group-hover:opacity-0 h-full w-full"
        isPortfolio={isPortfolio}
      />
      {/* Hover carousel (shows on hover) */}
      <ProjectCardCarousel
        projectId={id}
        isPortfolio={isPortfolio}
        isHovering={isHovering}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      <div className="absolute inset-0 bg-black/0 transition-opacity duration-300 group-hover:bg-black/60" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="text-center text-white">
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-white/80">{clientName}</p>
        </div>
      </div>
    </Link>
  );
}



