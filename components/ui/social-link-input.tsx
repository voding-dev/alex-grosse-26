"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";

type SocialPlatform = "instagram" | "facebook" | "linkedin" | "twitter" | "youtube";

interface SocialLinkInputProps {
  platform: SocialPlatform;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const platformConfig: Record<SocialPlatform, { icon: React.ComponentType<any>; placeholder: string; domain: string }> = {
  instagram: {
    icon: Instagram,
    placeholder: "instagram.com/username",
    domain: "instagram.com"
  },
  facebook: {
    icon: Facebook,
    placeholder: "facebook.com/username",
    domain: "facebook.com"
  },
  linkedin: {
    icon: Linkedin,
    placeholder: "linkedin.com/in/username",
    domain: "linkedin.com"
  },
  twitter: {
    icon: Twitter,
    placeholder: "twitter.com/username",
    domain: "twitter.com"
  },
  youtube: {
    icon: Youtube,
    placeholder: "youtube.com/@channel",
    domain: "youtube.com"
  },
};

export function SocialLinkInput({ 
  platform, 
  value, 
  onChange, 
  disabled, 
  className = ""
}: SocialLinkInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  const config = platformConfig[platform];
  const Icon = config.icon;

  // URL validation - check if it contains the platform domain
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes(config.domain);
  };

  const showValidation = hasBlurred && value.length > 0;
  const isValid = isValidUrl(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Platform icon */}
        <div className="absolute left-4 pointer-events-none">
          <Icon className={`h-4 w-4 transition-colors ${
            isFocused ? "text-foreground/60" : "text-foreground/30"
          }`} />
        </div>

        {/* Social link input */}
        <input
          type="url"
          placeholder={config.placeholder}
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
          Please enter a valid {platform} URL
        </p>
      )}
    </div>
  );
}

