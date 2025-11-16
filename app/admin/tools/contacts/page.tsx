"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  Tag,
  Link as LinkIcon,
  Users,
  Target,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { NameInput } from "@/components/ui/name-input";
import { EmailInput } from "@/components/ui/email-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { AddressInput } from "@/components/ui/address-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { SocialLinkInput } from "@/components/ui/social-link-input";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { CompanySelector } from "@/components/ui/company-selector";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { format } from "date-fns";

export default function ContactsPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Id<"contacts"> | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddCompanyDialogOpen, setIsAddCompanyDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "email" | "source" | "createdAt" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Form state for adding contact
  const [addFormData, setAddFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    businessName: "",
    address: "",
    website: "",
    phone: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    googleBusinessLink: "",
    contactName: "",
    contactTitle: "",
    contactPhone: "",
    companyId: null as Id<"companies"> | null,
    tags: [] as string[],
    notes: "",
    lastContactedDate: "",
    lastContactedTime: "",
  });
  
  // Form state for editing contact
  const [editFormData, setEditFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    businessName: "",
    address: "",
    website: "",
    phone: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    googleBusinessLink: "",
    contactName: "",
    contactTitle: "",
    contactPhone: "",
    companyId: null as Id<"companies"> | null,
    tags: [] as string[],
    notes: "",
    lastContactedDate: "",
    lastContactedTime: "",
  });

  // Form state for adding company
  const [addCompanyFormData, setAddCompanyFormData] = useState({
    name: "",
    address: "",
    website: "",
    phone: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    googleBusinessLink: "",
    notes: "",
  });

  const contacts = useQuery(
    api.contacts.contactsList,
    adminEmail ? {} : "skip"
  );

  const companies = useQuery(
    api.contacts.companiesList,
    adminEmail ? {} : "skip"
  );

  const createContact = useMutation(api.contacts.contactsCreate);
  const updateContact = useMutation(api.contacts.contactsUpdate);
  const removeContact = useMutation(api.contacts.contactsRemove);
  const createCompany = useMutation(api.contacts.companiesCreate);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    
    let filtered = contacts;
    
    // Filter by source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((contact) => contact.source === sourceFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.email.toLowerCase().includes(query) ||
          (contact.firstName && contact.firstName.toLowerCase().includes(query)) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(query)) ||
          (contact.businessName && contact.businessName.toLowerCase().includes(query)) ||
          (contact.contactName && contact.contactName.toLowerCase().includes(query)) ||
          (contact.address && contact.address.toLowerCase().includes(query))
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case "name":
          aVal = (a.businessName || a.contactName || a.email || "").toLowerCase();
          bVal = (b.businessName || b.contactName || b.email || "").toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "source":
          aVal = a.source || "";
          bVal = b.source || "";
          break;
        case "createdAt":
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case "updatedAt":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [contacts, sourceFilter, searchQuery, sortBy, sortOrder]);

  const handleAddContact = async () => {
    if (!addFormData.email) {
      toast({
        title: "Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert date/time to timestamp
    let lastContactedAt: number | undefined = undefined;
    if (addFormData.lastContactedDate && addFormData.lastContactedTime) {
      const dateTime = new Date(`${addFormData.lastContactedDate}T${addFormData.lastContactedTime}:00`);
      lastContactedAt = dateTime.getTime();
    } else if (addFormData.lastContactedDate) {
      const date = new Date(`${addFormData.lastContactedDate}T00:00:00`);
      lastContactedAt = date.getTime();
    }

    try {
      await createContact({
        email: addFormData.email,
        firstName: addFormData.firstName || undefined,
        lastName: addFormData.lastName || undefined,
        businessName: addFormData.businessName || undefined,
        address: addFormData.address || undefined,
        website: addFormData.website || undefined,
        phone: addFormData.phone || undefined,
        instagram: addFormData.instagram || undefined,
        facebook: addFormData.facebook || undefined,
        youtube: addFormData.youtube || undefined,
        twitter: addFormData.twitter || undefined,
        linkedin: addFormData.linkedin || undefined,
        googleBusinessLink: addFormData.googleBusinessLink || undefined,
        contactName: addFormData.contactName || undefined,
        contactTitle: addFormData.contactTitle || undefined,
        contactPhone: addFormData.contactPhone || undefined,
        companyId: addFormData.companyId || undefined,
        source: "manual",
        tags: addFormData.tags.length > 0 ? addFormData.tags : undefined,
        notes: addFormData.notes || undefined,
        lastContactedAt,
        syncToEmailMarketing: true,
      });
      
      toast({
        title: "Contact created",
        description: "The contact has been created successfully.",
      });
      
      setIsAddDialogOpen(false);
      setAddFormData({
        email: "",
        firstName: "",
        lastName: "",
        businessName: "",
        address: "",
        website: "",
        phone: "",
        instagram: "",
        facebook: "",
        youtube: "",
        twitter: "",
        linkedin: "",
        googleBusinessLink: "",
        contactName: "",
        contactTitle: "",
        contactPhone: "",
        companyId: null,
        tags: [],
        notes: "",
        lastContactedDate: "",
        lastContactedTime: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact.",
        variant: "destructive",
      });
    }
  };

  const handleAddCompany = async () => {
    if (!addCompanyFormData.name || addCompanyFormData.name.trim() === "") {
      toast({
        title: "Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCompany({
        name: addCompanyFormData.name,
        address: addCompanyFormData.address || undefined,
        website: addCompanyFormData.website || undefined,
        phone: addCompanyFormData.phone || undefined,
        instagram: addCompanyFormData.instagram || undefined,
        facebook: addCompanyFormData.facebook || undefined,
        youtube: addCompanyFormData.youtube || undefined,
        twitter: addCompanyFormData.twitter || undefined,
        linkedin: addCompanyFormData.linkedin || undefined,
        googleBusinessLink: addCompanyFormData.googleBusinessLink || undefined,
        notes: addCompanyFormData.notes || undefined,
      });

      toast({
        title: "Company created",
        description: "The company has been created successfully.",
      });

      setIsAddCompanyDialogOpen(false);
      setAddCompanyFormData({
        name: "",
        address: "",
        website: "",
        phone: "",
        instagram: "",
        facebook: "",
        youtube: "",
        twitter: "",
        linkedin: "",
        googleBusinessLink: "",
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create company.",
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contactId: Id<"contacts">) => {
    const contact = contacts?.find((c) => c._id === contactId);
    if (!contact) return;
    
    // Parse lastContactedAt to date and time
    let lastContactedDate = "";
    let lastContactedTime = "";
    if (contact.lastContactedAt) {
      const date = new Date(contact.lastContactedAt);
      lastContactedDate = format(date, "yyyy-MM-dd");
      lastContactedTime = format(date, "HH:mm");
    }
    
    setSelectedContact(contactId);
    setEditFormData({
      email: contact.email,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      businessName: contact.businessName || "",
      address: contact.address || "",
      website: contact.website || "",
      phone: contact.phone || "",
      instagram: contact.instagram || "",
      facebook: contact.facebook || "",
      youtube: contact.youtube || "",
      twitter: contact.twitter || "",
      linkedin: contact.linkedin || "",
      googleBusinessLink: contact.googleBusinessLink || "",
      contactName: contact.contactName || "",
      contactTitle: contact.contactTitle || "",
      contactPhone: contact.contactPhone || "",
      companyId: contact.companyId || null,
      tags: contact.tags || [],
      notes: contact.notes || "",
      lastContactedDate,
      lastContactedTime,
    });
    setIsEditDialogOpen(true);
  };

  // Get contact details for edit dialog
  const selectedContactData = selectedContact ? contacts?.find((c) => c._id === selectedContact) : null;

  const handleUpdateContact = async () => {
    if (!selectedContact) return;
    
    // Convert date/time to timestamp
    let lastContactedAt: number | undefined = undefined;
    if (editFormData.lastContactedDate && editFormData.lastContactedTime) {
      const dateTime = new Date(`${editFormData.lastContactedDate}T${editFormData.lastContactedTime}:00`);
      lastContactedAt = dateTime.getTime();
    } else if (editFormData.lastContactedDate) {
      const date = new Date(`${editFormData.lastContactedDate}T00:00:00`);
      lastContactedAt = date.getTime();
    }
    
    try {
      await updateContact({
        id: selectedContact,
        email: editFormData.email,
        firstName: editFormData.firstName || undefined,
        lastName: editFormData.lastName || undefined,
        businessName: editFormData.businessName || undefined,
        address: editFormData.address || undefined,
        website: editFormData.website || undefined,
        phone: editFormData.phone || undefined,
        instagram: editFormData.instagram || undefined,
        facebook: editFormData.facebook || undefined,
        youtube: editFormData.youtube || undefined,
        twitter: editFormData.twitter || undefined,
        linkedin: editFormData.linkedin || undefined,
        googleBusinessLink: editFormData.googleBusinessLink || undefined,
        contactName: editFormData.contactName || undefined,
        contactTitle: editFormData.contactTitle || undefined,
        contactPhone: editFormData.contactPhone || undefined,
        companyId: editFormData.companyId || undefined,
        tags: editFormData.tags.length > 0 ? editFormData.tags : undefined,
        notes: editFormData.notes || undefined,
        lastContactedAt,
        syncToEmailMarketing: true,
      });
      
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setSelectedContact(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: Id<"contacts">) => {
    try {
      await removeContact({ id: contactId });
      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-foreground/40" />;
    }
    return sortOrder === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-accent" />
      : <ArrowDown className="h-3 w-3 ml-1 text-accent" />;
  };

  const getSourceLabel = (source: string | undefined) => {
    switch (source) {
      case "lead":
        return "Lead";
      case "email_marketing":
        return "Email Marketing";
      case "manual":
        return "Manual";
      default:
        return "Unknown";
    }
  };

  // Calculate stats
  const totalContacts = contacts?.length || 0;
  const leadContacts = contacts?.filter(c => c.source === "lead").length || 0;
  const emailMarketingContacts = contacts?.filter(c => c.source === "email_marketing").length || 0;
  const manualContacts = contacts?.filter(c => c.source === "manual").length || 0;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
      <div className="mb-6 sm:mb-8 lg:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-foreground mb-2 sm:mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Contacts
          </h1>
          <p className="text-foreground/70 text-sm sm:text-base lg:text-lg">
            Unified contacts database - source of truth for all contacts
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1 overflow-x-auto">
          <TabsTrigger 
            value="all" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-3 lg:px-4 h-full flex items-center justify-center text-xs sm:text-sm whitespace-nowrap"
            style={{ fontWeight: '900' }}
          >
            All Contacts
          </TabsTrigger>
          <TabsTrigger 
            value="companies" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-3 lg:px-4 h-full flex items-center justify-center text-xs sm:text-sm whitespace-nowrap"
            style={{ fontWeight: '900' }}
          >
            Companies
          </TabsTrigger>
          <TabsTrigger 
            value="contact_form" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-3 lg:px-4 h-full flex items-center justify-center text-xs sm:text-sm whitespace-nowrap"
            style={{ fontWeight: '900' }}
          >
            Contact Form
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Total Contacts
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {totalContacts}
                    </p>
                  </div>
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      From Leads
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {leadContacts}
                    </p>
                  </div>
                  <Target className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Email Marketing
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {emailMarketingContacts}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Manual
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {manualContacts}
                    </p>
                  </div>
                  <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-foreground/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                All Contacts
              </CardTitle>
              <CardDescription className="text-sm">
                View and manage all contacts from leads, email marketing, and manual entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="email_marketing">Email Marketing</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Name
                          {getSortIcon("name")}
                        </button>
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
                        <button
                          onClick={() => handleSort("email")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Email
                          {getSortIcon("email")}
                        </button>
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden lg:table-cell">Business</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden md:table-cell">Company</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
                        <button
                          onClick={() => handleSort("source")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Source
                          {getSortIcon("source")}
                        </button>
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden xl:table-cell">Lead Status</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden xl:table-cell">From Prospect</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden lg:table-cell">Tags</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs hidden md:table-cell">
                        <button
                          onClick={() => handleSort("createdAt")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Created
                          {getSortIcon("createdAt")}
                        </button>
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-foreground/60 py-12 px-4">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-12 w-12 text-foreground/40 mb-2" />
                            <p className="text-foreground/60 mb-2">No contacts found</p>
                            <p className="text-sm text-foreground/40">Add some contacts or convert prospects to leads to get started.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact) => (
                        <TableRow key={contact._id}>
                          <TableCell className="font-bold min-w-[120px]">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[200px]">
                                {contact.contactName || contact.firstName || contact.email}
                                {contact.lastName && ` ${contact.lastName}`}
                              </span>
                              <span className="text-xs text-foreground/50 md:hidden mt-1 truncate">
                                {contact.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60 hidden md:table-cell">{contact.email}</TableCell>
                          <TableCell className="text-sm text-foreground/60 hidden lg:table-cell">
                            {contact.businessName || "-"}
                            {contact.projects && contact.projects.length > 0 && (
                              <div className="mt-1">
                                <Link
                                  href={`/admin/tools/contacts?contactId=${contact._id}`}
                                  className="text-xs text-accent hover:underline flex items-center gap-1"
                                >
                                  <Briefcase className="h-3 w-3" />
                                  {contact.projects.length} project{contact.projects.length !== 1 ? 's' : ''}
                                </Link>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60 hidden md:table-cell">
                            {contact.company ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-foreground/40" />
                                <span>{contact.company.name}</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded whitespace-nowrap ${
                                contact.source === "lead"
                                  ? "bg-accent/20 text-accent border border-accent/30"
                                  : contact.source === "email_marketing"
                                  ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                                  : contact.source === "manual"
                                  ? "bg-purple-500/20 text-purple-500 border border-purple-500/30"
                                  : "bg-foreground/10 text-foreground/60 border border-foreground/20"
                              }`}>
                                {getSourceLabel(contact.source)}
                              </span>
                              {contact.emailMarketing && (
                                <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded whitespace-nowrap ${
                                  contact.emailMarketing.status === "subscribed"
                                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                                    : contact.emailMarketing.status === "unsubscribed"
                                    ? "bg-red-500/20 text-red-500 border border-red-500/30"
                                    : contact.emailMarketing.status === "bounced"
                                    ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                    : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                                }`}>
                                  {contact.emailMarketing.status}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {contact.lead ? (
                              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                                contact.lead.status === "new"
                                  ? "bg-accent/20 text-accent border border-accent/30"
                                  : contact.lead.status === "contacted"
                                  ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                                  : contact.lead.status === "qualified"
                                  ? "bg-purple-500/20 text-purple-500 border border-purple-500/30"
                                  : contact.lead.status === "proposal"
                                  ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                  : "bg-green-500/20 text-green-500 border border-green-500/30"
                              }`}>
                                {contact.lead.status}
                              </span>
                            ) : (
                              <span className="text-sm text-foreground/40">-</span>
                            )}
                            {contact.leadId && (
                              <Link 
                                href={`/admin/tools/lead-pipeline?leadId=${contact.leadId}`}
                                className="flex items-center gap-1 text-xs text-accent hover:underline mt-1"
                              >
                                <ArrowRight className="h-3 w-3" />
                                View Lead
                              </Link>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {contact.prospect ? (
                              <Link 
                                href={`/admin/tools/prospecting?prospectId=${contact.prospectId}`}
                                className="flex items-center gap-1 text-sm text-accent hover:underline"
                              >
                                <LinkIcon className="h-3 w-3" />
                                {contact.prospect.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {contact.tags && contact.tags.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {contact.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {contact.tags.length > 3 && (
                                  <span className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-foreground/5 text-foreground/60">
                                    +{contact.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60 hidden md:table-cell">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditContact(contact._id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteContact(contact._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Companies
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Manage company contacts
                  </CardDescription>
                </div>
                <Button
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors w-full sm:w-auto"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                  onClick={() => setIsAddCompanyDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Company
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {companies && companies.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-black uppercase tracking-wider">Name</TableHead>
                        <TableHead className="font-black uppercase tracking-wider">Address</TableHead>
                        <TableHead className="font-black uppercase tracking-wider">Website</TableHead>
                        <TableHead className="font-black uppercase tracking-wider">Contacts</TableHead>
                        <TableHead className="font-black uppercase tracking-wider">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company._id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell className="text-foreground/60">{company.address || "-"}</TableCell>
                          <TableCell className="text-foreground/60">
                            {company.website ? (
                              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                                {company.website}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-foreground/60">{company.contactCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link href={`/admin/tools/contacts/companies/${company._id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {/* TODO: Delete company */}}
                                title="Delete"
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
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-foreground/20 mb-4" />
                  <p className="text-foreground/60 font-medium">No companies yet</p>
                  <p className="text-sm text-foreground/40 mt-2">Create your first company to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact_form" className="space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Form Submissions
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {contacts?.filter(c => c.source === "contact_form").length || 0}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-foreground/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Website Contact Form Submissions
              </CardTitle>
              <CardDescription className="text-sm">
                View and manage inquiries submitted through your website contact form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search submissions..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Name</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Email</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Phone</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Message</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Date</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.filter(c => c.source === "contact_form").length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-foreground/60 py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Mail className="h-12 w-12 text-foreground/40 mb-2" />
                            <p className="text-foreground/60 mb-2">No contact form submissions yet</p>
                            <p className="text-sm text-foreground/40">Submissions from your website contact form will appear here.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts
                        .filter(c => c.source === "contact_form")
                        .map((contact) => {
                          // Parse notes to extract message
                          const notes = contact.notes || "";
                          const message = notes.split("\n")[0] || ""; // Get first line as message preview
                          const truncatedMessage = message.length > 50 ? message.substring(0, 50) + "..." : message;

                          return (
                            <TableRow key={contact._id}>
                              <TableCell className="font-medium">
                                {contact.firstName || contact.contactName || "Unknown"}
                                {contact.lastName && ` ${contact.lastName}`}
                              </TableCell>
                              <TableCell className="text-sm text-foreground/60">{contact.email}</TableCell>
                              <TableCell className="text-sm text-foreground/60">{contact.phone || "-"}</TableCell>
                              <TableCell className="text-sm text-foreground/60 max-w-xs truncate" title={message}>
                                {truncatedMessage || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-foreground/60">
                                {contact.createdAt
                                  ? new Date(contact.createdAt).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditContact(contact._id)}
                                  title="View/Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Add Contact
            </DialogTitle>
            <DialogDescription>
              Create a new contact manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Personal Information Section */}
            <FormSection title="Personal Information" description="Basic contact details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name">
                  <Input
                    value={addFormData.firstName}
                    onChange={(e) => setAddFormData({ ...addFormData, firstName: e.target.value })}
                    placeholder="First name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    value={addFormData.lastName}
                    onChange={(e) => setAddFormData({ ...addFormData, lastName: e.target.value })}
                    placeholder="Last name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Email" required>
                  <EmailInput
                    value={addFormData.email}
                    onChange={(value) => setAddFormData({ ...addFormData, email: value })}
                    required
                  />
                </FormField>
                <FormField label="Phone" required>
                  <PhoneInput
                    value={addFormData.phone}
                    onChange={(value) => setAddFormData({ ...addFormData, phone: value })}
                    required
                  />
                </FormField>
                <FormField label="Company">
                  <CompanySelector
                    value={addFormData.companyId}
                    onChange={(value) => setAddFormData({ ...addFormData, companyId: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Business Information Section */}
            <FormSection title="Business Information" description="Company and business details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Business Name">
                  <Input
                    value={addFormData.businessName}
                    onChange={(e) => setAddFormData({ ...addFormData, businessName: e.target.value })}
                    placeholder="Company name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Website">
                  <WebsiteInput
                    value={addFormData.website}
                    onChange={(value) => setAddFormData({ ...addFormData, website: value })}
                  />
                </FormField>
                <FormField label="Address" className="col-span-2">
                  <AddressInput
                    value={addFormData.address}
                    onChange={(value) => setAddFormData({ ...addFormData, address: value })}
                  />
                </FormField>
                <FormField label="Google Business Link">
                  <WebsiteInput
                    value={addFormData.googleBusinessLink}
                    onChange={(value) => setAddFormData({ ...addFormData, googleBusinessLink: value })}
                    placeholder="https://g.page/..."
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Contact Details Section */}
            <FormSection title="Contact Details" description="Decision maker information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contact Name">
                  <Input
                    value={addFormData.contactName}
                    onChange={(e) => setAddFormData({ ...addFormData, contactName: e.target.value })}
                    placeholder="Decision maker name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Contact Title">
                  <Input
                    value={addFormData.contactTitle}
                    onChange={(e) => setAddFormData({ ...addFormData, contactTitle: e.target.value })}
                    placeholder="Job title"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Contact Phone">
                  <PhoneInput
                    value={addFormData.contactPhone}
                    onChange={(value) => setAddFormData({ ...addFormData, contactPhone: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Social Links Section */}
            <FormSection title="Social Links" description="Social media profiles">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Instagram">
                  <SocialLinkInput
                    platform="instagram"
                    value={addFormData.instagram}
                    onChange={(value) => setAddFormData({ ...addFormData, instagram: value })}
                  />
                </FormField>
                <FormField label="Facebook">
                  <SocialLinkInput
                    platform="facebook"
                    value={addFormData.facebook}
                    onChange={(value) => setAddFormData({ ...addFormData, facebook: value })}
                  />
                </FormField>
                <FormField label="LinkedIn">
                  <SocialLinkInput
                    platform="linkedin"
                    value={addFormData.linkedin}
                    onChange={(value) => setAddFormData({ ...addFormData, linkedin: value })}
                  />
                </FormField>
                <FormField label="Twitter">
                  <SocialLinkInput
                    platform="twitter"
                    value={addFormData.twitter}
                    onChange={(value) => setAddFormData({ ...addFormData, twitter: value })}
                  />
                </FormField>
                <FormField label="YouTube">
                  <SocialLinkInput
                    platform="youtube"
                    value={addFormData.youtube}
                    onChange={(value) => setAddFormData({ ...addFormData, youtube: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Additional Information Section */}
            <FormSection title="Additional Information" description="Notes and tracking">
              <div className="space-y-4">
                <FormField label="Notes">
                  <ResizableTextarea
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    minRows={4}
                    maxRows={12}
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
              </div>
            </FormSection>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="font-black uppercase tracking-wider"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              onClick={handleAddContact} 
              disabled={!addFormData.email}
            >
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Edit Contact
            </DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Relationship Info */}
            {selectedContactData && (
              <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">Related Records</p>
                {selectedContactData.lead && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60">Lead Status:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                        selectedContactData.lead.status === "new"
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : selectedContactData.lead.status === "contacted"
                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                          : selectedContactData.lead.status === "qualified"
                          ? "bg-purple-500/20 text-purple-500 border border-purple-500/30"
                          : selectedContactData.lead.status === "proposal"
                          ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                          : "bg-green-500/20 text-green-500 border border-green-500/30"
                      }`}>
                        {selectedContactData.lead.status}
                      </span>
                      {selectedContactData.leadId && (
                        <Link 
                          href={`/admin/tools/lead-pipeline?leadId=${selectedContactData.leadId}`}
                          className="flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <ArrowRight className="h-3 w-3" />
                          View Lead
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {selectedContactData.prospect && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60">From Prospect:</span>
                    <Link 
                      href={`/admin/tools/prospecting?prospectId=${selectedContactData.prospectId}`}
                      className="flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" />
                      {selectedContactData.prospect.name}
                    </Link>
                  </div>
                )}
                {selectedContactData.emailMarketing && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60">Email Marketing:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                        selectedContactData.emailMarketing.status === "subscribed"
                          ? "bg-green-500/20 text-green-500 border border-green-500/30"
                          : selectedContactData.emailMarketing.status === "unsubscribed"
                          ? "bg-red-500/20 text-red-500 border border-red-500/30"
                          : selectedContactData.emailMarketing.status === "bounced"
                          ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                          : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                      }`}>
                        {selectedContactData.emailMarketing.status}
                      </span>
                      {selectedContactData.emailMarketingId && (
                        <Link 
                          href={`/admin/email-marketing/contacts/${selectedContactData.emailMarketingId}`}
                          className="flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          <ArrowRight className="h-3 w-3" />
                          View in Email Marketing
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Projects History */}
            {selectedContactData && selectedContactData.projects && selectedContactData.projects.length > 0 && (
              <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">Projects ({selectedContactData.projects.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedContactData.projects.map((project: any) => (
                    <Link
                      key={project._id}
                      href={`/admin/client-projects/${project._id}`}
                      className="flex items-center justify-between p-2 rounded border border-foreground/10 hover:bg-foreground/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{project.title}</p>
                        <p className="text-xs text-foreground/60">{project.status}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-accent shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Bookings History */}
            {selectedContactData && selectedContactData.bookings && selectedContactData.bookings.length > 0 && (
              <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg space-y-2">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">Bookings ({selectedContactData.bookings.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedContactData.bookings.map((booking: any) => (
                    <Link
                      key={booking._id}
                      href={`/admin/scheduling/${booking._id}`}
                      className="flex items-center justify-between p-2 rounded border border-foreground/10 hover:bg-foreground/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{booking.title}</p>
                        <p className="text-xs text-foreground/60">{booking.status}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-accent shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Personal Information Section */}
            <FormSection title="Personal Information" description="Basic contact details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name">
                  <Input
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    placeholder="First name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    placeholder="Last name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Email" required>
                  <EmailInput
                    value={editFormData.email}
                    onChange={(value) => setEditFormData({ ...editFormData, email: value })}
                    required
                  />
                </FormField>
                <FormField label="Phone" required>
                  <PhoneInput
                    value={editFormData.phone}
                    onChange={(value) => setEditFormData({ ...editFormData, phone: value })}
                    required
                  />
                </FormField>
                <FormField label="Company">
                  <CompanySelector
                    value={editFormData.companyId}
                    onChange={(value) => setEditFormData({ ...editFormData, companyId: value })}
                  />
                </FormField>
                <FormField label="Last Contacted">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <CustomDatePicker
                      value={editFormData.lastContactedDate}
                      onChange={(value) => setEditFormData({ ...editFormData, lastContactedDate: value })}
                      placeholder="Date"
                    />
                    <CustomTimePicker
                      value={editFormData.lastContactedTime}
                      onChange={(value) => setEditFormData({ ...editFormData, lastContactedTime: value })}
                      placeholder="Time"
                    />
                  </div>
                </FormField>
              </div>
            </FormSection>

            {/* Business Information Section */}
            <FormSection title="Business Information" description="Company and business details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Business Name">
                  <Input
                    value={editFormData.businessName}
                    onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                    placeholder="Company name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Website">
                  <WebsiteInput
                    value={editFormData.website}
                    onChange={(value) => setEditFormData({ ...editFormData, website: value })}
                  />
                </FormField>
                <FormField label="Address" className="col-span-2">
                  <AddressInput
                    value={editFormData.address}
                    onChange={(value) => setEditFormData({ ...editFormData, address: value })}
                  />
                </FormField>
                <FormField label="Google Business Link">
                  <WebsiteInput
                    value={editFormData.googleBusinessLink}
                    onChange={(value) => setEditFormData({ ...editFormData, googleBusinessLink: value })}
                    placeholder="https://g.page/..."
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Contact Details Section */}
            <FormSection title="Contact Details" description="Decision maker information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Contact Name">
                  <Input
                    value={editFormData.contactName}
                    onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                    placeholder="Decision maker name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Contact Title">
                  <Input
                    value={editFormData.contactTitle}
                    onChange={(e) => setEditFormData({ ...editFormData, contactTitle: e.target.value })}
                    placeholder="Job title"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Contact Phone">
                  <PhoneInput
                    value={editFormData.contactPhone}
                    onChange={(value) => setEditFormData({ ...editFormData, contactPhone: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Social Links Section */}
            <FormSection title="Social Links" description="Social media profiles">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Instagram">
                  <SocialLinkInput
                    platform="instagram"
                    value={editFormData.instagram}
                    onChange={(value) => setEditFormData({ ...editFormData, instagram: value })}
                  />
                </FormField>
                <FormField label="Facebook">
                  <SocialLinkInput
                    platform="facebook"
                    value={editFormData.facebook}
                    onChange={(value) => setEditFormData({ ...editFormData, facebook: value })}
                  />
                </FormField>
                <FormField label="LinkedIn">
                  <SocialLinkInput
                    platform="linkedin"
                    value={editFormData.linkedin}
                    onChange={(value) => setEditFormData({ ...editFormData, linkedin: value })}
                  />
                </FormField>
                <FormField label="Twitter">
                  <SocialLinkInput
                    platform="twitter"
                    value={editFormData.twitter}
                    onChange={(value) => setEditFormData({ ...editFormData, twitter: value })}
                  />
                </FormField>
                <FormField label="YouTube">
                  <SocialLinkInput
                    platform="youtube"
                    value={editFormData.youtube}
                    onChange={(value) => setEditFormData({ ...editFormData, youtube: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Additional Information Section */}
            <FormSection title="Additional Information" description="Notes and tracking">
              <div className="space-y-4">
                <FormField label="Notes">
                  <ResizableTextarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    minRows={4}
                    maxRows={12}
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
              </div>
            </FormSection>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="font-black uppercase tracking-wider"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              onClick={handleUpdateContact} 
              disabled={!editFormData.email}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Company Dialog */}
      <Dialog open={isAddCompanyDialogOpen} onOpenChange={setIsAddCompanyDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Add Company
            </DialogTitle>
            <DialogDescription>
              Create a new company
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information Section */}
            <FormSection title="Basic Information" description="Company name and contact details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Company Name" required className="sm:col-span-2">
                  <Input
                    value={addCompanyFormData.name}
                    onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, name: e.target.value })}
                    placeholder="Company name"
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
                <FormField label="Phone">
                  <PhoneInput
                    value={addCompanyFormData.phone}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, phone: value })}
                  />
                </FormField>
                <FormField label="Website">
                  <WebsiteInput
                    value={addCompanyFormData.website}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, website: value })}
                  />
                </FormField>
                <FormField label="Address" className="sm:col-span-2">
                  <AddressInput
                    value={addCompanyFormData.address}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, address: value })}
                  />
                </FormField>
                <FormField label="Google Business Link">
                  <WebsiteInput
                    value={addCompanyFormData.googleBusinessLink}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, googleBusinessLink: value })}
                    placeholder="https://g.page/..."
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Social Links Section */}
            <FormSection title="Social Links" description="Social media profiles">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Instagram">
                  <SocialLinkInput
                    platform="instagram"
                    value={addCompanyFormData.instagram}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, instagram: value })}
                  />
                </FormField>
                <FormField label="Facebook">
                  <SocialLinkInput
                    platform="facebook"
                    value={addCompanyFormData.facebook}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, facebook: value })}
                  />
                </FormField>
                <FormField label="LinkedIn">
                  <SocialLinkInput
                    platform="linkedin"
                    value={addCompanyFormData.linkedin}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, linkedin: value })}
                  />
                </FormField>
                <FormField label="Twitter">
                  <SocialLinkInput
                    platform="twitter"
                    value={addCompanyFormData.twitter}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, twitter: value })}
                  />
                </FormField>
                <FormField label="YouTube">
                  <SocialLinkInput
                    platform="youtube"
                    value={addCompanyFormData.youtube}
                    onChange={(value) => setAddCompanyFormData({ ...addCompanyFormData, youtube: value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {/* Additional Information Section */}
            <FormSection title="Additional Information" description="Notes and details">
              <div className="space-y-4">
                <FormField label="Notes">
                  <ResizableTextarea
                    value={addCompanyFormData.notes}
                    onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    minRows={4}
                    maxRows={12}
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
              </div>
            </FormSection>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="font-black uppercase tracking-wider"
              onClick={() => setIsAddCompanyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              onClick={handleAddCompany} 
              disabled={!addCompanyFormData.name}
            >
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

