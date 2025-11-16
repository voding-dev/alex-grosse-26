"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function AddressInput({ 
  value, 
  onChange, 
  disabled, 
  required, 
  className = "",
  placeholder = "Street address, city, state, zip"
}: AddressInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-start">
        {/* MapPin icon */}
        <div className="absolute left-4 top-3 pointer-events-none">
          <MapPin className={`h-4 w-4 transition-colors ${
            isFocused ? "text-foreground/60" : "text-foreground/30"
          }`} />
        </div>

        {/* Address textarea */}
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          disabled={disabled}
          rows={3}
          className="w-full bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 disabled:opacity-50 outline-none resize-y min-h-[80px]"
          style={{ fontWeight: "500" }}
        />
      </div>
    </div>
  );
}

