"use client";

import { useState } from "react";
import { PricingCategory, LineItem } from "../types/pricing";
import { LineItemRow } from "./LineItemRow";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface CategorySectionProps {
  category: PricingCategory;
  onUpdateItem: (categoryId: string, itemId: string, updates: Partial<LineItem>) => void;
}

export function CategorySection({ category, onUpdateItem }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const enabledItems = category.items.filter((item) => item.enabled);
  const categoryTotal = enabledItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  const handleItemUpdate = (itemId: string, updates: Partial<LineItem>) => {
    onUpdateItem(category.id, itemId, updates);
  };

  return (
    <Card className="border border-foreground/20">
      <CardHeader
        className="cursor-pointer hover:bg-foreground/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-foreground/60" />
            ) : (
              <ChevronDown className="h-5 w-5 text-foreground/60" />
            )}
            <h3 className="text-lg font-bold uppercase tracking-wider">
              {category.name}
            </h3>
            {enabledItems.length > 0 && (
              <span className="text-sm text-foreground/60">
                ({enabledItems.length} active)
              </span>
            )}
          </div>
          {categoryTotal > 0 && (
            <span className="text-lg font-bold">
              {categoryTotal.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[auto_2fr_100px_120px_80px_120px] gap-4 items-center py-2 border-b-2 border-foreground/20 font-bold text-sm uppercase tracking-wider">
              <div></div>
              <div>Item</div>
              <div>Qty</div>
              <div>Rate</div>
              <div className="text-center">Unit</div>
              <div className="text-right">Subtotal</div>
            </div>
            {category.items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}























