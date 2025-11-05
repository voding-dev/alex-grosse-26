"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Plus, Mail, Users, TrendingUp, Send, Eye, MousePointerClick, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function EmailMarketingPage() {
  const { adminEmail } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const contacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? {} : ("skip" as const)
  );

  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? {} : ("skip" as const)
  );

  // Handle loading state
  if (contacts === undefined || campaigns === undefined) {
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

  const subscribed = contactsList.filter(c => c.status === "subscribed").length;
  const unsubscribed = contactsList.filter(c => c.status === "unsubscribed").length;
  const bounced = contactsList.filter(c => c.status === "bounced").length;
  const spam = contactsList.filter(c => c.status === "spam").length;

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
          <Link href="/admin/email-marketing/contacts/new">
            <Button variant="outline" className="font-black uppercase tracking-wider">
              <Users className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="journeys">Journeys</TabsTrigger>
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
                  <Link href="/admin/email-marketing/contacts/new">
                    <Button variant="outline" className="font-black uppercase tracking-wider">
                      Add First Contact
                    </Button>
                  </Link>
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
                            contact.status === "subscribed"
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : contact.status === "unsubscribed"
                              ? "bg-red-500/20 text-red-500 border border-red-500/30"
                              : contact.status === "bounced"
                              ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                          }`}
                        >
                          {contact.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link href="/admin/email-marketing/contacts">
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
                  <Link href="/admin/email-marketing/contacts/new">
                    <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                  </Link>
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
                              contact.status === "subscribed"
                                ? "bg-accent/20 text-accent border border-accent/30"
                                : contact.status === "unsubscribed"
                                ? "bg-red-500/20 text-red-500 border border-red-500/30"
                                : contact.status === "bounced"
                                ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                                : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                            }`}
                          >
                            {contact.status}
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
              <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Email Journeys
              </CardTitle>
              <CardDescription>
                Automate email sequences based on triggers and conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-16 text-center">
                <TrendingUp className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                  Coming Soon
                </p>
                <p className="text-sm text-foreground/70">
                  Journey automation will be available soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

