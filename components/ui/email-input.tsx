"use client";

import { useState } from "react";
import { Mail, Check, X } from "lucide-react";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function EmailInput({ value, onChange, disabled, required, className = "" }: EmailInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showValidation = value.length > 0 && !isFocused;
  const isValid = isValidEmail(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (value.length > 0) {
      setIsValidating(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Mail icon */}
        <div className="absolute left-4 pointer-events-none">
          <Mail className={`h-4 w-4 transition-colors ${
            isFocused ? "text-foreground/60" : "text-foreground/30"
          }`} />
        </div>

        {/* Email input */}
        <input
          type="email"
          placeholder="your.email@domain.com"
          value={value}
          onChange={handleChange}
          onFocus={() => {
            setIsFocused(true);
            setIsValidating(false);
          }}
          onBlur={() => {
            setIsFocused(false);
            if (value.length > 0) {
              setIsValidating(true);
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
          Please enter a valid email address
        </p>
      )}
    </div>
  );
}

