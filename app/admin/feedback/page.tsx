"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  const { adminEmail } = useAdminAuth();

  // Safely check if feedback function exists before calling
  const feedbackQuery = (api.feedback as any)?.getRecentFeedback;
  const recentFeedback = useQuery(
    feedbackQuery,
    adminEmail && feedbackQuery ? { email: adminEmail, limit: 100 } : ("skip" as const)
  );

  // Safely handle feedback data
  const feedbackArray = Array.isArray(recentFeedback) ? recentFeedback : [];

  // Group feedback by delivery
  const feedbackByDelivery = feedbackArray.reduce((acc: Record<string, any[]>, fb: any) => {
    const deliveryId = fb.deliveryId;
    if (!acc[deliveryId]) {
      acc[deliveryId] = [];
    }
    acc[deliveryId].push(fb);
    return acc;
  }, {});

  const deliveryIds = Object.keys(feedbackByDelivery);

  const getDecisionBadge = (decision: string | null) => {
    if (!decision) return null;
    
    switch (decision) {
      case "approve":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>;
      case "reject":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
      case "changes":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Changes</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Client Feedback
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          View and manage all client feedback from delivery portals. Feedback is organized by delivery portal and linked to specific projects.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 sm:mb-12 border border-accent/30 bg-accent/5">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Feedback</strong> is collected from your delivery portals. Clients can leave feedback on specific assets 
            or provide general project feedback. Each feedback item is linked to a delivery portal, which you can access from the 
            <Link href="/admin/deliveries" className="text-accent hover:text-accent/80 hover:underline mx-1 font-bold">Deliveries</Link>
            section.
          </p>
        </CardContent>
      </Card>

      {feedbackArray.length === 0 ? (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <MessageSquare className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No feedback yet.
            </p>
            <p className="mb-8 text-sm text-foreground/70">
              {!feedbackQuery ? "Feedback functions are being deployed. Please wait for Convex to finish syncing." : "Client feedback will appear here when they comment on deliveries"}
            </p>
            <Link href="/admin/deliveries" className="inline-block">
              <Button variant="outline" className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors">
                View Deliveries
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {deliveryIds.map((deliveryId) => {
            const feedbackItems = feedbackByDelivery[deliveryId];
            const firstItem = feedbackItems[0];
            const delivery = firstItem.delivery;
            const project = firstItem.project;

            return (
              <Card key={deliveryId} className="border border-foreground/20 hover:border-accent/50 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <Link 
                          href={`/dl/${delivery?.slug || ''}`} 
                          target="_blank"
                          className="text-lg sm:text-xl font-black uppercase tracking-wider hover:text-accent transition-colors break-all"
                          style={{ fontWeight: '900' }}
                        >
                          /dl/{delivery?.slug || 'Unknown'}
                        </Link>
                        <Link href={`/dl/${delivery?.slug || ''}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base text-foreground/70 break-words">
                        {project?.title || 'Unknown Project'} • {project?.clientName || 'Unknown Client'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className="font-bold uppercase tracking-wider text-xs">{feedbackItems.length} feedback {feedbackItems.length === 1 ? 'item' : 'items'}</Badge>
                      <Link href="/admin/deliveries" className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors">
                          View Delivery
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedbackItems.map((fb: any) => (
                    <div 
                      key={fb._id} 
                      className="rounded-md border border-foreground/10 bg-foreground/5 p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            {fb.decision && getDecisionBadge(fb.decision)}
                            {fb.assetId ? (
                              <Badge variant="outline" className="text-xs">
                                Per-asset feedback
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Project feedback
                              </Badge>
                            )}
                            <span className="text-xs text-foreground/60">
                              {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{fb.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
