"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Send, TrendingUp, Eye, MousePointerClick, Mail, X, AlertTriangle, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const campaign = useQuery(
    api.emailMarketing.getCampaign,
    adminEmail ? { id: id as any, email: adminEmail } : ("skip" as const)
  );

  const analytics = useQuery(
    api.emailMarketing.getCampaignAnalytics,
    adminEmail ? { campaignId: id as any, email: adminEmail } : ("skip" as const)
  );

  const sendCampaign = useMutation(api.emailMarketing.sendCampaign);
  const [isSending, setIsSending] = useState(false);

  if (!campaign) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-foreground/60">Loading campaign...</p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!adminEmail) return;
    
    if (!confirm(`Are you sure you want to send this campaign to all subscribed contacts?`)) {
      return;
    }

    setIsSending(true);
    try {
      await sendCampaign({
        campaignId: campaign._id,
        adminEmail: adminEmail,
      });
      toast({
        title: "Campaign sent",
        description: "The campaign has been sent successfully.",
      });
      router.push("/admin/email-marketing");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send campaign.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <Link
            href="/admin/email-marketing"
            className="text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground mb-4 inline-block"
          >
            ← Back to Email Marketing
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            {campaign.name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/email-marketing/campaigns/edit/${campaign._id}`}>
            <Button
              variant="outline"
              className="font-black uppercase tracking-wider"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {campaign.status === "draft" && (
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Campaign"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Campaign Info */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Campaign Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Subject
              </p>
              <p className="text-lg font-bold text-foreground">{campaign.subject}</p>
            </div>
            {(campaign.fromName || campaign.fromEmail) && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  From
                </p>
                <p className="text-foreground">
                  {campaign.fromName || "Ian Courtright"} {campaign.fromEmail ? `<${campaign.fromEmail}>` : ""}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">
                Status
              </p>
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded inline-block ${
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
            {campaign.tags.length > 0 && (
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {campaign.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-4 border-t border-foreground/10 space-y-1 text-xs text-foreground/50">
              <div>Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}</div>
              {campaign.sentAt && (
                <div>Sent {formatDistanceToNow(new Date(campaign.sentAt), { addSuffix: true })}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Campaign Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analytics ? (
              <div className="py-8 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                <p className="text-foreground/60">No analytics data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Send className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Total
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.total}
                    </p>
                  </div>
                  <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-accent" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Opens
                      </p>
                    </div>
                    <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                      {analytics.opened}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.openRate.toFixed(1)}% open rate
                    </p>
                  </div>
                  <div className="p-4 border border-accent/30 rounded-lg bg-accent/5">
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointerClick className="h-4 w-4 text-accent" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Clicks
                      </p>
                    </div>
                    <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                      {analytics.clicked}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.clickRate.toFixed(1)}% click rate
                    </p>
                  </div>
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Delivered
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.delivered}
                    </p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {analytics.deliveryRate.toFixed(1)}% delivery rate
                    </p>
                  </div>
                </div>

                {(analytics.bounced > 0 || analytics.unsubscribed > 0 || analytics.spam > 0) && (
                  <div className="pt-4 border-t border-foreground/10 space-y-2">
                    {analytics.bounced > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Bounced
                          </span>
                        </div>
                        <span className="font-black text-orange-500">{analytics.bounced}</span>
                      </div>
                    )}
                    {analytics.unsubscribed > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4 text-red-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Unsubscribed
                          </span>
                        </div>
                        <span className="font-black text-red-500">{analytics.unsubscribed}</span>
                      </div>
                    )}
                    {analytics.spam > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold uppercase tracking-wider text-foreground/60">
                            Marked as Spam
                          </span>
                        </div>
                        <span className="font-black text-yellow-500">{analytics.spam}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Content Preview */}
      <Card className="mt-6 border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Email Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-foreground/10 rounded-lg p-6 bg-foreground/5">
            {campaign.htmlContent && campaign.htmlContent.trim() ? (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
              />
            ) : campaign.textContent && campaign.textContent.trim() ? (
              <div className="whitespace-pre-wrap text-sm text-foreground font-mono">
                {campaign.textContent}
              </div>
            ) : (
              <div className="text-center text-foreground/40 py-8">
                <p>No content available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

