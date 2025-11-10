"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, Users, CheckCircle, XCircle, Pause, Play, Trash2, Edit, ArrowRight, Calendar, Zap, Mail, Eye, MousePointerClick, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
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

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const id = params.id as string;

  const journey = useQuery(
    api.emailMarketing.getJourney,
    adminEmail ? { journeyId: id as any, email: adminEmail } : ("skip" as const)
  );

  const analytics = useQuery(
    api.emailMarketing.getJourneyAnalytics,
    adminEmail ? { journeyId: id as any, email: adminEmail } : ("skip" as const)
  );

  const participants = useQuery(
    api.emailMarketing.getJourneyParticipants,
    adminEmail ? { journeyId: id as any, email: adminEmail } : ("skip" as const)
  ) || [];

  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const activateJourney = useMutation(api.emailMarketing.activateJourney);
  const pauseJourney = useMutation(api.emailMarketing.pauseJourney);
  const deleteJourney = useMutation(api.emailMarketing.deleteJourney);

  const [isActivating, setIsActivating] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!journey) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-foreground/60">Loading journey...</p>
        </div>
      </div>
    );
  }

  const handleActivate = async () => {
    if (!adminEmail) return;
    
    setIsActivating(true);
    try {
      await activateJourney({
        journeyId: journey._id,
        adminEmail: adminEmail,
      });
      toast({
        title: "Journey activated",
        description: "The journey has been activated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to activate journey.",
        variant: "destructive",
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handlePause = async () => {
    if (!adminEmail) return;
    
    setIsPausing(true);
    try {
      await pauseJourney({
        journeyId: journey._id,
        adminEmail: adminEmail,
      });
      toast({
        title: "Journey paused",
        description: "The journey has been paused successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pause journey.",
        variant: "destructive",
      });
    } finally {
      setIsPausing(false);
    }
  };

  const handleDelete = async () => {
    if (!adminEmail) return;
    
    setIsDeleting(true);
    try {
      await deleteJourney({
        journeyId: journey._id,
        adminEmail: adminEmail,
        hardDelete: false,
      });
      toast({
        title: "Journey deleted",
        description: "The journey has been archived successfully.",
      });
      router.push("/admin/email-marketing");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete journey.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find(c => c._id === campaignId);
    return campaign?.name || "Unknown Campaign";
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            {journey.name}
          </h1>
          {journey.description && (
            <p className="text-foreground/70 mb-4">{journey.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {journey.status === "draft" && (
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Play className="mr-2 h-4 w-4" />
              {isActivating ? "Activating..." : "Activate Journey"}
            </Button>
          )}
          {journey.status === "active" && (
            <Button
              onClick={handlePause}
              disabled={isPausing}
              variant="outline"
              className="font-black uppercase tracking-wider"
            >
              <Pause className="mr-2 h-4 w-4" />
              {isPausing ? "Pausing..." : "Pause Journey"}
            </Button>
          )}
          {journey.status === "paused" && (
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Play className="mr-2 h-4 w-4" />
              {isActivating ? "Activating..." : "Resume Journey"}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="font-black uppercase tracking-wider text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Journey</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to archive this journey? This will stop new enrollments but existing participants will continue through the journey.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Journey Info */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Journey Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Status
              </p>
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded inline-block ${
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
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Entry Trigger
              </p>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <p className="text-sm font-bold text-foreground capitalize">
                  {journey.entryTrigger.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                Steps
              </p>
              <p className="text-lg font-black text-foreground" style={{ fontWeight: '900' }}>
                {journey.steps.length}
              </p>
            </div>
            <div className="pt-4 border-t border-foreground/10 space-y-1 text-xs text-foreground/50">
              <div>Created {formatDistanceToNow(new Date(journey.createdAt), { addSuffix: true })}</div>
              <div>Updated {formatDistanceToNow(new Date(journey.updatedAt), { addSuffix: true })}</div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Analytics
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
                      <Users className="h-4 w-4 text-foreground/40" />
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
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Completed
                      </p>
                    </div>
                    <p className="text-2xl font-black text-accent" style={{ fontWeight: '900' }}>
                      {analytics.completed}
                    </p>
                    {analytics.total > 0 && (
                      <p className="text-xs text-foreground/60 mt-1">
                        {analytics.completionRate.toFixed(1)}% completion rate
                      </p>
                    )}
                  </div>
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Active
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.active}
                    </p>
                  </div>
                  <div className="p-4 border border-foreground/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-foreground/40" />
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                        Exited
                      </p>
                    </div>
                    <p className="text-2xl font-black text-foreground" style={{ fontWeight: '900' }}>
                      {analytics.exited}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Summary */}
        <Card className="border border-foreground/20">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-foreground/10 rounded-lg">
                <p className="text-2xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                  {participants.length}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                  Total Participants
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 border border-foreground/10 rounded">
                  <p className="font-bold text-foreground">{participants.filter(p => p.status === "active").length}</p>
                  <p className="text-foreground/60">Active</p>
                </div>
                <div className="p-2 border border-foreground/10 rounded">
                  <p className="font-bold text-foreground">{participants.filter(p => p.status === "completed").length}</p>
                  <p className="text-foreground/60">Completed</p>
                </div>
                <div className="p-2 border border-foreground/10 rounded">
                  <p className="font-bold text-foreground">{participants.filter(p => p.status === "paused").length}</p>
                  <p className="text-foreground/60">Paused</p>
                </div>
                <div className="p-2 border border-foreground/10 rounded">
                  <p className="font-bold text-foreground">{participants.filter(p => p.status === "exited").length}</p>
                  <p className="text-foreground/60">Exited</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Steps Flow */}
      <Card className="mb-6 border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Journey Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journey.steps.length === 0 ? (
              <div className="py-8 text-center text-foreground/60">
                <p>No steps configured</p>
              </div>
            ) : (
              <div className="space-y-4">
                {journey.steps.map((step, index) => {
                  const campaign = campaigns.find(c => c._id === step.campaignId);
                  const stepAnalytics = analytics?.stepAnalytics?.[index];
                  
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/20 text-accent font-black text-sm">
                          {index + 1}
                        </div>
                        {index < journey.steps.length - 1 && (
                          <div className="w-0.5 h-12 bg-foreground/20 my-2" />
                        )}
                      </div>
                      <div className="flex-1 p-4 border border-foreground/20 rounded-lg bg-foreground/5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-foreground mb-1">
                              {campaign?.name || "Unknown Campaign"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-foreground/60">
                              {step.delayDays > 0 && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{step.delayDays} day{step.delayDays !== 1 ? "s" : ""} delay</span>
                                </div>
                              )}
                              {step.condition && step.condition !== "always" && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span className="capitalize">{step.condition.replace(/_/g, " ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {stepAnalytics && (
                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-center">
                                <p className="font-bold text-foreground">{stepAnalytics.sent}</p>
                                <p className="text-foreground/60">Sent</p>
                              </div>
                              <div className="text-center">
                                <p className="font-bold text-accent">{stepAnalytics.opened}</p>
                                <p className="text-foreground/60">Opened</p>
                              </div>
                              <div className="text-center">
                                <p className="font-bold text-accent">{stepAnalytics.clicked}</p>
                                <p className="text-foreground/60">Clicked</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {campaign && (
                          <Link
                            href={`/admin/email-marketing/campaigns/${campaign._id}`}
                            className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent/80 inline-flex items-center gap-1"
                          >
                            View Campaign
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="py-12 text-center text-foreground/60">
              <Users className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
              <p>No participants yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-foreground/10">
                <thead className="bg-foreground/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Current Step</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Entered</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Next Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {participants.map((participant) => (
                    <tr key={participant._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {participant.contact?.email || "Unknown"}
                        </div>
                        {participant.contact?.firstName || participant.contact?.lastName ? (
                          <div className="text-xs text-foreground/60">
                            {[participant.contact?.firstName, participant.contact?.lastName].filter(Boolean).join(" ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            participant.status === "active"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : participant.status === "completed"
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : participant.status === "paused"
                              ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                              : "bg-foreground/10 text-foreground/60 border border-foreground/20"
                          }`}
                        >
                          {participant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                        Step {participant.currentStep + 1} of {journey.steps.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                        {formatDistanceToNow(new Date(participant.enteredAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                        {participant.nextStepAt
                          ? formatDistanceToNow(new Date(participant.nextStepAt), { addSuffix: true })
                          : participant.status === "completed"
                          ? "Completed"
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

