"use client";

import { JobControls } from "../types/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { loadSettings } from "../storage/settingsStorage";

interface JobControlsPanelProps {
  controls: JobControls;
  onUpdate: (updates: Partial<JobControls>) => void;
}

export function JobControlsPanel({ controls, onUpdate }: JobControlsPanelProps) {
  const settings = typeof window !== "undefined" ? loadSettings() : { discountMaxLimit: 50 };
  const maxDiscount = settings.discountMaxLimit || 50;

  return (
    <Card className="border border-foreground/20">
      <CardHeader>
        <CardTitle className="text-xl font-black uppercase tracking-wider">
          Job Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="production-fee" className="text-sm font-bold uppercase tracking-wider">
                Production Fee %
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-foreground/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Markup percentage applied to base costs</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="production-fee"
              type="number"
              min="0"
              step="0.1"
              value={controls.productionFeePercent}
              onChange={(e) =>
                onUpdate({ productionFeePercent: parseFloat(e.target.value) || 0 })
              }
              className="h-10"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="rush-fee" className="text-sm font-bold uppercase tracking-wider">
                Rush/Expedite %
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-foreground/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Additional fee for rush/expedited projects</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="rush-fee"
              type="number"
              min="0"
              step="0.1"
              value={controls.rushPercent}
              onChange={(e) =>
                onUpdate({ rushPercent: parseFloat(e.target.value) || 0 })
              }
              className="h-10"
            />
          </div>

          <div>
            <Label htmlFor="currency" className="text-sm font-bold uppercase tracking-wider mb-2 block">
              Currency
            </Label>
            <Select
              value={controls.currency}
              onValueChange={(value) => onUpdate({ currency: value })}
            >
              <SelectTrigger id="currency" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="sales-tax" className="text-sm font-bold uppercase tracking-wider">
                Sales Tax/VAT %
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-foreground/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Tax percentage applied to final subtotal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="sales-tax"
              type="number"
              min="0"
              step="0.1"
              value={controls.salesTaxPercent}
              onChange={(e) =>
                onUpdate({ salesTaxPercent: parseFloat(e.target.value) || 0 })
              }
              className="h-10"
            />
          </div>
        </div>

        {/* Discount Slider */}
        <div className="mt-6 pt-6 border-t border-foreground/20">
          <div className="flex items-center gap-2 mb-4">
            <Label htmlFor="discount" className="text-sm font-bold uppercase tracking-wider">
              Discount %
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-foreground/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Discount percentage applied to subtotal (max {maxDiscount}%)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="ml-auto text-lg font-bold">
              {controls.discountPercent.toFixed(1)}%
            </span>
          </div>
          <div className="space-y-2">
            <Slider
              id="discount"
              min={0}
              max={maxDiscount}
              step={0.5}
              value={[controls.discountPercent]}
              onValueChange={(value) => onUpdate({ discountPercent: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-foreground/60">
              <span>0%</span>
              <span>{maxDiscount}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

