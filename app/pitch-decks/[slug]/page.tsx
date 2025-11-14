"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PitchDeckPreview } from "@/components/pitch-deck/PitchDeckPreview";
import { use } from "react";
import { notFound } from "next/navigation";

export default function PitchDeckPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  // The slug is actually the pitch deck ID
  const pitchDeck = useQuery(api.pitchDecks.get, 
    slug.match(/^[a-zA-Z0-9]{17}$/) ? { id: slug as Id<"pitchDecks"> } : "skip"
  );

  // Loading state
  if (pitchDeck === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/70">Loading...</p>
        </div>
      </main>
    );
  }

  // Not found state
  if (!pitchDeck || pitchDeck === null) {
    notFound();
  }

  return (
    <PitchDeckPreview
      title={pitchDeck.title || "Untitled Pitch Deck"}
      coverDescription={pitchDeck.coverDescription || ""}
      preparedFor={pitchDeck.preparedFor || ""}
      preparedDate={pitchDeck.preparedDate || new Date().toLocaleDateString()}
      coverMediaUrls={pitchDeck.coverMediaUrls || []}
      scopeOfWork={pitchDeck.scopeOfWork || ""}
      preProduction={pitchDeck.preProduction || ""}
      production={pitchDeck.production || ""}
      postProduction={pitchDeck.postProduction || ""}
      imageryMediaUrls={pitchDeck.imageryMediaUrls || []}
      galleryMediaUrls={[]}
      estimate={pitchDeck.estimate || ""}
    />
  );
}
