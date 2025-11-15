"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { formatDistanceToNow } from "date-fns";

const statusConfig = {
  planning: { label: "Planning", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-accent/20 text-accent border-accent/30", icon: Briefcase },
  review: { label: "Review", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle },
  on_hold: { label: "On Hold", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle },
};

export default function ProjectsPage() {
  const { adminEmail } = useAdminAuth();

  const projects = useQuery(
    api.clientProjects.list,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  // Group projects by status
  const projectsByStatus = projects.reduce((acc: Record<string, typeof projects>, project) => {
    const status = project.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(project);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Client Projects
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage client projects with timeline, notes, contracts, scope, and sign-offs. Track all project activities and history.
          </p>
        </div>
        <Link href="/admin/client-projects/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 sm:mb-12 border border-accent/30 bg-accent/5">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Projects</strong> is a project management system for tracking client work, not a full CRM. 
            Store project information, key moments, notes, contracts, scope, sign-offs, and link to portals and feedback. 
            All changes are tracked with date history for reference.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-8 sm:mb-12 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-foreground/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  Total Projects
                </p>
                <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                  {projects.length}
                </p>
              </div>
              <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-foreground/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  In Progress
                </p>
                <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                  {projectsByStatus.in_progress?.length || 0}
                </p>
              </div>
              <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-accent/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-foreground/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  Completed
                </p>
                <p className="text-2xl sm:text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
                  {projectsByStatus.completed?.length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <Briefcase className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No projects yet
            </p>
            <p className="text-sm text-foreground/70 mb-6">
              Create your first client project to start tracking work
            </p>
            <Link href="/admin/client-projects/new">
              <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(projectsByStatus).map(([status, statusProjects]) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            const StatusIcon = config.icon;

            return (
              <div key={status} className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  {config.label} ({statusProjects.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {statusProjects.map((project) => {
                    const createdDate = new Date(project.createdAt);
                    const updatedDate = new Date(project.updatedAt);
                    const keyMomentsCount = project.keyMoments?.length || 0;
                    const signOffsCount = project.signOffs?.length || 0;
                    const linkedDeliveriesCount = project.linkedDeliveryIds?.length || 0;

                    return (
                      <Link key={project._id} href={`/admin/client-projects/${project._id}`}>
                        <Card className="border border-foreground/20 bg-foreground/5 hover:border-accent/50 hover:bg-foreground/10 transition-all cursor-pointer h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground line-clamp-2" style={{ fontWeight: '900' }}>
                                {project.title}
                              </CardTitle>
                            </div>
                            <CardDescription className="text-sm font-medium text-foreground/70">
                              {project.clientName}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Status Badge */}
                            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider w-fit ${config.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </div>

                            {/* Project Info */}
                            <div className="space-y-1.5 text-xs text-foreground/60">
                              {keyMomentsCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {keyMomentsCount} key moment{keyMomentsCount !== 1 ? 's' : ''}
                                </div>
                              )}
                              {signOffsCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3" />
                                  {signOffsCount} sign-off{signOffsCount !== 1 ? 's' : ''}
                                </div>
                              )}
                              {linkedDeliveriesCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-3 w-3" />
                                  {linkedDeliveriesCount} linked portal{linkedDeliveriesCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>

                            {/* Dates */}
                            <div className="pt-2 border-t border-foreground/10 space-y-1 text-xs text-foreground/50">
                              <div>Created {formatDistanceToNow(createdDate, { addSuffix: true })}</div>
                              {updatedDate.getTime() !== createdDate.getTime() && (
                                <div>Updated {formatDistanceToNow(updatedDate, { addSuffix: true })}</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
















