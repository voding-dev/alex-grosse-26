"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2, Plus, Calendar, Clock, CheckCircle2, ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface BookingSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (token: string) => void;
}

export function BookingSelectorModal({ open, onOpenChange, onSelect }: BookingSelectorModalProps) {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state for creating new request
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [gettingToken, setGettingToken] = useState<string | null>(null);

  const requests = useQuery(
    api.scheduling.listRequests,
    adminEmail ? { email: adminEmail } : "skip"
  ) || [];

  const createRequest = useMutation(api.scheduling.createRequest);
  const createPublicInvite = useMutation(api.scheduling.createPublicInvite);

  // Get or create public invite token for a request
  const handleGetToken = async (requestId: string) => {
    setGettingToken(requestId);
    try {
      // Create or get public invite (returns { inviteId, token })
      const result = await createPublicInvite({
        requestId: requestId as any,
        email: adminEmail || undefined,
      });

      if (result && result.token) {
        // Return the token to the parent component
        onSelect(result.token);
        toast({
          title: "Token selected",
          description: "Booking token has been set for this page.",
        });
        onOpenChange(false);
      } else {
        throw new Error("Failed to get token");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get token",
        variant: "destructive",
      });
    } finally {
      setGettingToken(null);
    }
  };

  const handleCreateNew = async () => {
    if (!title || !organizerEmail) {
      toast({
        title: "Missing fields",
        description: "Title and organizer email are required.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const requestId = await createRequest({
        title,
        description: description || undefined,
        organizerEmail,
        recipientEmails: [], // Empty for public invite
        durationMinutes,
        slots: [], // User can add slots later
        email: adminEmail || undefined,
      });

      // Create a public invite immediately
      const inviteResult = await createPublicInvite({
        requestId: requestId as any,
        email: adminEmail || undefined,
      });

      if (inviteResult && inviteResult.token) {
        // Use the token directly
        onSelect(inviteResult.token);
        toast({
          title: "Created and selected",
          description: "Scheduling request created and token set. You can add time slots later.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Created",
          description: "Scheduling request created. Please add time slots and get the token from the detail page.",
        });
        router.push(`/admin/scheduling/${requestId}`);
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create request",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const openRequests = requests.filter((r: any) => r.status === "open");
  
  // Filter requests based on search query
  const filteredRequests = openRequests.filter((request: any) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.title?.toLowerCase().includes(query) ||
      request.description?.toLowerCase().includes(query) ||
      request.organizerEmail?.toLowerCase().includes(query)
    );
  });

  // Reset search when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery("");
      setShowCreateForm(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
            Select or Create Booking Request
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose an existing scheduling request or create a new one. You'll get a token to use for booking on your pages.
          </DialogDescription>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <h3 className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Existing Requests
              </h3>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="font-black uppercase tracking-wider"
                style={{ fontWeight: '900' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            {openRequests.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search requests by title, description, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-12"
                />
              </div>
            )}

            {filteredRequests.length === 0 && openRequests.length > 0 ? (
              <Card className="border border-foreground/20">
                <CardContent className="p-8 text-center">
                  <p className="text-foreground/70 mb-4">No requests match your search.</p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="font-bold uppercase tracking-wider"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : filteredRequests.length === 0 ? (
              <Card className="border border-foreground/20">
                <CardContent className="p-8 text-center">
                  <p className="text-foreground/70 mb-4">No open scheduling requests found.</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="font-black uppercase tracking-wider"
                    style={{ fontWeight: '900' }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request: any) => (
                  <Card
                    key={request._id}
                    className="border border-foreground/20 hover:border-accent/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                            {request.title}
                          </h4>
                          {request.description && (
                            <p className="text-sm text-foreground/70 mb-2">{request.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-foreground/60">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.durationMinutes} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              router.push(`/admin/scheduling/${request._id}`);
                              onOpenChange(false);
                            }}
                            className="font-bold uppercase tracking-wider"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleGetToken(request._id)}
                            disabled={gettingToken === request._id}
                            className="font-black uppercase tracking-wider bg-accent text-black"
                            style={{ fontWeight: '900' }}
                          >
                            {gettingToken === request._id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Getting Token...
                              </>
                            ) : (
                              "Get Token"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Create New Request
              </h3>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="font-bold uppercase tracking-wider"
              >
                Back to List
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Consultation Booking"
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description for the booking request"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="organizerEmail" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Organizer Email *
                </Label>
                <Input
                  id="organizerEmail"
                  type="email"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor="durationMinutes" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Duration (minutes) *
                </Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                  min={15}
                  step={15}
                  className="h-12"
                />
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm text-foreground/80">
                  <strong className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Note:</strong> After creating, you'll be taken to the request detail page where you can add time slots and copy the booking token.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {showCreateForm ? (
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNew}
                disabled={creating || !title || !organizerEmail}
                className="flex-1 sm:flex-none font-black uppercase tracking-wider bg-accent text-black"
                style={{ fontWeight: '900' }}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Request"
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

