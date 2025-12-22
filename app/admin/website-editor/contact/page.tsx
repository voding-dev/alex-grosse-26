"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function ContactEditorPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  
  // Homepage contact data
  const homepage = useQuery(api.homepage.get);
  const updateHomepage = useMutation(api.homepage.update);
  
  // Form state
  const [formData, setFormData] = useState({
    contactHeading: "",
    contactText: "",
    contactEmail: "",
    contactPhone: "",
    contactInstagramUrl: "",
    contactLinkedinUrl: "",
    formHeading: "",
  });
  
  // Sync form data
  useEffect(() => {
    if (homepage) {
      setFormData({
        contactHeading: homepage.contactHeading || "",
        contactText: homepage.contactText || "",
        contactEmail: homepage.contactEmail || "",
        contactPhone: homepage.contactPhone || "",
        contactInstagramUrl: homepage.contactInstagramUrl || "",
        contactLinkedinUrl: homepage.contactLinkedinUrl || "",
        formHeading: homepage.formHeading || "",
      });
    }
  }, [homepage]);

  const handleSave = async () => {
    try {
      await updateHomepage({ ...formData, email: adminEmail || undefined });
      toast({ title: "Contact section updated", description: "Changes saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update.", variant: "destructive" });
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
          Contact Section
        </h1>
        <p className="text-base sm:text-lg" style={{ color: '#666' }}>
          Manage the Contact section content on your homepage.
        </p>
      </div>
      
      <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
            Contact Section
          </CardTitle>
          <CardDescription className="text-base" style={{ color: '#666' }}>
            Edit the content that appears in the Contact section on your homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Section Heading */}
          <div>
            <Label htmlFor="contactHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
              Contact Section Heading
            </Label>
            <Input
              id="contactHeading"
              value={formData.contactHeading}
              onChange={(e) => setFormData({ ...formData, contactHeading: e.target.value })}
              placeholder="e.g., GET IN TOUCH"
              className="h-12 text-base border-gray-200 focus:border-[#586034]"
              style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
            />
            <p className="mt-2 text-xs" style={{ color: '#888' }}>
              Optional heading displayed above the contact text.
            </p>
          </div>
          
          <Separator style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
          
          {/* Contact Text */}
          <div>
            <Label htmlFor="contactText" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
              Contact Section Text
            </Label>
            <Textarea
              id="contactText"
              value={formData.contactText}
              onChange={(e) => setFormData({ ...formData, contactText: e.target.value })}
              rows={4}
              className="text-base border-gray-200 focus:border-[#586034]"
              style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
              placeholder="At my studio, I create high-quality visual work..."
            />
            <p className="mt-2 text-xs" style={{ color: '#888' }}>
              Main descriptive text displayed in the Contact section.
            </p>
          </div>
          
          <Separator style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
          
          {/* Contact Information */}
          <div className="space-y-6">
            <Label className="text-base font-black uppercase tracking-wider block" style={{ color: '#333' }}>
              Contact Information
            </Label>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="contactEmail" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
                  Email
                </Label>
                <Input
                  id="contactEmail"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="h-12 text-base border-gray-200 focus:border-[#586034]"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                  placeholder="hello@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
                  Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="h-12 text-base border-gray-200 focus:border-[#586034]"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                  placeholder="555-123-4567"
                />
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="contactInstagramUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
                  Instagram URL
                </Label>
                <Input
                  id="contactInstagramUrl"
                  value={formData.contactInstagramUrl}
                  onChange={(e) => setFormData({ ...formData, contactInstagramUrl: e.target.value })}
                  className="h-12 text-base border-gray-200 focus:border-[#586034]"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>
              <div>
                <Label htmlFor="contactLinkedinUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
                  LinkedIn URL
                </Label>
                <Input
                  id="contactLinkedinUrl"
                  value={formData.contactLinkedinUrl}
                  onChange={(e) => setFormData({ ...formData, contactLinkedinUrl: e.target.value })}
                  className="h-12 text-base border-gray-200 focus:border-[#586034]"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </div>
          
          <Separator style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
          
          {/* Form Heading */}
          <div>
            <Label htmlFor="formHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ color: '#333' }}>
              Contact Form Heading
            </Label>
            <Input
              id="formHeading"
              value={formData.formHeading}
              onChange={(e) => setFormData({ ...formData, formHeading: e.target.value })}
              placeholder="GET IN TOUCH"
              className="h-12 text-base border-gray-200 focus:border-[#586034]"
              style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
            />
            <p className="mt-2 text-xs" style={{ color: '#888' }}>
              Heading displayed above the contact form. Leave empty to use default.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button 
          onClick={handleSave} 
          size="lg" 
          className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider transition-all hover:opacity-90"
          style={{ backgroundColor: '#586034', color: '#fff' }}
        >
          Save Contact Section
        </Button>
      </div>
    </div>
  );
}

