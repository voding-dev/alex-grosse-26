"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Save, Plus, X, ArrowRight, Calendar, Zap, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

type JourneyStep = {
  stepNumber: number;
  campaignId: string;
  delayDays: number;
  condition?: "always" | "if_opened" | "if_clicked" | "if_not_opened";
};

export default function NewJourneyPage() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const createJourney = useMutation(api.emailMarketing.createJourney);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entryTrigger: "manual" as "manual" | "tag_added" | "campaign_opened" | "campaign_clicked" | "contact_created" | "booking_created" | "booking_confirmed" | "custom",
    entryTriggerData: {} as any,
    steps: [] as JourneyStep[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerCampaignId, setTriggerCampaignId] = useState<string>("");

  // Get all campaigns for step selection
  const campaigns = useQuery(
    api.emailMarketing.listCampaigns,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  const handleSubmit = async () => {
    if (!adminEmail) {
      toast({
        title: "Error",
        description: "Not authenticated. Please log in.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Journey name is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.steps.length === 0) {
      toast({
        title: "Error",
        description: "At least one step is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate steps
    for (const step of formData.steps) {
      if (!step.campaignId) {
        toast({
          title: "Error",
          description: `Step ${step.stepNumber} must have a campaign selected.`,
          variant: "destructive",
        });
        return;
      }
      if (step.delayDays < 0) {
        toast({
          title: "Error",
          description: `Step ${step.stepNumber} delay days must be 0 or greater.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Prepare entry trigger data
      let entryTriggerData: any = undefined;
      if (formData.entryTrigger === "campaign_opened" || formData.entryTrigger === "campaign_clicked") {
        if (triggerCampaignId) {
          entryTriggerData = { campaignId: triggerCampaignId };
        }
      }

      // Prepare steps with proper step numbers
      const preparedSteps = formData.steps.map((step, index) => ({
        stepNumber: index,
        campaignId: step.campaignId as Id<"emailCampaigns">,
        delayDays: step.delayDays,
        condition: step.condition || "always",
      }));

      await createJourney({
        adminEmail: adminEmail,
        name: formData.name,
        description: formData.description || undefined,
        entryTrigger: formData.entryTrigger,
        entryTriggerData: entryTriggerData,
        steps: preparedSteps,
      });

      toast({
        title: "Journey created",
        description: "The journey has been created successfully.",
      });

      router.push("/admin/email-marketing");
    } catch (error) {
      console.error("Error creating journey:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create journey.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStep = () => {
    const newStep: JourneyStep = {
      stepNumber: formData.steps.length + 1,
      campaignId: "",
      delayDays: 0,
      condition: "always",
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      stepNumber: i + 1,
    }));
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, updates: Partial<JourneyStep>) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setFormData({ ...formData, steps: newSteps });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/email-marketing"
              className="text-sm font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground"
            >
              ← Back
            </Link>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
              New Journey
            </h1>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Journey"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    Journey Name <span className="text-accent">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="font-medium"
                    placeholder="Welcome Series"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="font-medium"
                    rows={3}
                    placeholder="A brief description of this journey..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Entry Trigger */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                  Entry Trigger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="entryTrigger" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                    When should contacts enter this journey? <span className="text-accent">*</span>
                  </Label>
                  <Select
                    value={formData.entryTrigger}
                    onValueChange={(value: any) => setFormData({ ...formData, entryTrigger: value, entryTriggerData: {} })}
                  >
                    <SelectTrigger id="entryTrigger" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Enrollment</SelectItem>
                      <SelectItem value="tag_added">Tag Added</SelectItem>
                      <SelectItem value="campaign_opened">Campaign Opened</SelectItem>
                      <SelectItem value="campaign_clicked">Campaign Clicked</SelectItem>
                      <SelectItem value="contact_created">Contact Created</SelectItem>
                      <SelectItem value="booking_created">Booking Created</SelectItem>
                      <SelectItem value="booking_confirmed">Booking Confirmed</SelectItem>
                      <SelectItem value="custom">Custom Trigger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.entryTrigger === "campaign_opened" || formData.entryTrigger === "campaign_clicked") && (
                  <div>
                    <Label htmlFor="triggerCampaign" className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                      Campaign <span className="text-accent">*</span>
                    </Label>
                    <Select
                      value={triggerCampaignId}
                      onValueChange={setTriggerCampaignId}
                    >
                      <SelectTrigger id="triggerCampaign" className="h-11">
                        <SelectValue placeholder="Select a campaign..." />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns
                          .filter(c => c.status === "sent" || c.status === "draft")
                          .map(campaign => (
                            <SelectItem key={campaign._id} value={campaign._id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 mt-2 text-xs text-foreground/60">
                      <AlertCircle className="h-4 w-4" />
                      <span>Contacts will enter this journey when they {formData.entryTrigger === "campaign_opened" ? "open" : "click"} this campaign</span>
                    </div>
                  </div>
                )}

                {formData.entryTrigger === "tag_added" && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <AlertCircle className="h-4 w-4" />
                    <span>Contacts will enter this journey when a tag is added (configure in trigger data)</span>
                  </div>
                )}

                {(formData.entryTrigger === "booking_created" || formData.entryTrigger === "booking_confirmed") && (
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <AlertCircle className="h-4 w-4" />
                    <span>Contacts will enter this journey when they {formData.entryTrigger === "booking_created" ? "create" : "confirm"} a booking</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journey Steps */}
            <Card className="border border-foreground/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                    Journey Steps
                  </CardTitle>
                  <Button
                    onClick={addStep}
                    variant="outline"
                    size="sm"
                    className="font-black uppercase tracking-wider"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.steps.length === 0 ? (
                  <div className="py-12 text-center border border-foreground/10 rounded-lg bg-foreground/5">
                    <Zap className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                    <p className="text-foreground/60 mb-4">No steps yet. Add your first step to get started.</p>
                    <Button
                      onClick={addStep}
                      variant="outline"
                      className="font-black uppercase tracking-wider"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Step
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="p-4 border border-foreground/20 rounded-lg bg-foreground/5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-black text-sm">
                              {step.stepNumber}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">Step {step.stepNumber}</p>
                              {index > 0 && (
                                <p className="text-xs text-foreground/60 mt-1">
                                  {step.delayDays === 0 ? "Immediately" : `After ${step.delayDays} day${step.delayDays !== 1 ? "s" : ""}`}
                                </p>
                              )}
                            </div>
                          </div>
                          {formData.steps.length > 1 && (
                            <Button
                              onClick={() => removeStep(index)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                              Campaign <span className="text-accent">*</span>
                            </Label>
                            <Select
                              value={step.campaignId}
                              onValueChange={(value) => updateStep(index, { campaignId: value })}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select a campaign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {campaigns
                                  .filter(c => c.status === "sent" || c.status === "draft")
                                  .map(campaign => (
                                    <SelectItem key={campaign._id} value={campaign._id}>
                                      {campaign.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                                Delay (Days)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={step.delayDays}
                                onChange={(e) => updateStep(index, { delayDays: parseInt(e.target.value) || 0 })}
                                className="font-medium"
                              />
                              <p className="text-xs text-foreground/50 mt-1">
                                {step.delayDays === 0 ? "Send immediately" : `Wait ${step.delayDays} day${step.delayDays !== 1 ? "s" : ""} before sending`}
                              </p>
                            </div>

                            {index > 0 && (
                              <div>
                                <Label className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                                  Condition
                                </Label>
                                <Select
                                  value={step.condition || "always"}
                                  onValueChange={(value: any) => updateStep(index, { condition: value })}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="always">Always Send</SelectItem>
                                    <SelectItem value="if_opened">If Previous Opened</SelectItem>
                                    <SelectItem value="if_clicked">If Previous Clicked</SelectItem>
                                    <SelectItem value="if_not_opened">If Previous Not Opened</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-1">
            <Card className="border border-foreground/20 sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                  Journey Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                    Name
                  </p>
                  <p className="font-bold text-foreground">{formData.name || "Untitled Journey"}</p>
                </div>

                {formData.description && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-foreground/80">{formData.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
                    Entry Trigger
                  </p>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <p className="text-sm font-bold text-foreground capitalize">
                      {formData.entryTrigger.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-3">
                    Steps ({formData.steps.length})
                  </p>
                  {formData.steps.length === 0 ? (
                    <p className="text-sm text-foreground/60">No steps yet</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.steps.map((step, index) => {
                        const campaign = campaigns.find(c => c._id === step.campaignId);
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent font-black text-xs flex-shrink-0">
                              {step.stepNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">
                                {campaign?.name || "No campaign selected"}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-foreground/60">
                                {step.delayDays > 0 && (
                                  <>
                                    <Calendar className="h-3 w-3" />
                                    <span>{step.delayDays} day{step.delayDays !== 1 ? "s" : ""}</span>
                                  </>
                                )}
                                {index > 0 && step.condition && step.condition !== "always" && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{step.condition.replace(/_/g, " ")}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {index < formData.steps.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-foreground/40 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

