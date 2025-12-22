"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ChevronUp, ChevronDown, Plus, Eye, Trash2, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectsEditorPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  // Projects
  const allProjects = useQuery(api.projects.list) || [];
  const deleteProject = useMutation(api.projects.remove);
  const reorderProjects = useMutation(api.projects.reorder);
  
  // Filter for visible items (approved/delivered)
  const projects = allProjects.filter((project) => 
    project.status === "approved" || project.status === "delivered"
  );
  
  // Draft items
  const draftProjects = allProjects.filter((project) => 
    project.status !== "approved" && project.status !== "delivered"
  );
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  const handleMoveUp = async (index: number) => {
    if (index === 0 || !adminEmail) return;
    const newOrder = [...projects];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderProjects({ ids: newOrder.map((item) => item._id), email: adminEmail });
    toast({ title: "Order updated", description: "Project order has been updated." });
  };

  const handleMoveDown = async (index: number) => {
    if (index === projects.length - 1 || !adminEmail) return;
    const newOrder = [...projects];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderProjects({ ids: newOrder.map((item) => item._id), email: adminEmail });
    toast({ title: "Order updated", description: "Project order has been updated." });
  };

  const handleDeleteClick = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteProject({ id: itemToDelete.id as any, email: adminEmail || undefined });
      toast({ title: "Project deleted", description: `"${itemToDelete.title}" has been deleted.` });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete project.", variant: "destructive" });
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              Projects Section
            </h1>
            <p className="text-base sm:text-lg" style={{ color: '#666' }}>
              Manage projects displayed on your homepage. Shows {projects.length} visible project{projects.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <Button 
            onClick={() => router.push('/admin/projects/new')} 
            className="w-full sm:w-auto font-black uppercase tracking-wider transition-all hover:opacity-90" 
            style={{ backgroundColor: '#586034', fontWeight: '900', color: '#fff' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border mb-8" style={{ backgroundColor: 'rgba(88, 96, 52, 0.08)', borderColor: 'rgba(88, 96, 52, 0.2)' }}>
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm" style={{ color: '#555' }}>
            <strong className="font-black uppercase tracking-wider" style={{ color: '#586034' }}>Projects Section</strong> - These projects appear in the Projects section on your public homepage.
          </p>
        </CardContent>
      </Card>
      
      {projects.length === 0 ? (
        <Card className="border" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardContent className="py-16 text-center">
            <Briefcase className="mx-auto h-16 w-16 mb-6" style={{ color: '#ccc' }} />
            <p className="mb-4 text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
              No projects yet.
            </p>
            <Button 
              onClick={() => router.push('/admin/projects/new')}
              className="font-black uppercase tracking-wider transition-all hover:opacity-90" 
              style={{ backgroundColor: '#586034', fontWeight: '900', color: '#fff' }}
            >
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Card key={project._id} className="group transition-all hover:shadow-lg relative" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
              <div className="cursor-pointer" onClick={() => router.push(`/admin/projects/${project._id}`)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-base" style={{ color: '#666' }}>
                    {project.clientName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#586034' }}>
                      Visible at /project/{project.slug}
                    </span>
                    <span className="text-xs" style={{ color: '#888' }}>{project.categories.join(", ")}</span>
                  </div>
                </CardContent>
              </div>
              <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }} disabled={index === 0} className="h-6 w-6 p-0 hover:bg-gray-100">
                    <ChevronUp className="h-3 w-3" style={{ color: '#555' }} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }} disabled={index === projects.length - 1} className="h-6 w-6 p-0 hover:bg-gray-100">
                    <ChevronDown className="h-3 w-3" style={{ color: '#555' }} />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteClick(project._id, project.title); }} className="hover:bg-red-50 rounded-full h-8 w-8" style={{ color: '#999' }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Draft Projects */}
      {draftProjects.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6" style={{ fontWeight: '900', color: '#1a1a1a' }}>
            Draft Projects ({draftProjects.length})
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {draftProjects.map((project) => (
              <Card key={project._id} className="group transition-all opacity-60 hover:opacity-80" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
                <div className="cursor-pointer" onClick={() => router.push(`/admin/projects/${project._id}`)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ color: '#1a1a1a' }}>{project.title}</CardTitle>
                    <CardDescription style={{ color: '#666' }}>{project.clientName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-xs uppercase" style={{ color: '#888' }}>Status: {project.status}</span>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive">Delete Project</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

