"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Country {
  code: string;
  name: string;
  dialCode: string;
  format?: string;
}

// SVG flag component for cleaner, more professional look
const CountryFlag = ({ code }: { code: string }) => (
  <div className="w-6 h-4 bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center text-[10px] font-bold text-foreground/40 border border-foreground/10">
    {code}
  </div>
);

const countries: Country[] = [
  { code: "US", name: "United States", dialCode: "+1", format: "(###) ###-####" },
  { code: "CA", name: "Canada", dialCode: "+1", format: "(###) ###-####" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", format: "#### ### ####" },
  { code: "AU", name: "Australia", dialCode: "+61", format: "#### ### ###" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", format: "### ### ####" },
  { code: "DE", name: "Germany", dialCode: "+49", format: "### ########" },
  { code: "FR", name: "France", dialCode: "+33", format: "# ## ## ## ##" },
  { code: "ES", name: "Spain", dialCode: "+34", format: "### ## ## ##" },
  { code: "IT", name: "Italy", dialCode: "+39", format: "### ### ####" },
  { code: "NL", name: "Netherlands", dialCode: "+31", format: "## ########" },
  { code: "BE", name: "Belgium", dialCode: "+32", format: "### ## ## ##" },
  { code: "SE", name: "Sweden", dialCode: "+46", format: "###-### ## ##" },
  { code: "NO", name: "Norway", dialCode: "+47", format: "### ## ###" },
  { code: "DK", name: "Denmark", dialCode: "+45", format: "## ## ## ##" },
  { code: "FI", name: "Finland", dialCode: "+358", format: "### #######" },
  { code: "CH", name: "Switzerland", dialCode: "+41", format: "## ### ## ##" },
  { code: "AT", name: "Austria", dialCode: "+43", format: "### #######" },
  { code: "IE", name: "Ireland", dialCode: "+353", format: "### ### ####" },
  { code: "PT", name: "Portugal", dialCode: "+351", format: "### ### ###" },
  { code: "GR", name: "Greece", dialCode: "+30", format: "### ### ####" },
  { code: "PL", name: "Poland", dialCode: "+48", format: "### ### ###" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", format: "### ### ###" },
  { code: "JP", name: "Japan", dialCode: "+81", format: "###-####-####" },
  { code: "CN", name: "China", dialCode: "+86", format: "### #### ####" },
  { code: "KR", name: "South Korea", dialCode: "+82", format: "###-####-####" },
  { code: "IN", name: "India", dialCode: "+91", format: "##### #####" },
  { code: "SG", name: "Singapore", dialCode: "+65", format: "#### ####" },
  { code: "MY", name: "Malaysia", dialCode: "+60", format: "###-### ####" },
  { code: "TH", name: "Thailand", dialCode: "+66", format: "### ### ####" },
  { code: "PH", name: "Philippines", dialCode: "+63", format: "#### ### ####" },
  { code: "ID", name: "Indonesia", dialCode: "+62", format: "###-###-####" },
  { code: "VN", name: "Vietnam", dialCode: "+84", format: "### ### ####" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", format: "## ### ####" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", format: "### ### ####" },
  { code: "IL", name: "Israel", dialCode: "+972", format: "###-### ####" },
  { code: "TR", name: "Turkey", dialCode: "+90", format: "### ### ####" },
  { code: "ZA", name: "South Africa", dialCode: "+27", format: "## ### ####" },
  { code: "NG", name: "Nigeria", dialCode: "+234", format: "### ### ####" },
  { code: "EG", name: "Egypt", dialCode: "+20", format: "### ### ####" },
  { code: "KE", name: "Kenya", dialCode: "+254", format: "### ######" },
  { code: "BR", name: "Brazil", dialCode: "+55", format: "(##) #####-####" },
  { code: "MX", name: "Mexico", dialCode: "+52", format: "### ### ####" },
  { code: "AR", name: "Argentina", dialCode: "+54", format: "### ####-####" },
  { code: "CL", name: "Chile", dialCode: "+56", format: "# #### ####" },
  { code: "CO", name: "Colombia", dialCode: "+57", format: "### ### ####" },
  { code: "PE", name: "Peru", dialCode: "+51", format: "### ### ###" },
  { code: "RU", name: "Russia", dialCode: "+7", format: "### ###-##-##" },
  { code: "UA", name: "Ukraine", dialCode: "+380", format: "## ### ####" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function PhoneInput({ value, onChange, disabled, required, className = "" }: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Parse initial value
  useEffect(() => {
    if (value && value.includes(" ")) {
      const [dialCode, number] = value.split(" ", 2);
      const country = countries.find(c => c.dialCode === dialCode);
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(number || "");
      }
    }
  }, []);

  const formatPhoneNumber = (input: string, format?: string): string => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, "");
    
    if (!format) return digitsOnly;

    let formatted = "";
    let digitIndex = 0;

    for (let i = 0; i < format.length && digitIndex < digitsOnly.length; i++) {
      if (format[i] === "#") {
        formatted += digitsOnly[digitIndex];
        digitIndex++;
      } else {
        formatted += format[i];
      }
    }

    return formatted;
  };

  const handlePhoneChange = (input: string) => {
    const formatted = formatPhoneNumber(input, selectedCountry.format);
    setPhoneNumber(formatted);
    onChange(`${selectedCountry.dialCode} ${formatted}`);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");
    // Reformat existing number with new country format
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    const formatted = formatPhoneNumber(digitsOnly, country.format);
    setPhoneNumber(formatted);
    onChange(`${country.dialCode} ${formatted}`);
  };

  const filteredCountries = countries.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Phone validation - check if we have dial code and at least 7 digits
  const isValidPhone = (): boolean => {
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    return digitsOnly.length >= 7 && selectedCountry.dialCode.length > 0;
  };

  const showValidation = phoneNumber.length > 0 && !isFocused;
  const isValid = isValidPhone();

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* Country Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-full px-3 py-3 bg-foreground/3 hover:bg-foreground/5 border-2 border-transparent transition-all duration-200 disabled:opacity-50 flex items-center gap-2 min-w-[120px]"
          >
            <CountryFlag code={selectedCountry.code} />
            <span className="text-sm font-medium text-foreground/70">{selectedCountry.dialCode}</span>
            <ChevronDown className={`h-4 w-4 text-foreground/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-background border-2 border-foreground/20 shadow-2xl z-20 max-h-96 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="p-3 border-b-2 border-foreground/10">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-foreground/3 text-foreground text-sm outline-none"
                    autoFocus
                  />
                </div>

                {/* Countries List */}
                <div className="overflow-y-auto">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-foreground/5 transition-colors text-left ${
                        selectedCountry.code === country.code ? "bg-foreground/8" : ""
                      }`}
                    >
                      <CountryFlag code={country.code} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {country.name}
                        </div>
                      </div>
                      <span className="text-sm text-foreground/60 font-medium">
                        {country.dialCode}
                      </span>
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-foreground/40">
                      No countries found
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <input
            type="tel"
            placeholder={selectedCountry.format || "Phone number"}
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            required={required}
            disabled={disabled}
            className="w-full bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 pr-11 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 disabled:opacity-50 outline-none"
            style={{ fontWeight: "500" }}
          />
          
          {/* Validation indicator */}
          {showValidation && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
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
      </div>

      {/* Validation message */}
      {showValidation && !isValid && (
        <p className="mt-1.5 text-xs text-red-600/80 font-medium">
          Please enter a valid phone number
        </p>
      )}
    </div>
  );
}

