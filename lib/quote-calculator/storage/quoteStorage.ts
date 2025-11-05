import { Quote, JobControls, PricingCategory } from "../types/pricing";
import { DEFAULT_BRAND } from "../brands";
import { getBrandCategories, loadSettings } from "./settingsStorage";

export function getDefaultJobControls(): JobControls {
  const settings = loadSettings();
  return {
    productionFeePercent: 20,
    rushPercent: 0,
    discountPercent: settings.discountDefault || 0,
    currency: "USD",
    salesTaxPercent: 0,
  };
}

const STORAGE_KEY = "production_quotes";

function generateUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function loadQuotes(): Quote[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading quotes:", error);
    return [];
  }
}

export function saveQuote(quote: Omit<Quote, "id" | "createdAt" | "updatedAt"> | Quote): Quote {
  try {
    const quotes = loadQuotes();
    const now = new Date().toISOString();
    
    let updatedQuote: Quote;
    
    if ("id" in quote && quote.id) {
      // Update existing quote
      const index = quotes.findIndex((q) => q.id === quote.id);
      if (index === -1) {
        throw new Error("Quote not found");
      }
      updatedQuote = {
        ...quote,
        updatedAt: now,
      } as Quote;
      quotes[index] = updatedQuote;
    } else {
      // Create new quote
      updatedQuote = {
        ...quote,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
        brand: quote.brand || DEFAULT_BRAND,
      } as Quote;
      quotes.push(updatedQuote);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    return updatedQuote;
  } catch (error) {
    console.error("Error saving quote:", error);
    throw error;
  }
}

export function updateQuote(id: string, updates: Partial<Quote>): Quote | null {
  try {
    const quotes = loadQuotes();
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) return null;
    
    const updatedQuote: Quote = {
      ...quotes[index],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };
    
    quotes[index] = updatedQuote;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    return updatedQuote;
  } catch (error) {
    console.error("Error updating quote:", error);
    return null;
  }
}

export function deleteQuote(id: string): boolean {
  try {
    const quotes = loadQuotes();
    const filtered = quotes.filter((q) => q.id !== id);
    if (filtered.length === quotes.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting quote:", error);
    return false;
  }
}

export function createEmptyQuote(brand?: "ian-courtright" | "style-driven" | "voding"): Omit<Quote, "id" | "createdAt" | "updatedAt"> {
  const selectedBrand = brand || DEFAULT_BRAND;
  // Load brand-specific categories from settings
  const categories: PricingCategory[] = getBrandCategories(selectedBrand);
  
  return {
    name: "",
    clientName: "",
    projectName: "",
    jobControls: getDefaultJobControls(),
    categories,
    brand: selectedBrand,
  };
}

