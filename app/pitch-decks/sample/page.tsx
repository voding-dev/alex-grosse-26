import { PitchDeckPreview } from "@/components/pitch-deck/PitchDeckPreview";

export default function SamplePitchDeckPage() {
  const cover = Array.from({ length: 12 }).map(() => "");
  const imagery = Array.from({ length: 6 }).map(() => "");
  const gallery = Array.from({ length: 12 }).map(() => "");

  return (
    <PitchDeckPreview
      title="SAMPLE CAMPAIGN"
      coverDescription="A short description demonstrating the cover layout."
      preparedFor="Acme Co."
      preparedDate={new Date().toLocaleDateString()}
      coverMediaUrls={cover}
      scopeOfWork={"High level scope with goals, deliverables, and creative direction."}
      preProduction={"Planning, creative, casting, locations, schedule."}
      production={"Principal photography and capture across 2 days."}
      postProduction={"Edit, color, sound, and deliverables."}
      imageryMediaUrls={imagery}
      galleryMediaUrls={gallery}
      estimate={"Flat project estimate with terms and assumptions."}
    />
  );
}








