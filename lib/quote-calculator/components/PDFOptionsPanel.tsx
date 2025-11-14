"use client";

import { QuotePDFOptions, Quote } from "../types/pricing";
import { AppSettings } from "../types/settings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QrCode } from "lucide-react";
import { useState } from "react";

interface PDFOptionsPanelProps {
  quote: Quote;
  settings: AppSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: QuotePDFOptions) => void;
}

export function PDFOptionsPanel({
  quote,
  settings,
  open,
  onOpenChange,
  onExport,
}: PDFOptionsPanelProps) {
  const defaultOptions: QuotePDFOptions = {
    selectedSLATermIds: settings.slaTerms.map((t) => t.id),
    showQRCode: !!settings.paymentInfo.qrCodeUrl,
    customValidityDays: undefined,
  };

  const [options, setOptions] = useState<QuotePDFOptions>(
    quote.pdfOptions || defaultOptions
  );
  const [validityType, setValidityType] = useState<"default" | "custom">(
    quote.pdfOptions?.customValidityDays ? "custom" : "default"
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setOptions({
        ...options,
        selectedSLATermIds: settings.slaTerms.map((t) => t.id),
      });
    } else {
      setOptions({ ...options, selectedSLATermIds: [] });
    }
  };

  const handleTermToggle = (termId: string, checked: boolean) => {
    if (checked) {
      setOptions({
        ...options,
        selectedSLATermIds: [...options.selectedSLATermIds, termId],
      });
    } else {
      setOptions({
        ...options,
        selectedSLATermIds: options.selectedSLATermIds.filter((id) => id !== termId),
      });
    }
  };

  const allSelected = options.selectedSLATermIds.length === settings.slaTerms.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider">
            PDF Export Options
          </DialogTitle>
          <DialogDescription className="text-base">
            Configure what to include in your branded PDF quote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Terms & Conditions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-bold uppercase tracking-wider">
                Terms & Conditions
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-foreground/60">
                  Select All Terms
                </span>
              </div>
            </div>
            <p className="text-xs text-foreground/60 mb-3">
              {options.selectedSLATermIds.length} of {settings.slaTerms.length} selected
            </p>
            <div className="border border-foreground/20 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
              {settings.slaTerms.length === 0 ? (
                <p className="text-sm text-foreground/60 text-center py-4">
                  No terms & conditions added yet. Add them in Settings.
                </p>
              ) : (
                settings.slaTerms
                  .sort((a, b) => a.order - b.order)
                  .map((term) => (
                    <div key={term.id} className="flex items-start gap-3">
                      <Checkbox
                        checked={options.selectedSLATermIds.includes(term.id)}
                        onCheckedChange={(checked) =>
                          handleTermToggle(term.id, checked === true)
                        }
                        className="mt-1"
                      />
                      <Label className="text-sm font-medium cursor-pointer flex-1">
                        {term.title}
                      </Label>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* QR Code Toggle */}
          {settings.paymentInfo.qrCodeUrl && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <QrCode className="h-5 w-5 text-foreground/60" />
                <Label className="text-sm font-bold uppercase tracking-wider">
                  Show QR Code
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={options.showQRCode}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, showQRCode: checked === true })
                  }
                />
                <span className="text-sm text-foreground/60">
                  Include payment QR code in PDF
                </span>
              </div>
            </div>
          )}

          {/* Quote Validity Period */}
          <div>
            <Label className="text-sm font-bold uppercase tracking-wider mb-3 block">
              Quote Validity Period
            </Label>
            <RadioGroup
              value={validityType}
              onValueChange={(value) => {
                setValidityType(value as "default" | "custom");
                if (value === "default") {
                  setOptions({ ...options, customValidityDays: undefined });
                }
              }}
            >
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default" className="cursor-pointer">
                  Use default ({settings.quoteValidityDays} days)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer mr-3">
                  Custom period
                </Label>
                {validityType === "custom" && (
                  <Input
                    type="number"
                    min="1"
                    value={options.customValidityDays || settings.quoteValidityDays}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        customValidityDays: parseInt(e.target.value) || undefined,
                      })
                    }
                    className="h-9 w-24"
                  />
                )}
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-bold uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onExport(options);
              onOpenChange(false);
            }}
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}













