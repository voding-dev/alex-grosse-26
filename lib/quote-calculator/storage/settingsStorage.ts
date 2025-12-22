import { AppSettings, SLATerm, PaymentMethod, PaymentInfo } from "../types/settings";
import { PricingCategory } from "../types/pricing";
import { ALEX_GROSSE_CATEGORIES, VODING_CATEGORIES, STYLE_DRIVEN_CATEGORIES } from "../data/brandCategories";

const STORAGE_KEY = "quote_calculator_settings";

function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const defaultSettings: AppSettings = {
  slaTerms: [],
  paymentInfo: { paymentMethods: [] },
  quoteValidityDays: 30,
  discountDefault: 0,
  discountMaxLimit: 50,
  brandCategories: {
    "alex-grosse": JSON.parse(JSON.stringify(ALEX_GROSSE_CATEGORIES)),
    "style-driven": JSON.parse(JSON.stringify(STYLE_DRIVEN_CATEGORIES)),
    "voding": JSON.parse(JSON.stringify(VODING_CATEGORIES)),
  },
};

export function loadSettings(): AppSettings {
  try {
    if (typeof window === "undefined") return defaultSettings;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored);
    // Ensure brandCategories exists (for migration from old settings)
    if (!parsed.brandCategories) {
      parsed.brandCategories = defaultSettings.brandCategories;
    }
    // Ensure discount settings exist (for migration)
    if (typeof parsed.discountDefault === "undefined") {
      parsed.discountDefault = defaultSettings.discountDefault;
    }
    if (typeof parsed.discountMaxLimit === "undefined") {
      parsed.discountMaxLimit = defaultSettings.discountMaxLimit;
    }
    if (parsed.brandCategories || typeof parsed.discountDefault === "undefined" || typeof parsed.discountMaxLimit === "undefined") {
      saveSettings(parsed);
    }
    return parsed;
  } catch (error) {
    console.error("Error loading settings:", error);
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

export function addSLATerm(term: Omit<SLATerm, "id" | "order">): SLATerm {
  const settings = loadSettings();
  const newTerm: SLATerm = {
    ...term,
    id: generateUUID(),
    order: settings.slaTerms.length,
  };
  settings.slaTerms.push(newTerm);
  saveSettings(settings);
  return newTerm;
}

export function updateSLATerm(id: string, updates: Partial<SLATerm>): boolean {
  const settings = loadSettings();
  const index = settings.slaTerms.findIndex((t) => t.id === id);
  if (index === -1) return false;
  
  settings.slaTerms[index] = { ...settings.slaTerms[index], ...updates };
  saveSettings(settings);
  return true;
}

export function deleteSLATerm(id: string): boolean {
  const settings = loadSettings();
  const filtered = settings.slaTerms.filter((t) => t.id !== id);
  if (filtered.length === settings.slaTerms.length) return false;
  
  // Reorder remaining terms
  filtered.forEach((term, index) => {
    term.order = index;
  });
  
  settings.slaTerms = filtered;
  saveSettings(settings);
  return true;
}

export function addPaymentMethod(method: Omit<PaymentMethod, "id" | "order">): PaymentMethod {
  const settings = loadSettings();
  const newMethod: PaymentMethod = {
    ...method,
    id: generateUUID(),
    order: settings.paymentInfo.paymentMethods.length,
  };
  settings.paymentInfo.paymentMethods.push(newMethod);
  saveSettings(settings);
  return newMethod;
}

export function updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): boolean {
  const settings = loadSettings();
  const index = settings.paymentInfo.paymentMethods.findIndex((m) => m.id === id);
  if (index === -1) return false;
  
  settings.paymentInfo.paymentMethods[index] = {
    ...settings.paymentInfo.paymentMethods[index],
    ...updates,
  };
  saveSettings(settings);
  return true;
}

export function deletePaymentMethod(id: string): boolean {
  const settings = loadSettings();
  const filtered = settings.paymentInfo.paymentMethods.filter((m) => m.id !== id);
  if (filtered.length === settings.paymentInfo.paymentMethods.length) return false;
  
  // Reorder remaining methods
  filtered.forEach((method, index) => {
    method.order = index;
  });
  
  settings.paymentInfo.paymentMethods = filtered;
  saveSettings(settings);
  return true;
}

export function updateQRCode(qrCodeUrl: string | undefined): void {
  const settings = loadSettings();
  settings.paymentInfo.qrCodeUrl = qrCodeUrl;
  saveSettings(settings);
}

export function updateQuoteValidityDays(days: number): void {
  const settings = loadSettings();
  settings.quoteValidityDays = days;
  saveSettings(settings);
}

export function updateBrandCategories(
  brand: "alex-grosse" | "style-driven" | "voding",
  categories: PricingCategory[]
): void {
  const settings = loadSettings();
  settings.brandCategories[brand] = JSON.parse(JSON.stringify(categories));
  saveSettings(settings);
}

export function getBrandCategories(
  brand: "alex-grosse" | "style-driven" | "voding"
): PricingCategory[] {
  const settings = loadSettings();
  return JSON.parse(JSON.stringify(settings.brandCategories[brand] || []));
}

export function updateDiscountSettings(defaultDiscount: number, maxLimit: number): void {
  const settings = loadSettings();
  settings.discountDefault = defaultDiscount;
  settings.discountMaxLimit = maxLimit;
  saveSettings(settings);
}

