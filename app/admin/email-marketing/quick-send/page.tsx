"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Send, Users, Tag, Eye, Code, Save, FolderOpen, AlertTriangle } from "lucide-react";
import Link from "next/link";
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
import { Id } from "@/convex/_generated/dataModel";

export default function QuickSendPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const quickSend = useMutation(api.emailMarketing.quickSend);

  const [formData, setFormData] = useState({
    subject: "",
    fromEmail: "",
    fromName: "",
    htmlContent: "",
    textContent: "",
    saveAsCampaign: false,
    campaignName: "",
  });
  const [contentType, setContentType] = useState<"html" | "text">("html");
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");
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

  // Check if Resend API key is configured
  const resendApiKey = useQuery(
    api.settings.get,
    adminEmail ? { key: "resendApiKey" } : ("skip" as const)
  );
  
  // Filter to only subscribed contacts
  const subscribedContacts = allContacts.filter(c => (c as any).emailMarketingStatus === "subscribed");

  const handleSendClick = () => {
    if (!formData.subject.trim()) {
      toast({
        title: "Error",
        description: "Subject line is required.",
        variant: "destructive",
      });
      return;
    }

    if (contentType === "html" && !formData.htmlContent.trim()) {
      toast({
        title: "Error",
        description: "HTML content is required.",
        variant: "destructive",
      });
      return;
    }

    if (contentType === "text" && !formData.textContent.trim()) {
      toast({
        title: "Error",
        description: "Plain text content is required.",
        variant: "destructive",
      });
      return;
    }

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
      const result = await quickSend({
        adminEmail: adminEmail,
        subject: formData.subject,
        fromEmail: formData.fromEmail || undefined,
        fromName: formData.fromName || undefined,
        htmlContent: contentType === "html" ? formData.htmlContent : undefined,
        textContent: contentType === "text" ? formData.textContent : undefined,
        contactIds,
        tags,
        saveAsCampaign: formData.saveAsCampaign,
        campaignName: formData.saveAsCampaign ? (formData.campaignName || formData.subject) : undefined,
      });
      
      if (result.sendsCount > 0) {
        if ((result as any).warning) {
          toast({
            title: "Partially sent",
            description: (result as any).warning,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Email sent",
            description: `Successfully sent to ${result.sendsCount} contact${result.sendsCount !== 1 ? 's' : ''}.${result.campaignId ? ' Campaign saved.' : ''}`,
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to send emails. Please check your Resend API key and configuration.",
          variant: "destructive",
        });
      }
      
      setShowSendDialog(false);
      
      // Reset form
      setFormData({
        subject: "",
        fromEmail: "",
        fromName: "",
        htmlContent: "",
        textContent: "",
        saveAsCampaign: false,
        campaignName: "",
      });
      
      // Optionally redirect to campaign if saved
      if (result.campaignId && formData.saveAsCampaign) {
        router.push(`/admin/email-marketing/campaigns/${result.campaignId}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Process content for preview
  const processPreviewContent = (content: string) => {
    return content
      .replace(/{{\s*unsubscribe_url\s*}}/g, '<a href="#" style="color: #666; text-decoration: underline;">Unsubscribe</a>')
      .replace(/{{\s*first_name\s*}}/g, '<span style="color: #333; font-weight: 600;">John</span>')
      .replace(/{{\s*last_name\s*}}/g, '<span style="color: #333; font-weight: 600;">Doe</span>')
      .replace(/{{\s*email\s*}}/g, '<span style="color: #333;">john.doe@example.com</span>')
      .replace(/{{\s*full_name\s*}}/g, '<span style="color: #333; font-weight: 600;">John Doe</span>');
  };

  const processPreviewText = (content: string) => {
    return content
      .replace(/{{\s*unsubscribe_url\s*}}/g, "[Unsubscribe Link]")
      .replace(/{{\s*first_name\s*}}/g, "John")
      .replace(/{{\s*last_name\s*}}/g, "Doe")
      .replace(/{{\s*email\s*}}/g, "john.doe@example.com")
      .replace(/{{\s*full_name\s*}}/g, "John Doe");
  };

  const previewHtml = contentType === "html" 
    ? processPreviewContent(formData.htmlContent)
    : null;
  
  const previewText = contentType === "text"
    ? processPreviewText(formData.textContent)
    : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-foreground/20 bg-background px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/email-marketing"
            className="text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Quick Email Blast
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(previewMode === "preview" ? "code" : "preview")}
            className="font-black uppercase tracking-wider"
          >
            {previewMode === "preview" ? (
              <>
                <Code className="mr-2 h-4 w-4" />
                View Code
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                View Preview
              </>
            )}
          </Button>
          <Button
            onClick={handleSendClick}
            disabled={isSending}
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>

      {/* API Key Warning */}
      {adminEmail && (!resendApiKey || resendApiKey === "" || (typeof resendApiKey === "string" && resendApiKey.trim() === "")) && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold uppercase tracking-wider text-yellow-500 mb-1">
                Resend API Key Not Configured
              </p>
              <p className="text-sm text-foreground/70 mb-3">
                You need to configure your Resend API key before sending emails. Go to Settings to add your API key.
              </p>
              <Link href="/admin/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-black uppercase tracking-wider text-xs border-yellow-500/50 hover:bg-yellow-500/10"
                >
                  Go to Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 border-r border-foreground/20 overflow-y-auto bg-background p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  From Name
                </Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  className="font-medium"
                  placeholder="Ian Courtright"
                />
              </div>

              <div>
                <Label htmlFor="fromEmail" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  From Email
                </Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  className="font-medium"
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Subject Line <span className="text-accent">*</span>
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="font-medium"
                placeholder="Check out our latest updates!"
              />
            </div>

            {/* Content Type Toggle */}
            <div>
              <Label className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Content Type <span className="text-accent">*</span>
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={contentType === "html" ? "default" : "outline"}
                  onClick={() => setContentType("html")}
                  className="font-black uppercase tracking-wider"
                  style={contentType === "html" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
                >
                  HTML
                </Button>
                <Button
                  type="button"
                  variant={contentType === "text" ? "default" : "outline"}
                  onClick={() => setContentType("text")}
                  className="font-black uppercase tracking-wider"
                  style={contentType === "text" ? { backgroundColor: '#FFA617', fontWeight: '900' } : {}}
                >
                  Plain Text
                </Button>
              </div>
            </div>

            {contentType === "html" ? (
              <div>
                <Label htmlFor="htmlContent" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  HTML Content <span className="text-accent">*</span>
                </Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  required
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="<html><body><h1>Hello {{first_name}}!</h1><p>Your email content here. Use {{unsubscribe_url}} for unsubscribe link</p></body></html>"
                />
                <div className="text-xs text-foreground/50 mt-2 space-y-1">
                  <p>Available short codes:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{first_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{last_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{full_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{email}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{unsubscribe_url}}"}</code>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="textContent" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  Plain Text Content <span className="text-accent">*</span>
                </Label>
                <Textarea
                  id="textContent"
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  required
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Hello {{first_name}}! Your plain text email content here. Use {{unsubscribe_url}} for unsubscribe link"
                />
                <div className="text-xs text-foreground/50 mt-2 space-y-1">
                  <p>Available short codes:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{first_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{last_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{full_name}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{email}}"}</code>
                    <code className="px-2 py-1 bg-foreground/10 rounded">{"{{unsubscribe_url}}"}</code>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveAsCampaign"
                checked={formData.saveAsCampaign}
                onCheckedChange={(checked) => setFormData({ ...formData, saveAsCampaign: !!checked })}
              />
              <Label htmlFor="saveAsCampaign" className="text-sm font-medium cursor-pointer">
                Save as Campaign
              </Label>
            </div>

            {formData.saveAsCampaign && (
              <div>
                <Label htmlFor="campaignName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  Campaign Name
                </Label>
                <Input
                  id="campaignName"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  className="font-medium"
                  placeholder={formData.subject || "Campaign name"}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {previewMode === "preview" ? (
            <div className="p-8">
              <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="border-b border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>From:</strong> {formData.fromName || "Ian Courtright"} {formData.fromEmail ? `<${formData.fromEmail}>` : ""}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>To:</strong> recipient@example.com
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Subject:</strong> {formData.subject || "Email Subject"}
                  </div>
                </div>
                <div className="p-6">
                  {contentType === "html" ? (
                    formData.htmlContent ? (
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
                      />
                    ) : (
                      <div className="text-center text-gray-400 py-12">
                        <p>Start typing HTML content to see preview</p>
                      </div>
                    )
                  ) : (
                    formData.textContent ? (
                      <div className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {previewText}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-12">
                        <p>Start typing plain text content to see preview</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-t-lg border-b border-gray-700">
                  <div className="text-xs font-mono text-gray-400">HTML Code</div>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-xs font-mono">
                  <code>{formData.htmlContent || "<!-- Start typing HTML content -->"}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Send Email Blast
            </DialogTitle>
            <DialogDescription>
              Choose who to send this email to
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
                <div className="space-y-2">
                  {subscribedContacts.map((contact) => {
                    const contactId = (contact as any).emailMarketingId || (contact as any)._id;
                    return (
                      <div key={contactId} className="flex items-center space-x-2">
                        <Checkbox
                          id={`contact-${contactId}`}
                          checked={selectedContactIds.has(contactId)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedContactIds);
                            if (checked) {
                              newSet.add(contactId);
                            } else {
                              newSet.delete(contactId);
                            }
                            setSelectedContactIds(newSet);
                          }}
                        />
                        <Label
                          htmlFor={`contact-${contactId}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {(contact as any).firstName || (contact as any).lastName
                            ? `${(contact as any).firstName || ""} ${(contact as any).lastName || ""}`.trim()
                            : (contact as any).email}
                          <span className="text-foreground/60 ml-2">({(contact as any).email})</span>
                        </Label>
                      </div>
                    );
                  })}
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
                          ({subscribedContacts.filter(c => (c as any).tags?.includes(tag)).length} contacts)
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
                      {segmentContacts.length} contact{segmentContacts.length !== 1 ? "s" : ""} in this segment
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
                      : subscribedContacts.filter(c => Array.from(selectedTags).some(tag => (c as any).tags?.includes(tag))).length !== 1 ? "s" : ""} will receive this email
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
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

