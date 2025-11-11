"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { 
  Briefcase, ArrowLeft, Save, Upload, Trash2, Plus, Calendar, FileText, 
  Clock, CheckCircle, XCircle, AlertCircle, Link2, History, Download,
  Edit, X, Check, MessageSquare, ExternalLink, Eye, EyeOff, Key, Copy, RefreshCw,
  User, Users, ArrowRight, Link as LinkIcon
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow, format } from "date-fns";

const statusConfig = {
  planning: { label: "Planning", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-accent/20 text-accent border-accent/30", icon: Briefcase },
  review: { label: "Review", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle },
  on_hold: { label: "On Hold", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle },
};

const signOffStatusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-500 border-green-500/30" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-500 border-red-500/30" },
};

export default function ClientProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const { adminEmail } = useAdminAuth();

  const project = useQuery(api.clientProjects.get, { 
    id: projectId as Id<"clientProjects">,
    email: adminEmail || undefined,
  });

  // Get all deliveries for linking
  const allDeliveries = useQuery(
    api.deliveries.listAll,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  // Get feedback for this project
  const projectFeedback = useQuery(
    api.clientProjects.getFeedback,
    project ? { 
      id: projectId as Id<"clientProjects">,
      email: adminEmail || undefined,
    } : ("skip" as const)
  ) || [];

  // Get feedback count per delivery
  const feedbackByDelivery = projectFeedback.reduce((acc: Record<string, number>, fb: any) => {
    const deliveryId = fb.deliveryId;
    acc[deliveryId] = (acc[deliveryId] || 0) + 1;
    return acc;
  }, {});

  // Mutations
  const updateProject = useMutation(api.clientProjects.update);
  const addKeyMoment = useMutation(api.clientProjects.addKeyMoment);
  const updateKeyMoment = useMutation(api.clientProjects.updateKeyMoment);
  const removeKeyMoment = useMutation(api.clientProjects.removeKeyMoment);
  const addSignOff = useMutation(api.clientProjects.addSignOff);
  const updateSignOff = useMutation(api.clientProjects.updateSignOff);
  const removeSignOff = useMutation(api.clientProjects.removeSignOff);
  const uploadContract = useMutation(api.clientProjects.uploadContract);
  const linkDelivery = useMutation(api.clientProjects.linkDelivery);
  const unlinkDelivery = useMutation(api.clientProjects.unlinkDelivery);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const getContractUrl = useAction(api.storage.getSignedDownloadUrl);
  const deleteProject = useMutation(api.clientProjects.remove);
  const resetDeliveryPin = useMutation(api.deliveries.resetPin);
  const updateDeliveryPin = useMutation(api.deliveries.update);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    description: "",
    status: "planning" as "planning" | "in_progress" | "review" | "completed" | "on_hold" | "cancelled",
    scope: "",
    notes: "",
  });

  // Key moment form
  const [keyMomentForm, setKeyMomentForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [editingKeyMomentIndex, setEditingKeyMomentIndex] = useState<number | null>(null);

  // Sign-off form
  const [signOffForm, setSignOffForm] = useState({
    title: "",
    description: "",
    status: "pending" as "pending" | "approved" | "rejected",
    date: "",
  });
  const [editingSignOffIndex, setEditingSignOffIndex] = useState<number | null>(null);

  // Contract upload
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);

  // PIN visibility
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [resettingPin, setResettingPin] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKeyMomentForm, setShowKeyMomentForm] = useState(false);
  const [showSignOffForm, setShowSignOffForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        clientName: project.clientName || "",
        description: project.description || "",
        status: project.status || "planning",
        scope: project.scope || "",
        notes: project.notes || "",
      });
      setIsLoading(false);

      // Get contract URL if exists
      if (project.contractStorageId) {
        getContractUrl({ storageKey: project.contractStorageId })
          .then((url) => setContractUrl(url))
          .catch(() => setContractUrl(null));
      }
    }
  }, [project, getContractUrl]);

  const handleSave = async () => {
    if (!formData.title || !formData.clientName) {
      toast({
        title: "Error",
        description: "Please fill in title and client name.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateProject({
        id: projectId as Id<"clientProjects">,
        ...formData,
        email: adminEmail || undefined,
      });

      toast({
        title: "Project updated!",
        description: "Changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKeyMoment = async () => {
    if (!keyMomentForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the key moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addKeyMoment({
        id: projectId as Id<"clientProjects">,
        title: keyMomentForm.title,
        description: keyMomentForm.description,
        date: new Date(keyMomentForm.date).getTime(),
        email: adminEmail || undefined,
      });

      setKeyMomentForm({ title: "", description: "", date: new Date().toISOString().split('T')[0] });
      setShowKeyMomentForm(false);
      toast({
        title: "Key moment added!",
        description: "The key moment has been added to the timeline.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add key moment.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateKeyMoment = async (index: number) => {
    if (!keyMomentForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the key moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateKeyMoment({
        id: projectId as Id<"clientProjects">,
        momentIndex: index,
        title: keyMomentForm.title,
        description: keyMomentForm.description,
        date: new Date(keyMomentForm.date).getTime(),
        email: adminEmail || undefined,
      });

      setEditingKeyMomentIndex(null);
      setKeyMomentForm({ title: "", description: "", date: new Date().toISOString().split('T')[0] });
      toast({
        title: "Key moment updated!",
        description: "The key moment has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update key moment.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKeyMoment = async (index: number) => {
    if (!confirm("Are you sure you want to delete this key moment?")) return;

    try {
      await removeKeyMoment({
        id: projectId as Id<"clientProjects">,
        momentIndex: index,
        email: adminEmail || undefined,
      });

      toast({
        title: "Key moment deleted!",
        description: "The key moment has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete key moment.",
        variant: "destructive",
      });
    }
  };

  const handleAddSignOff = async () => {
    if (!signOffForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the sign-off.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addSignOff({
        id: projectId as Id<"clientProjects">,
        title: signOffForm.title,
        description: signOffForm.description,
        status: signOffForm.status,
        date: signOffForm.date ? new Date(signOffForm.date).getTime() : undefined,
        email: adminEmail || undefined,
      });

      setSignOffForm({ title: "", description: "", status: "pending", date: "" });
      setShowSignOffForm(false);
      toast({
        title: "Sign-off added!",
        description: "The sign-off has been added.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add sign-off.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSignOff = async (index: number) => {
    if (!signOffForm.title) {
      toast({
        title: "Error",
        description: "Please enter a title for the sign-off.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateSignOff({
        id: projectId as Id<"clientProjects">,
        signOffIndex: index,
        title: signOffForm.title,
        description: signOffForm.description,
        status: signOffForm.status,
        date: signOffForm.date ? new Date(signOffForm.date).getTime() : undefined,
        email: adminEmail || undefined,
      });

      setEditingSignOffIndex(null);
      setSignOffForm({ title: "", description: "", status: "pending", date: "" });
      toast({
        title: "Sign-off updated!",
        description: "The sign-off has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update sign-off.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSignOff = async (index: number) => {
    if (!confirm("Are you sure you want to delete this sign-off?")) return;

    try {
      await removeSignOff({
        id: projectId as Id<"clientProjects">,
        signOffIndex: index,
        email: adminEmail || undefined,
      });

      toast({
        title: "Sign-off deleted!",
        description: "The sign-off has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sign-off.",
        variant: "destructive",
      });
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingContract(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload contract");
      }

      const { storageId } = await result.json();

      // Save contract reference
      await uploadContract({
        id: projectId as Id<"clientProjects">,
        storageId,
        filename: file.name,
        email: adminEmail || undefined,
      });

      // Get download URL
      const url = await getContractUrl({ storageKey: storageId });
      setContractUrl(url);

      toast({
        title: "Contract uploaded!",
        description: "The contract has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload contract.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingContract(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleLinkDelivery = async (deliveryId: Id<"deliveries">) => {
    try {
      await linkDelivery({
        id: projectId as Id<"clientProjects">,
        deliveryId,
        email: adminEmail || undefined,
      });

      toast({
        title: "Delivery linked!",
        description: "The delivery has been linked to this project.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link delivery.",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkDelivery = async (deliveryId: Id<"deliveries">) => {
    try {
      await unlinkDelivery({
        id: projectId as Id<"clientProjects">,
        deliveryId,
        email: adminEmail || undefined,
      });

      toast({
        title: "Delivery unlinked!",
        description: "The delivery has been unlinked from this project.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unlink delivery.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    try {
      await deleteProject({
        id: projectId as Id<"clientProjects">,
        email: adminEmail || undefined,
      });

      toast({
        title: "Project deleted!",
        description: "The project has been deleted.",
      });

      router.push("/admin/client-projects");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  const togglePinVisibility = (deliveryId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [deliveryId]: !prev[deliveryId],
    }));
  };

  const copyPin = (pin: string, deliveryTitle: string) => {
    navigator.clipboard.writeText(pin);
    toast({
      title: "PIN copied",
      description: `PIN for ${deliveryTitle} copied to clipboard.`,
    });
  };

  const handleResetDeliveryPin = async (deliveryId: Id<"deliveries">, deliveryTitle: string) => {
    if (!confirm(`Are you sure you want to reset the PIN for "${deliveryTitle}"? The current PIN will no longer work.`)) {
      return;
    }

    setResettingPin(prev => ({ ...prev, [deliveryId]: true }));
    try {
      const result = await resetDeliveryPin({
        id: deliveryId,
        email: adminEmail || undefined,
      });

      // Make the new PIN visible
      setVisiblePins(prev => ({ ...prev, [deliveryId]: true }));

      toast({
        title: "PIN reset!",
        description: `New PIN for ${deliveryTitle}: ${result.pin}. It has been copied to clipboard.`,
      });

      // Copy new PIN to clipboard
      navigator.clipboard.writeText(result.pin);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset PIN.",
        variant: "destructive",
      });
    } finally {
      setResettingPin(prev => ({ ...prev, [deliveryId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="text-foreground/60">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="text-foreground/60 mb-4">Project not found</p>
          <Link href="/admin/client-projects">
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  // Sort key moments by date
  const sortedKeyMoments = [...(project.keyMoments || [])].sort((a, b) => a.date - b.date);

  // Dashboard view (read-only)
  if (!isEditMode) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <Link href="/admin/client-projects" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                {project.title}
              </h1>
              <p className="text-foreground/70 text-base sm:text-lg mb-3">
                {project.clientName}
              </p>
              <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider w-fit ${config.color}`}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsEditMode(true)}
                className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Info Card */}
          <Card className="lg:col-span-2 border border-foreground/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                  Description
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {project.description || "No description provided."}
                </p>
              </div>
              {project.scope && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                    Scope
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {project.scope}
                  </p>
                </div>
              )}
              {project.notes && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                    Notes
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {project.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border border-foreground/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                  Created
                </p>
                <p className="text-sm text-foreground/80">
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                  Deliveries
                </p>
                <p className="text-sm text-foreground/80">
                  {project.linkedDeliveryIds?.length || 0} linked
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                  Key Moments
                </p>
                <p className="text-sm text-foreground/80">
                  {project.keyMoments?.length || 0} events
                </p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                  Sign-offs
                </p>
                <p className="text-sm text-foreground/80">
                  {project.signOffs?.length || 0} total
                </p>
              </div>
              {project.contractStorageId && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                    Contract
                  </p>
                  <p className="text-sm text-accent font-medium">
                    ✓ Uploaded
                  </p>
                </div>
              )}
              {/* Contact Link */}
              {project.contact && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                    Contact
                  </p>
                  <Link 
                    href={`/admin/tools/contacts?contactId=${project.contact._id}`}
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <User className="h-3 w-3" />
                    {project.contact.businessName || project.contact.contactName || project.contact.email}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {/* Lead Link */}
              {project.lead && (
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-1" style={{ fontWeight: '900' }}>
                    From Lead
                  </p>
                  <Link 
                    href={`/admin/tools/lead-pipeline?leadId=${project.lead._id}`}
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {project.lead.name}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Preview */}
        {sortedKeyMoments.length > 0 && (
          <Card className="mb-8 border border-foreground/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Recent Timeline Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedKeyMoments.slice(-5).reverse().map((moment, idx) => (
                  <div key={idx} className="flex items-start gap-4 pb-3 border-b border-foreground/10 last:border-0 last:pb-0">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase tracking-wider text-foreground mb-1" style={{ fontWeight: '900' }}>
                        {moment.title}
                      </p>
                      {moment.description && (
                        <p className="text-xs text-foreground/70 leading-relaxed mb-1">
                          {moment.description}
                        </p>
                      )}
                      <p className="text-xs text-foreground/60">
                        {format(new Date(moment.date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Deliveries */}
        {project.linkedDeliveryIds && project.linkedDeliveryIds.length > 0 && (
          <Card className="mb-8 border border-foreground/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Linked Delivery Portals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allDeliveries
                  .filter((d: any) => project.linkedDeliveryIds?.includes(d._id))
                  .map((delivery: any) => (
                    <div key={delivery._id} className="flex items-center justify-between p-3 rounded-lg border border-foreground/10 bg-foreground/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black uppercase tracking-wider text-foreground mb-1" style={{ fontWeight: '900' }}>
                          /dl/{delivery.slug}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {delivery.title || "Untitled Delivery"}
                        </p>
                      </div>
                      <Link href={`/dl/${delivery.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback */}
        {projectFeedback && projectFeedback.length > 0 && (
          <Card className="mb-8 border border-foreground/20 rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Client Feedback ({projectFeedback.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectFeedback.map((fb: any) => {
                  const delivery = allDeliveries.find((d: any) => d._id === fb.deliveryId);
                  return (
                    <div key={fb._id} className="p-4 rounded-lg border border-foreground/10 bg-foreground/5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {delivery && (
                            <Link 
                              href={`/dl/${delivery.slug}`}
                              className="text-sm font-black uppercase tracking-wider text-accent hover:underline"
                              style={{ fontWeight: '900' }}
                            >
                              {delivery.title || "Untitled Delivery"}
                            </Link>
                          )}
                          <p className="text-xs text-foreground/60 mt-1">
                            {format(new Date(fb.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        {fb.decision && (
                          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                            fb.decision === "approve"
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : fb.decision === "reject"
                              ? "bg-red-500/20 text-red-500 border border-red-500/30"
                              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                          }`}>
                            {fb.decision}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {fb.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Edit mode (existing form)
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/client-projects" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              {project.title}
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg mb-3">
              {project.clientName}
            </p>
            <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider w-fit ${config.color}`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsEditMode(false)}
              variant="outline"
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              {isSaving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              onClick={handleDeleteProject}
              variant="destructive"
              className="font-bold uppercase tracking-wider"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-8">
        <TabsList className="grid w-full grid-cols-7 max-w-5xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger value="info" className="font-bold uppercase tracking-wider text-xs sm:text-sm">Info</TabsTrigger>
          <TabsTrigger value="timeline" className="font-bold uppercase tracking-wider text-xs sm:text-sm">Timeline</TabsTrigger>
          <TabsTrigger value="contract" className="font-bold uppercase tracking-wider text-xs sm:text-sm">Contract</TabsTrigger>
          <TabsTrigger value="signoffs" className="font-bold uppercase tracking-wider text-xs sm:text-sm">Sign-offs</TabsTrigger>
          <TabsTrigger value="portals" className="font-bold uppercase tracking-wider text-xs sm:text-sm">
            Portals {project.linkedDeliveryIds && project.linkedDeliveryIds.length > 0 && `(${project.linkedDeliveryIds.length})`}
          </TabsTrigger>
          <TabsTrigger value="feedback" className="font-bold uppercase tracking-wider text-xs sm:text-sm">
            Feedback {projectFeedback.length > 0 && `(${projectFeedback.length})`}
          </TabsTrigger>
          <TabsTrigger value="history" className="font-bold uppercase tracking-wider text-xs sm:text-sm">History</TabsTrigger>
        </TabsList>

        {/* Project Information Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Project Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="clientName" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Client Name *
                </Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="flex h-12 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-base"
                >
                  <option value="planning">Planning</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="text-base"
                />
              </div>

              <div>
                <Label htmlFor="scope" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Scope of Project
                </Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  rows={6}
                  className="text-base"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Key Moments (Timeline)
              </CardTitle>
              <Button
                onClick={() => {
                  setShowKeyMomentForm(true);
                  setEditingKeyMomentIndex(null);
                  setKeyMomentForm({ title: "", description: "", date: new Date().toISOString().split('T')[0] });
                }}
                className="font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Moment
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showKeyMomentForm && (
                <Card className="border border-accent/30 bg-accent/5">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Title *
                      </Label>
                      <Input
                        value={keyMomentForm.title}
                        onChange={(e) => setKeyMomentForm({ ...keyMomentForm, title: e.target.value })}
                        placeholder="e.g., Kickoff Meeting"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Description
                      </Label>
                      <Textarea
                        value={keyMomentForm.description}
                        onChange={(e) => setKeyMomentForm({ ...keyMomentForm, description: e.target.value })}
                        placeholder="Details about this moment..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Date *
                      </Label>
                      <Input
                        type="date"
                        value={keyMomentForm.date}
                        onChange={(e) => setKeyMomentForm({ ...keyMomentForm, date: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => editingKeyMomentIndex !== null 
                          ? handleUpdateKeyMoment(editingKeyMomentIndex) 
                          : handleAddKeyMoment()}
                        className="font-bold uppercase tracking-wider"
                      >
                        {editingKeyMomentIndex !== null ? "Update" : "Add"} Moment
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowKeyMomentForm(false);
                          setEditingKeyMomentIndex(null);
                          setKeyMomentForm({ title: "", description: "", date: new Date().toISOString().split('T')[0] });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {sortedKeyMoments.length === 0 ? (
                <p className="text-center text-foreground/60 py-8">No key moments yet. Add one to start tracking the timeline.</p>
              ) : (
                <div className="space-y-3">
                  {sortedKeyMoments.map((moment, index) => {
                    const originalIndex = project.keyMoments?.findIndex(m => m.date === moment.date && m.title === moment.title) ?? index;
                    const isEditing = editingKeyMomentIndex === originalIndex;

                    if (isEditing) {
                      return (
                        <Card key={index} className="border border-accent/30 bg-accent/5">
                          <CardContent className="p-4 space-y-4">
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                Title *
                              </Label>
                              <Input
                                value={keyMomentForm.title}
                                onChange={(e) => setKeyMomentForm({ ...keyMomentForm, title: e.target.value })}
                                className="h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                Description
                              </Label>
                              <Textarea
                                value={keyMomentForm.description}
                                onChange={(e) => setKeyMomentForm({ ...keyMomentForm, description: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                Date *
                              </Label>
                              <Input
                                type="date"
                                value={keyMomentForm.date}
                                onChange={(e) => setKeyMomentForm({ ...keyMomentForm, date: e.target.value })}
                                className="h-10"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdateKeyMoment(originalIndex)} className="font-bold uppercase tracking-wider">
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => {
                                setEditingKeyMomentIndex(null);
                                setKeyMomentForm({ title: "", description: "", date: new Date().toISOString().split('T')[0] });
                              }}>
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card key={index} className="border border-foreground/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Calendar className="h-4 w-4 text-accent" />
                                <p className="text-sm font-bold text-foreground/60">
                                  {format(new Date(moment.date), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <h3 className="font-black uppercase tracking-wider text-base mb-2" style={{ fontWeight: '900' }}>
                                {moment.title}
                              </h3>
                              {moment.description && (
                                <p className="text-sm text-foreground/70">{moment.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingKeyMomentIndex(originalIndex);
                                  setKeyMomentForm({
                                    title: moment.title,
                                    description: moment.description || "",
                                    date: new Date(moment.date).toISOString().split('T')[0],
                                  });
                                  setShowKeyMomentForm(false);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteKeyMoment(originalIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Contract
              </CardTitle>
              <CardDescription>
                Upload and manage the project contract file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.contractStorageId && contractUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 border border-foreground/20 rounded-lg">
                    <FileText className="h-8 w-8 text-accent" />
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{project.contractFilename}</p>
                      <p className="text-sm text-foreground/60">
                        Uploaded {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <a href={contractUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="font-bold uppercase tracking-wider">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </a>
                  </div>
                  <div>
                    <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                      Replace Contract
                    </Label>
                    <Input
                      type="file"
                      onChange={handleContractUpload}
                      disabled={isUploadingContract}
                      accept=".pdf,.doc,.docx"
                      className="h-10"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-foreground/20 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                    <p className="text-foreground/60 mb-4">No contract uploaded yet</p>
                    <Label className="cursor-pointer">
                      <Input
                        type="file"
                        onChange={handleContractUpload}
                        disabled={isUploadingContract}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                      />
                      <Button variant="outline" className="font-bold uppercase tracking-wider" asChild>
                        <span>{isUploadingContract ? "Uploading..." : "Upload Contract"}</span>
                      </Button>
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sign-offs Tab */}
        <TabsContent value="signoffs" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Sign-offs
              </CardTitle>
              <Button
                onClick={() => {
                  setShowSignOffForm(true);
                  setEditingSignOffIndex(null);
                  setSignOffForm({ title: "", description: "", status: "pending", date: "" });
                }}
                className="font-bold uppercase tracking-wider"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Sign-off
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showSignOffForm && (
                <Card className="border border-accent/30 bg-accent/5">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Title *
                      </Label>
                      <Input
                        value={signOffForm.title}
                        onChange={(e) => setSignOffForm({ ...signOffForm, title: e.target.value })}
                        placeholder="e.g., Initial Design Approval"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                        Description
                      </Label>
                      <Textarea
                        value={signOffForm.description}
                        onChange={(e) => setSignOffForm({ ...signOffForm, description: e.target.value })}
                        placeholder="Details about this sign-off..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                          Status
                        </Label>
                        <select
                          value={signOffForm.status}
                          onChange={(e) => setSignOffForm({ ...signOffForm, status: e.target.value as any })}
                          className="flex h-10 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={signOffForm.date}
                          onChange={(e) => setSignOffForm({ ...signOffForm, date: e.target.value })}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => editingSignOffIndex !== null 
                          ? handleUpdateSignOff(editingSignOffIndex) 
                          : handleAddSignOff()}
                        className="font-bold uppercase tracking-wider"
                      >
                        {editingSignOffIndex !== null ? "Update" : "Add"} Sign-off
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSignOffForm(false);
                          setEditingSignOffIndex(null);
                          setSignOffForm({ title: "", description: "", status: "pending", date: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {project.signOffs && project.signOffs.length === 0 ? (
                <p className="text-center text-foreground/60 py-8">No sign-offs yet. Add one to track approvals.</p>
              ) : (
                <div className="space-y-3">
                  {project.signOffs?.map((signOff, index) => {
                    const statusConfig = signOffStatusConfig[signOff.status];
                    const isEditing = editingSignOffIndex === index;

                    if (isEditing) {
                      return (
                        <Card key={index} className="border border-accent/30 bg-accent/5">
                          <CardContent className="p-4 space-y-4">
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                Title *
                              </Label>
                              <Input
                                value={signOffForm.title}
                                onChange={(e) => setSignOffForm({ ...signOffForm, title: e.target.value })}
                                className="h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                Description
                              </Label>
                              <Textarea
                                value={signOffForm.description}
                                onChange={(e) => setSignOffForm({ ...signOffForm, description: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                  Status
                                </Label>
                                <select
                                  value={signOffForm.status}
                                  onChange={(e) => setSignOffForm({ ...signOffForm, status: e.target.value as any })}
                                  className="flex h-10 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="approved">Approved</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-sm font-bold uppercase tracking-wider mb-2 block">
                                  Date
                                </Label>
                                <Input
                                  type="date"
                                  value={signOffForm.date}
                                  onChange={(e) => setSignOffForm({ ...signOffForm, date: e.target.value })}
                                  className="h-10"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleUpdateSignOff(index)} className="font-bold uppercase tracking-wider">
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => {
                                setEditingSignOffIndex(null);
                                setSignOffForm({ title: "", description: "", status: "pending", date: "" });
                              }}>
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card key={index} className="border border-foreground/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusConfig.color}`}>
                                  {signOff.status === "approved" && <CheckCircle className="h-3 w-3" />}
                                  {signOff.status === "rejected" && <XCircle className="h-3 w-3" />}
                                  {signOff.status === "pending" && <Clock className="h-3 w-3" />}
                                  {statusConfig.label}
                                </div>
                                {signOff.date && (
                                  <p className="text-sm text-foreground/60">
                                    {format(new Date(signOff.date), "MMM dd, yyyy")}
                                  </p>
                                )}
                              </div>
                              <h3 className="font-black uppercase tracking-wider text-base mb-2" style={{ fontWeight: '900' }}>
                                {signOff.title}
                              </h3>
                              {signOff.description && (
                                <p className="text-sm text-foreground/70">{signOff.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSignOffIndex(index);
                                  setSignOffForm({
                                    title: signOff.title,
                                    description: signOff.description || "",
                                    status: signOff.status,
                                    date: signOff.date ? new Date(signOff.date).toISOString().split('T')[0] : "",
                                  });
                                  setShowSignOffForm(false);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSignOff(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Portals Tab */}
        <TabsContent value="portals" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Linked Deliveries (Portals)
              </CardTitle>
              <CardDescription>
                Link delivery portals to this project for easy access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.linkedDeliveryIds && project.linkedDeliveryIds.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold uppercase tracking-wider text-sm mb-3">Linked Portals</h3>
                  {project.linkedDeliveryIds.map((deliveryId) => {
                    const delivery = allDeliveries.find(d => d._id === deliveryId);
                    if (!delivery) return null;

                    return (
                      <Card key={deliveryId} className="border border-foreground/20 hover:border-accent/50 transition-all">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-foreground">{delivery.title}</h4>
                                  {feedbackByDelivery[deliveryId] && feedbackByDelivery[deliveryId] > 0 && (
                                    <div className="flex items-center gap-1 rounded-full bg-accent/20 border border-accent/30 px-2 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                                      <MessageSquare className="h-3 w-3" />
                                      {feedbackByDelivery[deliveryId]}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/60">{delivery.clientName}</p>
                                <Link href={`/dl/${delivery.slug}`} className="text-xs text-accent hover:text-accent/80 hover:underline mt-1 inline-block">
                                  /dl/{delivery.slug}
                                </Link>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/dl/${delivery.slug}`} target="_blank">
                                  <Button variant="outline" size="sm" className="font-bold uppercase tracking-wider">
                                    <ExternalLink className="mr-2 h-3 w-3" />
                                    View Portal
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlinkDelivery(deliveryId)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* PIN Section */}
                            <div className="rounded-lg border border-foreground/20 bg-foreground/5 p-3">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">PIN</span>
                                  {!delivery.pinPlaintext && (
                                    <span className="text-xs text-yellow-500/80 font-medium">(Needs reset)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {delivery.pinPlaintext ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => togglePinVisibility(deliveryId)}
                                        className="h-7 px-2 text-xs"
                                      >
                                        {visiblePins[deliveryId] ? (
                                          <EyeOff className="h-3 w-3" />
                                        ) : (
                                          <Eye className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyPin(delivery.pinPlaintext || "", delivery.title)}
                                        className="h-7 px-2 text-xs"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetDeliveryPin(deliveryId, delivery.title)}
                                    disabled={resettingPin[deliveryId]}
                                    className="h-7 px-2 text-xs"
                                    title={delivery.pinPlaintext ? "Reset PIN" : "Set PIN (no PIN stored)"}
                                  >
                                    {resettingPin[deliveryId] ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              {!delivery.pinPlaintext ? (
                                <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                                  <span className="text-xs text-yellow-500/80 font-medium">
                                    PIN not stored. Click reset to generate a new PIN and view it here.
                                  </span>
                                </div>
                              ) : visiblePins[deliveryId] ? (
                                <code className="block px-3 py-2 bg-background border border-foreground/20 rounded font-mono text-base font-bold text-foreground tracking-wider">
                                  {delivery.pinPlaintext}
                                </code>
                              ) : (
                                <div className="px-3 py-2 bg-background border border-foreground/20 rounded">
                                  <span className="text-xs text-foreground/50 font-medium">Click eye icon to reveal PIN</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {allDeliveries.filter(d => !project.linkedDeliveryIds?.includes(d._id)).length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold uppercase tracking-wider text-sm mb-3">Available Portals to Link</h3>
                  {allDeliveries
                    .filter(d => !project.linkedDeliveryIds?.includes(d._id))
                    .map((delivery) => (
                      <Card key={delivery._id} className="border border-foreground/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-foreground mb-1">{delivery.title}</h4>
                              <p className="text-sm text-foreground/60">{delivery.clientName}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLinkDelivery(delivery._id)}
                              className="font-bold uppercase tracking-wider"
                            >
                              <Link2 className="mr-2 h-3 w-3" />
                              Link
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}

              {allDeliveries.length === 0 && (
                <p className="text-center text-foreground/60 py-8">No deliveries available. Create a delivery portal first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Client Feedback
              </CardTitle>
              <CardDescription>
                All feedback from linked delivery portals for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectFeedback.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-foreground/60 mb-2 font-medium">No feedback yet</p>
                  <p className="text-sm text-foreground/50">
                    Feedback from linked portals will appear here when clients comment on deliveries.
                  </p>
                  {project.linkedDeliveryIds && project.linkedDeliveryIds.length === 0 && (
                    <p className="text-sm text-foreground/50 mt-4">
                      Link a delivery portal in the Portals tab to receive feedback.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {projectFeedback.map((fb: any) => {
                    const delivery = fb.delivery;
                    const decisionColor = fb.decision === "approve" 
                      ? "bg-green-500/20 text-green-500 border-green-500/30"
                      : fb.decision === "reject"
                      ? "bg-red-500/20 text-red-500 border-red-500/30"
                      : fb.decision === "changes"
                      ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                      : "bg-foreground/10 text-foreground/60 border-foreground/20";

                    return (
                      <Card key={fb._id} className="border border-foreground/20 hover:border-accent/50 transition-all">
                        <CardContent className="p-4 sm:p-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {fb.decision && (
                                    <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${decisionColor}`}>
                                      {fb.decision === "approve" && <CheckCircle className="h-3 w-3" />}
                                      {fb.decision === "reject" && <XCircle className="h-3 w-3" />}
                                      {fb.decision === "changes" && <AlertCircle className="h-3 w-3" />}
                                      {fb.decision?.toUpperCase()}
                                    </div>
                                  )}
                                  {fb.assetId && (
                                    <div className="text-xs text-foreground/60 font-medium">
                                      Per-asset feedback
                                    </div>
                                  )}
                                  <div className="text-xs text-foreground/60">
                                    {format(new Date(fb.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                                  </div>
                                </div>
                                {delivery && (
                                  <div className="mb-3">
                                    <Link 
                                      href={`/dl/${delivery.slug}`} 
                                      target="_blank"
                                      className="text-sm text-accent hover:text-accent/80 hover:underline inline-flex items-center gap-1"
                                    >
                                      <Link2 className="h-3 w-3" />
                                      {delivery.title}
                                    </Link>
                                  </div>
                                )}
                                <p className="text-sm text-foreground/80 leading-relaxed">{fb.body}</p>
                              </div>
                              {delivery && (
                                <Link href={`/dl/${delivery.slug}`} target="_blank">
                                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modification History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Modification History
              </CardTitle>
              <CardDescription>
                Track all changes made to this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border border-foreground/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <History className="h-4 w-4 text-accent" />
                    <p className="font-bold text-foreground">Project Created</p>
                  </div>
                  <p className="text-sm text-foreground/60 mb-1">
                    Created by {project.createdBy || "Admin"}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {format(new Date(project.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>

                {project.modifiedBy && (
                  <div className="p-4 border border-foreground/20 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Edit className="h-4 w-4 text-accent" />
                      <p className="font-bold text-foreground">Last Modified</p>
                    </div>
                    <p className="text-sm text-foreground/60 mb-1">
                      Modified by {project.modifiedBy}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {format(new Date(project.updatedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {project.modificationHistory && project.modificationHistory.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="font-bold uppercase tracking-wider text-sm mb-3">Change History</h3>
                    {[...project.modificationHistory].reverse().map((change, index) => (
                      <div key={index} className="p-4 border border-foreground/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-foreground">{change.field}</p>
                          <p className="text-xs text-foreground/50">
                            {format(new Date(change.modifiedAt), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-foreground/60 mb-1">Old Value:</p>
                            <p className="text-foreground/80 break-words">
                              {change.oldValue !== null && change.oldValue !== undefined 
                                ? String(change.oldValue) 
                                : "(empty)"}
                            </p>
                          </div>
                          <div>
                            <p className="text-foreground/60 mb-1">New Value:</p>
                            <p className="text-foreground/80 break-words">
                              {change.newValue !== null && change.newValue !== undefined 
                                ? String(change.newValue) 
                                : "(empty)"}
                            </p>
                          </div>
                        </div>
                        {change.modifiedBy && (
                          <p className="text-xs text-foreground/50 mt-2">
                            Modified by {change.modifiedBy}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!project.modificationHistory || project.modificationHistory.length === 0) && (
                  <p className="text-center text-foreground/60 py-8">No modification history yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

