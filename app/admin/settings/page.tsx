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
import { Eye, EyeOff, Key, Mail, Package, Bell, Settings as SettingsIcon, Save, Clock, Calendar, ChevronDown, ChevronUp, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonthAvailabilityCalendar, type MonthAvailability } from "@/components/ui/month-availability-calendar";
import { DayConfigPanel } from "@/components/scheduling/day-config-panel";

// Test Resend Connection Component
function TestResendConnection({ adminEmail, toast }: { adminEmail: string | null; toast: any }) {
  const testResend = useMutation(api.emailMarketing.testResendConnection);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const result = await testResend({
        adminEmail: adminEmail,
        testEmail: testEmail,
      });

      if (result && result.success) {
        toast({
          title: "Test Email Sent!",
          description: result.message || `Test email sent successfully to ${testEmail}. Check your inbox and Resend dashboard.`,
        });
        setTestEmail("");
      } else {
        toast({
          title: "Test Failed",
          description: result?.error || "Failed to send test email. Check your API key and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Test Resend error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test email. Please check your console for details.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your-email@example.com"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="h-10 text-sm border-foreground/20 focus:border-accent/50 transition-colors"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTest();
            }
          }}
        />
        <Button
          onClick={handleTest}
          disabled={isTesting || !testEmail}
          size="sm"
          className="font-black uppercase tracking-wider text-xs"
        >
          {isTesting ? "Sending..." : "Send Test"}
        </Button>
      </div>
      <p className="text-xs text-foreground/50">
        This will send a test email to verify your Resend API key is working. Check your Resend dashboard to see if the email appears.
      </p>
    </div>
  );
}

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
    workHoursStart: "09:00",
    workHoursEnd: "17:00",
    workHoursDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    workHoursTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    siteTimezone: "America/New_York", // Default to EST
    defaultSlotDurationMinutes: 60,
    defaultSlotIntervalMinutes: 60,
    autoAddBookingContacts: true,
    bookingConfirmationEmail: true,
    bookingReminderEmail: false,
    bookingReminderHours: 24,
    resendApiKey: "",
    emailDomain: "",
  });

  // Availability state
  const [monthAvailability, setMonthAvailability] = useState<MonthAvailability>({});
  // Accordion state for month grouping
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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
        workHoursStart: settings.workHoursStart || "09:00",
        workHoursEnd: settings.workHoursEnd || "17:00",
        workHoursDays: settings.workHoursDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
        workHoursTimezone: settings.workHoursTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        siteTimezone: settings.siteTimezone || "America/New_York", // Default to EST
        defaultSlotDurationMinutes: settings.defaultSlotDurationMinutes || 60,
        defaultSlotIntervalMinutes: settings.defaultSlotIntervalMinutes || 60,
        autoAddBookingContacts: settings.autoAddBookingContacts !== false, // Default to true
        bookingConfirmationEmail: settings.bookingConfirmationEmail !== false, // Default to true
        bookingReminderEmail: settings.bookingReminderEmail === true, // Default to false
        bookingReminderHours: settings.bookingReminderHours || 24,
        resendApiKey: settings.resendApiKey || "",
        emailDomain: settings.emailDomain || "",
      });
      
      // Load availability from settings
      if (settings.schedulingAvailability) {
        setMonthAvailability(settings.schedulingAvailability as MonthAvailability);
      }
    }
  }, [settings]);

  // Auto-expand first month when availability changes and no months are expanded
  useEffect(() => {
    if (expandedMonths.size === 0 && Object.keys(monthAvailability).length > 0) {
      const availableDates = Object.keys(monthAvailability)
        .filter((date) => monthAvailability[date]?.available)
        .sort();
      
      if (availableDates.length > 0) {
        const firstDate = availableDates[0];
        const firstMonthKey = firstDate.substring(0, 7); // yyyy-mm
        setExpandedMonths(new Set([firstMonthKey]));
      }
    }
  }, [monthAvailability, expandedMonths.size]);

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
        setSetting({ key: "workHoursStart", value: formData.workHoursStart, sessionToken }),
        setSetting({ key: "workHoursEnd", value: formData.workHoursEnd, sessionToken }),
        setSetting({ key: "workHoursDays", value: formData.workHoursDays, sessionToken }),
        setSetting({ key: "workHoursTimezone", value: formData.workHoursTimezone, sessionToken }),
        setSetting({ key: "siteTimezone", value: formData.siteTimezone, sessionToken }),
        setSetting({ key: "defaultSlotDurationMinutes", value: formData.defaultSlotDurationMinutes, sessionToken }),
        setSetting({ key: "defaultSlotIntervalMinutes", value: formData.defaultSlotIntervalMinutes, sessionToken }),
        setSetting({ key: "schedulingAvailability", value: monthAvailability, sessionToken }),
        setSetting({ key: "autoAddBookingContacts", value: formData.autoAddBookingContacts, sessionToken }),
        setSetting({ key: "bookingConfirmationEmail", value: formData.bookingConfirmationEmail, sessionToken }),
        setSetting({ key: "bookingReminderEmail", value: formData.bookingReminderEmail, sessionToken }),
        setSetting({ key: "bookingReminderHours", value: formData.bookingReminderHours, sessionToken }),
        setSetting({ key: "resendApiKey", value: formData.resendApiKey || "", sessionToken }),
        setSetting({ key: "emailDomain", value: formData.emailDomain || "", sessionToken }),
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="general" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            General
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Email
          </TabsTrigger>
          <TabsTrigger 
            value="availability" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Availability
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
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
              <div>
                <Label htmlFor="siteTimezone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Site Timezone <span className="text-accent">*</span>
                </Label>
                <Input
                  id="siteTimezone"
                  type="text"
                  value={formData.siteTimezone}
                  onChange={(e) => setFormData({ ...formData, siteTimezone: e.target.value })}
                  placeholder="America/New_York"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  Main timezone for site operations, scheduled blog posts, and automated tasks. Default: America/New_York (EST/EDT). Common values: America/New_York, America/Chicago, America/Denver, America/Los_Angeles, Europe/London, UTC.
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
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          {/* Booking Email Automation */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Calendar className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Booking Email Automation
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Automate email marketing and notifications for bookings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
                <div className="flex-1">
                  <Label htmlFor="autoAddBookingContacts" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                    Auto-Add Booking Contacts
                  </Label>
                  <p className="text-sm text-foreground/60">
                    Automatically add booking email addresses to your email marketing contacts list. Contacts will be tagged with "booking" and the scheduler ID.
                  </p>
                </div>
                <Checkbox
                  id="autoAddBookingContacts"
                  checked={formData.autoAddBookingContacts}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoAddBookingContacts: checked === true })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
                <div className="flex-1">
                  <Label htmlFor="bookingConfirmationEmail" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                    Send Confirmation Emails
                  </Label>
                  <p className="text-sm text-foreground/60">
                    Automatically send confirmation emails when bookings are made. Includes booking details and date/time.
                  </p>
                </div>
                <Checkbox
                  id="bookingConfirmationEmail"
                  checked={formData.bookingConfirmationEmail}
                  onCheckedChange={(checked) => setFormData({ ...formData, bookingConfirmationEmail: checked === true })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors">
                <div className="flex-1">
                  <Label htmlFor="bookingReminderEmail" className="text-sm font-black uppercase tracking-wider mb-2 block cursor-pointer" style={{ fontWeight: '900' }}>
                    Send Reminder Emails
                  </Label>
                  <p className="text-sm text-foreground/60">
                    Automatically send reminder emails before bookings. Helps reduce no-shows.
                  </p>
                </div>
                <Checkbox
                  id="bookingReminderEmail"
                  checked={formData.bookingReminderEmail}
                  onCheckedChange={(checked) => setFormData({ ...formData, bookingReminderEmail: checked === true })}
                  className="mt-1"
                />
              </div>
              {formData.bookingReminderEmail && (
                <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                  <Label htmlFor="bookingReminderHours" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Reminder Timing (Hours Before Booking)
                  </Label>
                  <Input
                    id="bookingReminderHours"
                    type="number"
                    min={1}
                    max={168}
                    value={formData.bookingReminderHours}
                    onChange={(e) => setFormData({ ...formData, bookingReminderHours: parseInt(e.target.value) || 24 })}
                    className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors max-w-xs"
                  />
                  <p className="mt-2 text-sm text-foreground/60">
                    How many hours before the booking to send the reminder email (default: 24 hours).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Marketing Configuration */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Send className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Email Marketing Configuration
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Configure Resend API and email domain for sending emails</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div>
                <Label htmlFor="resendApiKey" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Resend API Key <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="resendApiKey"
                    type="password"
                    value={formData.resendApiKey}
                    onChange={(e) => setFormData({ ...formData, resendApiKey: e.target.value })}
                    placeholder="re_xxxxxxxxxxxxx"
                    className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("resendApiKey") as HTMLInputElement;
                      if (input) {
                        input.type = input.type === "password" ? "text" : "password";
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-foreground/60">
                  Your Resend API key. Get it from your <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Resend dashboard</a>.
                </p>
              </div>
              <div>
                <Label htmlFor="emailDomain" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Email Domain
                </Label>
                <Input
                  id="emailDomain"
                  type="text"
                  value={formData.emailDomain}
                  onChange={(e) => setFormData({ ...formData, emailDomain: e.target.value })}
                  placeholder="example.com"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  Your verified email domain in Resend (e.g., example.com). If not set, defaults to onboarding.resend.dev.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2">Test API Connection</p>
                <p className="text-sm text-foreground/60 mb-3">
                  Send a test email to verify your Resend API key is working correctly:
                </p>
                <TestResendConnection adminEmail={adminEmail} toast={toast} />
              </div>
              <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2">Webhook Configuration</p>
                <p className="text-sm text-foreground/60 mb-2">
                  Configure your Resend webhook to track email opens and clicks:
                </p>
                <div className="space-y-2 text-xs text-foreground/60 font-mono bg-foreground/10 p-3 rounded border border-foreground/10">
                  <p><strong>Webhook URL:</strong></p>
                  <p className="break-all">{typeof window !== "undefined" ? window.location.origin : ""}/api/email/webhook</p>
                  <p className="mt-2"><strong>Events to subscribe:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>email.sent</li>
                    <li>email.delivered</li>
                    <li>email.opened</li>
                    <li>email.clicked</li>
                    <li>email.bounced</li>
                    <li>email.complained</li>
                    <li>email.unsubscribed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Email Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-6">
          {/* Work Hours Settings */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Clock className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Work Hours
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Configure your default work hours for scheduling</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Start Time
                  </Label>
                  <CustomTimePicker
                    value={formData.workHoursStart}
                    onChange={(value) => setFormData({ ...formData, workHoursStart: value })}
                    placeholder="Select start time"
                  />
                </div>
                <div>
                  <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    End Time
                  </Label>
                  <CustomTimePicker
                    value={formData.workHoursEnd}
                    onChange={(value) => setFormData({ ...formData, workHoursEnd: value })}
                    placeholder="Select end time"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Work Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const currentDays = formData.workHoursDays;
                        const isSelected = currentDays.includes(day);
                        setFormData({
                          ...formData,
                          workHoursDays: isSelected
                            ? currentDays.filter((d) => d !== day)
                            : [...currentDays, day].sort((a, b) => {
                                const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                                return order.indexOf(a) - order.indexOf(b);
                              }),
                        });
                      }}
                      className={`px-4 py-2 text-sm font-black uppercase tracking-wider rounded border transition-colors ${
                        formData.workHoursDays.includes(day)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-foreground/20 text-foreground/80 hover:border-accent/50 hover:bg-foreground/5"
                      }`}
                      style={{ fontWeight: '900' }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="workHoursTimezone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Timezone
                </Label>
                <Input
                  id="workHoursTimezone"
                  type="text"
                  value={formData.workHoursTimezone}
                  onChange={(e) => setFormData({ ...formData, workHoursTimezone: e.target.value })}
                  placeholder="America/New_York"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                />
                <p className="mt-2 text-sm text-foreground/60">
                  Timezone for your work hours (e.g., America/New_York, Europe/London). Defaults to your system timezone.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultSlotDurationMinutes" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Default Slot Duration (minutes)
                  </Label>
                  <Input
                    id="defaultSlotDurationMinutes"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.defaultSlotDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, defaultSlotDurationMinutes: parseInt(e.target.value) || 60 })}
                    className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                  />
                  <p className="mt-2 text-sm text-foreground/60">
                    Default duration for each time slot when auto-generating availability.
                  </p>
                </div>
                <div>
                  <Label htmlFor="defaultSlotIntervalMinutes" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Default Slot Interval (minutes)
                  </Label>
                  <Input
                    id="defaultSlotIntervalMinutes"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.defaultSlotIntervalMinutes}
                    onChange={(e) => setFormData({ ...formData, defaultSlotIntervalMinutes: parseInt(e.target.value) || 60 })}
                    className="h-12 text-base border-foreground/20 focus:border-accent/50 transition-colors"
                  />
                  <p className="mt-2 text-sm text-foreground/60">
                    How often new slots start. Example: 60 min duration with 30 min interval creates slots every 30 minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Availability Calendar */}
          <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Calendar className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Availability Calendar
                  </CardTitle>
                  <CardDescription className="text-base mt-1">Select available days from the month view and configure time slots</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Month View Calendar */}
              <div className="border border-foreground/20 rounded-lg p-4 bg-foreground/5">
                <Label className="text-sm font-black uppercase tracking-wider mb-4 block" style={{ fontWeight: '900' }}>
                  Month View - Select Available Days
                </Label>
                <MonthAvailabilityCalendar
                  availability={monthAvailability}
                  onAvailabilityChange={setMonthAvailability}
                  minDate={new Date()}
                  workHoursStart={formData.workHoursStart}
                  workHoursEnd={formData.workHoursEnd}
                  durationMinutes={formData.defaultSlotDurationMinutes}
                  intervalMinutes={formData.defaultSlotIntervalMinutes}
                />
              </div>

              {/* Day Configuration Panels - Grouped by Month */}
              {(() => {
                // Group dates by month
                const datesByMonth: Record<string, string[]> = {};
                Object.keys(monthAvailability)
                  .filter((date) => monthAvailability[date]?.available)
                  .sort()
                  .forEach((date) => {
                    const monthKey = date.substring(0, 7); // yyyy-mm
                    if (!datesByMonth[monthKey]) {
                      datesByMonth[monthKey] = [];
                    }
                    datesByMonth[monthKey].push(date);
                  });

                const monthKeys = Object.keys(datesByMonth).sort();

                if (monthKeys.length === 0) {
                  return (
                    <div className="p-6 rounded-lg border border-foreground/20 bg-foreground/5 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-foreground/40" />
                      <p className="text-sm text-foreground/60">
                        No available days selected. Select days from the calendar above.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {monthKeys.map((monthKey) => {
                      const dates = datesByMonth[monthKey];
                      // Parse monthKey (yyyy-mm) and create date explicitly to avoid timezone issues
                      const [year, month] = monthKey.split('-').map(Number);
                      const monthDate = new Date(year, month - 1, 1); // month is 0-indexed
                      const monthName = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                      const isMonthExpanded = expandedMonths.has(monthKey);

                      return (
                        <Card key={monthKey} className="border border-foreground/20">
                          <CardHeader
                            className="pb-3 cursor-pointer hover:bg-foreground/5 transition-colors"
                            onClick={() => {
                              const newExpanded = new Set(expandedMonths);
                              if (isMonthExpanded) {
                                newExpanded.delete(monthKey);
                              } else {
                                newExpanded.add(monthKey);
                              }
                              setExpandedMonths(newExpanded);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isMonthExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-accent" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-foreground/60" />
                                )}
                                <CardTitle className="text-lg font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                                  {monthName}
                                </CardTitle>
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                                  {dates.length} day{dates.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          {isMonthExpanded && (
                            <CardContent className="pt-0 space-y-3">
                              {dates.map((date) => {
                                const dayAvail = monthAvailability[date] || { date, available: true };
                                const isDateExpanded = expandedDates.has(date);
                                const activeSlotsCount = (() => {
                                  let count = 0;
                                  if (dayAvail.autoGeneratedSlots) {
                                    count += dayAvail.autoGeneratedSlots.filter(
                                      slot => !dayAvail.excludedSlots?.includes(slot.start)
                                    ).length;
                                  }
                                  if (dayAvail.specificSlots) {
                                    count += (dayAvail.specificSlots.length / 2);
                                  }
                                  return count;
                                })();

                                return (
                                  <div key={date} className="border border-foreground/10 rounded-lg bg-foreground/5">
                                    <div
                                      className="p-3 cursor-pointer hover:bg-foreground/10 transition-colors flex items-center justify-between"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedDates);
                                        if (isDateExpanded) {
                                          newExpanded.delete(date);
                                        } else {
                                          newExpanded.add(date);
                                        }
                                        setExpandedDates(newExpanded);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        {isDateExpanded ? (
                                          <ChevronUp className="h-4 w-4 text-accent" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-foreground/60" />
                                        )}
                                        <Calendar className="h-4 w-4 text-accent" />
                                        <span className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                                          {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        {activeSlotsCount > 0 && (
                                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                                            {activeSlotsCount} slot{activeSlotsCount !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isDateExpanded && (
                                      <div className="p-4 pt-0">
                                        <DayConfigPanel
                                          date={date}
                                          availability={dayAvail}
                                          onUpdate={(updated) => {
                                            setMonthAvailability((prev) => ({
                                              ...prev,
                                              [date]: { ...updated, date },
                                            }));
                                          }}
                                          workHoursStart={formData.workHoursStart}
                                          workHoursEnd={formData.workHoursEnd}
                                          durationMinutes={formData.defaultSlotDurationMinutes}
                                          intervalMinutes={formData.defaultSlotIntervalMinutes}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave} 
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Availability Settings"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


