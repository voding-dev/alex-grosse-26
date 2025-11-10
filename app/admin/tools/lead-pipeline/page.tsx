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
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/10 text-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/10 text-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500/10 text-purple-500" },
  { value: "proposal", label: "Proposal", color: "bg-orange-500/10 text-orange-500" },
  { value: "closed", label: "Closed", color: "bg-green-500/10 text-green-500" },
] as const;

export default function LeadPipelinePage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Id<"leads"> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Id<"prospects"> | null>(null);
  
  // Form state for converting prospect
  const [convertFormData, setConvertFormData] = useState({
    contactName: "",
    contactTitle: "",
    contactPhone: "",
    contactEmail: "",
    notes: "",
    tags: [] as string[],
  });
  
  // Form state for editing lead
  const [editFormData, setEditFormData] = useState({
    contactName: "",
    contactTitle: "",
    contactPhone: "",
    contactEmail: "",
    status: "new" as "new" | "contacted" | "qualified" | "proposal" | "closed",
    closedOutcome: undefined as "won" | "lost" | undefined,
    notes: "",
    tags: [] as string[],
  });

  const leads = useQuery(
    api.leads.leadsList,
    adminEmail ? {} : "skip"
  );

  const prospects = useQuery(
    api.prospects.prospectsList,
    adminEmail ? {} : "skip"
  );

  const createLead = useMutation(api.leads.leadsCreate);
  const updateLead = useMutation(api.leads.leadsUpdate);
  const removeLead = useMutation(api.leads.leadsRemove);

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    let filtered = leads;
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          (lead.contactName && lead.contactName.toLowerCase().includes(query)) ||
          (lead.contactEmail && lead.contactEmail.toLowerCase().includes(query)) ||
          lead.emails.some((email) => email.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [leads, statusFilter, searchQuery]);

  // Group leads by status for pipeline view
  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, typeof filteredLeads> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal: [],
      closed: [],
    };
    
    filteredLeads.forEach((lead) => {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    });
    
    return grouped;
  }, [filteredLeads]);

  // Get unconverted prospects
  const unconvertedProspects = useMemo(() => {
    if (!prospects) return [];
    return prospects.filter((p) => !p.convertedToLeadId);
  }, [prospects]);

  const handleConvertProspect = async () => {
    if (!selectedProspect) return;
    
    try {
      await createLead({
        prospectId: selectedProspect,
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
      setSelectedProspect(null);
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
  };

  const handleEditLead = (leadId: Id<"leads">) => {
    const lead = leads?.find((l) => l._id === leadId);
    if (!lead) return;
    
    setSelectedLead(leadId);
    setEditFormData({
      contactName: lead.contactName || "",
      contactTitle: lead.contactTitle || "",
      contactPhone: lead.contactPhone || "",
      contactEmail: lead.contactEmail || "",
      status: lead.status,
      closedOutcome: lead.closedOutcome,
      notes: lead.notes || "",
      tags: lead.tags || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    
    try {
      await updateLead({
        id: selectedLead,
        contactName: editFormData.contactName || undefined,
        contactTitle: editFormData.contactTitle || undefined,
        contactPhone: editFormData.contactPhone || undefined,
        contactEmail: editFormData.contactEmail || undefined,
        status: editFormData.status,
        closedOutcome: editFormData.closedOutcome,
        notes: editFormData.notes || undefined,
        tags: editFormData.tags.length > 0 ? editFormData.tags : undefined,
      });
      
      toast({
        title: "Lead updated",
        description: "The lead has been updated successfully.",
      });
      
      setIsEditDialogOpen(false);
      setSelectedLead(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLead = async (leadId: Id<"leads">) => {
    try {
      await removeLead({ id: leadId });
      toast({
        title: "Lead deleted",
        description: "The lead has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline</h1>
          <p className="text-foreground/60 mt-2">
            Manage your leads through the sales pipeline
          </p>
        </div>
        <Button
          onClick={() => {
            setActiveTab("convert");
            setIsConvertDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Convert Prospect
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
          <TabsTrigger value="list">Leads List</TabsTrigger>
          <TabsTrigger value="convert">Convert from Prospects</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline View</CardTitle>
              <CardDescription>
                Drag and drop leads between stages or click to edit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {STATUS_OPTIONS.map((status) => (
                  <div key={status.value} className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-foreground/5 rounded-lg">
                      <span className="font-medium">{status.label}</span>
                      <span className="text-sm text-foreground/60">
                        {leadsByStatus[status.value]?.length || 0}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[400px]">
                      {leadsByStatus[status.value]?.map((lead) => (
                        <Card
                          key={lead._id}
                          className="cursor-pointer hover:bg-foreground/5 transition-colors"
                          onClick={() => handleEditLead(lead._id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-medium">{lead.name}</div>
                              {lead.contactName && (
                                <div className="text-sm text-foreground/60">
                                  <User className="h-3 w-3 inline mr-1" />
                                  {lead.contactName}
                                  {lead.contactTitle && ` - ${lead.contactTitle}`}
                                </div>
                              )}
                              {lead.contactEmail && (
                                <div className="text-sm text-foreground/60">
                                  <Mail className="h-3 w-3 inline mr-1" />
                                  {lead.contactEmail}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leads List</CardTitle>
              <CardDescription>
                View and manage all leads in a table format
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
                      placeholder="Search leads..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-foreground/60 py-8">
                          No leads found. Convert some prospects from the Convert tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead._id}>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>
                            {lead.contactName && (
                              <div className="text-sm">
                                {lead.contactName}
                                {lead.contactTitle && ` - ${lead.contactTitle}`}
                              </div>
                            )}
                            {lead.contactEmail && (
                              <div className="text-sm text-foreground/60">{lead.contactEmail}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.status)}`}>
                              {STATUS_OPTIONS.find((s) => s.value === lead.status)?.label || lead.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-foreground/60">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLead(lead._id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLead(lead._id)}
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

        <TabsContent value="convert" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Convert from Prospects</CardTitle>
              <CardDescription>
                Select a prospect to convert to a lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unconvertedProspects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-foreground/60 py-8">
                          No unconverted prospects found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      unconvertedProspects.map((prospect) => (
                        <TableRow key={prospect._id}>
                          <TableCell className="font-medium">{prospect.name}</TableCell>
                          <TableCell className="text-sm text-foreground/60">{prospect.address}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent">
                              {prospect.score || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProspect(prospect._id);
                                setIsConvertDialogOpen(true);
                              }}
                            >
                              Convert
                            </Button>
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

      {/* Convert Prospect Dialog */}
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
              onClick={handleConvertProspect}
              disabled={!convertFormData.contactName || !convertFormData.contactEmail}
            >
              Convert to Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update lead information and pipeline status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Contact Phone</Label>
                <Input
                  value={editFormData.contactPhone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contactPhone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  value={editFormData.contactEmail}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contactEmail: e.target.value })
                  }
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: any) =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editFormData.status === "closed" && (
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select
                    value={editFormData.closedOutcome || ""}
                    onValueChange={(value: any) =>
                      setEditFormData({ ...editFormData, closedOutcome: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <Button onClick={handleUpdateLead}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

