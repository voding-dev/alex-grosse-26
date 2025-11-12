"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Zap, Mail, Users, Tag, Calendar, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function TriggersPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const saveBookingTriggers = useMutation(api.emailMarketing.saveBookingTriggers);
  const getBookingTriggers = useQuery(
    api.emailMarketing.getBookingTriggers,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const journeys = useQuery(
    api.emailMarketing.listJourneys,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const [bookingCreatedEnabled, setBookingCreatedEnabled] = useState(false);
  const [bookingCreatedCampaignId, setBookingCreatedCampaignId] = useState<string>("");
  const [bookingConfirmedEnabled, setBookingConfirmedEnabled] = useState(false);
  const [bookingConfirmedCampaignId, setBookingConfirmedCampaignId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Load existing trigger settings
  useEffect(() => {
    if (getBookingTriggers) {
      setBookingCreatedEnabled(!!getBookingTriggers.bookingCreated);
      setBookingCreatedCampaignId(getBookingTriggers.bookingCreated || "");
      setBookingConfirmedEnabled(!!getBookingTriggers.bookingConfirmed);
      setBookingConfirmedCampaignId(getBookingTriggers.bookingConfirmed || "");
    }
  }, [getBookingTriggers]);

  const handleSave = async () => {
    if (!adminEmail) return;

    if (bookingCreatedEnabled && !bookingCreatedCampaignId) {
      toast({
        title: "Error",
        description: "Please select a campaign for booking created trigger.",
        variant: "destructive",
      });
      return;
    }

    if (bookingConfirmedEnabled && !bookingConfirmedCampaignId) {
      toast({
        title: "Error",
        description: "Please select a campaign for booking confirmed trigger.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveBookingTriggers({
        adminEmail,
        bookingCreatedCampaignId: bookingCreatedEnabled && bookingCreatedCampaignId ? (bookingCreatedCampaignId as any) : (null as any),
        bookingConfirmedCampaignId: bookingConfirmedEnabled && bookingConfirmedCampaignId ? (bookingConfirmedCampaignId as any) : (null as any),
      });

      toast({
        title: "Triggers saved",
        description: "Your trigger settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save triggers.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const availableCampaigns = campaigns.filter(c => c.status === "draft" || c.status === "sent");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Email Triggers
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Automate emails based on events and actions
          </p>
        </div>
        <Link href="/admin/email-marketing?tab=triggers">
          <Button variant="outline" className="font-black uppercase tracking-wider">
            Back to Email Marketing
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Booking Triggers */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Triggers
              </div>
            </CardTitle>
            <CardDescription>
              Automatically send emails when bookings are created or confirmed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Booking Created Trigger */}
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                    When Booking is Created
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Send an email immediately when a new booking is created
                  </p>
                </div>
                <Checkbox
                  id="bookingCreatedEnabled"
                  checked={bookingCreatedEnabled}
                  onCheckedChange={(checked) => setBookingCreatedEnabled(checked === true)}
                />
              </div>
              {bookingCreatedEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="bookingCreatedCampaign" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Select Campaign
                    </Label>
                    <Select
                      value={bookingCreatedCampaignId}
                      onValueChange={setBookingCreatedCampaignId}
                    >
                      <SelectTrigger id="bookingCreatedCampaign" className="h-11">
                        <SelectValue placeholder="Choose a campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCampaigns.length === 0 ? (
                          <div className="p-4 text-center text-sm text-foreground/60">
                            No campaigns available. <Link href="/admin/email-marketing/campaigns/new" className="text-accent hover:underline">Create one</Link>
                          </div>
                        ) : (
                          availableCampaigns.map(campaign => (
                            <SelectItem key={campaign._id} value={campaign._id}>
                              {campaign.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <AlertCircle className="h-4 w-4" />
                    <span>This campaign will be sent immediately when a booking is created</span>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Confirmed Trigger */}
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                    When Booking is Confirmed
                  </h3>
                  <p className="text-sm text-foreground/60">
                    Send a follow-up email after booking confirmation
                  </p>
                </div>
                <Checkbox
                  id="bookingConfirmedEnabled"
                  checked={bookingConfirmedEnabled}
                  onCheckedChange={(checked) => setBookingConfirmedEnabled(checked === true)}
                />
              </div>
              {bookingConfirmedEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="bookingConfirmedCampaign" className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Select Campaign
                    </Label>
                    <Select
                      value={bookingConfirmedCampaignId}
                      onValueChange={setBookingConfirmedCampaignId}
                    >
                      <SelectTrigger id="bookingConfirmedCampaign" className="h-11">
                        <SelectValue placeholder="Choose a campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCampaigns.length === 0 ? (
                          <div className="p-4 text-center text-sm text-foreground/60">
                            No campaigns available. <Link href="/admin/email-marketing/campaigns/new" className="text-accent hover:underline">Create one</Link>
                          </div>
                        ) : (
                          availableCampaigns.map(campaign => (
                            <SelectItem key={campaign._id} value={campaign._id}>
                              {campaign.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <AlertCircle className="h-4 w-4" />
                    <span>This campaign will be sent after booking confirmation</span>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              {isSaving ? "Saving..." : "Save Trigger Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Journey-Based Triggers Info */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Journey-Based Triggers
              </div>
            </CardTitle>
            <CardDescription>
              Create automated email journeys that trigger based on events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-foreground/70">
                Journeys can be triggered by:
              </p>
              <ul className="space-y-2 text-sm text-foreground/60 list-disc list-inside">
                <li>Manual enrollment</li>
                <li>Tag added to contact</li>
                <li>Campaign opened</li>
                <li>Campaign clicked</li>
                <li>Contact created</li>
                <li>Booking created</li>
                <li>Booking confirmed</li>
              </ul>
              <div className="pt-4">
                <Link href="/admin/email-marketing/journeys">
                  <Button variant="outline" className="font-black uppercase tracking-wider">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    View All Journeys
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Triggers Summary */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Active Triggers
            </CardTitle>
            <CardDescription>
              Triggers that are currently active and will send emails automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingCreatedEnabled || bookingConfirmedEnabled || journeys.filter(j => j.status === "active").length > 0 ? (
              <div className="space-y-3">
                {bookingCreatedEnabled && bookingCreatedCampaignId && (
                  <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-bold text-foreground">Booking Created</p>
                        <p className="text-sm text-foreground/60">
                          Campaign: {availableCampaigns.find(c => c._id === bookingCreatedCampaignId)?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/email-marketing/campaigns/${bookingCreatedCampaignId}`}>
                      <Button variant="ghost" size="sm" className="font-black uppercase tracking-wider text-xs">
                        View Campaign →
                      </Button>
                    </Link>
                  </div>
                )}
                {bookingConfirmedEnabled && bookingConfirmedCampaignId && (
                  <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-bold text-foreground">Booking Confirmed</p>
                        <p className="text-sm text-foreground/60">
                          Campaign: {availableCampaigns.find(c => c._id === bookingConfirmedCampaignId)?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/email-marketing/campaigns/${bookingConfirmedCampaignId}`}>
                      <Button variant="ghost" size="sm" className="font-black uppercase tracking-wider text-xs">
                        View Campaign →
                      </Button>
                    </Link>
                  </div>
                )}
                {journeys.filter(j => j.status === "active").map(journey => (
                  <div key={journey._id} className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-bold text-foreground">{journey.name}</p>
                        <p className="text-sm text-foreground/60">
                          Journey: {journey.entryTrigger.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <Link href={`/admin/email-marketing/journeys/${journey._id}`}>
                      <Button variant="ghost" size="sm" className="font-black uppercase tracking-wider text-xs">
                        View Journey →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
                <p className="text-foreground/60 mb-2">No active triggers</p>
                <p className="text-sm text-foreground/50">
                  Enable triggers above or create active journeys to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

