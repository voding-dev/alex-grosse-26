"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Building2, ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanySelectorProps {
  value: Id<"companies"> | null | undefined;
  onChange: (value: Id<"companies"> | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CompanySelector({ 
  value, 
  onChange, 
  disabled, 
  className = "",
  placeholder = "Select company"
}: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const companies = useQuery(api.contacts.companiesList, {});

  const selectedCompany = companies?.find(c => c._id === value);

  const filteredCompanies = companies?.filter(
    company =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.address && company.address.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleSelect = (companyId: Id<"companies"> | null) => {
    onChange(companyId);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full bg-foreground/3 hover:bg-foreground/5 border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground transition-all duration-200 disabled:opacity-50 flex items-center gap-3",
          selectedCompany ? "font-medium" : "text-foreground/40"
        )}
        style={{ fontWeight: selectedCompany ? "500" : "400" }}
      >
        <Building2 className="h-4 w-4 text-foreground/30 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-foreground/40 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border-2 border-foreground/20 shadow-2xl z-20 max-h-96 overflow-hidden flex flex-col max-w-full">
            {/* Search */}
            <div className="p-3 border-b-2 border-foreground/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-foreground/3 text-foreground text-sm outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Companies List */}
            <div className="overflow-y-auto">
              {/* None option */}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 hover:bg-foreground/5 transition-colors text-left",
                  !value && "bg-foreground/8"
                )}
              >
                <Building2 className="h-4 w-4 text-foreground/30" />
                <span className="flex-1 text-sm font-medium text-foreground/60">No company</span>
                {!value && (
                  <Check className="h-4 w-4 text-foreground/60" />
                )}
              </button>

              {filteredCompanies.map((company) => (
                <button
                  key={company._id}
                  type="button"
                  onClick={() => handleSelect(company._id)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 hover:bg-foreground/5 transition-colors text-left",
                    value === company._id && "bg-foreground/8"
                  )}
                >
                  <Building2 className="h-4 w-4 text-foreground/30" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {company.name}
                    </div>
                    {company.contactCount > 0 && (
                      <div className="text-xs text-foreground/40 mt-0.5">
                        {company.contactCount} contact{company.contactCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {value === company._id && (
                    <Check className="h-4 w-4 text-foreground/60" />
                  )}
                </button>
              ))}

              {filteredCompanies.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-foreground/40">
                  {searchQuery ? "No companies found" : "No companies yet"}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

