import { BrandConfig } from "./types/settings";

export const BRANDS: Record<string, BrandConfig> = {
  "ian-courtright": {
    id: "ian-courtright",
    name: "IAN COURTRIGHT",
    tagline: "Freelance Quote Builder",
    website: "iancourtright.com",
    primaryColor: "#0D0D0D", // Black
    secondaryColor: "#FFA617", // Orange accent from site
  },
  "style-driven": {
    id: "style-driven",
    name: "STYLE DRIVEN",
    tagline: "Production Quote Builder",
    website: "styledriven.com",
    primaryColor: "#0D0D0D", // Black
    secondaryColor: "#D2FF65", // Lime
  },
  "voding": {
    id: "voding",
    name: "VODING",
    tagline: "Software Quote Builder",
    website: "voding.com",
    primaryColor: "#0D0D0D", // Black
    secondaryColor: "#10EC7F", // Teal/Green
  },
};

export const DEFAULT_BRAND = "ian-courtright";

