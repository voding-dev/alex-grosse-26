export interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  unit: string; // "day", "flat", "hour", etc.
  enabled: boolean;
  notes?: string;
}

export interface PricingCategory {
  id: string;
  name: string;
  items: LineItem[];
}

export interface JobControls {
  productionFeePercent: number; // Markup on hard costs
  rushPercent: number; // Rush/expedite fee
  discountPercent: number; // Discount percentage
  currency: string; // "USD", "EUR", "GBP", "CAD", "AUD"
  salesTaxPercent: number; // Final tax on grand total
}

export interface QuotePDFOptions {
  selectedSLATermIds: string[]; // Which T&C to include
  showQRCode: boolean; // Show/hide QR code
  customValidityDays?: number; // Override default validity
}

export interface Quote {
  id: string; // UUID
  name: string;
  clientName: string;
  projectName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  jobControls: JobControls;
  categories: PricingCategory[];
  pdfOptions?: QuotePDFOptions;
  brand?: "ian-courtright" | "style-driven" | "voding"; // Brand toggle
}

