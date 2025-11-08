"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Eye, EyeOff, Key, Mail, Package, Bell, Settings as SettingsIcon, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const settings = useQuery(api.settings.getAll) || {};
  const setSetting = useMutation(api.settings.set);
  const resetPassword = useMutation(api.auth.resetPassword);
  const { toast } = useToast();
  const { adminEmail, sessionToken } = useAdminAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    supportEmail: "",
    defaultDeliveryExpirationDays: 30,
    expirationWarningThresholdDays: 7,
    emailNotifications: true,
    newFeedbackNotifications: true,
    expiringDeliveryAlerts: true,
  });

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
  const primaryAdminEmail = settings?.primaryAdminEmail as string | undefined;
  const isPrimaryEmail = adminEmail && primaryAdminEmail 
    ? adminEmail.toLowerCase() === primaryAdminEmail.toLowerCase() 
    : false;

  // Sync formData when settings load or change
  useEffect(() => {
    if (settings) {
      setFormData({
        supportEmail: settings.supportEmail || "",
        defaultDeliveryExpirationDays: settings.defaultDeliveryExpirationDays || 30,
        expirationWarningThresholdDays: settings.expirationWarningThresholdDays || 7,
        emailNotifications: settings.emailNotifications !== false, // Default to true
        newFeedbackNotifications: settings.newFeedbackNotifications !== false, // Default to true
        expiringDeliveryAlerts: settings.expiringDeliveryAlerts !== false, // Default to true
      });
    }
  }, [settings]);

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
      // Save all settings with session token
      await Promise.all([
        setSetting({ key: "supportEmail", value: formData.supportEmail || "", sessionToken }),
        setSetting({ key: "defaultDeliveryExpirationDays", value: formData.defaultDeliveryExpirationDays || 30, sessionToken }),
        setSetting({ key: "expirationWarningThresholdDays", value: formData.expirationWarningThresholdDays || 7, sessionToken }),
        setSetting({ key: "emailNotifications", value: formData.emailNotifications, sessionToken }),
        setSetting({ key: "newFeedbackNotifications", value: formData.newFeedbackNotifications, sessionToken }),
        setSetting({ key: "expiringDeliveryAlerts", value: formData.expiringDeliveryAlerts, sessionToken }),
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
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/20">
            <SettingsIcon className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Settings
            </h1>
            <p className="text-foreground/60 text-sm sm:text-base mt-1">
              Manage your site configuration and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Two Column Layout for General Settings and Delivery Defaults */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Mail className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    General Settings
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Configure general site settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="supportEmail" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Support Email
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  This email is used for general support inquiries. Note: Stripe links are now configured per-page (Portraits and Design pages).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Defaults */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Package className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Delivery Defaults
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Configure default settings for new deliveries</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="defaultDeliveryExpirationDays" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Default Expiration Days
                </Label>
                <Input
                  id="defaultDeliveryExpirationDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.defaultDeliveryExpirationDays}
                  onChange={(e) => setFormData({ ...formData, defaultDeliveryExpirationDays: parseInt(e.target.value) || 30 })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  Number of days before deliveries expire (default: 30 days). This can be overridden when creating individual deliveries.
                </p>
              </div>
              <div>
                <Label htmlFor="expirationWarningThresholdDays" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Expiration Warning Threshold
                </Label>
                <Input
                  id="expirationWarningThresholdDays"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.expirationWarningThresholdDays}
                  onChange={(e) => setFormData({ ...formData, expirationWarningThresholdDays: parseInt(e.target.value) || 7 })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  Number of days before expiration to show warning alerts (default: 7 days). Clients will see warnings when deliveries are approaching expiration.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification Preferences */}
        <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                <Bell className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-base mt-1">Control when and how you receive notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
              <div className="flex-1">
                <Label htmlFor="emailNotifications" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                  Email Notifications
                </Label>
                <p className="text-sm text-foreground/60">
                  Enable or disable all email notifications. When disabled, other notification preferences are ignored.
                </p>
              </div>
              <Checkbox
                id="emailNotifications"
                checked={formData.emailNotifications}
                onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked === true })}
                className="mt-1"
              />
            </div>
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
              <div className="flex-1">
                <Label htmlFor="newFeedbackNotifications" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                  New Feedback Alerts
                </Label>
                <p className="text-sm text-foreground/60">
                  Get notified when clients leave feedback on deliveries.
                </p>
              </div>
              <Checkbox
                id="newFeedbackNotifications"
                checked={formData.newFeedbackNotifications && formData.emailNotifications}
                onCheckedChange={(checked) => setFormData({ ...formData, newFeedbackNotifications: checked === true })}
                disabled={!formData.emailNotifications}
                className="mt-1"
              />
            </div>
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
              <div className="flex-1">
                <Label htmlFor="expiringDeliveryAlerts" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                  Expiring Delivery Alerts
                </Label>
                <p className="text-sm text-foreground/60">
                  Get notified when deliveries are approaching their expiration date (based on warning threshold).
                </p>
              </div>
              <Checkbox
                id="expiringDeliveryAlerts"
                checked={formData.expiringDeliveryAlerts && formData.emailNotifications}
                onCheckedChange={(checked) => setFormData({ ...formData, expiringDeliveryAlerts: checked === true })}
                disabled={!formData.emailNotifications}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Password Reset Section - Only for primary email */}
        {isPrimaryEmail && (
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Key className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Update your admin password. This will log you out of all devices.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="currentPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="h-12 text-base pr-10 border-foreground/20 focus:border-accent/50 transition-colors"
                    autoComplete="current-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
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
                <Label htmlFor="newPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 8 characters)"
                    className="h-12 text-base pr-10 border-foreground/20 focus:border-accent/50 transition-colors"
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
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
                <Label htmlFor="confirmPassword" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="h-12 text-base pr-10 border-foreground/20 focus:border-accent/50 transition-colors"
                    autoComplete="new-password"
                    disabled={isResettingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
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
                className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
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
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}


