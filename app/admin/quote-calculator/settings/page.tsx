"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  loadSettings,
  addSLATerm,
  updateSLATerm,
  deleteSLATerm,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  updateQRCode,
  updateQuoteValidityDays,
  updateBrandCategories,
  getBrandCategories,
  updateDiscountSettings,
} from "@/lib/quote-calculator/storage/settingsStorage";
import { AppSettings, SLATerm, PaymentMethod } from "@/lib/quote-calculator/types/settings";
import { PricingCategory, LineItem } from "@/lib/quote-calculator/types/pricing";
import { ServicesManager } from "@/lib/quote-calculator/components/ServicesManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, ArrowLeft, Upload, QrCode } from "lucide-react";
import { toast } from "sonner";
import { BRANDS, DEFAULT_BRAND } from "@/lib/quote-calculator/brands";

export default function QuoteCalculatorSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== "undefined") {
      return loadSettings();
    }
    return { 
      slaTerms: [], 
      paymentInfo: { paymentMethods: [] }, 
      quoteValidityDays: 30,
      discountDefault: 0,
      discountMaxLimit: 50,
      brandCategories: {
        "ian-courtright": [],
        "style-driven": [],
        "voding": [],
      },
    };
  });

  const [newSLATitle, setNewSLATitle] = useState("");
  const [newSLAContent, setNewSLAContent] = useState("");
  const [newPaymentPlatform, setNewPaymentPlatform] = useState("");
  const [newPaymentDetails, setNewPaymentDetails] = useState("");
  const [editingSLATerm, setEditingSLATerm] = useState<string | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string | null>(null);

  const refreshSettings = () => {
    if (typeof window !== "undefined") {
      setSettings(loadSettings());
    }
  };

  const handleAddSLATerm = () => {
    if (!newSLATitle.trim() || !newSLAContent.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }
    addSLATerm({ title: newSLATitle.trim(), content: newSLAContent.trim() });
    setNewSLATitle("");
    setNewSLAContent("");
    refreshSettings();
    toast.success("SLA term added");
  };

  const handleUpdateSLATerm = (id: string, updates: Partial<SLATerm>) => {
    if (updateSLATerm(id, updates)) {
      refreshSettings();
      setEditingSLATerm(null);
      toast.success("SLA term updated");
    }
  };

  const handleDeleteSLATerm = (id: string) => {
    if (confirm("Are you sure you want to delete this term?")) {
      if (deleteSLATerm(id)) {
        refreshSettings();
        toast.success("SLA term deleted");
      }
    }
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentPlatform.trim() || !newPaymentDetails.trim()) {
      toast.error("Please fill in both platform and details");
      return;
    }
    addPaymentMethod({
      platform: newPaymentPlatform.trim(),
      details: newPaymentDetails.trim(),
    });
    setNewPaymentPlatform("");
    setNewPaymentDetails("");
    refreshSettings();
    toast.success("Payment method added");
  };

  const handleUpdatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    if (updatePaymentMethod(id, updates)) {
      refreshSettings();
      setEditingPaymentMethod(null);
      toast.success("Payment method updated");
    }
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (confirm("Are you sure you want to delete this payment method?")) {
      if (deletePaymentMethod(id)) {
        refreshSettings();
        toast.success("Payment method deleted");
      }
    }
  };

  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateQRCode(dataUrl);
      refreshSettings();
      toast.success("QR code uploaded");
    };
    reader.onerror = () => {
      toast.error("Failed to read QR code image");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQRCode = () => {
    if (confirm("Remove QR code?")) {
      updateQRCode(undefined);
      refreshSettings();
      toast.success("QR code removed");
    }
  };

  const handleValidityDaysUpdate = (days: number) => {
    if (days < 1) {
      toast.error("Validity days must be at least 1");
      return;
    }
    updateQuoteValidityDays(days);
    refreshSettings();
    toast.success("Quote validity period updated");
  };

  const handleDiscountSettingsUpdate = (defaultDiscount: number, maxLimit: number) => {
    if (defaultDiscount < 0 || defaultDiscount > maxLimit) {
      toast.error("Default discount must be between 0 and max limit");
      return;
    }
    if (maxLimit < 0 || maxLimit > 100) {
      toast.error("Max discount limit must be between 0 and 100");
      return;
    }
    updateDiscountSettings(defaultDiscount, maxLimit);
    refreshSettings();
    toast.success("Discount settings updated");
  };

  const currentBrand = BRANDS[DEFAULT_BRAND];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="border-b border-foreground/10 bg-background sticky top-0 z-50 backdrop-blur-sm bg-background/95"
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
                Settings
              </span>
            </div>
            <Link href="/admin/quote-calculator">
              <Button
                variant="outline"
                className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quotes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-4 border border-foreground/20 bg-foreground/5 mb-6">
            <TabsTrigger
              value="services"
              className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background"
            >
              Services
            </TabsTrigger>
            <TabsTrigger
              value="sla"
              className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background"
            >
              SLA Terms
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background"
            >
              Payment Info
            </TabsTrigger>
            <TabsTrigger
              value="quote-settings"
              className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background"
            >
              Quote Settings
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <ServicesManager settings={settings} onUpdate={refreshSettings} />
          </TabsContent>

          {/* SLA Terms Tab */}
          <TabsContent value="sla" className="space-y-6">
            {/* Add New SLA Term */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-wider">
                  Add New SLA Term
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sla-title" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Term Title
                  </Label>
                  <Input
                    id="sla-title"
                    value={newSLATitle}
                    onChange={(e) => setNewSLATitle(e.target.value)}
                    placeholder="e.g., Payment Terms"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="sla-content" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Term Content
                  </Label>
                  <Textarea
                    id="sla-content"
                    value={newSLAContent}
                    onChange={(e) => setNewSLAContent(e.target.value)}
                    placeholder="Enter the full text of the term..."
                    rows={4}
                    className="text-base"
                  />
                </div>
                <Button
                  onClick={handleAddSLATerm}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Add SLA Term
                </Button>
              </CardContent>
            </Card>

            {/* Existing SLA Terms */}
            <div className="space-y-4">
              {settings.slaTerms.length === 0 ? (
                <Card className="border border-foreground/20">
                  <CardContent className="py-8 text-center">
                    <p className="text-foreground/60">No SLA terms added yet.</p>
                  </CardContent>
                </Card>
              ) : (
                settings.slaTerms
                  .sort((a, b) => a.order - b.order)
                  .map((term) => (
                    <Card key={term.id} className="border border-foreground/20">
                      <CardContent className="p-6">
                        {editingSLATerm === term.id ? (
                          <div className="space-y-4">
                            <Input
                              value={term.title}
                              onChange={(e) =>
                                handleUpdateSLATerm(term.id, { title: e.target.value })
                              }
                              className="h-10 font-bold"
                            />
                            <Textarea
                              value={term.content}
                              onChange={(e) =>
                                handleUpdateSLATerm(term.id, { content: e.target.value })
                              }
                              rows={4}
                              className="text-base"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingSLATerm(null)}
                                variant="outline"
                                className="font-bold uppercase tracking-wider"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => setEditingSLATerm(null)}
                                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-bold uppercase tracking-wider">
                                {term.title}
                              </h3>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setEditingSLATerm(term.id)}
                                  variant="outline"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeleteSLATerm(term.id)}
                                  variant="destructive"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                              {term.content}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          {/* Payment Info Tab */}
          <TabsContent value="payment" className="space-y-6">
            {/* QR Code */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-wider">
                  Payment QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.paymentInfo.qrCodeUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="border-2 border-foreground/20 rounded-lg p-4 bg-white">
                        <img
                          src={settings.paymentInfo.qrCodeUrl}
                          alt="QR Code"
                          className="w-32 h-32"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-foreground/70 mb-2">
                          QR code uploaded successfully
                        </p>
                        <Button
                          onClick={handleRemoveQRCode}
                          variant="destructive"
                          size="sm"
                          className="font-bold uppercase tracking-wider"
                        >
                          Remove QR Code
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label
                      htmlFor="qr-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-foreground/20 rounded-lg cursor-pointer hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <QrCode className="h-10 w-10 text-foreground/40 mb-2" />
                        <p className="mb-2 text-sm font-bold uppercase tracking-wider">
                          Click to upload QR code
                        </p>
                        <p className="text-xs text-foreground/60">
                          PNG, JPG, or SVG up to 10MB
                        </p>
                      </div>
                      <input
                        id="qr-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleQRCodeUpload}
                        className="hidden"
                      />
                    </Label>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Payment Method */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-wider">
                  Add Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="payment-platform" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Platform/Method
                  </Label>
                  <Input
                    id="payment-platform"
                    value={newPaymentPlatform}
                    onChange={(e) => setNewPaymentPlatform(e.target.value)}
                    placeholder="e.g., Zelle, Venmo, Bank Transfer"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-details" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Details/Instructions
                  </Label>
                  <Textarea
                    id="payment-details"
                    value={newPaymentDetails}
                    onChange={(e) => setNewPaymentDetails(e.target.value)}
                    placeholder="Enter payment instructions or account details..."
                    rows={3}
                    className="text-base"
                  />
                </div>
                <Button
                  onClick={handleAddPaymentMethod}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Existing Payment Methods */}
            <div className="space-y-4">
              {settings.paymentInfo.paymentMethods.length === 0 ? (
                <Card className="border border-foreground/20">
                  <CardContent className="py-8 text-center">
                    <p className="text-foreground/60">No payment methods added yet.</p>
                  </CardContent>
                </Card>
              ) : (
                settings.paymentInfo.paymentMethods
                  .sort((a, b) => a.order - b.order)
                  .map((method) => (
                    <Card key={method.id} className="border border-foreground/20">
                      <CardContent className="p-6">
                        {editingPaymentMethod === method.id ? (
                          <div className="space-y-4">
                            <Input
                              value={method.platform}
                              onChange={(e) =>
                                handleUpdatePaymentMethod(method.id, {
                                  platform: e.target.value,
                                })
                              }
                              className="h-10 font-bold"
                            />
                            <Textarea
                              value={method.details}
                              onChange={(e) =>
                                handleUpdatePaymentMethod(method.id, {
                                  details: e.target.value,
                                })
                              }
                              rows={3}
                              className="text-base"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingPaymentMethod(null)}
                                variant="outline"
                                className="font-bold uppercase tracking-wider"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => setEditingPaymentMethod(null)}
                                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-bold uppercase tracking-wider">
                                {method.platform}
                              </h3>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setEditingPaymentMethod(method.id)}
                                  variant="outline"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeletePaymentMethod(method.id)}
                                  variant="destructive"
                                  size="sm"
                                  className="font-bold uppercase tracking-wider text-xs"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                              {method.details}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          {/* Quote Settings Tab */}
          <TabsContent value="quote-settings" className="space-y-6">
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-wider">
                  Quote Validity Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="validity-days" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Number of Days
                  </Label>
                  <Input
                    id="validity-days"
                    type="number"
                    min="1"
                    value={settings.quoteValidityDays}
                    onChange={(e) =>
                      handleValidityDaysUpdate(parseInt(e.target.value) || 30)
                    }
                    className="h-10 w-32"
                  />
                </div>
                <p className="text-sm text-foreground/60">
                  How many days should quotes remain valid from the date of issue?
                </p>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-wider">
                  Discount Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="discount-default" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Default Discount %
                  </Label>
                  <Input
                    id="discount-default"
                    type="number"
                    min="0"
                    max={settings.discountMaxLimit || 50}
                    step="0.5"
                    value={settings.discountDefault || 0}
                    onChange={(e) =>
                      handleDiscountSettingsUpdate(
                        parseFloat(e.target.value) || 0,
                        settings.discountMaxLimit || 50
                      )
                    }
                    className="h-10 w-32"
                  />
                  <p className="text-sm text-foreground/60 mt-2">
                    Default discount percentage applied to new quotes
                  </p>
                </div>
                <div>
                  <Label htmlFor="discount-max" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                    Maximum Discount Limit %
                  </Label>
                  <Input
                    id="discount-max"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settings.discountMaxLimit || 50}
                    onChange={(e) =>
                      handleDiscountSettingsUpdate(
                        settings.discountDefault || 0,
                        parseFloat(e.target.value) || 50
                      )
                    }
                    className="h-10 w-32"
                  />
                  <p className="text-sm text-foreground/60 mt-2">
                    Maximum discount percentage allowed in the discount slider
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

