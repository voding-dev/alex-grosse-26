"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Send, TrendingUp, Eye, MousePointerClick, Mail, X, AlertTriangle, Edit, Users, Tag, FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const campaign = useQuery(
    api.emailMarketing.getCampaign,
    adminEmail ? { id: id as any, email: adminEmail } : ("skip" as const)
  );

  const analytics = useQuery(
    api.emailMarketing.getCampaignAnalytics,
    adminEmail ? { campaignId: id as any, email: adminEmail } : ("skip" as const)
  );

  const sendCampaign = useMutation(api.emailMarketing.sendCampaign);
  const [isSending, setIsSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendMode, setSendMode] = useState<"all" | "contacts" | "tags" | "segments">("all");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  
  // Get all contacts and tags for selection
  const allContacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];
  
  const allTags = useQuery(
    api.emailMarketing.getAllTags,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const segments = useQuery(
    api.emailMarketing.listSegments,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const segmentContacts = useQuery(
    api.emailMarketing.getSegmentContacts,
    adminEmail && selectedSegmentId ? { segmentId: selectedSegmentId as any, email: adminEmail } : ("skip" as const)
  ) || [];
  
  // Filter to only subscribed contacts
  const subscribedContacts = allContacts.filter(c => (c as any).emailMarketingStatus === "subscribed");

  if (!campaign) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-foreground/60">Loading campaign...</p>
        </div>
      </div>
    );
  }

  const handleSendClick = () => {
    setShowSendDialog(true);
    setSendMode("all");
    setSelectedContactIds(new Set());
    setSelectedTags(new Set());
    setSelectedSegmentId("");
  };

  const handleSend = async () => {
    if (!adminEmail) return;
    
    let contactIds: Id<"emailContacts">[] | undefined;
    let tags: string[] | undefined;
    
    if (sendMode === "contacts" && selectedContactIds.size > 0) {
      contactIds = Array.from(selectedContactIds) as Id<"emailContacts">[];
    } else if (sendMode === "tags" && selectedTags.size > 0) {
      tags = Array.from(selectedTags);
    } else if (sendMode === "segments" && selectedSegmentId) {
      // Get contact IDs from segment (only subscribed contacts)
      const segmentContactIds = segmentContacts
        .filter((c: any) => (c as any).emailMarketingStatus === "subscribed")
        .map((c: any) => (c as any).emailMarketingId || (c as any)._id)
        .filter((id: any) => id);
      contactIds = segmentContactIds as Id<"emailContacts">[];
    }
    
    const recipientCount = sendMode === "all" 
      ? subscribedContacts.length 
      : sendMode === "contacts" 
        ? contactIds?.length || 0
        : sendMode === "segments"
          ? contactIds?.length || 0
          : subscribedContacts.filter(c => tags?.some(tag => (c as any).tags?.includes(tag))).length;
    
    if (recipientCount === 0) {
      toast({
        title: "Error",
        description: "No recipients selected. Please select contacts, tags, or a segment.",
        variant: "destructive",
      });
      return;
    }

    if (sendMode === "segments" && !selectedSegmentId) {
      toast({
        title: "Error",
        description: "Please select a segment.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await sendCampaign({
        campaignId: campaign._id,
        adminEmail: adminEmail,
        contactIds,
        tags,
      });
      toast({
        title: "Campaign sent",
        description: `The campaign has been sent to ${recipientCount} contact${recipientCount !== 1 ? 's' : ''}.`,
      });
      setShowSendDialog(false);
      router.push("/admin/email-marketing");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send campaign.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <Link
            href="/admin/email-marketing"
            className="text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground mb-4 inline-block"
          >
            ← Back to Email Marketing
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            {campaign.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/email-marketing/campaigns/edit/${campaign._id}`}>
            <Button
              variant="outline"
              className="font-black uppercase tracking-wider"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {campaign.status === "draft" && (
            <Button
              onClick={handleSendClick}
              disabled={isSending}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Campaign
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Campaign Info */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Campaign Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Subject
              </p>
              <p className="text-lg font-bold text-foreground">{campaign.subject}</p>
            </div>
            {(campaign.fromName || campaign.fromEmail) && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  From
                </p>
                <p className="text-foreground">
                  {campaign.fromName || "Ian Courtright"} {campaign.fromEmail ? `<${campaign.fromEmail}>` : ""}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">
                Status
              </p>
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded inline-block ${
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
            {campaign.tags.length > 0 && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {campaign.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-foreground/10 space-y-1 text-xs text-foreground/50">
              <div>Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}</div>
              {campaign.sentAt && (
                <div>Sent {formatDistanceToNow(new Date(campaign.sentAt), { addSuffix: true })}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Campaign Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analytics ? (
              <div className="py-8 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                <p className="text-foreground/60">No analytics data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Total
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.total}
                    </p>
                  </div>
                  <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-accent" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Opens
                      </p>
                    </div>
                    <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                      {analytics.opened}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.openRate.toFixed(1)}% open rate
                    </p>
                  </div>
                  <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointerClick className="h-4 w-4 text-accent" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Clicks
                      </p>
                    </div>
                    <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                      {analytics.clicked}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.clickRate.toFixed(1)}% click rate
                    </p>
                  </div>
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Delivered
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.delivered}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.deliveryRate.toFixed(1)}% delivery rate
                    </p>
                  </div>
                </div>

                {(analytics.bounced > 0 || analytics.unsubscribed > 0 || analytics.spam > 0) && (
                  <div className="pt-4 border-t border-foreground/10 space-y-2">
                    {analytics.bounced > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Bounced
                          </span>
                        </div>
                        <span className="font-black text-orange-500">{analytics.bounced}</span>
                      </div>
                    )}
                    {analytics.unsubscribed > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Unsubscribed
                          </span>
                        </div>
                        <span className="font-black text-red-500">{analytics.unsubscribed}</span>
                      </div>
                    )}
                    {analytics.spam > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Marked as Spam
                          </span>
                        </div>
                        <span className="font-black text-yellow-500">{analytics.spam}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Content Preview */}
      <Card className="mt-6 border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Email Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-foreground/10 rounded-lg p-6 bg-foreground/5">
            {campaign.htmlContent && campaign.htmlContent.trim() ? (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
              />
            ) : campaign.textContent && campaign.textContent.trim() ? (
              <div className="whitespace-pre-wrap text-sm text-foreground font-mono">
                {campaign.textContent}
              </div>
            ) : (
              <div className="text-center text-foreground/40 py-8">
                <p>No content available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Campaign Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Send Campaign
            </DialogTitle>
            <DialogDescription>
              Choose who to send this campaign to
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Send Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider">Recipient Selection</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="send-all"
                    name="send-mode"
                    checked={sendMode === "all"}
                    onChange={() => setSendMode("all")}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="send-all" className="font-medium cursor-pointer">
                    All Subscribed Contacts ({subscribedContacts.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="send-contacts"
                    name="send-mode"
                    checked={sendMode === "contacts"}
                    onChange={() => setSendMode("contacts")}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="send-contacts" className="font-medium cursor-pointer">
                    Select Specific Contacts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="send-tags"
                    name="send-mode"
                    checked={sendMode === "tags"}
                    onChange={() => setSendMode("tags")}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="send-tags" className="font-medium cursor-pointer">
                    Select by Tags
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="send-segments"
                    name="send-mode"
                    checked={sendMode === "segments"}
                    onChange={() => setSendMode("segments")}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="send-segments" className="font-medium cursor-pointer">
                    Select by Segment
                  </Label>
                </div>
              </div>
            </div>

            {/* Contact Selection */}
            {sendMode === "contacts" && (
              <div className="space-y-3 border border-foreground/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Contacts ({selectedContactIds.size} selected)
                </Label>
                <Input
                  placeholder="Search contacts..."
                  className="mb-2"
                  onChange={(e) => {
                    // Simple search - could be enhanced
                  }}
                />
                <div className="space-y-2">
                  {subscribedContacts.map((contact) => (
                    <div key={contact._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`contact-${contact._id}`}
                        checked={selectedContactIds.has(contact._id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedContactIds);
                          if (checked) {
                            newSet.add(contact._id);
                          } else {
                            newSet.delete(contact._id);
                          }
                          setSelectedContactIds(newSet);
                        }}
                      />
                      <Label
                        htmlFor={`contact-${contact._id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          : contact.email}
                        <span className="text-foreground/60 ml-2">({contact.email})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Selection */}
            {sendMode === "tags" && (
              <div className="space-y-3 border border-foreground/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Select Tags ({selectedTags.size} selected)
                </Label>
                <div className="space-y-2">
                  {allTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={selectedTags.has(tag)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedTags);
                          if (checked) {
                            newSet.add(tag);
                          } else {
                            newSet.delete(tag);
                          }
                          setSelectedTags(newSet);
                        }}
                      />
                      <Label
                        htmlFor={`tag-${tag}`}
                        className="text-sm cursor-pointer"
                      >
                        {tag}
                        <span className="text-foreground/60 ml-2">
                          ({subscribedContacts.filter(c => c.tags.includes(tag)).length} contacts)
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Segment Selection */}
            {sendMode === "segments" && (
              <div className="space-y-3 border border-foreground/20 rounded-lg p-4">
                <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4" />
                  Select Segment
                </Label>
                {segments.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-foreground/40" />
                    <p className="text-sm text-foreground/60 mb-4">No segments available</p>
                    <Link href="/admin/email-marketing/contacts">
                      <Button variant="outline" size="sm" className="font-black uppercase tracking-wider text-xs">
                        Create Segment
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a segment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment._id} value={segment._id}>
                          {segment.name} ({segment.contactCount} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedSegmentId && segmentContacts.length > 0 && (
                  <div className="mt-3 p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Segment Preview
                    </p>
                    <p className="text-sm text-foreground/70">
                      {segmentContacts.filter((c: any) => (c as any).emailMarketingStatus === "subscribed").length} subscribed contact{segmentContacts.filter((c: any) => (c as any).emailMarketingStatus === "subscribed").length !== 1 ? "s" : ""} in this segment
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Recipient Count */}
            <div className="p-4 bg-foreground/5 border border-foreground/20 rounded-lg">
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Recipients
              </p>
              <p className="text-lg font-black" style={{ fontWeight: '900' }}>
                {sendMode === "all" 
                  ? subscribedContacts.length 
                  : sendMode === "contacts" 
                    ? selectedContactIds.size
                    : sendMode === "segments"
                      ? (selectedSegmentId ? segmentContacts.filter((c: any) => (c as any).emailMarketingStatus === "subscribed").length : 0)
                      : subscribedContacts.filter(c => Array.from(selectedTags).some(tag => (c as any).tags?.includes(tag))).length}
                {" "}contact{sendMode === "all" 
                  ? subscribedContacts.length !== 1 ? "s" : ""
                  : sendMode === "contacts"
                    ? selectedContactIds.size !== 1 ? "s" : ""
                    : sendMode === "segments"
                      ? (selectedSegmentId ? (segmentContacts.filter((c: any) => (c as any).emailMarketingStatus === "subscribed").length !== 1 ? "s" : "") : "")
                      : subscribedContacts.filter(c => Array.from(selectedTags).some(tag => (c as any).tags?.includes(tag))).length !== 1 ? "s" : ""} will receive this campaign
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              disabled={isSending}
              className="font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

