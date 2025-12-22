"use client";

import { Quote } from "../types/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface QuoteSummaryProps {
  quote: Quote;
  onExportPDF: () => void;
}

export function QuoteSummary({ quote, onExportPDF }: QuoteSummaryProps) {
  // Calculate totals
  const baseCosts = quote.categories.reduce((total, category) => {
    return (
      total +
      category.items
        .filter((item) => item.enabled)
        .reduce((catTotal, item) => catTotal + item.quantity * item.rate, 0)
    );
  }, 0);

  const productionFee = baseCosts * (quote.jobControls.productionFeePercent / 100);
  const rushFee = baseCosts * (quote.jobControls.rushPercent / 100);
  const subtotalBeforeDiscount = baseCosts + productionFee + rushFee;
  const discountAmount = subtotalBeforeDiscount * (quote.jobControls.discountPercent / 100);
  const subtotal = subtotalBeforeDiscount - discountAmount;
  const salesTax = subtotal * (quote.jobControls.salesTaxPercent / 100);
  const grandTotal = subtotal + salesTax;

  const currency = quote.jobControls.currency;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    });
  };

  return (
    <Card className="border border-foreground/20 sticky top-6">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-wider">
          Quote Summary
        </CardTitle>
        {quote.clientName && (
          <p className="text-sm text-foreground/70 mt-2">
            <span className="font-bold">Client:</span> {quote.clientName}
          </p>
        )}
        {quote.projectName && (
          <p className="text-sm text-foreground/70">
            <span className="font-bold">Project:</span> {quote.projectName}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Items Summary */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-2">
            Line Items
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {quote.categories.map((category) => {
              const enabledItems = category.items.filter((item) => item.enabled);
              if (enabledItems.length === 0) return null;

              return (
                <div key={category.id} className="text-xs">
                  <p className="font-bold text-foreground/80 mb-1">
                    {category.name}
                  </p>
                  {enabledItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-foreground/60 ml-2"
                    >
                      <span>
                        {item.name} ({item.quantity} × {formatCurrency(item.rate)})
                      </span>
                      <span>{formatCurrency(item.quantity * item.rate)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculations */}
        <div className="border-t border-foreground/20 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Costs</span>
            <span>{formatCurrency(baseCosts)}</span>
          </div>

          {productionFee > 0 && (
            <div className="flex justify-between text-sm text-foreground/60">
              <span>
                Production Fee ({quote.jobControls.productionFeePercent}%)
              </span>
              <span>{formatCurrency(productionFee)}</span>
            </div>
          )}

          {rushFee > 0 && (
            <div className="flex justify-between text-sm text-foreground/60">
              <span>Rush/Expedite ({quote.jobControls.rushPercent}%)</span>
              <span>{formatCurrency(rushFee)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-500">
              <span>
                Discount ({quote.jobControls.discountPercent}%)
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold border-t border-foreground/20 pt-2">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {salesTax > 0 && (
            <div className="flex justify-between text-sm text-foreground/60">
              <span>
                Sales Tax/VAT ({quote.jobControls.salesTaxPercent}%)
              </span>
              <span>{formatCurrency(salesTax)}</span>
            </div>
          )}

          <div className="flex justify-between text-xl font-black uppercase tracking-wider bg-accent text-background p-3 rounded-lg mt-4">
            <span>GRAND TOTAL</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <Button
          onClick={onExportPDF}
          className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
          style={{ backgroundColor: '#586034', fontWeight: '900' }}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export Branded PDF
        </Button>
      </CardContent>
    </Card>
  );
}

