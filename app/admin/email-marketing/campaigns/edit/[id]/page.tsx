"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Save, Eye, Code, X, Tag } from "lucide-react";
import Link from "next/link";

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const campaign = useQuery(
    api.emailMarketing.getCampaign,
    adminEmail ? { id: id as any, email: adminEmail } : ("skip" as const)
  );

  const updateCampaign = useMutation(api.emailMarketing.updateCampaign);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");
  const [contentType, setContentType] = useState<"html" | "text">("html");
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Get all available tags
  const allTags = useQuery(
    api.emailMarketing.getAllTags,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    fromEmail: "",
    fromName: "",
    htmlContent: "",
    textContent: "",
    tags: [] as string[],
  });

  // Load campaign data when it's available
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || "",
        subject: campaign.subject || "",
        fromEmail: campaign.fromEmail || "",
        fromName: campaign.fromName || "",
        htmlContent: campaign.htmlContent || "",
        textContent: campaign.textContent || "",
        tags: campaign.tags || [],
      });
      // Determine content type based on what exists
      if (campaign.htmlContent && campaign.htmlContent.trim()) {
        setContentType("html");
      } else if (campaign.textContent && campaign.textContent.trim()) {
        setContentType("text");
      }
    }
  }, [campaign]);

  // Filter tags based on input
  const filteredTags = tagInput
    ? allTags.filter(tag => 
        tag.toLowerCase().includes(tagInput.toLowerCase()) && 
        !formData.tags.includes(tag)
      )
    : allTags.filter(tag => !formData.tags.includes(tag));

  if (!campaign) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-foreground/60">Loading campaign...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
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

    setIsSaving(true);
    try {
      await updateCampaign({
        id: campaign._id,
        adminEmail: adminEmail,
        name: formData.name,
        subject: formData.subject,
        fromEmail: formData.fromEmail || undefined,
        fromName: formData.fromName || undefined,
        htmlContent: contentType === "html" ? formData.htmlContent : "",
        textContent: contentType === "text" ? formData.textContent : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });

      toast({
        title: "Campaign updated",
        description: "The campaign has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating campaign:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update campaign.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (trimmed && !formData.tags.includes(trimmed)) {
        setFormData({ ...formData, tags: [...formData.tags, trimmed] });
        setTagInput("");
        setShowTagDropdown(false);
      }
    } else if (e.key === "Backspace" && tagInput === "" && formData.tags.length > 0) {
      setFormData({ ...formData, tags: formData.tags.slice(0, -1) });
    }
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput("");
      setShowTagDropdown(false);
      tagInputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  // Process content for preview with short codes
  const processPreviewContent = (content: string) => {
    return content
      .replace(/{{\s*unsubscribe_url\s*}}/g, '<a href="#" style="color: #666; text-decoration: underline;">Unsubscribe</a>')
      .replace(/{{\s*first_name\s*}}/g, '<span style="color: #333; font-weight: 600;">John</span>')
      .replace(/{{\s*last_name\s*}}/g, '<span style="color: #333; font-weight: 600;">Doe</span>')
      .replace(/{{\s*email\s*}}/g, '<span style="color: #333;">john.doe@example.com</span>')
      .replace(/{{\s*full_name\s*}}/g, '<span style="color: #333; font-weight: 600;">John Doe</span>');
  };

  // Process text content for preview
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

  // Handle broken images in preview
  useEffect(() => {
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.src.includes('via.placeholder.com') || img.src.includes('placeholder')) {
        img.style.display = 'none';
      }
    };

    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('error', handleImageError);
    });

    return () => {
      images.forEach(img => {
        img.removeEventListener('error', handleImageError);
      });
    };
  }, [previewHtml]);

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
            Edit Campaign: {formData.name || "Untitled"}
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
            onClick={handleSave}
            disabled={isSaving}
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 border-r border-foreground/20 overflow-y-auto bg-background p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Campaign Name <span className="text-accent">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="font-medium"
                placeholder="Newsletter - January 2024"
              />
            </div>

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

            <div>
              <Label htmlFor="tags" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Tags
              </Label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 border border-foreground/20 rounded-md bg-background min-h-[42px]">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <div className="relative flex-1 min-w-[120px]">
                    <Input
                      ref={tagInputRef}
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowTagDropdown(true);
                      }}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={() => setShowTagDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                      className="border-0 focus-visible:ring-0 h-auto p-0 font-medium"
                      placeholder={formData.tags.length === 0 ? "Type and press comma or enter to add tags..." : ""}
                    />
                    {showTagDropdown && filteredTags.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-foreground/20 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/10 flex items-center gap-2"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-foreground/50 mt-2">
                Type and press comma or enter to add tags. Click existing tags to remove them.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {previewMode === "preview" ? (
            <div className="p-8">
              {/* Email Preview Container */}
              <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {/* Email Header */}
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

                {/* Email Body */}
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
    </div>
  );
}

