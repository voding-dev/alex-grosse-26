"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Mail,
  Phone,
  MapPin,
  Globe,
  MessageSquare,
  Calendar,
  Tag,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

type Lead = {
  _id: Id<"leads">;
  name: string;
  address: string;
  phone?: string;
  emails: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "closed";
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
  prospectName?: string;
};

export default function LeadsPage() {
  const { sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const leads = useQuery(api.leads.leadsList, {
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    searchQuery: searchQuery || undefined,
  }) || [];

  const updateLead = useMutation(api.leads.leadsUpdate);

  const handleStatusChange = async (leadId: Id<"leads">, newStatus: string) => {
    try {
      await updateLead({
        id: leadId,
        status: newStatus as any,
      });
      toast({
        title: "Lead updated",
        description: "Lead status has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "qualified":
        return "bg-purple-100 text-purple-800";
      case "proposal":
        return "bg-orange-100 text-orange-800";
      case "closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wide mb-2" style={{ fontWeight: '900', color: '#586034' }}>
          Leads
        </h1>
        <p className="text-sm uppercase tracking-wider" style={{ color: '#888' }}>
          Manage and track your leads from contact form submissions
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#888' }} />
          <Input
            placeholder="Search leads by name, email, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      {leads.length === 0 ? (
        <Card style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}>
          <CardContent className="py-12 text-center">
            <p className="text-sm uppercase tracking-wider" style={{ color: '#888' }}>
              {searchQuery || statusFilter !== "all" ? "No leads match your filters" : "No leads yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card
              key={lead._id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}
              onClick={() => setSelectedLead(lead)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: '#1a1a1a' }}>
                          {lead.contactName || lead.name}
                        </h3>
                        {lead.contactName && lead.name !== lead.contactName && (
                          <p className="text-sm" style={{ color: '#666' }}>
                            {lead.name}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {lead.contactEmail && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#666' }}>
                          <Mail className="h-4 w-4" />
                          <a
                            href={`mailto:${lead.contactEmail}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.contactEmail}
                          </a>
                        </div>
                      )}
                      {lead.contactPhone && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#666' }}>
                          <Phone className="h-4 w-4" />
                          <a
                            href={`tel:${lead.contactPhone}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {lead.contactPhone}
                          </a>
                        </div>
                      )}
                      {lead.address && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#666' }}>
                          <MapPin className="h-4 w-4" />
                          {lead.address}
                        </div>
                      )}
                      {lead.notes && (
                        <div className="flex items-start gap-2 text-sm mt-3" style={{ color: '#666' }}>
                          <MessageSquare className="h-4 w-4 mt-0.5" />
                          <p className="line-clamp-2">{lead.notes}</p>
                        </div>
                      )}
                    </div>

                    {lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {lead.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: 'rgba(88, 96, 52, 0.3)', color: '#666' }}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#888' }}>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lead.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead._id, value)}
                    >
                      <SelectTrigger className="w-full" style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSelectedLead(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#586034' }}>
                    {selectedLead.contactName || selectedLead.name}
                  </h2>
                  {selectedLead.contactName && selectedLead.name !== selectedLead.contactName && (
                    <p className="text-sm" style={{ color: '#666' }}>
                      {selectedLead.name}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLead(null)}
                  style={{ color: '#666' }}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#586034' }}>
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    {selectedLead.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" style={{ color: '#888' }} />
                        <a href={`mailto:${selectedLead.contactEmail}`} className="hover:underline" style={{ color: '#1a1a1a' }}>
                          {selectedLead.contactEmail}
                        </a>
                      </div>
                    )}
                    {selectedLead.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" style={{ color: '#888' }} />
                        <a href={`tel:${selectedLead.contactPhone}`} className="hover:underline" style={{ color: '#1a1a1a' }}>
                          {selectedLead.contactPhone}
                        </a>
                      </div>
                    )}
                    {selectedLead.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: '#888' }} />
                        <span style={{ color: '#1a1a1a' }}>{selectedLead.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLead.notes && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#586034' }}>
                      Notes
                    </h3>
                    <p className="whitespace-pre-wrap" style={{ color: '#1a1a1a' }}>{selectedLead.notes}</p>
                  </div>
                )}

                {selectedLead.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#586034' }}>
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          style={{ borderColor: 'rgba(88, 96, 52, 0.3)', color: '#666' }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#586034' }}>
                    Status
                  </h3>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(value) => {
                      handleStatusChange(selectedLead._id, value);
                      setSelectedLead({ ...selectedLead, status: value as any });
                    }}
                  >
                    <SelectTrigger className="w-full" style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs" style={{ color: '#888' }}>
                  <p>Created: {formatDate(selectedLead.createdAt)}</p>
                  <p>Updated: {formatDate(selectedLead.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

