"use client";

import { useState } from "react";
import { User, Check, X } from "lucide-react";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function NameInput({ value, onChange, disabled, required, className = "" }: NameInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  // Name validation - at least 2 characters, not just spaces
  const isValidName = (name: string): boolean => {
    const trimmed = name.trim();
    return trimmed.length >= 2;
  };

  // Show validation only after blur (when they move to next field)
  const showValidation = hasBlurred && value.length > 0;
  const isValid = isValidName(value);

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* User icon */}
        <div className="absolute left-4 pointer-events-none">
          <User className={`h-4 w-4 transition-colors ${
            isFocused ? "text-foreground/60" : "text-foreground/30"
          }`} />
        </div>

        {/* Name input */}
        <input
          type="text"
          placeholder="Name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setHasBlurred(true);
          }}
          required={required}
          disabled={disabled}
          className="w-full bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground pl-11 pr-11 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 disabled:opacity-50 outline-none"
          style={{ fontWeight: "500" }}
        />

        {/* Validation indicator - only shows after blur */}
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
          Please enter at least 2 characters
        </p>
      )}
    </div>
  );
}

