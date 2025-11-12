"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { 
  Users, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, 
  Filter, X, Tag, Mail, Send, UserPlus, Edit, Trash2,
  Save, FolderPlus, FolderOpen
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";

type SortField = "name" | "email" | "status" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";
type QuickFilter = "all" | "subscribed" | "unsubscribed" | "bounced" | "hasTags" | "noTags";

export default function ContactsPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Advanced filters
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);

  // Segment dialog state
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");

  // Queries
  const contacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? {
      email: adminEmail,
      search: searchQuery || undefined,
      statuses: quickFilter === "all" ? undefined : quickFilter === "subscribed" ? ["subscribed"] : quickFilter === "unsubscribed" ? ["unsubscribed"] : quickFilter === "bounced" ? ["bounced"] : undefined,
      hasTags: quickFilter === "hasTags" ? true : quickFilter === "noTags" ? false : undefined,
      tags: tagFilters.length > 0 ? tagFilters : undefined,
      sources: sourceFilters.length > 0 ? sourceFilters : undefined,
      sortBy,
      sortOrder,
    } : ("skip" as const)
  ) || [];

  const allTags = useQuery(
    api.emailMarketing.getAllTags,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const segments = useQuery(
    api.emailMarketing.listSegments,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  // Mutations
  const createSegment = useMutation(api.emailMarketing.createSegment);
  const bulkUpdateContacts = useMutation(api.emailMarketing.bulkUpdateContacts);

  // Bulk actions state
  const [bulkActionType, setBulkActionType] = useState<"status" | "addTags" | "removeTags" | "sendQuickSend" | "sendCampaign" | "enrollJourney" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState<string[]>([]);
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState<string[]>([]);
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false);

  // Filtered contacts count
  const filteredCount = contacts.length;

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = contacts.map((c: any) => (c as any).emailMarketingId || (c as any)._id);
      setSelectedContactIds(new Set(allIds));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  // Handle individual selection
  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSet = new Set(selectedContactIds);
    if (checked) {
      newSet.add(contactId);
    } else {
      newSet.delete(contactId);
    }
    setSelectedContactIds(newSet);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setQuickFilter("all");
    setStatusFilters([]);
    setTagFilters([]);
    setSourceFilters([]);
  };

  // Handle bulk action
  const handleBulkAction = async () => {
    if (!adminEmail || selectedContactIds.size === 0) return;

    const contactIds = Array.from(selectedContactIds) as Id<"emailContacts">[];

    setIsProcessingBulkAction(true);
    try {
      if (bulkActionType === "status" && bulkStatus) {
        await bulkUpdateContacts({
          adminEmail,
          contactIds,
          status: bulkStatus as any,
        });

        toast({
          title: "Status updated",
          description: `Updated status for ${contactIds.length} contact${contactIds.length !== 1 ? "s" : ""}.`,
        });

        setSelectedContactIds(new Set());
        setShowBulkActions(false);
        setBulkActionType(null);
        setBulkStatus("");
      } else if (bulkActionType === "addTags" && bulkTagsToAdd.length > 0) {
        await bulkUpdateContacts({
          adminEmail,
          contactIds,
          tagsToAdd: bulkTagsToAdd,
        });

        toast({
          title: "Tags added",
          description: `Added tags to ${contactIds.length} contact${contactIds.length !== 1 ? "s" : ""}.`,
        });

        setSelectedContactIds(new Set());
        setShowBulkActions(false);
        setBulkActionType(null);
        setBulkTagsToAdd([]);
      } else if (bulkActionType === "removeTags" && bulkTagsToRemove.length > 0) {
        await bulkUpdateContacts({
          adminEmail,
          contactIds,
          tagsToRemove: bulkTagsToRemove,
        });

        toast({
          title: "Tags removed",
          description: `Removed tags from ${contactIds.length} contact${contactIds.length !== 1 ? "s" : ""}.`,
        });

        setSelectedContactIds(new Set());
        setShowBulkActions(false);
        setBulkActionType(null);
        setBulkTagsToRemove([]);
      } else if (bulkActionType === "sendQuickSend") {
        // Navigate to quick send with selected contacts
        const contactIdsParam = contactIds.join(",");
        router.push(`/admin/email-marketing/quick-send?contacts=${contactIdsParam}`);
      } else if (bulkActionType === "sendCampaign") {
        // Navigate to campaigns with selected contacts
        const contactIdsParam = contactIds.join(",");
        router.push(`/admin/email-marketing/campaigns?contacts=${contactIdsParam}`);
      } else if (bulkActionType === "enrollJourney") {
        // Navigate to journeys with selected contacts
        const contactIdsParam = contactIds.join(",");
        router.push(`/admin/email-marketing/journeys?contacts=${contactIdsParam}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to perform bulk action.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingBulkAction(false);
    }
  };

  // Save current filters as segment
  const handleSaveSegment = async () => {
    if (!adminEmail || !segmentName.trim()) {
      toast({
        title: "Error",
        description: "Segment name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      const filters: any = {};
      
      // Build filters from current state
      if (quickFilter !== "all") {
        if (quickFilter === "subscribed") filters.status = ["subscribed"];
        else if (quickFilter === "unsubscribed") filters.status = ["unsubscribed"];
        else if (quickFilter === "bounced") filters.status = ["bounced"];
        else if (quickFilter === "hasTags") filters.tags = tagFilters.length > 0 ? tagFilters : undefined;
      }
      
      if (tagFilters.length > 0) filters.tags = tagFilters;
      if (sourceFilters.length > 0) filters.sources = sourceFilters;
      if (statusFilters.length > 0) filters.status = statusFilters;

      await createSegment({
        adminEmail,
        name: segmentName,
        description: segmentDescription || undefined,
        filters,
      });

      toast({
        title: "Segment created",
        description: `Segment "${segmentName}" has been created successfully.`,
      });

      setShowSegmentDialog(false);
      setSegmentName("");
      setSegmentDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create segment.",
        variant: "destructive",
      });
    }
  };

  // Get unique sources from contacts
  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    contacts.forEach((c: any) => {
      if (c.source) sources.add(c.source);
    });
    return Array.from(sources);
  }, [contacts]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Contacts
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage and segment your email contacts
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/email-marketing/contacts/new">
            <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
          <Link href="/admin/email-marketing?tab=contacts">
            <Button variant="outline" className="font-black uppercase tracking-wider">
              Back to Email Marketing
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <Card className="border border-foreground/20 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                placeholder="Search contacts by name, email, or business..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Filter Chips */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "subscribed", "unsubscribed", "bounced", "hasTags", "noTags"] as QuickFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={quickFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickFilter(filter)}
                  className="font-black uppercase tracking-wider text-xs"
                  style={quickFilter === filter ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
                >
                  {filter === "all" ? "All" : 
                   filter === "subscribed" ? "Subscribed" :
                   filter === "unsubscribed" ? "Unsubscribed" :
                   filter === "bounced" ? "Bounced" :
                   filter === "hasTags" ? "Has Tags" : "No Tags"}
                </Button>
              ))}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="font-black uppercase tracking-wider"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-foreground/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">Status</Label>
                  <div className="space-y-2">
                    {(["subscribed", "unsubscribed", "bounced", "spam"] as const).map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statusFilters.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilters([...statusFilters, status]);
                            } else {
                              setStatusFilters(statusFilters.filter(s => s !== status));
                            }
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="text-sm cursor-pointer capitalize">
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                <div>
                  <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">Tags</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {allTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={tagFilters.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTagFilters([...tagFilters, tag]);
                            } else {
                              setTagFilters(tagFilters.filter(t => t !== tag));
                            }
                          }}
                        />
                        <Label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer">
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">Source</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uniqueSources.map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={sourceFilters.includes(source)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSourceFilters([...sourceFilters, source]);
                            } else {
                              setSourceFilters(sourceFilters.filter(s => s !== source));
                            }
                          }}
                        />
                        <Label htmlFor={`source-${source}`} className="text-sm cursor-pointer capitalize">
                          {source}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-foreground/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="font-black uppercase tracking-wider text-xs"
                >
                  <X className="mr-2 h-3 w-3" />
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSegmentDialog(true)}
                  className="font-black uppercase tracking-wider text-xs"
                >
                  <Save className="mr-2 h-3 w-3" />
                  Save as Segment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segments Sidebar and Main Content */}
      <div className="flex gap-6">
        {/* Segments Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Segments
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {segments.length === 0 ? (
                <div className="text-center py-8">
                  <FolderPlus className="h-8 w-8 mx-auto mb-2 text-foreground/40" />
                  <p className="text-sm text-foreground/60 mb-4">No segments yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSegmentDialog(true)}
                    className="font-black uppercase tracking-wider text-xs"
                  >
                    Create Segment
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map((segment) => (
                    <div
                      key={segment._id}
                      className="p-3 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer"
                    >
                      <p className="font-bold text-sm text-foreground">{segment.name}</p>
                      <p className="text-xs text-foreground/60 mt-1">
                        {segment.contactCount} contacts
                      </p>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSegmentDialog(true)}
                    className="w-full font-black uppercase tracking-wider text-xs mt-2"
                  >
                    <FolderPlus className="mr-2 h-3 w-3" />
                    New Segment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <div className="flex-1">
          <Card className="border border-foreground/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                  All Contacts ({filteredCount})
                </CardTitle>
                {selectedContactIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground/60">
                      {selectedContactIds.size} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkActions(true)}
                      className="font-black uppercase tracking-wider text-xs"
                    >
                      Bulk Actions
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No contacts found
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    {searchQuery || quickFilter !== "all" || statusFilters.length > 0 || tagFilters.length > 0 || sourceFilters.length > 0
                      ? "Try adjusting your filters"
                      : "Add contacts to start sending emails"}
                  </p>
                  {(!searchQuery && quickFilter === "all" && statusFilters.length === 0 && tagFilters.length === 0 && sourceFilters.length === 0) && (
                    <Link href="/admin/email-marketing/contacts/new">
                      <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("name")}
                            className="font-black uppercase tracking-wider h-auto p-0 hover:bg-transparent"
                          >
                            Name
                            {getSortIcon("name")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("email")}
                            className="font-black uppercase tracking-wider h-auto p-0 hover:bg-transparent"
                          >
                            Email
                            {getSortIcon("email")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("status")}
                            className="font-black uppercase tracking-wider h-auto p-0 hover:bg-transparent"
                          >
                            Status
                            {getSortIcon("status")}
                          </Button>
                        </TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("createdAt")}
                            className="font-black uppercase tracking-wider h-auto p-0 hover:bg-transparent"
                          >
                            Created
                            {getSortIcon("createdAt")}
                          </Button>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact: any) => {
                        const contactId = contact.emailMarketingId || contact._id;
                        const isSelected = selectedContactIds.has(contactId);
                        return (
                          <TableRow key={contact._id}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectContact(contactId, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {contact.firstName || contact.lastName
                                ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                : contact.email}
                            </TableCell>
                            <TableCell className="text-sm text-foreground/60">
                              {contact.email}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                                  contact.emailMarketingStatus === "subscribed"
                                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                                    : contact.emailMarketingStatus === "unsubscribed"
                                    ? "bg-red-500/20 text-red-500 border border-red-500/30"
                                    : contact.emailMarketingStatus === "bounced"
                                    ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                    : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                                }`}
                              >
                                {contact.emailMarketingStatus || "subscribed"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {contact.tags && contact.tags.length > 0 ? (
                                <div className="flex gap-1 flex-wrap">
                                  {contact.tags.slice(0, 3).map((tag: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {contact.tags.length > 3 && (
                                    <span className="px-2 py-0.5 text-xs text-foreground/50">
                                      +{contact.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-foreground/60">
                              {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Link href={`/admin/email-marketing/contacts/${contactId}`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Segment Dialog */}
      <Dialog open={showSegmentDialog} onOpenChange={setShowSegmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Save as Segment
            </DialogTitle>
            <DialogDescription>
              Save your current filters as a reusable segment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="segment-name" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                Segment Name <span className="text-accent">*</span>
              </Label>
              <Input
                id="segment-name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="e.g., VIP Customers, Newsletter Subscribers"
              />
            </div>
            <div>
              <Label htmlFor="segment-description" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                Description
              </Label>
              <Textarea
                id="segment-description"
                value={segmentDescription}
                onChange={(e) => setSegmentDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Current Filters
              </p>
              <p className="text-sm text-foreground/70">
                {filteredCount} contact{filteredCount !== 1 ? "s" : ""} will be included
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSegmentDialog(false);
                setSegmentName("");
                setSegmentDescription("");
              }}
              className="font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSegment}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Bulk Actions ({selectedContactIds.size} contacts)
            </DialogTitle>
            <DialogDescription>
              Perform actions on selected contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={bulkActionType === "status" ? "default" : "outline"}
                onClick={() => setBulkActionType("status")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "status" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                Change Status
              </Button>
              <Button
                variant={bulkActionType === "addTags" ? "default" : "outline"}
                onClick={() => setBulkActionType("addTags")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "addTags" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                <Tag className="mr-2 h-4 w-4" />
                Add Tags
              </Button>
              <Button
                variant={bulkActionType === "removeTags" ? "default" : "outline"}
                onClick={() => setBulkActionType("removeTags")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "removeTags" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                <Tag className="mr-2 h-4 w-4" />
                Remove Tags
              </Button>
              <Button
                variant={bulkActionType === "sendQuickSend" ? "default" : "outline"}
                onClick={() => setBulkActionType("sendQuickSend")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "sendQuickSend" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                <Send className="mr-2 h-4 w-4" />
                Quick Send
              </Button>
              <Button
                variant={bulkActionType === "sendCampaign" ? "default" : "outline"}
                onClick={() => setBulkActionType("sendCampaign")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "sendCampaign" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Campaign
              </Button>
              <Button
                variant={bulkActionType === "enrollJourney" ? "default" : "outline"}
                onClick={() => setBulkActionType("enrollJourney")}
                className="font-black uppercase tracking-wider"
                style={bulkActionType === "enrollJourney" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Enroll in Journey
              </Button>
            </div>

            {/* Status Change */}
            {bulkActionType === "status" && (
              <div>
                <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                  New Status
                </Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscribed">Subscribed</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Add Tags */}
            {bulkActionType === "addTags" && (
              <div>
                <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                  Tags to Add
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-lg p-3">
                  {allTags.length === 0 ? (
                    <p className="text-sm text-foreground/60">No tags available</p>
                  ) : (
                    allTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`add-tag-${tag}`}
                          checked={bulkTagsToAdd.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBulkTagsToAdd([...bulkTagsToAdd, tag]);
                            } else {
                              setBulkTagsToAdd(bulkTagsToAdd.filter(t => t !== tag));
                            }
                          }}
                        />
                        <Label htmlFor={`add-tag-${tag}`} className="text-sm cursor-pointer">
                          {tag}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Remove Tags */}
            {bulkActionType === "removeTags" && (
              <div>
                <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                  Tags to Remove
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-lg p-3">
                  {allTags.length === 0 ? (
                    <p className="text-sm text-foreground/60">No tags available</p>
                  ) : (
                    allTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`remove-tag-${tag}`}
                          checked={bulkTagsToRemove.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBulkTagsToRemove([...bulkTagsToRemove, tag]);
                            } else {
                              setBulkTagsToRemove(bulkTagsToRemove.filter(t => t !== tag));
                            }
                          }}
                        />
                        <Label htmlFor={`remove-tag-${tag}`} className="text-sm cursor-pointer">
                          {tag}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Quick Send / Campaign / Journey info */}
            {(bulkActionType === "sendQuickSend" || bulkActionType === "sendCampaign" || bulkActionType === "enrollJourney") && (
              <div className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg">
                <p className="text-sm text-foreground/70">
                  {bulkActionType === "sendQuickSend" && "You will be redirected to Quick Send with these contacts pre-selected."}
                  {bulkActionType === "sendCampaign" && "You will be redirected to Campaigns to select a campaign to send to these contacts."}
                  {bulkActionType === "enrollJourney" && "You will be redirected to Journeys to select a journey to enroll these contacts in."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkActions(false);
                setBulkActionType(null);
                setBulkStatus("");
                setBulkTagsToAdd([]);
                setBulkTagsToRemove([]);
              }}
              disabled={isProcessingBulkAction}
              className="font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={isProcessingBulkAction || !bulkActionType || 
                (bulkActionType === "status" && !bulkStatus) ||
                (bulkActionType === "addTags" && bulkTagsToAdd.length === 0) ||
                (bulkActionType === "removeTags" && bulkTagsToRemove.length === 0)}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              {isProcessingBulkAction ? "Processing..." : "Apply Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

