"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Quote, PricingCategory, LineItem } from "@/lib/quote-calculator/types/pricing";
import {
  loadQuotes,
  saveQuote,
  createEmptyQuote,
  updateQuote,
  deleteQuote,
} from "@/lib/quote-calculator/storage/quoteStorage";
import { loadSettings, getBrandCategories, defaultSettings } from "@/lib/quote-calculator/storage/settingsStorage";
import { generatePDF } from "@/lib/quote-calculator/utils/pdfExport";
import { BRANDS, DEFAULT_BRAND } from "@/lib/quote-calculator/brands";
import { JobControlsPanel } from "@/lib/quote-calculator/components/JobControlsPanel";
import { CategorySection } from "@/lib/quote-calculator/components/CategorySection";
import { QuoteSummary } from "@/lib/quote-calculator/components/QuoteSummary";
import { QuoteManager } from "@/lib/quote-calculator/components/QuoteManager";
import { PDFOptionsPanel } from "@/lib/quote-calculator/components/PDFOptionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Settings, Plus, FolderOpen, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

export default function QuoteCalculatorPage() {
  const router = useRouter();
  const [currentQuote, setCurrentQuote] = useState<Quote>(() => {
    if (typeof window !== "undefined") {
      return saveQuote(createEmptyQuote(DEFAULT_BRAND)) as Quote;
    }
    return createEmptyQuote(DEFAULT_BRAND) as Quote;
  });
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [showQuoteManager, setShowQuoteManager] = useState(false);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [settings] = useState(() => {
    if (typeof window !== "undefined") {
      return loadSettings();
    }
    return defaultSettings;
  });

  // Load saved quotes on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSavedQuotes(loadQuotes());
    }
  }, []);

  // Memoized default PDF options
  const defaultPDFOptions = useMemo(() => {
    return {
      selectedSLATermIds: settings.slaTerms.map((t) => t.id),
      showQRCode: !!settings.paymentInfo?.qrCodeUrl,
      customValidityDays: undefined,
    };
  }, [settings]);

  const handleQuoteInfoUpdate = (field: "name" | "clientName" | "projectName", value: string) => {
    setCurrentQuote((prev) => ({ ...prev, [field]: value }));
  };

  const handleJobControlsUpdate = (updates: Partial<Quote["jobControls"]>) => {
    setCurrentQuote((prev) => ({
      ...prev,
      jobControls: { ...prev.jobControls, ...updates },
    }));
  };

  const handleCategoryItemUpdate = (
    categoryId: string,
    itemId: string,
    updates: Partial<LineItem>
  ) => {
    setCurrentQuote((prev) => {
      const newCategories = prev.categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          };
        }
        return cat;
      });
      return { ...prev, categories: newCategories };
    });
  };

  const handleBrandChange = (brandId: "ian-courtright" | "style-driven" | "voding") => {
    // Load brand-specific categories when brand changes
    const brandCategories = getBrandCategories(brandId);
    setCurrentQuote((prev) => ({
      ...prev,
      brand: brandId,
      categories: JSON.parse(JSON.stringify(brandCategories)),
    }));
  };

  const handleNewQuote = () => {
    const newQuote = saveQuote(createEmptyQuote(currentQuote.brand || DEFAULT_BRAND)) as Quote;
    setCurrentQuote(newQuote);
    setSavedQuotes(loadQuotes());
    toast.success("New quote created");
  };

  const handleSaveQuote = () => {
    const saved = saveQuote(currentQuote);
    setCurrentQuote(saved);
    setSavedQuotes(loadQuotes());
    toast.success("Quote saved successfully");
  };

  const handleLoadQuote = (quote: Quote) => {
    // Apply default PDF options if missing
    // Ensure discountPercent exists (for migration)
    const quoteWithDefaults = {
      ...quote,
      pdfOptions: quote.pdfOptions || defaultPDFOptions,
      jobControls: {
        ...quote.jobControls,
        discountPercent: quote.jobControls.discountPercent ?? 0,
      },
    };
    setCurrentQuote(quoteWithDefaults);
    toast.success("Quote loaded");
  };

  const handleDeleteQuote = (id: string) => {
    if (deleteQuote(id)) {
      setSavedQuotes(loadQuotes());
      if (currentQuote.id === id) {
        handleNewQuote();
      }
      toast.success("Quote deleted");
    }
  };

  const handleExportPDF = async (pdfOptions: Quote["pdfOptions"]) => {
    try {
      // Save current quote with PDF options
      const quoteToExport = {
        ...currentQuote,
        pdfOptions,
      };
      const saved = saveQuote(quoteToExport);
      setCurrentQuote(saved);

      await generatePDF({
        quote: saved,
        settings,
        pdfOptions: pdfOptions || defaultPDFOptions,
      });
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const currentBrand = BRANDS[currentQuote.brand || DEFAULT_BRAND];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-40 border-b border-foreground/10 bg-background backdrop-blur-sm bg-background/95"
        style={{ backgroundColor: currentBrand.primaryColor }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1
                className="text-2xl font-black italic uppercase tracking-wider"
                style={{ color: currentBrand.secondaryColor }}
              >
                {currentBrand.name}
              </h1>
              <span
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: currentBrand.secondaryColor }}
              >
                {currentBrand.tagline}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={currentQuote.brand || DEFAULT_BRAND}
                onValueChange={(value) =>
                  handleBrandChange(value as "ian-courtright" | "style-driven" | "voding")
                }
              >
                <SelectTrigger className="w-40 h-9" style={{ backgroundColor: currentBrand.secondaryColor, color: currentBrand.primaryColor }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ian-courtright">Ian Courtright</SelectItem>
                  <SelectItem value="style-driven">Style Driven</SelectItem>
                  <SelectItem value="voding">Voding</SelectItem>
                </SelectContent>
              </Select>
              <Link href="/admin/quote-calculator/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                onClick={() => setShowQuoteManager(true)}
                variant="outline"
                size="sm"
                className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Load Quote
              </Button>
              <Button
                onClick={handleNewQuote}
                variant="outline"
                size="sm"
                className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
              <Button
                onClick={handleSaveQuote}
                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: currentBrand.secondaryColor, color: currentBrand.primaryColor, fontWeight: '900' }}
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Quote
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Information */}
            <Card className="border border-foreground/20">
              <CardContent className="p-6">
                <h2 className="text-xl font-black uppercase tracking-wider mb-4">
                  Quote Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quote-name" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Quote Name
                    </Label>
                    <Input
                      id="quote-name"
                      value={currentQuote.name}
                      onChange={(e) => handleQuoteInfoUpdate("name", e.target.value)}
                      placeholder="e.g., Q1 2024 Commercial"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-name" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Client Name
                    </Label>
                    <Input
                      id="client-name"
                      value={currentQuote.clientName}
                      onChange={(e) => handleQuoteInfoUpdate("clientName", e.target.value)}
                      placeholder="Client Name"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-name" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Project Name
                    </Label>
                    <Input
                      id="project-name"
                      value={currentQuote.projectName}
                      onChange={(e) => handleQuoteInfoUpdate("projectName", e.target.value)}
                      placeholder="Project Name"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Controls */}
            <JobControlsPanel
              controls={currentQuote.jobControls}
              onUpdate={handleJobControlsUpdate}
            />

            {/* Line Items */}
            <Card className="border border-foreground/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-black uppercase tracking-wider">
                    Line Items
                  </h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-foreground/40 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Checking a line item automatically sets quantity to 1. We price by full day rates only - no half days or hourly rates. What's on the menu is what you get.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-4">
                  {currentQuote.categories.map((category) => (
                    <CategorySection
                      key={category.id}
                      category={category}
                      onUpdateItem={handleCategoryItemUpdate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quote Summary */}
          <div className="lg:col-span-1">
            <QuoteSummary
              quote={currentQuote}
              onExportPDF={() => setShowPDFOptions(true)}
            />
          </div>
        </div>
      </div>

      {/* Quote Manager Dialog */}
      <QuoteManager
        quotes={savedQuotes}
        onLoad={handleLoadQuote}
        onDelete={handleDeleteQuote}
        open={showQuoteManager}
        onOpenChange={setShowQuoteManager}
      />

      {/* PDF Options Dialog */}
      <PDFOptionsPanel
        quote={currentQuote}
        settings={settings}
        open={showPDFOptions}
        onOpenChange={setShowPDFOptions}
        onExport={handleExportPDF}
      />
    </div>
  );
}

