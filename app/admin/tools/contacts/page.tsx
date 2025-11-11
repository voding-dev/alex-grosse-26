"use client";

import { useState, useMemo } from "react";
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

export default function ContactsPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Id<"contacts"> | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
    tags: [] as string[],
    notes: "",
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
    tags: [] as string[],
    notes: "",
  });

  const contacts = useQuery(
    api.contacts.contactsList,
    adminEmail ? {} : "skip"
  );

  const createContact = useMutation(api.contacts.contactsCreate);
  const updateContact = useMutation(api.contacts.contactsUpdate);
  const removeContact = useMutation(api.contacts.contactsRemove);

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
        source: "manual",
        tags: addFormData.tags.length > 0 ? addFormData.tags : undefined,
        notes: addFormData.notes || undefined,
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
        tags: [],
        notes: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact.",
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contactId: Id<"contacts">) => {
    const contact = contacts?.find((c) => c._id === contactId);
    if (!contact) return;
    
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
      tags: contact.tags || [],
      notes: contact.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get contact details for edit dialog
  const selectedContactData = selectedContact ? contacts?.find((c) => c._id === selectedContact) : null;

  const handleUpdateContact = async () => {
    if (!selectedContact) return;
    
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
        tags: editFormData.tags.length > 0 ? editFormData.tags : undefined,
        notes: editFormData.notes || undefined,
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Contacts
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Unified contacts database - source of truth for all contacts
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 max-w-2xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="all" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            All Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
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
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                All Contacts
              </CardTitle>
              <CardDescription>
                View and manage all contacts from leads, email marketing, and manual entries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
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
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[180px]">
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

              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Table>
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
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Business</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
                        <button
                          onClick={() => handleSort("source")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Source
                          {getSortIcon("source")}
                        </button>
                      </TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Lead Status</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">From Prospect</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Tags</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">
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
                        <TableCell colSpan={9} className="text-center text-foreground/60 py-12">
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
                          <TableCell className="font-bold">
                            {contact.contactName || contact.firstName || contact.email}
                            {contact.lastName && ` ${contact.lastName}`}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60">{contact.email}</TableCell>
                          <TableCell className="text-sm text-foreground/60">
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
                          <TableCell>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
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
                            {contact.hasEmailMarketing && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-foreground/50">
                                <CheckCircle2 className="h-3 w-3 text-accent" />
                                Synced
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
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
                          <TableCell>
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
                          <TableCell>
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
                          <TableCell className="text-sm text-foreground/60">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Add Contact
            </DialogTitle>
            <DialogDescription>
              Create a new contact manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, email: e.target.value })
                  }
                  type="email"
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={addFormData.businessName}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, businessName: e.target.value })
                  }
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={addFormData.firstName}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, firstName: e.target.value })
                  }
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={addFormData.lastName}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, lastName: e.target.value })
                  }
                  placeholder="Last name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={addFormData.contactName}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, contactName: e.target.value })
                  }
                  placeholder="Decision maker name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Title</Label>
                <Input
                  value={addFormData.contactTitle}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, contactTitle: e.target.value })
                  }
                  placeholder="Job title"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={addFormData.phone}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, phone: e.target.value })
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={addFormData.contactPhone}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, contactPhone: e.target.value })
                  }
                  placeholder="Decision maker phone"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={addFormData.address}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, address: e.target.value })
                  }
                  placeholder="Business address"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={addFormData.website}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Google Business Link</Label>
                <Input
                  value={addFormData.googleBusinessLink}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, googleBusinessLink: e.target.value })
                  }
                  placeholder="Google Business URL"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={addFormData.notes}
                onChange={(e) =>
                  setAddFormData({ ...addFormData, notes: e.target.value })
                }
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Edit Contact
            </DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                {selectedContactData.hasEmailMarketing && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/60">Email Marketing:</span>
                    <div className="flex items-center gap-1 text-xs text-accent">
                      <CheckCircle2 className="h-3 w-3" />
                      Synced
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
                      <ArrowRight className="h-3 w-3 text-accent flex-shrink-0 ml-2" />
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
                      <ArrowRight className="h-3 w-3 text-accent flex-shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={editFormData.businessName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, businessName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, lastName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={editFormData.contactName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contactName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Title</Label>
                <Input
                  value={editFormData.contactTitle}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contactTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={editFormData.contactPhone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contactPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editFormData.website}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, website: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Google Business Link</Label>
                <Input
                  value={editFormData.googleBusinessLink}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, googleBusinessLink: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, notes: e.target.value })
                }
                rows={4}
              />
            </div>
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
    </div>
  );
}

