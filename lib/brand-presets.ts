export type BrandingPresetId = "alexgrosse" | "voding" | "styledriven";

export type BrandingPreset = {
  id: BrandingPresetId;
  name: string;
  primary: string; // background/base
  accent: string; // call-to-action
  text: string; // default text color
  logoUrl?: string; // optional path in /public
};

export const BRAND_PRESETS: Record<BrandingPresetId, BrandingPreset> = {
  alexgrosse: {
    id: "alexgrosse",
    name: "Alex Grosse",
    primary: "#161616",
    accent: "#586034",
    text: "#FFFFFF",
    logoUrl: "/ag-wordmark-white.svg",
  },
  voding: {
    id: "voding",
    name: "Voding.dev",
    primary: "#0A0F0D",
    accent: "#10EC7F",
    text: "#D6F7E6",
    logoUrl: "/voding-logo-white.svg",
  },
  styledriven: {
    id: "styledriven",
    name: "Style Driven",
    primary: "#0A0A0A",
    accent: "#D2FF65",
    text: "#FFFFFF",
    logoUrl: "/style-driven-logo-lime.svg",
  },
};

export function resolveBranding(
  presetId?: BrandingPresetId | null,
  overrides?: Partial<Pick<BrandingPreset, "primary" | "accent" | "text" | "logoUrl">>
) {
  const base = (presetId && BRAND_PRESETS[presetId]) || BRAND_PRESETS.alexgrosse;
  return {
    ...base,
    ...overrides,
  };
}




