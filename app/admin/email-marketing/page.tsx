"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import * as React from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Mail, Users, TrendingUp, Send, Eye, MousePointerClick, X, AlertTriangle, Calendar, Zap, AlertCircle, Tag } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "next/navigation";

export default function EmailMarketingPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");
  
  // Update tab when URL param changes
  useEffect(() => {
    if (tabFromUrl && ["overview", "contacts", "campaigns", "journeys", "triggers"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    tags: "",
    source: "",
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const createContact = useMutation(api.emailMarketing.createContact);
  
  // Booking trigger state
  const [bookingCreatedEnabled, setBookingCreatedEnabled] = useState(false);
  const [bookingCreatedCampaignId, setBookingCreatedCampaignId] = useState<string>("");
  const [bookingConfirmedEnabled, setBookingConfirmedEnabled] = useState(false);
  const [bookingConfirmedCampaignId, setBookingConfirmedCampaignId] = useState<string>("");
  const [isSavingTriggers, setIsSavingTriggers] = useState(false);
  const getBookingTriggers = useQuery(
    api.emailMarketing.getBookingTriggers,
    adminEmail ? { email: adminEmail } : "skip"
  );
  const saveBookingTriggers = useMutation(api.emailMarketing.saveBookingTriggers);

  const contacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const journeys = useQuery(
    api.emailMarketing.listJourneys,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  );

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingContact(true);
    try {
      const tagsArray = contactFormData.tags
        ? contactFormData.tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      await createContact({
        adminEmail: adminEmail,
        email: contactFormData.email,
        firstName: contactFormData.firstName || undefined,
        lastName: contactFormData.lastName || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        source: contactFormData.source || "email_marketing",
      });

      toast({
        title: "Contact created",
        description: "The contact has been added successfully.",
      });

      // Reset form and close modal
      setContactFormData({
        email: "",
        firstName: "",
        lastName: "",
        tags: "",
        source: "",
      });
      setIsAddContactModalOpen(false);
    } catch (error) {
      console.error("Error creating contact:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create contact.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Load booking trigger settings
  useEffect(() => {
    if (getBookingTriggers) {
      setBookingCreatedEnabled(!!getBookingTriggers.bookingCreated);
      setBookingCreatedCampaignId(getBookingTriggers.bookingCreated || "");
      setBookingConfirmedEnabled(!!getBookingTriggers.bookingConfirmed);
      setBookingConfirmedCampaignId(getBookingTriggers.bookingConfirmed || "");
    }
  }, [getBookingTriggers]);

  const handleSaveTriggers = async () => {
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTriggers(true);
    try {
      await saveBookingTriggers({
        adminEmail: adminEmail,
        bookingCreatedCampaignId: bookingCreatedEnabled 
          ? (bookingCreatedCampaignId ? (bookingCreatedCampaignId as any) : undefined)
          : null,
        bookingConfirmedCampaignId: bookingConfirmedEnabled 
          ? (bookingConfirmedCampaignId ? (bookingConfirmedCampaignId as any) : undefined)
          : null,
      });

      toast({
        title: "Triggers saved",
        description: "Your booking email triggers have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving triggers:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save triggers.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTriggers(false);
    }
  };

  // Handle loading state
  if (contacts === undefined || campaigns === undefined || journeys === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-foreground/60 mb-4">Loading email marketing data...</p>
            <p className="text-sm text-foreground/40">If this persists, check that Convex dev is running and compiled successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  const contactsList = contacts || [];
  const campaignsList = campaigns || [];
  const journeysList = journeys || [];

  const subscribed = contactsList.filter(c => c.emailMarketingStatus === "subscribed").length;
  const unsubscribed = contactsList.filter(c => c.emailMarketingStatus === "unsubscribed").length;
  const bounced = contactsList.filter(c => c.emailMarketingStatus === "bounced").length;
  const spam = contactsList.filter(c => c.emailMarketingStatus === "spam").length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Email Marketing
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage contacts, send campaigns, track engagement, and automate email journeys.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/email-marketing/campaigns/new">
            <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="font-black uppercase tracking-wider"
            onClick={() => setIsAddContactModalOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="overview" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="contacts" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Contacts
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Campaigns
          </TabsTrigger>
          <TabsTrigger 
            value="journeys" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Journeys
          </TabsTrigger>
          <TabsTrigger 
            value="triggers" 
            className="font-black uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ fontWeight: '900' }}
          >
            Triggers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Total Contacts
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {contactsList.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Subscribed
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {subscribed}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Campaigns
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {campaignsList.length}
                    </p>
                  </div>
                  <Send className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-foreground/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Unsubscribed
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {unsubscribed}
                    </p>
                  </div>
                  <X className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Contacts */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Recent Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactsList.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-foreground/60 mb-2">No contacts yet</p>
                  <Button 
                    variant="outline" 
                    className="font-black uppercase tracking-wider"
                    onClick={() => setIsAddContactModalOpen(true)}
                  >
                    Add First Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactsList.slice(0, 5).map((contact) => (
                    <div key={contact._id} className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg">
                      <div>
                        <p className="font-bold text-foreground">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                            : contact.email}
                        </p>
                        <p className="text-sm text-foreground/60">{contact.email}</p>
                        {contact.source && (
                          <p className="text-xs text-foreground/50 mt-1">
                            Source: {contact.source === "lead" ? "Lead" : contact.source === "email_marketing" ? "Email Marketing" : contact.source === "manual" ? "Manual" : contact.source}
                          </p>
                        )}
                        {contact.tags.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            contact.emailMarketingStatus === "subscribed"
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : contact.emailMarketingStatus === "unsubscribed"
                              ? "bg-red-500/20 text-red-500 border border-red-500/30"
                              : contact.emailMarketingStatus === "bounced"
                              ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                          }`}
                        >
                          {contact.emailMarketingStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link href="/admin/tools/contacts">
                    <Button variant="outline" className="w-full font-black uppercase tracking-wider">
                      View All Contacts
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Campaigns */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Recent Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsList.length === 0 ? (
                <div className="py-8 text-center">
                  <Send className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-foreground/60 mb-2">No campaigns yet</p>
                  <Link href="/admin/email-marketing/campaigns/new">
                    <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                      Create First Campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignsList.slice(0, 5).map((campaign) => (
                    <Link key={campaign._id} href={`/admin/email-marketing/campaigns/${campaign._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div>
                          <p className="font-bold text-foreground">{campaign.name}</p>
                          <p className="text-sm text-foreground/60">{campaign.subject}</p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            campaign.status === "sent"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : campaign.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : "bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link href="/admin/email-marketing/campaigns">
                    <Button variant="outline" className="w-full font-black uppercase tracking-wider">
                      View All Campaigns
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                All Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactsList.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No contacts yet
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    Add contacts to start sending emails
                  </p>
                  <Button 
                    className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                    style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                    onClick={() => setIsAddContactModalOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactsList.map((contact) => (
                    <Link key={contact._id} href={`/admin/email-marketing/contacts/${contact._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-bold text-foreground">
                            {contact.firstName || contact.lastName
                              ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                              : contact.email}
                          </p>
                          <p className="text-sm text-foreground/60">{contact.email}</p>
                        {contact.source && (
                          <p className="text-xs text-foreground/50 mt-1">
                            Source: {contact.source === "lead" ? "Lead" : contact.source === "email_marketing" ? "Email Marketing" : contact.source === "manual" ? "Manual" : contact.source}
                          </p>
                        )}
                          {contact.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {contact.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded mb-2 block ${
                              contact.emailMarketingStatus === "subscribed"
                                ? "bg-accent/20 text-accent border border-accent/30"
                                : contact.emailMarketingStatus === "unsubscribed"
                                ? "bg-red-500/20 text-red-500 border border-red-500/30"
                                : contact.emailMarketingStatus === "bounced"
                                ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                            }`}
                          >
                            {contact.emailMarketingStatus}
                          </span>
                          <p className="text-xs text-foreground/50">
                            {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                All Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsList.length === 0 ? (
                <div className="py-16 text-center">
                  <Send className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No campaigns yet
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    Create a campaign to send emails to your contacts
                  </p>
                  <Link href="/admin/email-marketing/campaigns/new">
                    <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Campaign
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignsList.map((campaign) => (
                    <Link key={campaign._id} href={`/admin/email-marketing/campaigns/${campaign._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div>
                          <p className="font-bold text-foreground">{campaign.name}</p>
                          <p className="text-sm text-foreground/60">{campaign.subject}</p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            campaign.status === "sent"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : campaign.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : "bg-accent/20 text-accent border border-accent/30"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Email Journeys
                  </CardTitle>
                  <CardDescription>
                    Automate email sequences based on triggers and conditions
                  </CardDescription>
                </div>
                <Button
                  onClick={() => window.location.href = "/admin/email-marketing/journeys/new"}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Journey
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {journeysList.length === 0 ? (
                <div className="py-16 text-center">
                  <TrendingUp className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No journeys yet
                  </p>
                  <p className="text-sm text-foreground/70 mb-6">
                    Create a journey to automate email sequences based on triggers
                  </p>
                  <Button
                    onClick={() => window.location.href = "/admin/email-marketing/journeys/new"}
                    className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                    style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Journey
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {journeysList.map((journey) => (
                    <Link key={journey._id} href={`/admin/email-marketing/journeys/${journey._id}`}>
                      <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg hover:border-accent/50 hover:bg-foreground/5 transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-bold text-foreground">{journey.name}</p>
                          {journey.description && (
                            <p className="text-sm text-foreground/60 mt-1">{journey.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-foreground/50">
                              {journey.steps.length} step{journey.steps.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-foreground/50">
                              Trigger: {journey.entryTrigger.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            journey.status === "active"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : journey.status === "draft"
                              ? "bg-foreground/20 text-foreground border border-foreground/30"
                              : journey.status === "paused"
                              ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                              : "bg-foreground/10 text-foreground/60 border border-foreground/20"
                          }`}
                        >
                          {journey.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          {/* Available Triggers Overview */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Available Triggers
              </CardTitle>
              <CardDescription>
                Configure automated emails based on events. Use these triggers in journeys for advanced automation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Manual Enrollment */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Manual Enrollment</p>
                  </div>
                  <p className="text-xs text-foreground/60">Manually add contacts to journeys</p>
                </div>

                {/* Tag Added */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Tag Added</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a tag is added to a contact</p>
                </div>

                {/* Campaign Opened */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Campaign Opened</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a contact opens a campaign</p>
                </div>

                {/* Campaign Clicked */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Campaign Clicked</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a contact clicks a campaign link</p>
                </div>

                {/* Contact Created */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Contact Created</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a new contact is created</p>
                </div>

                {/* Booking Created */}
                <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Booking Created</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a booking is created (configurable below)</p>
                </div>

                {/* Booking Confirmed */}
                <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Booking Confirmed</p>
                  </div>
                  <p className="text-xs text-foreground/60">When a booking is confirmed (configurable below)</p>
                </div>

                {/* Custom Trigger */}
                <div className="p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider text-foreground">Custom Trigger</p>
                  </div>
                  <p className="text-xs text-foreground/60">Custom event-based triggers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Triggers Section */}
          <Card className="border border-foreground/20 group relative overflow-hidden hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-gradient-to-br from-background to-foreground/5">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                  <Calendar className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Booking Email Triggers
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Configure automated emails when bookings are created or confirmed
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              {/* Booking Created Trigger */}
              <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                      When Booking is Created
                    </h3>
                    <p className="text-sm text-foreground/60">
                      Automatically send an email campaign when someone books a time slot
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
                          {campaignsList
                            .filter(c => c.status === "draft" || c.status === "sent")
                            .map(campaign => (
                              <SelectItem key={campaign._id} value={campaign._id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
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
                          {campaignsList
                            .filter(c => c.status === "draft" || c.status === "sent")
                            .map(campaign => (
                              <SelectItem key={campaign._id} value={campaign._id}>
                                {campaign.name}
                              </SelectItem>
                            ))}
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
                onClick={handleSaveTriggers}
                disabled={isSavingTriggers}
                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSavingTriggers ? "Saving..." : "Save Trigger Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Active Triggers List */}
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
              {bookingCreatedEnabled || bookingConfirmedEnabled ? (
                <div className="space-y-3">
                  {bookingCreatedEnabled && bookingCreatedCampaignId && (
                    <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-bold text-foreground">Booking Created</p>
                          <p className="text-sm text-foreground/60">
                            {campaignsList.find(c => c._id === bookingCreatedCampaignId)?.name || "Campaign not found"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-green-500/20 text-green-500 border border-green-500/30">
                        Active
                      </span>
                    </div>
                  )}
                  {bookingConfirmedEnabled && bookingConfirmedCampaignId && (
                    <div className="flex items-center justify-between p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-bold text-foreground">Booking Confirmed</p>
                          <p className="text-sm text-foreground/60">
                            {campaignsList.find(c => c._id === bookingConfirmedCampaignId)?.name || "Campaign not found"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded bg-green-500/20 text-green-500 border border-green-500/30">
                        Active
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Zap className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="font-bold uppercase tracking-wider mb-2">No active triggers</p>
                  <p className="text-sm text-foreground/60">
                    Enable triggers above to automatically send emails on booking events
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Triggers Info */}
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Using Triggers in Journeys
              </CardTitle>
              <CardDescription>
                Create automated email sequences using any of these triggers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  All trigger types can be used in <strong>Email Journeys</strong> to create sophisticated automated email sequences. 
                  While booking triggers can be configured here for simple one-off emails, journeys allow you to combine multiple steps, 
                  delays, and conditions for advanced automation.
                </p>
                <Link href="/admin/email-marketing/journeys/new">
                  <Button
                    variant="outline"
                    className="font-black uppercase tracking-wider w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Journey
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Modal */}
      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Add New Contact
            </DialogTitle>
            <DialogDescription className="text-base text-foreground/70">
              Add a new contact to your email marketing list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-6 mt-4">
            <div>
              <Label htmlFor="modal-email" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Email Address <span className="text-accent">*</span>
              </Label>
              <Input
                id="modal-email"
                type="email"
                value={contactFormData.email}
                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                required
                className="font-medium"
                placeholder="contact@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-firstName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  First Name
                </Label>
                <Input
                  id="modal-firstName"
                  value={contactFormData.firstName}
                  onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                  className="font-medium"
                  placeholder="John"
                />
              </div>

              <div>
                <Label htmlFor="modal-lastName" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                  Last Name
                </Label>
                <Input
                  id="modal-lastName"
                  value={contactFormData.lastName}
                  onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                  className="font-medium"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="modal-tags" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Tags
              </Label>
              <Input
                id="modal-tags"
                value={contactFormData.tags}
                onChange={(e) => setContactFormData({ ...contactFormData, tags: e.target.value })}
                className="font-medium"
                placeholder="customer, vip, newsletter (comma-separated)"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Separate multiple tags with commas
              </p>
            </div>

            <div>
              <Label htmlFor="modal-source" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                Source
              </Label>
              <Input
                id="modal-source"
                value={contactFormData.source}
                onChange={(e) => setContactFormData({ ...contactFormData, source: e.target.value })}
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
                disabled={isSubmittingContact}
                className="flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isSubmittingContact ? "Creating..." : "Create Contact"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddContactModalOpen(false)}
                className="font-black uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

