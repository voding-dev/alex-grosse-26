"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";

export default function NewContactPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const createContact = useMutation(api.emailMarketing.createContact);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    tags: "",
    source: "",
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

      await createContact({
        adminEmail: adminEmail,
        email: formData.email,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        source: formData.source || undefined,
      });

      toast({
        title: "Contact created",
        description: "The contact has been added successfully.",
      });

      router.push("/admin/email-marketing");
    } catch (error) {
      console.error("Error creating contact:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create contact.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Add New Contact
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Add a new contact to your email marketing list.
        </p>
      </div>

      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Email Address <span className="text-accent">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="font-medium"
                placeholder="contact@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="font-medium"
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="font-medium"
                  placeholder="Doe"
                />
              </div>
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
                placeholder="customer, vip, newsletter (comma-separated)"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Separate multiple tags with commas
              </p>
            </div>

            <div>
              <Label htmlFor="source" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Source
              </Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
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
                disabled={isSubmitting}
                className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSubmitting ? "Creating..." : "Create Contact"}
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




