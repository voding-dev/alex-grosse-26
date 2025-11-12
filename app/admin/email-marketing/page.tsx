"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useMemo } from "react";
import * as React from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Mail, Users, TrendingUp, Send, Eye, MousePointerClick, X, AlertTriangle, Calendar, Zap, AlertCircle, Tag, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Edit, FolderOpen, FolderPlus, Save, UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

// Valid tab values
const VALID_TABS = ["overview", "quick-send", "contacts", "campaigns", "journeys", "triggers"] as const;
type TabValue = typeof VALID_TABS[number];

// Contacts Tab Content Component
type SortField = "name" | "email" | "status" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";
type QuickFilter = "all" | "subscribed" | "unsubscribed" | "bounced" | "hasTags" | "noTags";

function ContactsTabContent({ adminEmail, toast }: { adminEmail: string | null; toast: any }) {
  const router = useRouter();

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

  // Bulk actions state
  const [bulkActionType, setBulkActionType] = useState<"status" | "addTags" | "removeTags" | "sendQuickSend" | "sendCampaign" | "enrollJourney" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState<string[]>([]);
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState<string[]>([]);
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false);

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
        const contactIdsParam = contactIds.join(",");
        router.push(`/admin/email-marketing/quick-send?contacts=${contactIdsParam}`);
      } else if (bulkActionType === "sendCampaign") {
        const contactIdsParam = contactIds.join(",");
        router.push(`/admin/email-marketing/campaigns?contacts=${contactIdsParam}`);
      } else if (bulkActionType === "enrollJourney") {
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
    <div className="space-y-6">
      {/* Search and Quick Filters */}
      <Card className="border border-foreground/20">
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

export default function EmailMarketingPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  
  // Get initial tab from URL param using lazy initializer (only called once)
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    try {
      // Use window.location to avoid useSearchParams issues
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        return (tab && VALID_TABS.includes(tab as TabValue)) ? (tab as TabValue) : "overview";
      }
    } catch {
      // Fallback on error
    }
    return "overview";
  });

  // Wrapper function to handle tab changes with type safety
  const handleTabChange = (value: string) => {
    if (VALID_TABS.includes(value as TabValue)) {
      setActiveTab(value as TabValue);
    }
  };
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    tags: "",
    source: "",
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const createContact = useMutation(api.emailMarketing.createContact);
  
  // Booking trigger state
  const [bookingCreatedEnabled, setBookingCreatedEnabled] = useState(false);
  const [bookingCreatedCampaignId, setBookingCreatedCampaignId] = useState<string>("");
  const [bookingConfirmedEnabled, setBookingConfirmedEnabled] = useState(false);
  const [bookingConfirmedCampaignId, setBookingConfirmedCampaignId] = useState<string>("");
  const [isSavingTriggers, setIsSavingTriggers] = useState(false);
  const getBookingTriggers = useQuery(
    api.emailMarketing.getBookingTriggers,
    adminEmail ? { email: adminEmail } : "skip"
  );
  const saveBookingTriggers = useMutation(api.emailMarketing.saveBookingTriggers);

  const contacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const journeys = useQuery(
    api.emailMarketing.listJourneys,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingContact(true);
    try {
      const tagsArray = contactFormData.tags
        ? contactFormData.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      await createContact({
        adminEmail: adminEmail,
        email: contactFormData.email,
        firstName: contactFormData.firstName || undefined,
        lastName: contactFormData.lastName || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        source: contactFormData.source || "email_marketing",
      });

      toast({
        title: "Contact created",
        description: "The contact has been added successfully.",
      });

      // Reset form and close modal
      setContactFormData({
        email: "",
        firstName: "",
        lastName: "",
        tags: "",
        source: "",
      });
      setIsAddContactModalOpen(false);
    } catch (error) {
      console.error("Error creating contact:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create contact.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Load booking trigger settings
  useEffect(() => {
    if (getBookingTriggers) {
      setBookingCreatedEnabled(!!getBookingTriggers.bookingCreated);
      setBookingCreatedCampaignId(getBookingTriggers.bookingCreated || "");
      setBookingConfirmedEnabled(!!getBookingTriggers.bookingConfirmed);
      setBookingConfirmedCampaignId(getBookingTriggers.bookingConfirmed || "");
    }
  }, [getBookingTriggers]);

  const handleSaveTriggers = async () => {
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTriggers(true);
    try {
      await saveBookingTriggers({
        adminEmail: adminEmail,
        bookingCreatedCampaignId: bookingCreatedEnabled 
          ? (bookingCreatedCampaignId ? (bookingCreatedCampaignId as any) : undefined)
          : null,
        bookingConfirmedCampaignId: bookingConfirmedEnabled 
          ? (bookingConfirmedCampaignId ? (bookingConfirmedCampaignId as any) : undefined)
          : null,
      });

      toast({
        title: "Triggers saved",
        description: "Your booking email triggers have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving triggers:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save triggers.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTriggers(false);
    }
  };

  // Handle loading state
  if (contacts === undefined || campaigns === undefined || journeys === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-foreground/60 mb-4">Loading email marketing data...</p>
            <p className="text-sm text-foreground/40">If this persists, check that Convex dev is running and compiled successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  const contactsList = contacts || [];
  const campaignsList = campaigns || [];
  const journeysList = journeys || [];

  const subscribed = contactsList.filter(c => c.emailMarketingStatus === "subscribed").length;
  const unsubscribed = contactsList.filter(c => c.emailMarketingStatus === "unsubscribed").length;
  const bounced = contactsList.filter(c => c.emailMarketingStatus === "bounced").length;
  const spam = contactsList.filter(c => c.emailMarketingStatus === "spam").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Email Marketing
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage contacts, send campaigns, track engagement, and automate email journeys.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/email-marketing/campaigns/new">
            <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="font-black uppercase tracking-wider"
            onClick={() => setIsAddContactModalOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="overview" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="quick-send" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Quick Send
          </TabsTrigger>
          <TabsTrigger 
            value="contacts" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Contacts
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Campaigns
          </TabsTrigger>
          <TabsTrigger 
            value="journeys" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Journeys
          </TabsTrigger>
          <TabsTrigger 
            value="triggers" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-send" className="space-y-6">
          <div className="text-center py-12">
            <Send className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900' }}>
              Quick Email Blast
            </h2>
            <p className="text-foreground/60 mb-6">
              Send one-off emails without creating a campaign
            </p>
            <Link href="/admin/email-marketing/quick-send">
              <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Send className="mr-2 h-4 w-4" />
                Open Quick Send
              </Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
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
                      {contactsList.length}
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
                      Subscribed
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {subscribed}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Campaigns
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {campaignsList.length}
                    </p>
                  </div>
                  <Send className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Unsubscribed
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {unsubscribed}
                    </p>
                  </div>
                  <X className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Contacts */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactsList.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-foreground/60 mb-2">No contacts yet</p>
                  <Button 
                    variant="outline" 
                    className="font-black uppercase tracking-wider"
                    onClick={() => setIsAddContactModalOpen(true)}
                  >
                    Add First Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactsList.slice(0, 5).map((contact) => (
                    <div key={contact._id} className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg">
                      <div>
                        <p className="font-bold text-foreground">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                            : contact.email}
                        </p>
                        <p className="text-sm text-foreground/60">{contact.email}</p>
                        {contact.source && (
                          <p className="text-xs text-foreground/50 mt-1">
                            Source: {contact.source === "lead" ? "Lead" : contact.source === "email_marketing" ? "Email Marketing" : contact.source === "manual" ? "Manual" : contact.source}
                          </p>
                        )}
                          {contact.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {contact.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            contact.emailMarketingStatus === "subscribed"
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : contact.emailMarketingStatus === "unsubscribed"
                              ? "bg-red-500/20 text-red-500 border border-red-500/30"
                              : contact.emailMarketingStatus === "bounced"
                              ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                          }`}
                        >
                          {contact.emailMarketingStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link href="/admin/tools/contacts">
                    <Button variant="outline" className="w-full font-black uppercase tracking-wider">
                      View All Contacts
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Recent Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsList.length === 0 ? (
                <div className="py-8 text-center">
                  <Send className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-foreground/60 mb-2">No campaigns yet</p>
                  <Link href="/admin/email-marketing/campaigns/new">
                    <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                      Create First Campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignsList.slice(0, 5).map((campaign) => (
                    <Link key={campaign._id} href={`/admin/email-marketing/campaigns/${campaign._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div>
                          <p className="font-bold text-foreground">{campaign.name}</p>
                          <p className="text-sm text-foreground/60">{campaign.subject}</p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            campaign.status === "sent"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : campaign.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : "bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link href="/admin/email-marketing?tab=campaigns">
                    <Button variant="outline" className="w-full font-black uppercase tracking-wider">
                      View All Campaigns
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <ContactsTabContent adminEmail={adminEmail} toast={toast} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                All Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsList.length === 0 ? (
                <div className="py-16 text-center">
                  <Send className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No campaigns yet
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    Create a campaign to send emails to your contacts
                  </p>
                  <Link href="/admin/email-marketing/campaigns/new">
                    <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignsList.map((campaign) => (
                    <Link key={campaign._id} href={`/admin/email-marketing/campaigns/${campaign._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div>
                          <p className="font-bold text-foreground">{campaign.name}</p>
                          <p className="text-sm text-foreground/60">{campaign.subject}</p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            campaign.status === "sent"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : campaign.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : "bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Email Journeys
                  </CardTitle>
                  <CardDescription>
                    Automate email sequences based on triggers and conditions
                  </CardDescription>
                </div>
                <Button
                  onClick={() => window.location.href = "/admin/email-marketing/journeys/new"}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Journey
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {journeysList.length === 0 ? (
                <div className="py-16 text-center">
                  <TrendingUp className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No journeys yet
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    Create a journey to automate email sequences based on triggers
                  </p>
                  <Button
                    onClick={() => window.location.href = "/admin/email-marketing/journeys/new"}
                    className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                    style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Journey
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {journeysList.map((journey) => (
                    <Link key={journey._id} href={`/admin/email-marketing/journeys/${journey._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-bold text-foreground">{journey.name}</p>
                          {journey.description && (
                            <p className="text-sm text-foreground/60 mt-1">{journey.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-foreground/50">
                              {journey.steps.length} step{journey.steps.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-foreground/50">
                              Trigger: {journey.entryTrigger.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            journey.status === "active"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : journey.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : journey.status === "paused"
                              ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                              : "bg-foreground/10 text-foreground/60 border border-foreground/20"
                          }`}
                        >
                          {journey.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          {/* Available Triggers Overview */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Available Triggers
              </CardTitle>
              <CardDescription>
                Configure automated emails based on events. Use these triggers in journeys for advanced automation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Manual Enrollment */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Manual Enrollment</p>
                  </div>
                  <p className="text-xs text-foreground/60">Manually add contacts to journeys</p>
                </div>

                {/* Tag Added */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Tag Added</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a tag is added to a contact</p>
                </div>

                {/* Campaign Opened */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Campaign Opened</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a contact opens a campaign</p>
                </div>

                {/* Campaign Clicked */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Campaign Clicked</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a contact clicks a campaign link</p>
                </div>

                {/* Contact Created */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Contact Created</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a new contact is created</p>
                </div>

                {/* Booking Created */}
                <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Booking Created</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a booking is created (configurable below)</p>
                </div>

                {/* Booking Confirmed */}
                <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Booking Confirmed</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a booking is confirmed (configurable below)</p>
                </div>

                {/* Custom Trigger */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Custom Trigger</p>
                  </div>
                  <p className="text-xs text-foreground/60">Custom event-based triggers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Triggers Section */}
          <Card className="border border-foreground/20 group relative overflow-hidden hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Calendar className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Booking Email Triggers
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Configure automated emails when bookings are created or confirmed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Booking Created Trigger */}
              <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                      When Booking is Created
                    </h3>
                    <p className="text-sm text-foreground/60">
                      Automatically send an email campaign when someone books a time slot
                    </p>
                  </div>
                  <Checkbox
                    id="bookingCreatedEnabled"
                    checked={bookingCreatedEnabled}
                    onCheckedChange={(checked) => setBookingCreatedEnabled(checked === true)}
                  />
                </div>
                {bookingCreatedEnabled && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="bookingCreatedCampaign" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Select Campaign
                      </Label>
                      <Select
                        value={bookingCreatedCampaignId}
                        onValueChange={setBookingCreatedCampaignId}
                      >
                        <SelectTrigger id="bookingCreatedCampaign" className="h-11">
                          <SelectValue placeholder="Choose a campaign..." />
                        </SelectTrigger>
                        <SelectContent>
                          {campaignsList
                            .filter(c => c.status === "draft" || c.status === "sent")
                            .map(campaign => (
                              <SelectItem key={campaign._id} value={campaign._id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <AlertCircle className="h-4 w-4" />
                      <span>This campaign will be sent immediately when a booking is created</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Confirmed Trigger */}
              <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                      When Booking is Confirmed
                    </h3>
                    <p className="text-sm text-foreground/60">
                      Send a follow-up email after booking confirmation
                    </p>
                  </div>
                  <Checkbox
                    id="bookingConfirmedEnabled"
                    checked={bookingConfirmedEnabled}
                    onCheckedChange={(checked) => setBookingConfirmedEnabled(checked === true)}
                  />
                </div>
                {bookingConfirmedEnabled && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="bookingConfirmedCampaign" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Select Campaign
                      </Label>
                      <Select
                        value={bookingConfirmedCampaignId}
                        onValueChange={setBookingConfirmedCampaignId}
                      >
                        <SelectTrigger id="bookingConfirmedCampaign" className="h-11">
                          <SelectValue placeholder="Choose a campaign..." />
                        </SelectTrigger>
                        <SelectContent>
                          {campaignsList
                            .filter(c => c.status === "draft" || c.status === "sent")
                            .map(campaign => (
                              <SelectItem key={campaign._id} value={campaign._id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <AlertCircle className="h-4 w-4" />
                      <span>This campaign will be sent after booking confirmation</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveTriggers}
                disabled={isSavingTriggers}
                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSavingTriggers ? "Saving..." : "Save Trigger Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Active Triggers List */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                Active Triggers
              </CardTitle>
              <CardDescription>
                Triggers that are currently active and will send emails automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingCreatedEnabled || bookingConfirmedEnabled ? (
                <div className="space-y-3">
                  {bookingCreatedEnabled && bookingCreatedCampaignId && (
                    <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-bold text-foreground">Booking Created</p>
                          <p className="text-sm text-foreground/60">
                            {campaignsList.find(c => c._id === bookingCreatedCampaignId)?.name || "Campaign not found"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-green-500/20 text-green-500 border border-green-500/30">
                        Active
                      </span>
                    </div>
                  )}
                  {bookingConfirmedEnabled && bookingConfirmedCampaignId && (
                    <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-bold text-foreground">Booking Confirmed</p>
                          <p className="text-sm text-foreground/60">
                            {campaignsList.find(c => c._id === bookingConfirmedCampaignId)?.name || "Campaign not found"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-green-500/20 text-green-500 border border-green-500/30">
                        Active
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Zap className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="font-bold uppercase tracking-wider mb-2">No active triggers</p>
                  <p className="text-sm text-foreground/60">
                    Enable triggers above to automatically send emails on booking events
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Triggers Info */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Using Triggers in Journeys
              </CardTitle>
              <CardDescription>
                Create automated email sequences using any of these triggers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  All trigger types can be used in <strong>Email Journeys</strong> to create sophisticated automated email sequences. 
                  While booking triggers can be configured here for simple one-off emails, journeys allow you to combine multiple steps, 
                  delays, and conditions for advanced automation.
                </p>
                <Link href="/admin/email-marketing/journeys/new">
                  <Button
                    variant="outline"
                    className="font-black uppercase tracking-wider w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Journey
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Modal */}
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Add New Contact
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/70">
              Add a new contact to your email marketing list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-6 mt-4">
            <div>
              <Label htmlFor="modal-email" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Email Address <span className="text-accent">*</span>
              </Label>
              <Input
                id="modal-email"
                type="email"
                value={contactFormData.email}
                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                required
                className="font-medium"
                placeholder="contact@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-firstName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  First Name
                </Label>
                <Input
                  id="modal-firstName"
                  value={contactFormData.firstName}
                  onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                  className="font-medium"
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor="modal-lastName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  Last Name
                </Label>
                <Input
                  id="modal-lastName"
                  value={contactFormData.lastName}
                  onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                  className="font-medium"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="modal-tags" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Tags
              </Label>
              <Input
                id="modal-tags"
                value={contactFormData.tags}
                onChange={(e) => setContactFormData({ ...contactFormData, tags: e.target.value })}
                className="font-medium"
                placeholder="customer, vip, newsletter (comma-separated)"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Separate multiple tags with commas
              </p>
            </div>

            <div>
              <Label htmlFor="modal-source" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Source
              </Label>
              <Input
                id="modal-source"
                value={contactFormData.source}
                onChange={(e) => setContactFormData({ ...contactFormData, source: e.target.value })}
                className="font-medium"
                placeholder="Website, Referral, Event, etc."
              />
              <p className="text-xs text-foreground/50 mt-2">
                Where did this contact come from?
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmittingContact}
                className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSubmittingContact ? "Creating..." : "Create Contact"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddContactModalOpen(false)}
                className="font-black uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

