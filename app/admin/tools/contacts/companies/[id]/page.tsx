"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Save, Trash2, Users, Mail, Phone, MapPin, Globe, ExternalLink } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { AddressInput } from "@/components/ui/address-input";
import { WebsiteInput } from "@/components/ui/website-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SocialLinkInput } from "@/components/ui/social-link-input";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const companyId = params.id as Id<"companies">;

  const company = useQuery(
    api.contacts.companiesGet,
    adminEmail && companyId ? { id: companyId } : "skip"
  );

  const updateCompany = useMutation(api.contacts.companiesUpdate);
  const removeCompany = useMutation(api.contacts.companiesRemove);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    website: "",
    phone: "",
    instagram: "",
    facebook: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    googleBusinessLink: "",
    notes: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        address: company.address || "",
        website: company.website || "",
        phone: company.phone || "",
        instagram: company.instagram || "",
        facebook: company.facebook || "",
        youtube: company.youtube || "",
        twitter: company.twitter || "",
        linkedin: company.linkedin || "",
        googleBusinessLink: company.googleBusinessLink || "",
        notes: company.notes || "",
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!companyId || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateCompany({
        id: companyId,
        name: formData.name,
        address: formData.address || undefined,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        instagram: formData.instagram || undefined,
        facebook: formData.facebook || undefined,
        youtube: formData.youtube || undefined,
        twitter: formData.twitter || undefined,
        linkedin: formData.linkedin || undefined,
        googleBusinessLink: formData.googleBusinessLink || undefined,
        notes: formData.notes || undefined,
      });

      toast({
        title: "Company updated",
        description: "The company has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update company.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId) return;

    try {
      await removeCompany({ id: companyId });
      toast({
        title: "Company deleted",
        description: "The company has been deleted successfully.",
      });
      router.push("/admin/tools/contacts?tab=companies");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company.",
        variant: "destructive",
      });
    }
  };

  if (!company) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-foreground/20 mb-4" />
          <p className="text-foreground/60 font-medium">Loading company...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/admin/tools/contacts?tab=companies">
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-tight text-foreground truncate" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              {company.name}
            </h1>
            <p className="text-foreground/70 text-sm sm:text-base lg:text-lg mt-2">
              {company.contactCount || 0} contact{company.contactCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="font-black uppercase tracking-wider w-full sm:w-auto"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="border border-foreground/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              <FormSection title="Basic Details" description="Company name and contact information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Company Name" required className="sm:col-span-2">
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Company name"
                      className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                      style={{ fontWeight: "500" }}
                    />
                  </FormField>
                  <FormField label="Phone">
                    <PhoneInput
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                    />
                  </FormField>
                  <FormField label="Website">
                    <WebsiteInput
                      value={formData.website}
                      onChange={(value) => setFormData({ ...formData, website: value })}
                    />
                  </FormField>
                  <FormField label="Address" className="sm:col-span-2">
                    <AddressInput
                      value={formData.address}
                      onChange={(value) => setFormData({ ...formData, address: value })}
                    />
                  </FormField>
                  <FormField label="Google Business Link">
                    <WebsiteInput
                      value={formData.googleBusinessLink}
                      onChange={(value) => setFormData({ ...formData, googleBusinessLink: value })}
                      placeholder="https://g.page/..."
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Social Links" description="Social media profiles">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Instagram">
                    <SocialLinkInput
                      platform="instagram"
                      value={formData.instagram}
                      onChange={(value) => setFormData({ ...formData, instagram: value })}
                    />
                  </FormField>
                  <FormField label="Facebook">
                    <SocialLinkInput
                      platform="facebook"
                      value={formData.facebook}
                      onChange={(value) => setFormData({ ...formData, facebook: value })}
                    />
                  </FormField>
                  <FormField label="LinkedIn">
                    <SocialLinkInput
                      platform="linkedin"
                      value={formData.linkedin}
                      onChange={(value) => setFormData({ ...formData, linkedin: value })}
                    />
                  </FormField>
                  <FormField label="Twitter">
                    <SocialLinkInput
                      platform="twitter"
                      value={formData.twitter}
                      onChange={(value) => setFormData({ ...formData, twitter: value })}
                    />
                  </FormField>
                  <FormField label="YouTube">
                    <SocialLinkInput
                      platform="youtube"
                      value={formData.youtube}
                      onChange={(value) => setFormData({ ...formData, youtube: value })}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Additional Information" description="Notes and details">
                <FormField label="Notes">
                  <ResizableTextarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    minRows={4}
                    maxRows={12}
                    className="bg-foreground/3 hover:bg-foreground/5 focus:bg-background border-2 border-transparent focus:border-foreground px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 transition-all duration-200 outline-none"
                    style={{ fontWeight: "500" }}
                  />
                </FormField>
              </FormSection>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Associated Contacts */}
        <div className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Associated Contacts
              </CardTitle>
              <CardDescription className="text-sm">
                {company.contactCount || 0} contact{company.contactCount !== 1 ? 's' : ''} linked to this company
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {company.contacts && company.contacts.length > 0 ? (
                <div className="space-y-2">
                  {company.contacts.map((contact) => (
                    <Link
                      key={contact._id}
                      href={`/admin/tools/contacts?contactId=${contact._id}`}
                      className="block p-3 rounded-lg border border-foreground/10 hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {contact.contactName || contact.firstName || contact.email}
                            {contact.lastName && ` ${contact.lastName}`}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1 text-xs text-foreground/60">
                            {contact.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{contact.email}</span>
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{contact.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-foreground/40 flex-shrink-0 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto text-foreground/20 mb-2" />
                  <p className="text-sm text-foreground/60">No contacts linked yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{company.name}"? This will unlink all associated contacts but will not delete the contacts themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

