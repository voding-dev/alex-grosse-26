"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";

export default function NewCampaignPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const createCampaign = useMutation(api.emailMarketing.createCampaign);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    fromEmail: "",
    fromName: "",
    htmlContent: "",
    textContent: "",
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        ? formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      await createCampaign({
        name: formData.name,
        subject: formData.subject,
        fromEmail: formData.fromEmail || undefined,
        fromName: formData.fromName || undefined,
        htmlContent: formData.htmlContent,
        textContent: formData.textContent || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });

      toast({
        title: "Campaign created",
        description: "The campaign has been created successfully.",
      });

      router.push("/admin/email-marketing");
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create campaign.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          New Campaign
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Create a new email campaign to send to your contacts.
        </p>
      </div>

      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Campaign Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <p className="text-xs text-foreground/50 mt-2">
                  Leave empty to use default domain email
                </p>
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

            <div>
              <Label htmlFor="htmlContent" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                HTML Content <span className="text-accent">*</span>
              </Label>
              <Textarea
                id="htmlContent"
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                required
                rows={12}
                className="font-mono text-sm"
                placeholder="<html><body><h1>Your email content</h1><p>Include {{unsubscribe_url}} for unsubscribe link</p></body></html>"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Use {"{{unsubscribe_url}}"} to include the unsubscribe link
              </p>
            </div>

            <div>
              <Label htmlFor="textContent" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Plain Text Content (Optional)
              </Label>
              <Textarea
                id="textContent"
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                placeholder="Plain text version of your email..."
              />
            </div>

            <div>
              <Label htmlFor="tags" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Tags
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="font-medium"
                placeholder="newsletter, marketing, updates (comma-separated)"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Separate multiple tags with commas
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSubmitting ? "Creating..." : "Create Campaign"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="font-black uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

