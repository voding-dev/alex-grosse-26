export interface SLATerm {
  id: string; // UUID
  title: string;
  content: string; // Multi-line text
  order: number;
}

export interface PaymentMethod {
  id: string; // UUID
  platform: string; // "Zelle", "Venmo", etc.
  details: string; // Instructions/account info
  order: number;
}

import { PricingCategory } from "./pricing";

export interface PaymentInfo {
  qrCodeUrl?: string; // Data URL of QR code image
  paymentMethods: PaymentMethod[];
}

export interface AppSettings {
  slaTerms: SLATerm[];
  paymentInfo: PaymentInfo;
  quoteValidityDays: number; // Default 30
  discountDefault: number; // Default discount percentage
  discountMaxLimit: number; // Maximum discount percentage allowed
  brandCategories: {
    "alex-grosse": PricingCategory[];
    "style-driven": PricingCategory[];
    "voding": PricingCategory[];
  };
}

export interface BrandConfig {
  id: "alex-grosse" | "style-driven" | "voding";
  name: string;
  tagline: string;
  website: string;
  primaryColor: string; // Hex color
  secondaryColor: string; // Hex color
}

