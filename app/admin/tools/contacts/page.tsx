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
} from "lucide-react";

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-foreground/60 mt-2">
            Unified contacts database - source of truth for all contacts
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="all">All Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Contacts</CardTitle>
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
                      <TableHead>
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Name
                          {getSortIcon("name")}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("email")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Email
                          {getSortIcon("email")}
                        </button>
                      </TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort("source")}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          Source
                          {getSortIcon("source")}
                        </button>
                      </TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>
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
                        <TableCell colSpan={7} className="text-center text-foreground/60 py-8">
                          No contacts found. Add some contacts or convert prospects to leads.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map((contact) => (
                        <TableRow key={contact._id}>
                          <TableCell className="font-medium">
                            {contact.contactName || contact.firstName || contact.email}
                            {contact.lastName && ` ${contact.lastName}`}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60">{contact.email}</TableCell>
                          <TableCell className="text-sm text-foreground/60">
                            {contact.businessName || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-foreground/5 text-foreground/60">
                              {getSourceLabel(contact.source)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {contact.tags && contact.tags.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {contact.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {contact.tags.length > 3 && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-foreground/5 text-foreground/60">
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
            <DialogTitle>Add Contact</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContact} disabled={!addFormData.email}>
              Create Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateContact} disabled={!editFormData.email}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

