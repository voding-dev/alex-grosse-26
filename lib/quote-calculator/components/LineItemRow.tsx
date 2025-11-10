"use client";

import { LineItem } from "../types/pricing";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LineItemRowProps {
  item: LineItem;
  onUpdate: (updates: Partial<LineItem>) => void;
}

export function LineItemRow({ item, onUpdate }: LineItemRowProps) {
  const subtotal = item.enabled ? item.quantity * item.rate : 0;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      // When checked, enable and set quantity to 1 if it's 0
      onUpdate({
        enabled: true,
        quantity: item.quantity === 0 ? 1 : item.quantity,
      });
    } else {
      // When unchecked, disable but keep quantity
      onUpdate({ enabled: false });
    }
  };

  return (
    <div className="grid grid-cols-[auto_2fr_100px_120px_80px_120px] gap-4 items-center py-2 border-b border-foreground/10">
      <Checkbox
        checked={item.enabled}
        onCheckedChange={handleCheckboxChange}
        className="mr-2"
      />
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{item.name}</span>
        {item.description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-foreground/40 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <Input
        type="number"
        min="0"
        value={item.quantity}
        onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || 0 })}
        disabled={!item.enabled}
        className="h-9 text-sm"
      />
      
      <Input
        type="number"
        min="0"
        step="0.01"
        value={item.rate}
        onChange={(e) => onUpdate({ rate: parseFloat(e.target.value) || 0 })}
        disabled={!item.enabled}
        className="h-9 text-sm"
      />
      
      <span className="text-sm text-foreground/60 text-center">{item.unit}</span>
      
      <div className="text-sm font-medium text-right">
        {subtotal.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}











