"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  Settings,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  MapPin,
  Globe,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  ExternalLink,
  Users,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Vault View Component
function VaultView({ 
  allProspects, 
  searches, 
  industries,
  capitalizeWords 
}: { 
  allProspects: any[]; 
  searches: any[]; 
  industries: any[];
  capitalizeWords: (str: string) => string;
}) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedIndustryId, setSelectedIndustryId] = useState<Id<"prospectIndustries"> | null>(null);
  
  // Get all unique states
  const allStates = useMemo(() => {
    const states = new Set<string>();
    searches.forEach(s => {
      if (s.state) states.add(s.state);
    });
    return Array.from(states).sort();
  }, [searches]);
  
  // Get cities for selected state
  const citiesForState = useMemo(() => {
    if (!selectedState) return [];
    const cities = new Set<string>();
    searches.forEach(s => {
      if (s.state === selectedState && s.city) {
        cities.add(s.city);
      }
    });
    return Array.from(cities).sort();
  }, [searches, selectedState]);
  
  // Get industries for selected state/city (or all if nothing selected)
  const industriesForLocation = useMemo(() => {
    const industryIds = new Set<Id<"prospectIndustries">>();
    searches.forEach(s => {
      if (selectedState && s.state !== selectedState) return;
      if (selectedCity && s.city !== selectedCity) return;
      if (s.industryId) industryIds.add(s.industryId);
    });
    return Array.from(industryIds);
  }, [searches, selectedState, selectedCity]);
  
  // Get all industries if no location filters
  const allIndustriesForVault = useMemo(() => {
    if (selectedState || selectedCity) return industriesForLocation;
    const industryIds = new Set<Id<"prospectIndustries">>();
    searches.forEach(s => {
      if (s.industryId) industryIds.add(s.industryId);
    });
    return Array.from(industryIds);
  }, [searches, selectedState, selectedCity, industriesForLocation]);
  
  // Get filtered prospects
  const filteredVaultProspects = useMemo(() => {
    return allProspects.filter((p: any) => {
      const search = searches.find(s => s._id === p.searchId);
      if (!search) return false;
      
      if (selectedState && search.state !== selectedState) return false;
      if (selectedCity && search.city !== selectedCity) return false;
      if (selectedIndustryId && search.industryId !== selectedIndustryId) return false;
      
      return true;
    });
  }, [allProspects, searches, selectedState, selectedCity, selectedIndustryId]);
  
  // Get counts for states
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allStates.forEach(state => {
      const stateProspects = allProspects.filter((p: any) => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.state === state;
      });
      counts[state] = stateProspects.length;
    });
    return counts;
  }, [allStates, allProspects, searches]);
  
  // Get counts for cities
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    citiesForState.forEach(city => {
      const cityProspects = allProspects.filter((p: any) => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.city === city && 
               (!selectedState || search.state === selectedState);
      });
      counts[city] = cityProspects.length;
    });
    return counts;
  }, [citiesForState, allProspects, searches, selectedState]);
  
  // Get counts for industries
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    industriesForLocation.forEach(industryId => {
      const industryProspects = allProspects.filter((p: any) => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.industryId === industryId &&
               (!selectedState || search.state === selectedState) &&
               (!selectedCity || search.city === selectedCity);
      });
      counts[industryId] = industryProspects.length;
    });
    return counts;
  }, [industriesForLocation, allProspects, searches, selectedState, selectedCity]);
  
  const handleReset = () => {
    setSelectedState(null);
    setSelectedCity(null);
    setSelectedIndustryId(null);
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 border border-foreground/10 rounded-lg bg-foreground/5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-foreground/60" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        {selectedState && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border border-accent/30 rounded-md">
            <span className="text-sm font-medium">{selectedState}</span>
            <button
              onClick={() => {
                setSelectedState(null);
                setSelectedCity(null);
                setSelectedIndustryId(null);
              }}
              className="ml-1 hover:text-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {selectedCity && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border border-accent/30 rounded-md">
            <span className="text-sm font-medium">{capitalizeWords(selectedCity)}</span>
            <button
              onClick={() => {
                setSelectedCity(null);
                setSelectedIndustryId(null);
              }}
              className="ml-1 hover:text-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {selectedIndustryId && (
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/20 border border-accent/30 rounded-md">
            <span className="text-sm font-medium">
              {capitalizeWords(industries.find(i => i._id === selectedIndustryId)?.name || '')}
            </span>
            <button
              onClick={() => setSelectedIndustryId(null)}
              className="ml-1 hover:text-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {(selectedState || selectedCity || selectedIndustryId) && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      
      {/* States Grid */}
      {!selectedState && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-tight">States</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allStates.map((state) => (
              <Card
                key={state}
                className="border border-foreground/10 hover:border-accent/50 cursor-pointer transition-all hover:bg-foreground/5"
                onClick={() => setSelectedState(state)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{state}</h4>
                    <span className="text-sm text-foreground/60">{stateCounts[state] || 0}</span>
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">prospects</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Cities Grid - Show when state is selected but not city */}
      {selectedState && !selectedCity && !selectedIndustryId && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedState(null);
                setSelectedCity(null);
                setSelectedIndustryId(null);
              }}
              className="text-foreground/60 hover:text-foreground"
            >
              ← Back to States
            </button>
            <span className="text-foreground/40">/</span>
            <h3 className="text-lg font-bold uppercase tracking-tight">{selectedState}</h3>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-tight">Cities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {citiesForState.map((city) => (
                <Card
                  key={city}
                  className="border border-foreground/10 hover:border-accent/50 cursor-pointer transition-all hover:bg-foreground/5"
                  onClick={() => setSelectedCity(city)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">{capitalizeWords(city)}</h4>
                      <span className="text-sm text-foreground/60">{cityCounts[city] || 0}</span>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">prospects</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Also show industries for this state */}
          {industriesForLocation.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-foreground/10">
              <h3 className="text-lg font-bold uppercase tracking-tight">Industries</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {industriesForLocation.map((industryId) => {
                  const industry = industries.find(i => i._id === industryId);
                  if (!industry) return null;
                  return (
                    <Card
                      key={industryId}
                      className="border border-foreground/10 hover:border-accent/50 cursor-pointer transition-all hover:bg-foreground/5"
                      onClick={() => setSelectedIndustryId(industryId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">{capitalizeWords(industry.name)}</h4>
                          <span className="text-sm text-foreground/60">{industryCounts[industryId] || 0}</span>
                        </div>
                        <p className="text-xs text-foreground/60 mt-1">prospects</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Industries Grid - Show when city is selected but not industry */}
      {selectedCity && !selectedIndustryId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCity(null);
                setSelectedIndustryId(null);
              }}
              className="text-foreground/60 hover:text-foreground"
            >
              ← Back to Cities
            </button>
            <span className="text-foreground/40">/</span>
            <h3 className="text-lg font-bold uppercase tracking-tight">{capitalizeWords(selectedCity)}</h3>
          </div>
          <h3 className="text-lg font-bold uppercase tracking-tight">Industries</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {industriesForLocation.map((industryId) => {
              const industry = industries.find(i => i._id === industryId);
              if (!industry) return null;
              return (
                <Card
                  key={industryId}
                  className="border border-foreground/10 hover:border-accent/50 cursor-pointer transition-all hover:bg-foreground/5"
                  onClick={() => setSelectedIndustryId(industryId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">{capitalizeWords(industry.name)}</h4>
                      <span className="text-sm text-foreground/60">{industryCounts[industryId] || 0}</span>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">prospects</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Prospects Grid - Show when industry is selected OR when state+city is selected */}
      {(selectedIndustryId || (selectedState && selectedCity)) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIndustryId && (
              <>
                <button
                  onClick={() => setSelectedIndustryId(null)}
                  className="text-foreground/60 hover:text-foreground"
                >
                  ← Back to Industries
                </button>
                <span className="text-foreground/40">/</span>
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  {capitalizeWords(industries.find(i => i._id === selectedIndustryId)?.name || '')}
                </h3>
              </>
            )}
            {selectedState && selectedCity && !selectedIndustryId && (
              <>
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  {capitalizeWords(selectedCity)}, {selectedState}
                </h3>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold uppercase tracking-tight">Prospects ({filteredVaultProspects.length})</h3>
          </div>
          {filteredVaultProspects.length === 0 ? (
            <p className="text-center text-foreground/60 py-8">
              No prospects found for this combination.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVaultProspects.map((prospect: any) => {
                const search = searches.find(s => s._id === prospect.searchId);
                const industry = search ? industries.find(i => i._id === search.industryId) : null;
                
                return (
                  <Card key={prospect._id} className="border border-foreground/10 hover:border-accent/30 transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-base">{prospect.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-accent fill-accent" />
                          <span className="text-sm font-medium">{prospect.score || 0}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-foreground/80">
                        {industry && (
                          <div className="flex items-center gap-2">
                            <span className="text-foreground/60">Industry:</span>
                            <span className="font-medium">{capitalizeWords(industry.name)}</span>
                          </div>
                        )}
                        {search && (
                          <>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-foreground/60" />
                              <span>{capitalizeWords(search.city || '')}, {search.state}</span>
                            </div>
                            {prospect.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3 w-3 text-foreground/60 mt-0.5" />
                                <span className="text-foreground/70">{prospect.address}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-foreground/10">
                        {prospect.website && (
                          <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Website
                          </a>
                        )}
                        {prospect.phone && (
                          <div className="text-xs text-foreground/60 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {prospect.phone}
                          </div>
                        )}
                        {prospect.emails.length > 0 && (
                          <div className="text-xs text-foreground/60 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {prospect.emails[0]}
                            {prospect.emails.length > 1 && ` (+${prospect.emails.length - 1})`}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to capitalize each word
function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Improved CSV parser that handles quoted fields and multi-line values
function parseCSV(text: string): { headers: string[]; rows: any[] } {
  if (!text || text.trim().length === 0) return { headers: [], rows: [] };
  
  const lines = text.split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Parse CSV handling quoted fields and multi-line values
  function parseCSVContent(lines: string[]): string[][] {
    const result: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            j++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          currentRow.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // If we're in quotes, continue to next line
      if (inQuotes) {
        currentField += '\n';
        i++;
        continue;
      }
      
      // End of field/row
      if (currentField.trim() !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        currentField = '';
      }
      
      if (currentRow.length > 0) {
        result.push(currentRow);
        currentRow = [];
      }
      
      i++;
    }
    
    // Handle last field if any
    if (currentField.trim() !== '' || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.length > 0) {
        result.push(currentRow);
      }
    }
    
    return result;
  }
  
  const parsed = parseCSVContent(lines);
  if (parsed.length === 0) return { headers: [], rows: [] };
  
  // First row is headers
  const headers = parsed[0].map(h => h.replace(/^"|"$/g, '').trim());
  
  // Rest are data rows
  const rows: any[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const values = parsed[i];
    const row: any = {};
    headers.forEach((header, index) => {
      let value = (values[index] || '').replace(/^"|"$/g, '').trim();
      // Clean up escaped quotes
      value = value.replace(/""/g, '"');
      row[header] = value;
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

// Extract emails from text
function extractEmails(text: string): string[] {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? [...new Set(matches)] : [];
}

export default function ProspectImporterPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [activeTab, setActiveTab] = useState("import");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSearchId, setSelectedSearchId] = useState<Id<"prospectSearches"> | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  
  // Industry management
  const [industryDialogOpen, setIndustryDialogOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Id<"prospectIndustries"> | null>(null);
  const [industryName, setIndustryName] = useState("");
  const [industryDescription, setIndustryDescription] = useState("");
  
  // Search selection (searches are managed externally)
  
  // Prospect list filters
  const [prospectSearchQuery, setProspectSearchQuery] = useState("");
  const [prospectFilterCity, setProspectFilterCity] = useState<string | "all">("all");
  const [prospectFilterState, setProspectFilterState] = useState<string | "all">("all");
  const [prospectFilterIndustryId, setProspectFilterIndustryId] = useState<Id<"prospectIndustries"> | "all">("all");
  const [quickFilter, setQuickFilter] = useState<"hasWebsite" | "hasPhone" | "hasEmails" | "highScore" | null>(null);
  const [prospectSortBy, setProspectSortBy] = useState<"score" | "name" | "createdAt" | "city" | "state" | "industry">("createdAt");
  const [prospectSortOrder, setProspectSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProspects, setSelectedProspects] = useState<Set<Id<"prospects">>>(new Set());
  const [showMappingDetails, setShowMappingDetails] = useState(false);
  
  // Handle column header click for sorting
  const handleSort = (column: "score" | "name" | "createdAt" | "city" | "state" | "industry") => {
    if (prospectSortBy === column) {
      // Toggle sort order if clicking the same column
      setProspectSortOrder(prospectSortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setProspectSortBy(column);
      setProspectSortOrder("desc");
    }
  };
  
  // Get sort icon for a column
  const getSortIcon = (column: "score" | "name" | "createdAt" | "city" | "state" | "industry") => {
    if (prospectSortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-foreground/40" />;
    }
    return prospectSortOrder === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1 text-accent" />
      : <ArrowDown className="h-3 w-3 ml-1 text-accent" />;
  };
  
  // Queries
  const industries = useQuery(api.prospects.industriesList) || [];
  const searches = useQuery(api.prospects.searchesList, {}) || [];
  
  // Get all prospects (unfiltered) for counts
  const allProspects = useQuery(api.prospects.prospectsList, {}) || [];
  
  // Hierarchical filtering: Industry → City → State
  // Get cities filtered by selected industry
  const filteredCities = useMemo(() => {
    if (prospectFilterIndustryId === "all") {
      // If no industry selected, show all cities
      const cities = new Set<string>();
      searches.forEach(s => {
        if (s.city) cities.add(s.city);
      });
      return Array.from(cities).sort();
    }
    
    // Filter cities by selected industry
    const cities = new Set<string>();
    searches.forEach(s => {
      if (s.industryId === prospectFilterIndustryId && s.city) {
        cities.add(s.city);
      }
    });
    return Array.from(cities).sort();
  }, [searches, prospectFilterIndustryId]);
  
  // Get states filtered by selected industry and city
  const filteredStates = useMemo(() => {
    if (prospectFilterIndustryId === "all") {
      // If no industry selected, show all states
      const states = new Set<string>();
      searches.forEach(s => {
        if (s.state) states.add(s.state);
      });
      return Array.from(states).sort();
    }
    
    // Filter states by selected industry and city
    const states = new Set<string>();
    searches.forEach(s => {
      if (s.industryId === prospectFilterIndustryId) {
        if (prospectFilterCity === "all" || s.city === prospectFilterCity) {
          if (s.state) states.add(s.state);
        }
      }
    });
    return Array.from(states).sort();
  }, [searches, prospectFilterIndustryId, prospectFilterCity]);
  
  // Get prospect counts for industries
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    industries.forEach(industry => {
      const industrySearches = searches.filter(s => s.industryId === industry._id);
      const industryProspects = allProspects.filter(p => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.industryId === industry._id;
      });
      counts[industry._id] = industryProspects.length;
    });
    return counts;
  }, [industries, searches, allProspects]);
  
  // Get prospect counts for cities
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCities.forEach(city => {
      const cityProspects = allProspects.filter(p => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.city === city
          // Apply industry filter if selected
          && (prospectFilterIndustryId === "all" || search.industryId === prospectFilterIndustryId);
      });
      counts[city] = cityProspects.length;
    });
    return counts;
  }, [filteredCities, allProspects, searches, prospectFilterIndustryId]);
  
  // Get prospect counts for states
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStates.forEach(state => {
      const stateProspects = allProspects.filter(p => {
        const search = searches.find(s => s._id === p.searchId);
        return search && search.state === state
          // Apply industry and city filters if selected
          && (prospectFilterIndustryId === "all" || search.industryId === prospectFilterIndustryId)
          && (prospectFilterCity === "all" || search.city === prospectFilterCity);
      });
      counts[state] = stateProspects.length;
    });
    return counts;
  }, [filteredStates, allProspects, searches, prospectFilterIndustryId, prospectFilterCity]);
  
  // Reset city/state filters when industry changes
  useEffect(() => {
    if (prospectFilterIndustryId !== "all") {
      // Reset city filter if current city is not in filtered cities
      if (prospectFilterCity !== "all" && !filteredCities.includes(prospectFilterCity)) {
        setProspectFilterCity("all");
      }
      // Reset state filter if current state is not in filtered states
      if (prospectFilterState !== "all" && !filteredStates.includes(prospectFilterState)) {
        setProspectFilterState("all");
      }
    }
  }, [prospectFilterIndustryId, filteredCities, filteredStates, prospectFilterCity, prospectFilterState]);
  
  // Reset state filter when city changes
  useEffect(() => {
    if (prospectFilterCity !== "all") {
      // Reset state filter if current state is not in filtered states
      if (prospectFilterState !== "all" && !filteredStates.includes(prospectFilterState)) {
        setProspectFilterState("all");
      }
    }
  }, [prospectFilterCity, filteredStates, prospectFilterState]);
  
  // Get filtered prospects for display
  const prospects = useQuery(
    api.prospects.prospectsList,
    {
      city: prospectFilterCity !== "all" ? prospectFilterCity : undefined,
      state: prospectFilterState !== "all" ? prospectFilterState : undefined,
      industryId: prospectFilterIndustryId !== "all" ? prospectFilterIndustryId : undefined,
      sortBy: prospectSortBy,
      sortOrder: prospectSortOrder,
    }
  ) || [];
  
  // Mutations
  const createIndustry = useMutation(api.prospects.industriesCreate);
  const updateIndustry = useMutation(api.prospects.industriesUpdate);
  const removeIndustry = useMutation(api.prospects.industriesRemove);
  const bulkCreateProspects = useMutation(api.prospects.prospectsBulkCreate);
  const updateProspect = useMutation(api.prospects.prospectsUpdate);
  const removeProspect = useMutation(api.prospects.prospectsRemove);
  const bulkRemoveProspects = useMutation(api.prospects.prospectsBulkRemove);
  const createSearch = useMutation(api.prospects.searchesCreate);
  const createLead = useMutation(api.leads.leadsCreate);
  
  // Convert to lead state
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedProspectForConvert, setSelectedProspectForConvert] = useState<Id<"prospects"> | null>(null);
  const [convertFormData, setConvertFormData] = useState({
    contactName: "",
    contactTitle: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
    tags: [] as string[],
  });
  
  
  // Auto-map CSV columns to prospect fields
  const autoMapColumns = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    headers.forEach(header => {
      const lower = header.toLowerCase().trim();
      
      // Exact matches first (most specific)
      if (lower === 'name' && !mapping['name']) mapping['name'] = header;
      else if (lower === 'address' && !mapping['address']) mapping['address'] = header;
      else if (lower === 'website' && !mapping['website']) mapping['website'] = header;
      else if (lower === 'phone' && !mapping['phone']) mapping['phone'] = header;
      else if (lower === 'emails' && !mapping['emails']) mapping['emails'] = header;
      else if (lower === 'email' && !mapping['emails']) mapping['emails'] = header;
      else if (lower === 'linkedin' && !mapping['linkedin']) mapping['linkedin'] = header;
      else if (lower === 'twitter' && !mapping['twitter']) mapping['twitter'] = header;
      else if (lower === 'facebook' && !mapping['facebook']) mapping['facebook'] = header;
      else if (lower === 'youtube' && !mapping['youtube']) mapping['youtube'] = header;
      else if (lower === 'instagram' && !mapping['instagram']) mapping['instagram'] = header;
      else if (lower === 'link' && !mapping['googleBusinessLink']) mapping['googleBusinessLink'] = header;
      // Partial matches for flexibility (only if not already mapped)
      else if (!mapping['name'] && lower.includes('name') && !lower.includes('owner')) mapping['name'] = header;
      else if (!mapping['address'] && lower.includes('address')) mapping['address'] = header;
      else if (!mapping['website'] && lower.includes('website')) mapping['website'] = header;
      else if (!mapping['phone'] && lower.includes('phone')) mapping['phone'] = header;
      else if (!mapping['instagram'] && lower.includes('instagram')) mapping['instagram'] = header;
      else if (!mapping['facebook'] && lower.includes('facebook')) mapping['facebook'] = header;
      else if (!mapping['youtube'] && lower.includes('youtube')) mapping['youtube'] = header;
      else if (!mapping['twitter'] && lower.includes('twitter')) mapping['twitter'] = header;
      else if (!mapping['linkedin'] && lower.includes('linkedin')) mapping['linkedin'] = header;
      else if (!mapping['emails'] && (lower.includes('email') || lower === 'emails')) mapping['emails'] = header;
      else if (!mapping['googleBusinessLink'] && lower.includes('link') && lower.includes('google')) mapping['googleBusinessLink'] = header;
      // Fallback: if header contains 'link' and googleBusinessLink is not mapped, map it
      else if (!mapping['googleBusinessLink'] && lower === 'link') mapping['googleBusinessLink'] = header;
    });
    
    return mapping;
  };

  // Parse filename to extract search, city, and state
  const parseFilename = (filename: string): { search: string; city: string; state: string } | null => {
    // Remove .csv extension
    const nameWithoutExt = filename.replace(/\.csv$/i, '');
    
    // Pattern: {search-query}-{city}-{state}-overview
    // Or: {search-query}-{city}-{state}
    const parts = nameWithoutExt.split('-');
    
    if (parts.length < 3) return null;
    
    // Remove "overview" if present
    const cleanParts = parts[parts.length - 1] === 'overview' ? parts.slice(0, -1) : parts;
    
    if (cleanParts.length < 3) return null;
    
    // Last two parts are state and city (in that order)
    const state = cleanParts[cleanParts.length - 1].toUpperCase();
    const city = cleanParts[cleanParts.length - 2];
    
    // Everything before city-state is the search query
    const searchParts = cleanParts.slice(0, -2);
    const search = searchParts.join(' ');
    
    return { search, city, state };
  };

  // Process CSV file
  const processCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
      
      // Auto-map columns
      const autoMapping = autoMapColumns(parsed.headers);
      setColumnMapping(autoMapping);
      
      // Check if required fields are mapped
      const missingFields: string[] = [];
      if (!autoMapping['name']) missingFields.push('name');
      if (!autoMapping['address']) missingFields.push('address');
      
      if (missingFields.length > 0) {
        toast({
          title: "Mapping warning",
          description: `Could not auto-map required fields: ${missingFields.join(', ')}. Please check your CSV headers.`,
          variant: "destructive",
        });
      } else {
      toast({
        title: "CSV loaded",
          description: `Found ${parsed.rows.length} rows with ${parsed.headers.length} columns. Auto-mapped successfully.`,
      });
      }
    };
    reader.readAsText(file);
  };

  // Handle CSV file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processCSVFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // Handle CSV import
  const handleImport = async () => {
    if (!csvData || !csvFile) {
      toast({
        title: "Missing data",
        description: "Please ensure CSV data is loaded",
        variant: "destructive",
      });
      return;
    }
    
    // Parse filename to extract search, city, and state
    const parsedFilename = parseFilename(csvFile.name);
    if (!parsedFilename) {
      toast({
        title: "Invalid filename",
        description: "Could not extract search, city, and state from filename. Expected format: {search}-{city}-{state}-overview.csv",
        variant: "destructive",
      });
      return;
    }
    
    const { search: searchName, city, state } = parsedFilename;
    
    // Find or create industry based on search query
    const industryName = searchName.split(' in ')[0].trim() || searchName.split(' ').slice(0, 2).join(' ');
    let industry = industries.find(i => i.name.toLowerCase() === industryName.toLowerCase());
    
    if (!industry) {
      try {
        const industryId = await createIndustry({
          name: industryName,
          description: `Auto-created from import: ${searchName}`,
        });
        // Refresh industries list to get full industry object
        // For now, create a minimal industry object - the query will refresh
        industry = { 
          _id: industryId as Id<"prospectIndustries">, 
          name: industryName, 
          description: `Auto-created from import: ${searchName}`,
          _creationTime: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      } catch (error: any) {
        toast({
          title: "Error creating industry",
          description: error.message || "Failed to create industry",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Find or create search
    let searchIdToUse = selectedSearchId;
    
    if (!searchIdToUse) {
      const existingSearch = searches.find(
        s => s.name.toLowerCase() === searchName.toLowerCase() &&
             s.city.toLowerCase() === city.toLowerCase() &&
             s.state.toUpperCase() === state.toUpperCase()
      );
      
      if (existingSearch) {
        searchIdToUse = existingSearch._id;
      } else {
        if (!industry) {
          toast({
            title: "Error",
            description: "Industry is required to create search",
            variant: "destructive",
          });
          return;
        }
        try {
          const newSearchId = await createSearch({
            name: searchName,
            city: city,
            state: state,
            industryId: industry._id,
          });
          searchIdToUse = newSearchId as Id<"prospectSearches">;
        } catch (error: any) {
          toast({
            title: "Error creating search",
            description: error.message || "Failed to create search",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    if (!searchIdToUse) {
      toast({
        title: "No search available",
        description: "Failed to create or find search",
        variant: "destructive",
      });
      return;
    }
    
    // Validate column mapping
    if (!columnMapping['name'] || !columnMapping['address']) {
      toast({
        title: "Invalid mapping",
        description: "Please map 'name' and 'address' columns",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      // Transform CSV rows to prospect format
      const prospectData = csvData.rows.map((row, index) => {
        // Get values from mapped columns, or empty string if not mapped
        const getValue = (field: string): string | undefined => {
          const mappedColumn = columnMapping[field];
          if (!mappedColumn) return undefined;
          const value = row[mappedColumn];
          // Return undefined if empty, otherwise return trimmed value
          return value && value.trim() ? value.trim() : undefined;
        };
        
        const name = getValue('name') || '';
        const address = getValue('address') || '';
        
        // Extract emails - check the emails column first, then try to extract from other fields
        let emails: string[] = [];
        const emailColumn = columnMapping['emails'];
        if (emailColumn && row[emailColumn]) {
          emails = extractEmails(row[emailColumn]);
        }
        
        return {
          name: name.trim(),
          address: address.trim(),
          website: getValue('website'),
          phone: getValue('phone'),
          instagram: getValue('instagram'),
          facebook: getValue('facebook'),
          youtube: getValue('youtube'),
          twitter: getValue('twitter'),
          linkedin: getValue('linkedin'),
          emails: emails,
          googleBusinessLink: getValue('googleBusinessLink'),
        };
      }).filter(p => p.name && p.address); // Filter out invalid rows
      
      // Import in batches
      const batchSize = 50;
      let imported = 0;
      
      for (let i = 0; i < prospectData.length; i += batchSize) {
        const batch = prospectData.slice(i, i + batchSize);
        await bulkCreateProspects({
          searchId: searchIdToUse,
          prospects: batch,
        });
        imported += batch.length;
        setImportProgress((imported / prospectData.length) * 100);
      }
      
      // Find the search name for the success message
      const importedSearch = searches.find(s => s._id === searchIdToUse);
      const importedSearchName = importedSearch?.name || searchName || "the search";
      
      toast({
        title: "Import complete",
        description: `Successfully imported ${imported} prospects into "${importedSearchName}"`,
      });
      
      // Reset
      setCsvFile(null);
      setCsvData(null);
      setColumnMapping({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setActiveTab("prospects");
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import prospects",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };
  
  // Industry management
  const handleCreateIndustry = async () => {
    if (!industryName.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter an industry name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (editingIndustry) {
        await updateIndustry({
          id: editingIndustry,
          name: industryName,
          description: industryDescription || undefined,
        });
        toast({
          title: "Industry updated",
          description: "Industry has been updated successfully",
        });
      } else {
        await createIndustry({
          name: industryName,
          description: industryDescription || undefined,
        });
        toast({
          title: "Industry created",
          description: "Industry has been created successfully",
        });
      }
      setIndustryDialogOpen(false);
      setIndustryName("");
      setIndustryDescription("");
      setEditingIndustry(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save industry",
        variant: "destructive",
      });
    }
  };
  
  const handleEditIndustry = (industry: any) => {
    setEditingIndustry(industry._id);
    setIndustryName(industry.name);
    setIndustryDescription(industry.description || "");
    setIndustryDialogOpen(true);
  };
  
  const handleDeleteIndustry = async (id: Id<"prospectIndustries">) => {
    try {
      await removeIndustry({ id });
      toast({
        title: "Industry deleted",
        description: "Industry has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete industry",
        variant: "destructive",
      });
    }
  };
  
  
  // Filtered and sorted prospects
  const filteredProspects = useMemo(() => {
    let filtered = [...prospects];
    
    // Text search
    if (prospectSearchQuery) {
      const query = prospectSearchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        (p.website && p.website.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query))
      );
    }
    
    // Quick filters
    if (quickFilter === "hasWebsite") {
      filtered = filtered.filter(p => p.website && p.website.trim() !== "");
    } else if (quickFilter === "hasPhone") {
      filtered = filtered.filter(p => p.phone && p.phone.trim() !== "");
    } else if (quickFilter === "hasEmails") {
      filtered = filtered.filter(p => p.emails && Array.isArray(p.emails) && p.emails.length > 0);
    } else if (quickFilter === "highScore") {
      filtered = filtered.filter(p => (p.score || 0) >= 40);
    }
    
    return filtered;
  }, [prospects, prospectSearchQuery, quickFilter]);
  
  // Toggle prospect selection
  const toggleProspectSelection = (id: Id<"prospects">) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const toggleAllProspects = () => {
    if (selectedProspects.size === filteredProspects.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(filteredProspects.map(p => p._id)));
    }
  };
  
  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedProspects.size === 0) return;
    
    try {
      await bulkRemoveProspects({ ids: Array.from(selectedProspects) });
      toast({
        title: "Prospects deleted",
        description: `Deleted ${selectedProspects.size} prospect(s)`,
      });
      setSelectedProspects(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete prospects",
        variant: "destructive",
      });
    }
  };
  
  // Export prospects
  const handleExport = () => {
    const dataToExport = filteredProspects.map(p => ({
      name: p.name,
      address: p.address,
      website: p.website || '',
      phone: p.phone || '',
      instagram: p.instagram || '',
      facebook: p.facebook || '',
      youtube: p.youtube || '',
      twitter: p.twitter || '',
      linkedin: p.linkedin || '',
      emails: p.emails.join('; '),
      googleBusinessLink: p.googleBusinessLink || '',
      score: p.score || 0,
    }));
    
    const headers = ['name', 'address', 'website', 'phone', 'instagram', 'facebook', 'youtube', 'twitter', 'linkedin', 'emails', 'googleBusinessLink', 'score'];
    const csv = [
      headers.join(','),
      ...dataToExport.map(row => headers.map(h => `"${(row[h as keyof typeof row] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete",
      description: `Exported ${dataToExport.length} prospects`,
    });
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Prospecting
            </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
              Import, organize, and score business prospects from CSV files
            </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="import" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Import
          </TabsTrigger>
          <TabsTrigger 
            value="prospects" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Prospects
          </TabsTrigger>
        </TabsList>
        
        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing prospect data. Map columns to prospect fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>CSV File</Label>
                {!csvFile ? (
                  <div
                    className={`border-2 border-dashed transition-colors rounded-lg p-8 text-center cursor-pointer ${
                      isDragging
                        ? "border-accent bg-accent/10"
                        : "border-foreground/20 hover:border-accent/50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-foreground/60" />
                    <p className="text-lg font-semibold mb-2">
                      Drag & drop CSV file here or click to browse
                    </p>
                    <p className="text-sm text-foreground/60">
                      Supports CSV files only
                    </p>
                    <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 p-4 border border-foreground/20 rounded-lg bg-foreground/5">
                      <FileText className="h-8 w-8 text-accent" />
                      <div className="flex-1">
                        <p className="font-semibold">{csvFile.name}</p>
                        <p className="text-sm text-foreground/60">
                          {csvData?.rows.length || 0} rows, {csvData?.headers.length || 0} columns
                        </p>
                      </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvData(null);
                        setColumnMapping({});
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                </div>
                  </div>
                )}
              </div>
              
              {/* Auto-mapping Summary */}
              {csvData && columnMapping && (
                <div className="space-y-4">
                  {(!columnMapping['name'] || !columnMapping['address']) ? (
                    <div className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950">
                      <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                        ⚠️ Warning: Required fields (name, address) must be mapped
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Please check your CSV headers to ensure 'name' and 'address' columns exist.
                </p>
              </div>
                  ) : (
                    <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        ✓ All required fields mapped successfully
                    </p>
                  </div>
                  )}
                  
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMappingDetails(!showMappingDetails)}
                      className="w-full justify-between"
                    >
                      <span className="text-sm font-medium">Field Mapping Details</span>
                      {showMappingDetails ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {showMappingDetails && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                        {['name', 'address', 'website', 'phone', 'instagram', 'facebook', 'youtube', 'twitter', 'linkedin', 'emails', 'googleBusinessLink'].map((field) => {
                          const mappedColumn = columnMapping[field];
                          return (
                            <div key={field} className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize text-foreground/80">
                                {field.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              {mappedColumn ? (
                                <span className="text-sm text-foreground/60">{mappedColumn}</span>
                              ) : (
                                <span className="text-sm text-foreground/40 italic">Not mapped</span>
                              )}
                      </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Import Button */}
              {csvData && (
                <div className="space-y-4">
                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Importing...</span>
                        <span>{Math.round(importProgress)}%</span>
                      </div>
                      <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !columnMapping['name'] || !columnMapping['address']}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Prospects
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Prospects Tab */}
        <TabsContent value="prospects" className="space-y-6">
          
          <Card className="border border-foreground/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Prospects
                  </CardTitle>
                  <CardDescription>
                    View and manage imported prospects
                  </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                        </Button>
                  {selectedProspects.size > 0 && (
                    <Button variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedProspects.size})
                        </Button>
                  )}
                </div>
                      </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Line: Industry, City, State */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Industry *</Label>
                        <Select
                    value={prospectFilterIndustryId}
                    onValueChange={(value) => {
                      setProspectFilterIndustryId(value as Id<"prospectIndustries"> | "all");
                      // Reset city and state when industry changes
                      setProspectFilterCity("all");
                      setProspectFilterState("all");
                    }}
                        >
                          <SelectTrigger>
                      <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                          <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                            {industries.map((industry) => (
                              <SelectItem key={industry._id} value={industry._id}>
                          {capitalizeWords(industry.name)} ({industryCounts[industry._id] || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={prospectFilterCity}
                    onValueChange={(value) => {
                      setProspectFilterCity(value as string | "all");
                      // Reset state when city changes
                      setProspectFilterState("all");
                    }}
                    disabled={prospectFilterIndustryId === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={prospectFilterIndustryId === "all" ? "Select Industry first" : "Select City"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {filteredCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {capitalizeWords(city)} ({cityCounts[city] || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={prospectFilterState}
                    onValueChange={(value) => setProspectFilterState(value as string | "all")}
                    disabled={prospectFilterIndustryId === "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={prospectFilterIndustryId === "all" ? "Select Industry first" : "Select State"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {filteredStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state} ({stateCounts[state] || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Bottom Line: Text Search and Quick Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-end pt-2 border-t border-foreground/10">
                <div className="flex-1 space-y-2">
                  <Label>Text Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      value={prospectSearchQuery}
                      onChange={(e) => setProspectSearchQuery(e.target.value)}
                      placeholder="Search prospects..."
                      className="pl-10"
                  />
                </div>
              </div>
              
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={quickFilter === "hasWebsite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setQuickFilter(quickFilter === "hasWebsite" ? null : "hasWebsite");
                    }}
                >
                    <Globe className="h-3 w-3 mr-1" />
                    Has Website
                  </Button>
                  <Button
                    variant={quickFilter === "hasPhone" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setQuickFilter(quickFilter === "hasPhone" ? null : "hasPhone");
                    }}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Has Phone
                  </Button>
                  <Button
                    variant={quickFilter === "hasEmails" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setQuickFilter(quickFilter === "hasEmails" ? null : "hasEmails");
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Has Emails
                  </Button>
                  <Button
                    variant={quickFilter === "highScore" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setQuickFilter(quickFilter === "highScore" ? null : "highScore");
                    }}
                >
                    <Star className="h-3 w-3 mr-1" />
                    High Score (40+)
                  </Button>
                  {(quickFilter || prospectSearchQuery) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuickFilter(null);
                        setProspectSearchQuery("");
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Prospects Table */}
              <div className="pt-6">
              {filteredProspects.length === 0 ? (
                <p className="text-center text-foreground/60 py-8">
                  No prospects found. Import some from the Import tab.
                </p>
              ) : (
                <div className="border border-foreground/10 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <button
                            onClick={toggleAllProspects}
                            className="p-1 hover:bg-foreground/5 rounded"
                          >
                            {selectedProspects.size === filteredProspects.length ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("name")}
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            Name
                            {getSortIcon("name")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("city")}
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            City
                            {getSortIcon("city")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("state")}
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            State
                            {getSortIcon("state")}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("industry")}
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                          >
                            Industry
                            {getSortIcon("industry")}
                          </button>
                        </TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Social</TableHead>
                        <TableHead className="text-right">
                          <button
                            onClick={() => handleSort("score")}
                            className="flex items-center justify-end gap-1 ml-auto hover:text-accent transition-colors"
                          >
                            Score
                            {getSortIcon("score")}
                          </button>
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProspects.map((prospect) => (
                        <TableRow key={prospect._id}>
                          <TableCell>
                            <button
                              onClick={() => toggleProspectSelection(prospect._id)}
                              className="p-1 hover:bg-foreground/5 rounded"
                            >
                              {selectedProspects.has(prospect._id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">{prospect.name}</TableCell>
                          <TableCell className="text-sm text-foreground/80">
                            {prospect.city ? capitalizeWords(prospect.city) : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/80">
                            {prospect.state || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/80">
                            {prospect.industryName ? capitalizeWords(prospect.industryName) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-foreground/60">
                              <MapPin className="h-3 w-3" />
                              {prospect.address}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              {prospect.website && (
                                <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent hover:underline">
                                  <Globe className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                              {prospect.phone && (
                                <div className="flex items-center gap-1 text-foreground/60">
                                  <Phone className="h-3 w-3" />
                                  {prospect.phone}
                                </div>
                              )}
                              {prospect.emails.length > 0 && (
                                <div className="flex items-center gap-1 text-foreground/60">
                                  <Mail className="h-3 w-3" />
                                  {prospect.emails[0]}
                                  {prospect.emails.length > 1 && ` (+${prospect.emails.length - 1})`}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {prospect.instagram && (
                                <a href={prospect.instagram} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <Instagram className="h-4 w-4" />
                                </a>
                              )}
                              {prospect.facebook && (
                                <a href={prospect.facebook} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <Facebook className="h-4 w-4" />
                                </a>
                              )}
                              {prospect.youtube && (
                                <a href={prospect.youtube} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <Youtube className="h-4 w-4" />
                                </a>
                              )}
                              {prospect.twitter && (
                                <a href={prospect.twitter} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <Twitter className="h-4 w-4" />
                                </a>
                              )}
                              {prospect.linkedin && (
                                <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <Linkedin className="h-4 w-4" />
                                </a>
                              )}
                              {prospect.googleBusinessLink && (
                                <a href={prospect.googleBusinessLink} target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-accent">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Star className="h-4 w-4 text-accent fill-accent" />
                              <span className="font-medium">{prospect.score || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!prospect.convertedToLeadId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProspectForConvert(prospect._id);
                                    setConvertFormData({
                                      contactName: "",
                                      contactTitle: "",
                                      contactPhone: "",
                                      contactEmail: prospect.emails.length > 0 ? prospect.emails[0] : "",
                                      notes: "",
                                      tags: [],
                                    });
                                    setIsConvertDialogOpen(true);
                                  }}
                                  title="Convert to Lead"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              )}
                              {prospect.convertedToLeadId && (
                                <div className="flex items-center gap-1" title="Converted to Lead">
                                  <Link 
                                    href={`/admin/tools/lead-pipeline?leadId=${prospect.convertedToLeadId}`}
                                    className="flex items-center gap-1 text-accent hover:underline"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </div>
                              )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProspect({ id: prospect._id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Convert to Lead Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
            <DialogTitle>Convert Prospect to Lead</DialogTitle>
                        <DialogDescription>
              Add decision maker information to convert this prospect to a lead
                        </DialogDescription>
                      </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                <Label>Contact Name *</Label>
                          <Input
                  value={convertFormData.contactName}
                  onChange={(e) =>
                    setConvertFormData({ ...convertFormData, contactName: e.target.value })
                  }
                  placeholder="Decision maker name"
                          />
                        </div>
                          <div className="space-y-2">
                <Label>Contact Title</Label>
                <Input
                  value={convertFormData.contactTitle}
                  onChange={(e) =>
                    setConvertFormData({ ...convertFormData, contactTitle: e.target.value })
                  }
                  placeholder="Job title"
                />
                          </div>
                          <div className="space-y-2">
                <Label>Contact Phone</Label>
                            <Input
                  value={convertFormData.contactPhone}
                  onChange={(e) =>
                    setConvertFormData({ ...convertFormData, contactPhone: e.target.value })
                  }
                  placeholder="Phone number"
                            />
                          </div>
                        <div className="space-y-2">
                <Label>Contact Email *</Label>
                          <Input
                  value={convertFormData.contactEmail}
                  onChange={(e) =>
                    setConvertFormData({ ...convertFormData, contactEmail: e.target.value })
                  }
                  placeholder="Email address"
                  type="email"
                          />
                        </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={convertFormData.notes}
                onChange={(e) =>
                  setConvertFormData({ ...convertFormData, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={4}
              />
                        </div>
                      </div>
                      <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
                          Cancel
                        </Button>
            <Button
              onClick={async () => {
                if (!selectedProspectForConvert) return;
                if (!convertFormData.contactName || !convertFormData.contactEmail) {
                  toast({
                    title: "Error",
                    description: "Contact name and email are required.",
                    variant: "destructive",
                  });
                  return;
                }
                
                try {
                  await createLead({
                    prospectId: selectedProspectForConvert,
                    contactName: convertFormData.contactName || undefined,
                    contactTitle: convertFormData.contactTitle || undefined,
                    contactPhone: convertFormData.contactPhone || undefined,
                    contactEmail: convertFormData.contactEmail || undefined,
                    notes: convertFormData.notes || undefined,
                    tags: convertFormData.tags.length > 0 ? convertFormData.tags : undefined,
                  });
                  
                  toast({
                    title: "Lead created",
                    description: "The prospect has been converted to a lead successfully.",
                  });
                  
                  setIsConvertDialogOpen(false);
                  setSelectedProspectForConvert(null);
                  setConvertFormData({
                    contactName: "",
                    contactTitle: "",
                    contactPhone: "",
                    contactEmail: "",
                    notes: "",
                    tags: [],
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to convert prospect to lead.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!convertFormData.contactName || !convertFormData.contactEmail}
            >
              Convert to Lead
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
    </div>
  );
}

