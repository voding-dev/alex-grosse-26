"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Plus, TrendingUp, Play, Pause, Archive, Users, Mail, Eye, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function JourneysPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();

  const journeys = useQuery(
    api.emailMarketing.listJourneys,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const activateJourney = useMutation(api.emailMarketing.activateJourney);
  const pauseJourney = useMutation(api.emailMarketing.pauseJourney);
  const deleteJourney = useMutation(api.emailMarketing.deleteJourney);

  const handleActivate = async (journeyId: string) => {
    if (!adminEmail) return;
    try {
      await activateJourney({ journeyId: journeyId as any, adminEmail });
      // Journey will update via query
    } catch (error) {
      console.error("Error activating journey:", error);
    }
  };

  const handlePause = async (journeyId: string) => {
    if (!adminEmail) return;
    try {
      await pauseJourney({ journeyId: journeyId as any, adminEmail });
      // Journey will update via query
    } catch (error) {
      console.error("Error pausing journey:", error);
    }
  };

  const handleDelete = async (journeyId: string) => {
    if (!adminEmail) return;
    try {
      await deleteJourney({ journeyId: journeyId as any, adminEmail });
      router.push("/admin/email-marketing?tab=journeys");
    } catch (error) {
      console.error("Error deleting journey:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded";
    switch (status) {
      case "active":
        return `${baseClasses} bg-green-500/20 text-green-500 border border-green-500/30`;
      case "paused":
        return `${baseClasses} bg-yellow-500/20 text-yellow-500 border border-yellow-500/30`;
      case "draft":
        return `${baseClasses} bg-foreground/10 text-foreground/60 border border-foreground/20`;
      case "archived":
        return `${baseClasses} bg-foreground/5 text-foreground/40 border border-foreground/10`;
      default:
        return `${baseClasses} bg-foreground/10 text-foreground/60 border border-foreground/20`;
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      manual: "Manual Enrollment",
      tag_added: "Tag Added",
      campaign_opened: "Campaign Opened",
      campaign_clicked: "Campaign Clicked",
      contact_created: "Contact Created",
      booking_created: "Booking Created",
      booking_confirmed: "Booking Confirmed",
      custom: "Custom Trigger",
    };
    return labels[trigger] || trigger;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Email Journeys
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Automated email sequences that engage contacts over time
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/email-marketing/journeys/new">
            <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              New Journey
            </Button>
          </Link>
          <Link href="/admin/email-marketing?tab=journeys">
            <Button variant="outline" className="font-black uppercase tracking-wider">
              Back to Email Marketing
            </Button>
          </Link>
        </div>
      </div>

      {/* Journeys List */}
      {journeys.length === 0 ? (
        <Card className="border border-foreground/20">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900' }}>
              No Journeys Yet
            </h3>
            <p className="text-foreground/60 mb-6">
              Create your first email journey to automate your email marketing
            </p>
            <Link href="/admin/email-marketing/journeys/new">
              <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Journey
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {journeys.map((journey) => (
            <Card key={journey._id} className="border border-foreground/20 hover:border-foreground/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900' }}>
                      <Link
                        href={`/admin/email-marketing/journeys/${journey._id}`}
                        className="hover:text-accent transition-colors"
                      >
                        {journey.name}
                      </Link>
                    </CardTitle>
                    {journey.description && (
                      <p className="text-sm text-foreground/60 mb-3">
                        {journey.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={getStatusBadge(journey.status)}>
                        {journey.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded">
                        {getTriggerLabel(journey.entryTrigger)}
                      </span>
                      <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-foreground/10 text-foreground/70 rounded">
                        {journey.steps.length} step{journey.steps.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Journey Steps Preview */}
                  {journey.steps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Steps
                      </p>
                      <div className="space-y-1">
                        {journey.steps.slice(0, 3).map((step: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-foreground/70">
                            <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold">
                              {step.stepNumber}
                            </span>
                            <span className="flex-1">
                              {step.delayDays === 0 ? "Immediately" : `After ${step.delayDays} day${step.delayDays !== 1 ? "s" : ""}`}
                            </span>
                            {step.condition && step.condition !== "always" && (
                              <span className="text-xs text-foreground/50">
                                ({step.condition})
                              </span>
                            )}
                          </div>
                        ))}
                        {journey.steps.length > 3 && (
                          <p className="text-xs text-foreground/50 ml-8">
                            +{journey.steps.length - 3} more step{journey.steps.length - 3 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-foreground/50 pt-2 border-t border-foreground/10">
                    <span>
                      Created {formatDistanceToNow(new Date(journey.createdAt), { addSuffix: true })}
                    </span>
                    <Link
                      href={`/admin/email-marketing/journeys/${journey._id}`}
                      className="text-accent hover:underline font-bold uppercase tracking-wider"
                    >
                      View Details →
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {journey.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(journey._id)}
                        className="font-black uppercase tracking-wider text-xs"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Activate
                      </Button>
                    )}
                    {journey.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePause(journey._id)}
                        className="font-black uppercase tracking-wider text-xs"
                      >
                        <Pause className="mr-1 h-3 w-3" />
                        Pause
                      </Button>
                    )}
                    {journey.status === "paused" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(journey._id)}
                        className="font-black uppercase tracking-wider text-xs"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Resume
                      </Button>
                    )}
                    <Link href={`/admin/email-marketing/journeys/${journey._id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-black uppercase tracking-wider text-xs"
                      >
                        <Mail className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-black uppercase tracking-wider text-xs text-red-500 hover:text-red-600"
                        >
                          <Archive className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
                            Delete Journey
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{journey.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="font-black uppercase tracking-wider">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(journey._id)}
                            className="font-black uppercase tracking-wider bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


