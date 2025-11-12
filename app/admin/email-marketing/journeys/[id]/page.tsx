"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, Users, CheckCircle, XCircle, Pause, Play, Trash2, Edit, ArrowRight, Calendar, Zap, Mail, Eye, MousePointerClick, AlertTriangle, UserPlus, FolderOpen } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

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
  const enrollContact = useMutation(api.emailMarketing.enrollContactInJourney);

  const [isActivating, setIsActivating] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollMode, setEnrollMode] = useState<"contacts" | "segments">("contacts");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Get all contacts for enrollment
  const allContacts = useQuery(
    api.emailMarketing.listContacts,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const segments = useQuery(
    api.emailMarketing.listSegments,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const segmentContacts = useQuery(
    api.emailMarketing.getSegmentContacts,
    adminEmail && selectedSegmentId ? { segmentId: selectedSegmentId as any, email: adminEmail } : ("skip" as const)
  ) || [];
  
  // Filter to only subscribed contacts that aren't already enrolled
  const enrolledContactIds = new Set(participants.map(p => p.contactId));
  const availableContacts = allContacts.filter(
    c => (c as any).emailMarketingStatus === "subscribed" && !enrolledContactIds.has((c as any).emailMarketingId || (c as any)._id)
  );

  // Filter segment contacts to only subscribed and not already enrolled
  const availableSegmentContacts = segmentContacts.filter(
    (c: any) => (c as any).emailMarketingStatus === "subscribed" && !enrolledContactIds.has((c as any).emailMarketingId || (c as any)._id)
  );

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

  const handleEnrollContacts = async () => {
    if (!adminEmail) return;

    // Get contact IDs based on mode
    let contactIdsToEnroll: string[] = [];
    if (enrollMode === "contacts") {
      if (selectedContactIds.size === 0) {
        toast({
          title: "Error",
          description: "Please select at least one contact.",
          variant: "destructive",
        });
        return;
      }
      contactIdsToEnroll = Array.from(selectedContactIds);
    } else if (enrollMode === "segments") {
      if (!selectedSegmentId) {
        toast({
          title: "Error",
          description: "Please select a segment.",
          variant: "destructive",
        });
        return;
      }
      contactIdsToEnroll = availableSegmentContacts.map((c: any) => (c as any).emailMarketingId || (c as any)._id).filter((id: any) => id);
      if (contactIdsToEnroll.length === 0) {
        toast({
          title: "Error",
          description: "No available contacts in this segment to enroll.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (journey.status !== "active") {
      toast({
        title: "Error",
        description: "Journey must be active to enroll contacts.",
        variant: "destructive",
      });
      return;
    }

    setIsEnrolling(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const contactId of contactIdsToEnroll) {
        try {
          await enrollContact({
            journeyId: journey._id,
            contactId: contactId as Id<"emailContacts">,
            adminEmail: adminEmail,
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to enroll contact ${contactId}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Contacts enrolled",
          description: `Successfully enrolled ${successCount} contact${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : '.'}`,
        });
        setShowEnrollDialog(false);
        setSelectedContactIds(new Set());
        setSelectedSegmentId("");
        setEnrollMode("contacts");
      } else {
        toast({
          title: "Error",
          description: "Failed to enroll contacts. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enroll contacts.",
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
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
          {journey.status === "active" && (
            <Button
              onClick={() => {
                setShowEnrollDialog(true);
                setSelectedContactIds(new Set());
              }}
              variant="outline"
              className="font-black uppercase tracking-wider"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll Contacts
            </Button>
          )}
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

      {/* Enroll Contacts Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Enroll Contacts in Journey
            </DialogTitle>
            <DialogDescription>
              Select contacts to manually enroll in this journey. Only subscribed contacts that aren't already enrolled are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Enrollment Mode Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider">Enrollment Method</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="enroll-contacts"
                    name="enroll-mode"
                    checked={enrollMode === "contacts"}
                    onChange={() => {
                      setEnrollMode("contacts");
                      setSelectedContactIds(new Set());
                    }}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="enroll-contacts" className="font-medium cursor-pointer">
                    Select Individual Contacts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="enroll-segments"
                    name="enroll-mode"
                    checked={enrollMode === "segments"}
                    onChange={() => {
                      setEnrollMode("segments");
                      setSelectedSegmentId("");
                    }}
                    className="w-4 h-4 text-accent"
                  />
                  <Label htmlFor="enroll-segments" className="font-medium cursor-pointer">
                    Enroll by Segment
                  </Label>
                </div>
              </div>
            </div>

            {/* Contact Selection */}
            {enrollMode === "contacts" && (
              <>
                {availableContacts.length === 0 ? (
                  <div className="py-8 text-center text-foreground/60">
                    <Users className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                    <p>No available contacts to enroll.</p>
                    <p className="text-sm mt-2">All subscribed contacts are already enrolled in this journey.</p>
                  </div>
                ) : (
                  <>
                    <div className="border border-foreground/20 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" />
                        Select Contacts ({selectedContactIds.size} selected)
                      </Label>
                      <div className="space-y-2">
                        {availableContacts.map((contact) => {
                          const contactId = (contact as any).emailMarketingId || contact._id;
                          return (
                            <div key={contact._id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`enroll-contact-${contact._id}`}
                                checked={selectedContactIds.has(contactId)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedContactIds);
                                  if (checked) {
                                    newSet.add(contactId);
                                  } else {
                                    newSet.delete(contactId);
                                  }
                                  setSelectedContactIds(newSet);
                                }}
                              />
                              <Label
                                htmlFor={`enroll-contact-${contact._id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {contact.firstName || contact.lastName
                                  ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                                  : contact.email}
                                <span className="text-foreground/60 ml-2">({contact.email})</span>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="p-4 bg-foreground/5 border border-foreground/20 rounded-lg">
                      <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                        Selected
                      </p>
                      <p className="text-lg font-black" style={{ fontWeight: '900' }}>
                        {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""} will be enrolled
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Segment Selection */}
            {enrollMode === "segments" && (
              <div className="space-y-3 border border-foreground/20 rounded-lg p-4">
                <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4" />
                  Select Segment
                </Label>
                {segments.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-foreground/40" />
                    <p className="text-sm text-foreground/60 mb-4">No segments available</p>
                    <Link href="/admin/email-marketing/contacts">
                      <Button variant="outline" size="sm" className="font-black uppercase tracking-wider text-xs">
                        Create Segment
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a segment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map((segment) => (
                        <SelectItem key={segment._id} value={segment._id}>
                          {segment.name} ({segment.contactCount} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedSegmentId && availableSegmentContacts.length > 0 && (
                  <div className="mt-3 p-3 bg-foreground/5 border border-foreground/10 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Segment Preview
                    </p>
                    <p className="text-sm text-foreground/70">
                      {availableSegmentContacts.length} contact{availableSegmentContacts.length !== 1 ? "s" : ""} will be enrolled
                    </p>
                  </div>
                )}
                {selectedSegmentId && availableSegmentContacts.length === 0 && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-1">
                      No Available Contacts
                    </p>
                    <p className="text-sm text-foreground/70">
                      All contacts in this segment are already enrolled in this journey.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEnrollDialog(false);
                setSelectedContactIds(new Set());
                setSelectedSegmentId("");
                setEnrollMode("contacts");
              }}
              disabled={isEnrolling}
              className="font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEnrollContacts}
              disabled={isEnrolling || 
                (enrollMode === "contacts" && (selectedContactIds.size === 0 || availableContacts.length === 0)) ||
                (enrollMode === "segments" && (!selectedSegmentId || availableSegmentContacts.length === 0))}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isEnrolling ? "Enrolling..." : "Enroll Contacts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

