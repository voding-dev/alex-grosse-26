"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Eye, EyeOff, Key, Mail, Save, FileText, Image as ImageIcon, X, Globe, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { MediaLibrarySelector } from "@/components/media-library/media-library-selector";

export default function SettingsPage() {
  const settingsData = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);
  const resetPassword = useMutation(api.auth.resetPassword);
  const { toast } = useToast();
  const { adminEmail, sessionToken } = useAdminAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    supportEmail: "",
    siteTimezone: "America/New_York",
    // PDF Builder settings
    pdfCoverImageUrl: "",
    pdfCoverStorageKey: "",
    pdfContactName: "",
    pdfTitle: "",
    pdfEmail: "",
    pdfPhone: "",
    pdfWebsite: "",
    // SEO & Metadata settings
    seoSiteName: "",
    seoTitle: "",
    seoDescription: "",
    seoOgImageStorageKey: "",
    seoSocialDescription: "",
  });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [seoOgMediaLibraryOpen, setSeoOgMediaLibraryOpen] = useState(false);

  // Password reset form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get primary email from settings dynamically (no hardcoded values)
  const primaryAdminEmail = settingsData?.primaryAdminEmail as string | undefined;
  const isPrimaryEmail = adminEmail && primaryAdminEmail 
    ? adminEmail.toLowerCase() === primaryAdminEmail.toLowerCase() 
    : false;

  // Get cover image URL from storage
  const coverImageUrl = useQuery(
    api.storageQueries.getUrl,
    formData.pdfCoverStorageKey ? { storageId: formData.pdfCoverStorageKey } : "skip"
  );

  // Get SEO OG image URL from storage
  const seoOgImageUrl = useQuery(
    api.storageQueries.getUrl,
    formData.seoOgImageStorageKey ? { storageId: formData.seoOgImageStorageKey } : "skip"
  );

  // Sync formData when settings load (only once)
  useEffect(() => {
    if (settingsData && !hasInitialized) {
      setFormData({
        supportEmail: (settingsData.supportEmail as string) || "",
        siteTimezone: (settingsData.siteTimezone as string) || "America/New_York",
        pdfCoverImageUrl: (settingsData.pdfCoverImageUrl as string) || "",
        pdfCoverStorageKey: (settingsData.pdfCoverStorageKey as string) || "",
        pdfContactName: (settingsData.pdfContactName as string) || "",
        pdfTitle: (settingsData.pdfTitle as string) || "",
        pdfEmail: (settingsData.pdfEmail as string) || "",
        pdfPhone: (settingsData.pdfPhone as string) || "",
        pdfWebsite: (settingsData.pdfWebsite as string) || "",
        // SEO & Metadata settings
        seoSiteName: (settingsData.seoSiteName as string) || "",
        seoTitle: (settingsData.seoTitle as string) || "",
        seoDescription: (settingsData.seoDescription as string) || "",
        seoOgImageStorageKey: (settingsData.seoOgImageStorageKey as string) || "",
        seoSocialDescription: (settingsData.seoSocialDescription as string) || "",
      });
      setHasInitialized(true);
    }
  }, [settingsData, hasInitialized]);

  const handleSave = async () => {
    if (!adminEmail || !sessionToken) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Save settings with session token
      await Promise.all([
        setSetting({ key: "supportEmail", value: formData.supportEmail || "", sessionToken }),
        setSetting({ key: "siteTimezone", value: formData.siteTimezone, sessionToken }),
        // PDF Builder settings
        setSetting({ key: "pdfCoverImageUrl", value: formData.pdfCoverImageUrl || "", sessionToken }),
        setSetting({ key: "pdfCoverStorageKey", value: formData.pdfCoverStorageKey || "", sessionToken }),
        setSetting({ key: "pdfContactName", value: formData.pdfContactName || "", sessionToken }),
        setSetting({ key: "pdfTitle", value: formData.pdfTitle || "", sessionToken }),
        setSetting({ key: "pdfEmail", value: formData.pdfEmail || "", sessionToken }),
        setSetting({ key: "pdfPhone", value: formData.pdfPhone || "", sessionToken }),
        setSetting({ key: "pdfWebsite", value: formData.pdfWebsite || "", sessionToken }),
        // SEO & Metadata settings
        setSetting({ key: "seoSiteName", value: formData.seoSiteName || "", sessionToken }),
        setSetting({ key: "seoTitle", value: formData.seoTitle || "", sessionToken }),
        setSetting({ key: "seoDescription", value: formData.seoDescription || "", sessionToken }),
        setSetting({ key: "seoOgImageStorageKey", value: formData.seoOgImageStorageKey || "", sessionToken }),
        setSetting({ key: "seoSocialDescription", value: formData.seoSocialDescription || "", sessionToken }),
      ]);

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!adminEmail || !isPrimaryEmail) {
      toast({
        title: "Error",
        description: "Password reset is only available from the primary email address.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetPassword({
        email: adminEmail,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast({
        title: "Password updated",
        description: "Your password has been updated. Please log in again.",
      });

      // Clear session and redirect to login
      localStorage.removeItem("admin_session_token");
      localStorage.removeItem("admin_email");
      router.push("/admin/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
          Settings
        </h1>
        <p className="text-base sm:text-lg" style={{ color: '#666' }}>
          Manage your site configuration and preferences.
        </p>
      </div>

      <div className="space-y-6">
          {/* General Settings */}
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(88, 96, 52, 0.1)' }}>
                  <Mail className="h-5 w-5" style={{ color: '#586034' }} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                    General Settings
                  </CardTitle>
                  <CardDescription className="text-base mt-1" style={{ color: '#666' }}>Configure general site settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="supportEmail" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Support Email
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  This email is used for general support inquiries.
                </p>
              </div>
              <div>
                <Label htmlFor="siteTimezone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Site Timezone <span style={{ color: '#586034' }}>*</span>
                </Label>
                <Input
                  id="siteTimezone"
                  type="text"
                  value={formData.siteTimezone}
                  onChange={(e) => setFormData({ ...formData, siteTimezone: e.target.value })}
                  placeholder="America/New_York"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  Main timezone for site operations. Default: America/New_York (EST/EDT). Common values: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, Europe/London, UTC.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO & Metadata Settings */}
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(88, 96, 52, 0.1)' }}>
                  <Search className="h-5 w-5" style={{ color: '#586034' }} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                    SEO & Metadata
                  </CardTitle>
                  <CardDescription className="text-base mt-1" style={{ color: '#666' }}>Configure search engine optimization and social sharing metadata</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Site Name */}
              <div>
                <Label htmlFor="seoSiteName" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Site Name
                </Label>
                <Input
                  id="seoSiteName"
                  type="text"
                  value={formData.seoSiteName}
                  onChange={(e) => setFormData({ ...formData, seoSiteName: e.target.value })}
                  placeholder="Alex Grosse"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  Your name or brand name. Used as the base for page titles.
                </p>
              </div>

              {/* Site Title */}
              <div>
                <Label htmlFor="seoTitle" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Site Title
                </Label>
                <Input
                  id="seoTitle"
                  type="text"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder="Alex Grosse — Photographer"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  The main title that appears in browser tabs and search results.
                </p>
              </div>

              {/* Site Description */}
              <div>
                <Label htmlFor="seoDescription" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Site Description
                </Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  placeholder="Professional photography services. Book your shoot today."
                  className="min-h-[80px] text-base border-gray-200 focus:border-accent focus:ring-accent/20 resize-y"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  A brief description of your site for search engines (recommended: 150-160 characters).
                </p>
              </div>

              {/* OG Image */}
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Social Share Image (OG Image)
                </Label>
                <p className="mb-3 text-sm" style={{ color: '#888' }}>
                  This image appears when your site is shared on social media. Recommended size: 1200x630 pixels.
                </p>
                {formData.seoOgImageStorageKey && seoOgImageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={seoOgImageUrl}
                      alt="OG Image Preview"
                      className="rounded-lg border object-cover max-w-[300px] max-h-[200px]"
                      style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                    />
                    <button
                      onClick={() => setFormData({ ...formData, seoOgImageStorageKey: "" })}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : formData.seoOgImageStorageKey && !seoOgImageUrl ? (
                  <div className="w-[300px] h-[200px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading image...</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSeoOgMediaLibraryOpen(true)}
                    className="flex items-center gap-2 border-gray-300 hover:border-accent hover:bg-accent/5"
                    style={{ color: '#1a1a1a', backgroundColor: '#fff' }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Select OG Image
                  </Button>
                )}
              </div>

              {/* Social Description */}
              <div>
                <Label htmlFor="seoSocialDescription" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Social Description
                </Label>
                <Textarea
                  id="seoSocialDescription"
                  value={formData.seoSocialDescription}
                  onChange={(e) => setFormData({ ...formData, seoSocialDescription: e.target.value })}
                  placeholder="Professional photographer specializing in portraits and commercial work."
                  className="min-h-[80px] text-base border-gray-200 focus:border-accent focus:ring-accent/20 resize-y"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
                <p className="mt-2 text-sm" style={{ color: '#888' }}>
                  Description for social media cards (OpenGraph & Twitter). Falls back to site description if empty.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PDF Builder Settings */}
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(88, 96, 52, 0.1)' }}>
                  <FileText className="h-5 w-5" style={{ color: '#586034' }} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                    PDF Builder Settings
                  </CardTitle>
                  <CardDescription className="text-base mt-1" style={{ color: '#666' }}>Configure the branding for visitor PDF exports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Cover Image */}
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  PDF Cover Hero Image
                </Label>
                <p className="mb-3 text-sm" style={{ color: '#888' }}>
                  This image will appear as the hero on the PDF cover page.
                </p>
                {formData.pdfCoverStorageKey && coverImageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={coverImageUrl}
                      alt="PDF Cover"
                      className="rounded-lg border object-cover max-w-[300px] max-h-[200px]"
                      style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                    />
                    <button
                      onClick={() => setFormData({ ...formData, pdfCoverImageUrl: "", pdfCoverStorageKey: "" })}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : formData.pdfCoverStorageKey && !coverImageUrl ? (
                  <div className="w-[300px] h-[200px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading image...</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMediaLibraryOpen(true)}
                    className="flex items-center gap-2 border-gray-300 hover:border-accent hover:bg-accent/5"
                    style={{ color: '#1a1a1a', backgroundColor: '#fff' }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Select Cover Image
                  </Button>
                )}
              </div>

              {/* Contact Name */}
              <div>
                <Label htmlFor="pdfContactName" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Contact Name
                </Label>
                <Input
                  id="pdfContactName"
                  type="text"
                  value={formData.pdfContactName}
                  onChange={(e) => setFormData({ ...formData, pdfContactName: e.target.value })}
                  placeholder="Alex Grosse"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="pdfTitle" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Professional Title
                </Label>
                <Input
                  id="pdfTitle"
                  type="text"
                  value={formData.pdfTitle}
                  onChange={(e) => setFormData({ ...formData, pdfTitle: e.target.value })}
                  placeholder="Photographer & Producer"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="pdfEmail" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Contact Email
                </Label>
                <Input
                  id="pdfEmail"
                  type="email"
                  value={formData.pdfEmail}
                  onChange={(e) => setFormData({ ...formData, pdfEmail: e.target.value })}
                  placeholder="alex@alexgrosse.com"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="pdfPhone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Contact Phone
                </Label>
                <Input
                  id="pdfPhone"
                  type="tel"
                  value={formData.pdfPhone}
                  onChange={(e) => setFormData({ ...formData, pdfPhone: e.target.value })}
                  placeholder="803-477-8527"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="pdfWebsite" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Website URL
                </Label>
                <Input
                  id="pdfWebsite"
                  type="text"
                  value={formData.pdfWebsite}
                  onChange={(e) => setFormData({ ...formData, pdfWebsite: e.target.value })}
                  placeholder="www.alexgrosse.com"
                  className="h-12 text-base border-gray-200 focus:border-accent focus:ring-accent/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                />
              </div>
            </CardContent>
          </Card>

        {/* Password Reset Section - Only for primary email */}
        {isPrimaryEmail && (
          <Card className="group relative overflow-hidden border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-1 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(88, 96, 52, 0.1)' }}>
                  <Key className="h-5 w-5" style={{ color: '#586034' }} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-base mt-1" style={{ color: '#666' }}>
                    Update your admin password. This will log you out of all devices.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="currentPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="h-12 text-base pr-10 border-gray-200 focus:border-accent focus:ring-accent/20"
                    style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                    autoComplete="current-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#888' }}
                    disabled={isResettingPassword}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 8 characters)"
                    className="h-12 text-base pr-10 border-gray-200 focus:border-accent focus:ring-accent/20"
                    style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#888' }}
                    disabled={isResettingPassword}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="h-12 text-base pr-10 border-gray-200 focus:border-accent focus:ring-accent/20"
                    style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#888' }}
                    disabled={isResettingPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                onClick={handlePasswordReset} 
                className="w-full sm:w-auto font-black uppercase tracking-wider transition-all hover:opacity-90"
                style={{ backgroundColor: '#586034', fontWeight: '900', color: '#fff' }}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              className="font-black uppercase tracking-wider transition-all hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: '#586034', fontWeight: '900', color: '#fff' }}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
      </div>

      {/* Media Library Selector for PDF Cover Image */}
      <MediaLibrarySelector
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        onSelect={(items) => {
          if (items.length > 0) {
            setFormData({
              ...formData,
              pdfCoverStorageKey: items[0].storageKey,
            });
          }
        }}
        title="Select PDF Cover Image"
        description="Choose an image for the PDF cover page"
        multiple={false}
        mediaType="image"
      />

      {/* Media Library Selector for SEO OG Image */}
      <MediaLibrarySelector
        open={seoOgMediaLibraryOpen}
        onOpenChange={setSeoOgMediaLibraryOpen}
        onSelect={(items) => {
          if (items.length > 0) {
            setFormData({
              ...formData,
              seoOgImageStorageKey: items[0].storageKey,
            });
          }
        }}
        title="Select Social Share Image"
        description="Choose an image for social media sharing (recommended: 1200x630)"
        multiple={false}
        mediaType="image"
      />
    </div>
  );
}
