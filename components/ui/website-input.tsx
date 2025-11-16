"use client";

import { useState } from "react";
import { Globe, Check, X } from "lucide-react";

interface WebsiteInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function WebsiteInput({ 
  value, 
  onChange, 
  disabled, 
  required, 
  className = "",
  placeholder = "https://example.com"
}: WebsiteInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  // URL validation
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      new URL(urlWithProtocol);
      return true;
    } catch {
      return false;
    }
  };

  const showValidation = hasBlurred && value.length > 0;
  const isValid = isValidUrl(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Globe icon */}
        <div className="absolute left-4 pointer-events-none">
          <Globe className={`h-4 w-4 transition-colors ${
            isFocused ? "text-foreground/60" : "text-foreground/30"
          }`} />
        </div>

        {/* Website input */}
        <input
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            setHasBlurred(false);
          }}
          onBlur={() => {
            setIsFocused(false);
            if (value.length > 0) {
              setHasBlurred(true);
            }
          }}
          required={required}
          disabled={disabled}
          className="w-full bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground pl-11 pr-11 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 disabled:opacity-50 outline-none"
          style={{ fontWeight: "500" }}
        />

        {/* Validation indicator */}
        {showValidation && (
          <div className="absolute right-4 pointer-events-none">
            {isValid ? (
              <div className="bg-green-500/10 rounded-full p-1">
                <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
              </div>
            ) : (
              <div className="bg-red-500/10 rounded-full p-1">
                <X className="h-3 w-3 text-red-600" strokeWidth={3} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation message */}
      {showValidation && !isValid && (
        <p className="mt-1.5 text-xs text-red-600/80 font-medium">
          Please enter a valid URL
        </p>
      )}
    </div>
  );
}

