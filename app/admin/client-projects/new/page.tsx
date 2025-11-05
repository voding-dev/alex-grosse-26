"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Briefcase, Plus, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function NewClientProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createProject = useMutation(api.clientProjects.create);
  const { adminEmail } = useAdminAuth();

  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    description: "",
    status: "planning" as "planning" | "in_progress" | "review" | "completed" | "on_hold" | "cancelled",
    scope: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.clientName) {
      toast({
        title: "Error",
        description: "Please fill in title and client name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const projectId = await createProject({
        ...formData,
        email: adminEmail || undefined,
      });

      toast({
        title: "Project created!",
        description: "You can now manage this project and add key moments, sign-offs, and more.",
      });

      router.push(`/admin/client-projects/${projectId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create project.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/client-projects" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Projects
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Create Client Project
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Create a new client project for tracking work, timelines, contracts, and sign-offs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Basic Information
            </CardTitle>
            <CardDescription className="text-base">
              Required information for the project
            </CardDescription>
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
                placeholder="e.g., Brand Campaign 2024"
                required
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
                placeholder="Client Name"
                required
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
                rows={4}
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Status
            </CardTitle>
            <CardDescription className="text-base">
              Set the initial status for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
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
          </CardContent>
        </Card>

        {/* Scope */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Scope of Project
            </CardTitle>
            <CardDescription className="text-base">
              Define the project scope and deliverables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.scope}
              onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
              placeholder="Project scope, deliverables, requirements..."
              rows={6}
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Notes
            </CardTitle>
            <CardDescription className="text-base">
              Additional notes about this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Project notes..."
              rows={6}
              className="text-base"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Create Project
          </Button>
          <Link href="/admin/client-projects" className="w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline"
              className="w-full sm:w-auto font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}





