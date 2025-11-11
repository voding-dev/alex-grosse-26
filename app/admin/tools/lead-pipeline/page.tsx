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
  TrendingUp,
  Users,
  Target,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-accent/20 text-accent border border-accent/30" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500/20 text-purple-500 border border-purple-500/30" },
  { value: "proposal", label: "Proposal", color: "bg-orange-500/20 text-orange-500 border border-orange-500/30" },
  { value: "closed", label: "Closed", color: "bg-green-500/20 text-green-500 border border-green-500/30" },
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
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-foreground/10 text-foreground/60 border border-foreground/20";
  };

  // Calculate stats
  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter(l => l.status === "new").length || 0;
  const qualifiedLeads = leads?.filter(l => l.status === "qualified").length || 0;
  const closedLeads = leads?.filter(l => l.status === "closed").length || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Lead Pipeline
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage your leads through the sales pipeline and track conversions.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            onClick={() => {
              setActiveTab("convert");
              setIsConvertDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Convert Prospect
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="pipeline" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Pipeline View
          </TabsTrigger>
          <TabsTrigger 
            value="list" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Leads List
          </TabsTrigger>
          <TabsTrigger 
            value="convert" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Convert
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Total Leads
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {totalLeads}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      New Leads
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {newLeads}
                    </p>
                  </div>
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Qualified
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {qualifiedLeads}
                    </p>
                  </div>
                  <Target className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Closed
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {closedLeads}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Pipeline View
              </CardTitle>
              <CardDescription>
                Drag and drop leads between stages or click to edit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {STATUS_OPTIONS.map((status) => (
                  <div key={status.value} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
                      <span className="font-bold uppercase tracking-wider text-sm">{status.label}</span>
                      <span className="text-sm font-black text-foreground" style={{ fontWeight: '900' }}>
                        {leadsByStatus[status.value]?.length || 0}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[300px] sm:min-h-[400px]">
                      {leadsByStatus[status.value]?.map((lead) => (
                        <Card
                          key={lead._id}
                          className="cursor-pointer hover:bg-foreground/5 hover:border-accent/50 transition-all border border-foreground/10"
                          onClick={() => handleEditLead(lead._id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-bold text-foreground">{lead.name}</div>
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
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Leads List
              </CardTitle>
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
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Name</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Contact</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Status</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-foreground/60 py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-12 w-12 text-foreground/40 mb-2" />
                            <p className="text-foreground/60 mb-2">No leads found</p>
                            <p className="text-sm text-foreground/40">Convert some prospects from the Convert tab to get started.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead._id}>
                          <TableCell className="font-bold">{lead.name}</TableCell>
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
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${getStatusColor(lead.status)}`}>
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
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Convert from Prospects
              </CardTitle>
              <CardDescription>
                Select a prospect to convert to a lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Name</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Address</TableHead>
                      <TableHead className="font-bold uppercase tracking-wider text-xs">Score</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unconvertedProspects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-foreground/60 py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Target className="h-12 w-12 text-foreground/40 mb-2" />
                            <p className="text-foreground/60 mb-2">No unconverted prospects found</p>
                            <p className="text-sm text-foreground/40">Import prospects from the Prospecting tool first.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      unconvertedProspects.map((prospect) => (
                        <TableRow key={prospect._id}>
                          <TableCell className="font-bold">{prospect.name}</TableCell>
                          <TableCell className="text-sm text-foreground/60">{prospect.address}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-accent/20 text-accent border border-accent/30">
                              {prospect.score || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-black uppercase tracking-wider text-xs"
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
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Convert Prospect to Lead
            </DialogTitle>
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
            <Button 
              variant="outline" 
              className="font-black uppercase tracking-wider"
              onClick={() => setIsConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
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
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Edit Lead
            </DialogTitle>
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
              onClick={handleUpdateLead}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

