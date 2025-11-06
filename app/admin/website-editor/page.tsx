"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useMutation as useConvexMutation } from "convex/react";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { X, ChevronUp, ChevronDown, Upload, Plus, Eye, Briefcase, Trash2, Image as ImageIcon, Search, Check, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WebsiteEditorPage() {
  const { adminEmail } = useAdminAuth();
  const router = useRouter();
  
  // Hero Carousel
  const carouselImages = useQuery(api.heroCarousel.list) || [];
  const addImage = useMutation(api.heroCarousel.add);
  const removeImage = useMutation(api.heroCarousel.remove);
  const reorderImages = useMutation(api.heroCarousel.reorder);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  
  // Homepage Contact
  const homepage = useQuery(api.homepage.get);
  const updateHomepage = useMutation(api.homepage.update);
  
  // About Section
  const about = useQuery(api.about.get);
  const updateAbout = useMutation(api.about.update);
  const generateAboutUploadUrl = useConvexMutation(api.storageMutations.generateUploadUrl);
  
  // ============================================
  // PORTFOLIO & PROJECTS - WEBSITE EDITOR ONLY
  // ============================================
  // This manages what appears on your PUBLIC HOMEPAGE
  // Completely separate from Client Delivery Portals (managed under /admin/deliveries)
  // 
  // Homepage Sections:
  // - Portfolio section: Shows portfolio items from the portfolio table (separate bucket)
  // - Projects section: Shows projects from the projects table (separate bucket)
  // ============================================
  
  // PORTFOLIO - Separate bucket, completely independent from projects
  const allPortfolioItems = useQuery(api.portfolio.list) || [];
  const deletePortfolioItem = useMutation(api.portfolio.remove);
  const deleteAllPortfolioItems = useMutation(api.portfolio.deleteAll);
  const reorderPortfolioItems = useMutation(api.portfolio.reorder);
  
  // Portfolio Section - For Homepage Portfolio Display
  // Shows approved/delivered portfolio items (separate from projects)
  const portfolioItems = allPortfolioItems.filter((item) => {
    return item.status === "approved" || item.status === "delivered";
  });
  
  // Draft portfolio items (not visible on site)
  const draftPortfolioItems = allPortfolioItems.filter((item) => {
    return item.status !== "approved" && item.status !== "delivered";
  });
  
  // PROJECTS - Separate bucket, completely independent from portfolio
  const allProjects = useQuery(api.projects.list) || [];
  const deleteProject = useMutation(api.projects.remove);
  const deleteAllProjects = useMutation(api.projects.deleteAll);
  const reorderProjects = useMutation(api.projects.reorder);
  
  // Projects Section - For Homepage Projects Display
  // Shows ALL approved/delivered projects (separate from portfolio)
  const projectsForProjectsSection = allProjects.filter((project) => {
    return project.status === "approved" || project.status === "delivered";
  });
  
  // Draft projects (not visible on site)
  const draftProjects = allProjects.filter((project) => {
    return project.status !== "approved" && project.status !== "delivered";
  });
  
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  
  // Media library state for hero carousel
  const [heroMediaLibraryOpen, setHeroMediaLibraryOpen] = useState(false);
  const [heroMediaTypeFilter, setHeroMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [heroMediaFolderFilter, setHeroMediaFolderFilter] = useState<string>("all");
  const [heroMediaSearchQuery, setHeroMediaSearchQuery] = useState("");
  const [selectedHeroMediaItems, setSelectedHeroMediaItems] = useState<Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video" }>>([]);
  
  // Media library state for about section
  const [aboutMediaLibraryOpen, setAboutMediaLibraryOpen] = useState(false);
  const [aboutMediaTypeFilter, setAboutMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [aboutMediaFolderFilter, setAboutMediaFolderFilter] = useState<string>("all");
  const [aboutMediaSearchQuery, setAboutMediaSearchQuery] = useState("");
  
  // Media library queries
  const heroMedia = useQuery(api.mediaLibrary.list, {
    type: heroMediaTypeFilter === "all" ? undefined : heroMediaTypeFilter,
    folder: heroMediaFolderFilter === "all" ? undefined : heroMediaFolderFilter,
    search: heroMediaSearchQuery || undefined,
    includeAssets: false,
  });
  const aboutMedia = useQuery(api.mediaLibrary.list, {
    type: aboutMediaTypeFilter === "all" ? undefined : aboutMediaTypeFilter,
    folder: aboutMediaFolderFilter === "all" ? undefined : aboutMediaFolderFilter,
    search: aboutMediaSearchQuery || undefined,
    includeAssets: false,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);
  
  // Homepage Contact Form Data
  const [homepageFormData, setHomepageFormData] = useState({
    heroText: "",
    contactHeading: "",
    contactText: "",
    contactEmail: "",
    contactPhone: "",
    contactInstagramUrl: "",
    contactLinkedinUrl: "",
    formHeading: "",
  });
  
  // About Form Data
  const [aboutFormData, setAboutFormData] = useState({
    heading: "",
    bio: "",
    littleBits: "",
    contactEmail: "",
    phone: "",
    instagramUrl: "",
    linkedinUrl: "",
    awards: [] as string[],
    clientList: [] as string[],
    imageStorageId: "",
    awardsHeading: "",
    littleBitsHeading: "",
    clientListHeading: "",
    contactHeading: "",
  });
  
  const [newAward, setNewAward] = useState("");
  const [newClient, setNewClient] = useState("");
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  
  const aboutImageUrl = useQuery(
    api.storageQueries.getUrl,
    aboutFormData.imageStorageId ? { storageId: aboutFormData.imageStorageId } : "skip"
  );
  
  useEffect(() => {
    if (homepage) {
      setHomepageFormData({
        heroText: homepage.heroText || "",
        contactHeading: homepage.contactHeading || "",
        contactText: homepage.contactText || "",
        contactEmail: homepage.contactEmail || "",
        contactPhone: homepage.contactPhone || "",
        contactInstagramUrl: homepage.contactInstagramUrl || "",
        contactLinkedinUrl: homepage.contactLinkedinUrl || "",
        formHeading: homepage.formHeading || "",
      });
    }
  }, [homepage]);
  
  useEffect(() => {
    if (about) {
      setAboutFormData({
        heading: about.heading || "",
        bio: about.bio || "",
        littleBits: about.littleBits || "",
        contactEmail: about.email || "",
        phone: about.phone || "",
        instagramUrl: about.instagramUrl || "",
        linkedinUrl: about.linkedinUrl || "",
        awards: about.awards || [],
        clientList: about.clientList || [],
        imageStorageId: about.imageStorageId || "",
        awardsHeading: about.awardsHeading || "",
        littleBitsHeading: about.littleBitsHeading || "",
        clientListHeading: about.clientListHeading || "",
        contactHeading: about.contactHeading || "",
      });
    }
  }, [about]);
  
  // Hero Carousel handlers
  const handleSelectHeroMediaFromLibrary = (media: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => {
    setSelectedHeroMediaItems((prev) => {
      const isSelected = prev.some((m) => m._id === media._id);
      if (isSelected) {
        return prev.filter((m) => m._id !== media._id);
      } else {
        return [...prev, media];
      }
    });
  };

  const handleAddSelectedHeroMedia = async () => {
    if (selectedHeroMediaItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one image from the media library.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const media of selectedHeroMediaItems) {
        try {
          if (media.type !== "image") {
            errorCount++;
            continue;
          }
          
          await addImage({
            imageStorageId: media.storageKey,
            alt: media.filename,
            email: adminEmail || undefined,
          });

          successCount++;
        } catch (error) {
          console.error(`Error adding media ${media.filename}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Images added",
          description: `${successCount} image${successCount !== 1 ? 's' : ''} added successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
        setSelectedHeroMediaItems([]);
        setHeroMediaLibraryOpen(false);
      } else {
        toast({
          title: "Failed to add images",
          description: "All items failed to add. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add images.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Failed to upload image");
      }
      
      const { storageId } = await result.json();
      
      await addImage({
        imageStorageId: storageId,
        alt: file.name,
        email: adminEmail || undefined,
      });
      
      toast({
        title: "Image uploaded",
        description: "Hero carousel image added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemoveHero = async (id: Id<"heroCarousel">) => {
    try {
      await removeImage({
        id,
        email: adminEmail || undefined,
      });
      toast({
        title: "Image removed",
        description: "Hero carousel image removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image.",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...carouselImages];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail,
    });
  };
  
  const handleMoveDown = async (index: number) => {
    if (index === carouselImages.length - 1) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...carouselImages];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail,
    });
  };

  // Portfolio reorder handlers
  const handleMovePortfolioUp = async (index: number) => {
    if (index === 0) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...portfolioItems];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderPortfolioItems({
      ids: newOrder.map((item) => item._id),
      email: adminEmail,
    });
  };

  const handleMovePortfolioDown = async (index: number) => {
    if (index === portfolioItems.length - 1) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...portfolioItems];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderPortfolioItems({
      ids: newOrder.map((item) => item._id),
      email: adminEmail,
    });
  };

  // Projects reorder handlers
  const handleMoveProjectUp = async (index: number) => {
    if (index === 0) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...projectsForProjectsSection];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderProjects({
      ids: newOrder.map((project) => project._id),
      email: adminEmail,
    });
  };

  const handleMoveProjectDown = async (index: number) => {
    if (index === projectsForProjectsSection.length - 1) return;
    if (!adminEmail) {
      toast({
        title: "Authentication required",
        description: "Please wait for authentication to complete.",
        variant: "destructive",
      });
      return;
    }
    const newOrder = [...projectsForProjectsSection];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderProjects({
      ids: newOrder.map((project) => project._id),
      email: adminEmail,
    });
  };
  
  // Homepage Contact handlers
  const handleSaveHomepage = async () => {
    try {
      await updateHomepage({
        ...homepageFormData,
        email: adminEmail || undefined,
      });
      toast({
        title: "Contact section updated",
        description: "Changes saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact section.",
        variant: "destructive",
      });
    }
  };
  
  
  // About handlers
  const handleSaveAbout = async () => {
    try {
      await updateAbout({
        ...aboutFormData,
        email: adminEmail || undefined,
      });
      toast({
        title: "About section updated",
        description: "Changes saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update about section.",
        variant: "destructive",
      });
    }
  };
  
  const handleSelectAboutImageFromLibrary = async (media: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => {
    if (media.type !== "image") {
      toast({
        title: "Invalid selection",
        description: "Please select an image for the about section.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAboutFormData({ ...aboutFormData, imageStorageId: media.storageKey });
      
      await updateAbout({
        imageStorageId: media.storageKey,
        email: adminEmail || undefined,
      });

      toast({
        title: "Image updated",
        description: "About section image updated successfully.",
      });
      
      setAboutMediaLibraryOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update image.",
        variant: "destructive",
      });
    }
  };

  const handleAboutImageUpload = async (file: File) => {
    try {
      const uploadUrl = await generateAboutUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Failed to upload image");
      }
      
      const { storageId } = await result.json();
      
      setAboutFormData({ ...aboutFormData, imageStorageId: storageId });
      
      await updateAbout({
        imageStorageId: storageId,
        email: adminEmail || undefined,
      });
      
      toast({
        title: "Image uploaded",
        description: "About image updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    }
  };
  
  const addAward = () => {
    if (newAward.trim()) {
      setAboutFormData({
        ...aboutFormData,
        awards: [...aboutFormData.awards, newAward.trim()],
      });
      setNewAward("");
    }
  };
  
  const removeAward = (index: number) => {
    setAboutFormData({
      ...aboutFormData,
      awards: aboutFormData.awards.filter((_, i) => i !== index),
    });
  };
  
  const addClient = () => {
    if (newClient.trim()) {
      setAboutFormData({
        ...aboutFormData,
        clientList: [...aboutFormData.clientList, newClient.trim()],
      });
      setNewClient("");
    }
  };
  
  const removeClient = (index: number) => {
    setAboutFormData({
      ...aboutFormData,
      clientList: aboutFormData.clientList.filter((_, i) => i !== index),
    });
  };

  // Delete handlers for portfolio/projects
  const [deleteItemType, setDeleteItemType] = useState<"portfolio" | "project" | null>(null);
  
  const handleDeletePortfolioClick = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setDeleteItemType("portfolio");
    setDeleteDialogOpen(true);
  };

  const handleDeleteProjectClick = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setDeleteItemType("project");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !deleteItemType) return;

    try {
      if (deleteItemType === "portfolio") {
        await deletePortfolioItem({ id: itemToDelete.id as any, email: adminEmail || undefined });
      } else {
        await deleteProject({ id: itemToDelete.id as any, email: adminEmail || undefined });
      }
      toast({
        title: "Item deleted",
        description: `"${itemToDelete.title}" has been permanently deleted.`,
      });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setDeleteItemType(null);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  // Delete all handler (context-aware: portfolio or projects)
  const [deleteAllType, setDeleteAllType] = useState<"portfolio" | "projects" | null>(null);
  
  const handleDeleteAllPortfolioClick = () => {
    setDeleteAllType("portfolio");
    setDeleteAllDialogOpen(true);
  };
  
  const handleDeleteAllProjectsClick = () => {
    setDeleteAllType("projects");
    setDeleteAllDialogOpen(true);
  };
  
  const handleDeleteAllConfirm = async () => {
    if (!deleteAllType) return;
    
    try {
      if (deleteAllType === "portfolio") {
        const result = await deleteAllPortfolioItems({ email: adminEmail || undefined });
        toast({
          title: "All portfolio items deleted",
          description: `Successfully deleted ${result?.deletedCount || allPortfolioItems.length} portfolio item${(result?.deletedCount || allPortfolioItems.length) === 1 ? '' : 's'} and all associated assets.`,
        });
      } else {
        const result = await deleteAllProjects({ email: adminEmail || undefined });
        toast({
          title: "All projects deleted",
          description: `Successfully deleted ${result?.deletedCount || allProjects.length} project${(result?.deletedCount || allProjects.length) === 1 ? '' : 's'} and all associated assets.`,
        });
      }
      setDeleteAllDialogOpen(false);
      setDeleteAllType(null);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete all items.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Website Editor
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg">
              Manage all content that appears on your website: Hero carousel, Portfolio, Projects, About section, and Contact section.
            </p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="hero" className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-5 max-w-4xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 !h-auto items-center gap-1">
          <TabsTrigger 
            value="hero" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Hero
          </TabsTrigger>
          <TabsTrigger 
            value="portfolio" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Portfolio
          </TabsTrigger>
          <TabsTrigger 
            value="projects" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Projects
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            About
          </TabsTrigger>
          <TabsTrigger 
            value="contact" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Contact
          </TabsTrigger>
        </TabsList>
        
        {/* Hero Carousel Tab */}
        <TabsContent value="hero" className="space-y-8 mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Add Hero Image
              </CardTitle>
              <CardDescription className="text-base">Upload a new image for the hero carousel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="hero-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-6 py-3 hover:bg-accent/20 transition-colors font-bold uppercase tracking-wider">
                    <Upload className="h-5 w-5" />
                    <span>{uploading ? "Uploading..." : "Choose Image"}</span>
                  </div>
                </Label>
                <input
                  id="hero-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleHeroImageUpload(file);
                  }}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  onClick={() => setHeroMediaLibraryOpen(true)}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-foreground/20 hover:border-accent/50 px-6 py-3 font-bold uppercase tracking-wider"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span>Select from Library</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hero Text */}
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Hero Text
              </CardTitle>
              <CardDescription className="text-base">Text displayed under your name SVG in the hero section</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="heroText" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Hero Text
                </Label>
                <Input
                  id="heroText"
                  value={homepageFormData.heroText}
                  onChange={(e) => setHomepageFormData({ ...homepageFormData, heroText: e.target.value })}
                  placeholder="e.g., Photographer & Director"
                  className="h-12 text-base"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  This text appears below your name SVG in the hero section. Leave empty to use default text.
                </p>
              </div>
              <Button
                onClick={handleSaveHomepage}
                className="w-full bg-accent text-background hover:bg-accent/90 font-bold uppercase tracking-wider py-6"
                style={{ fontWeight: '700' }}
              >
                Save Hero Text
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Carousel Images ({carouselImages.length})
              </CardTitle>
              <CardDescription className="text-base">
                {carouselImages.length === 0
                  ? "No images uploaded yet. Upload images above to get started."
                  : "Reorder images using the arrows. Images will display in this order."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carouselImages.length === 0 ? (
                <div className="py-16 text-center">
                  <Eye className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No carousel images yet.
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload an image to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {carouselImages.map((image, index) => (
                    <div
                      key={image._id}
                      className="flex items-center gap-4 rounded-lg border border-foreground/10 bg-foreground/5 p-4 hover:bg-foreground/10 transition-colors"
                    >
                      <div className="relative h-24 w-32 overflow-hidden rounded-md bg-black">
                        <HeroCarouselImage
                          storageId={image.imageStorageId}
                          alt={image.alt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{image.alt || "Untitled"}</p>
                        <p className="text-xs text-foreground/60 font-medium uppercase tracking-wider">Position: {index + 1}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === carouselImages.length - 1}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHero(image._id)}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Portfolio
              </h2>
              <p className="text-sm sm:text-base text-foreground/70">
                Manage the Portfolio section on your public homepage. Shows {portfolioItems.length} {portfolioItems.length === 1 ? 'item' : 'items'} (approved/delivered portfolio items). This is for public display only - separate from client delivery portals and projects.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/admin/portfolio/new')} 
                className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Portfolio Item
              </Button>
            </div>
          </div>
          
          {/* Info Banner - Clarify this is for public site only */}
          <Card className="border border-accent/30 bg-accent/5">
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>This manages your public website</strong> - what visitors see on your homepage Portfolio section. 
                Shows portfolio items from the portfolio table (separate from projects). This is completely separate from <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Delivery Portals</strong> (managed under Deliveries), which are PIN-gated portals for sending files to clients.
              </p>
            </CardContent>
          </Card>
          
          {portfolioItems.length === 0 ? (
            <Card className="border border-foreground/20">
              <CardContent className="py-16 text-center">
                <Eye className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                  No portfolio items yet.
                </p>
                <Button 
                  onClick={() => router.push('/admin/portfolio/new')}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Create Your First Portfolio Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item, index) => (
                <Card key={item._id} className="group transition-all hover:bg-foreground/10 border border-foreground/20 hover:border-accent/50 hover:shadow-lg relative">
                  <div className="cursor-pointer" onClick={() => router.push(`/admin/portfolio/${item._id}`)}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-base text-foreground/70">
                        {item.clientName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-accent font-bold uppercase tracking-wider flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Visible on site
                        </span>
                        <span className="text-xs text-foreground/60">
                          {item.categories.join(", ")}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                  <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMovePortfolioUp(index);
                        }}
                        disabled={index === 0}
                        className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 h-6 w-6 p-0"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMovePortfolioDown(index);
                        }}
                        disabled={index === portfolioItems.length - 1}
                        className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 h-6 w-6 p-0"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeletePortfolioClick(item._id, item.title);
                      }}
                      className="text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Projects
              </h2>
              <p className="text-sm sm:text-base text-foreground/70">
                Manage the Projects section on your public homepage. Shows {projectsForProjectsSection.length} {projectsForProjectsSection.length === 1 ? 'project' : 'projects'} (all approved/delivered projects). This is for public display only - separate from client delivery portals.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/admin/projects/new')}
                className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Info Banner - Clarify this is for public site only */}
          <Card className="border border-accent/30 bg-accent/5">
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>This manages your public website</strong> - what visitors see on your homepage Projects section. 
                Shows all approved/delivered projects from the projects table (separate from portfolio items).
                This is completely separate from <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Delivery Portals</strong> (managed under Deliveries), which are PIN-gated portals for sending files to clients.
              </p>
            </CardContent>
          </Card>

          {/* Approved Projects (Visible on Site) */}
          {projectsForProjectsSection.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <h3 className="mb-6 sm:mb-8 text-lg sm:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-accent" /> Visible on Public Site ({projectsForProjectsSection.length} {projectsForProjectsSection.length === 1 ? 'project' : 'projects'})
              </h3>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {projectsForProjectsSection.map((project, index) => (
                  <Card key={project._id} className="group transition-all hover:bg-foreground/10 border border-foreground/20 hover:border-accent/50 hover:shadow-lg relative">
                    <div className="cursor-pointer" onClick={() => router.push(`/admin/projects/${project._id}`)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                          {project.title}
                        </CardTitle>
                        <CardDescription className="text-base text-foreground/70">
                          {project.clientName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-accent font-bold uppercase tracking-wider">
                            Visible at /project/{project.slug}
                          </span>
                          <span className="text-xs text-foreground/60">
                            {project.categories.join(", ")}
                          </span>
                        </div>
                      </CardContent>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveProjectUp(index);
                          }}
                          disabled={index === 0}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 h-6 w-6 p-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveProjectDown(index);
                          }}
                          disabled={index === projectsForProjectsSection.length - 1}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 h-6 w-6 p-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProjectClick(project._id, project.title);
                        }}
                        className="text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Draft Projects (Not Visible) */}
          {draftProjects.length > 0 && (
            <div className="mb-8 sm:mb-12">
              <h3 className="mb-6 sm:mb-8 text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Draft Projects
              </h3>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {draftProjects.map((project) => (
                  <Card key={project._id} className="group transition-all hover:bg-foreground/10 border border-foreground/20 hover:border-accent/50 hover:shadow-lg relative">
                    <div className="cursor-pointer" onClick={() => router.push(`/admin/projects/${project._id}`)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                          {project.title}
                        </CardTitle>
                        <CardDescription className="text-base text-foreground/70">
                          {project.clientName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-foreground/60 font-medium uppercase tracking-wider">
                            Status: {project.status}
                          </span>
                          <span className="text-xs text-foreground/60">
                            {project.categories.join(", ")}
                          </span>
                        </div>
                      </CardContent>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteProjectClick(project._id, project.title);
                      }}
                      className="absolute bottom-4 right-4 z-10 text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {allProjects.length === 0 && (
            <Card className="border border-foreground/20">
              <CardContent className="py-16 text-center">
                <Briefcase className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                  No projects yet.
                </p>
                <Button 
                  onClick={() => router.push('/admin/projects/new')}
                  className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Contact Section Tab */}
        <TabsContent value="contact" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Contact Section
              </CardTitle>
              <CardDescription className="text-base">
                Edit the content that appears in the Contact section on your homepage. This section appears below the "CONTACT" title banner.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label htmlFor="contactHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Contact Section Heading
                </Label>
                <Input
                  id="contactHeading"
                  value={homepageFormData.contactHeading}
                  onChange={(e) => setHomepageFormData({ ...homepageFormData, contactHeading: e.target.value })}
                  placeholder="e.g., GET IN TOUCH"
                  className="h-12 text-base"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Optional heading displayed above the contact text in the content area. Leave empty to show no heading.
                </p>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <Label htmlFor="contactText" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Contact Section Text
                </Label>
                <Textarea
                  id="contactText"
                  value={homepageFormData.contactText}
                  onChange={(e) => setHomepageFormData({ ...homepageFormData, contactText: e.target.value })}
                  rows={4}
                  className="text-base"
                  placeholder="At Ian Courtright Creative, I create high-quality visual work..."
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Main descriptive text displayed in the left column of the Contact section.
                </p>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-6">
                <Label className="text-base font-black uppercase tracking-wider block" style={{ fontWeight: '900' }}>
                  Contact Information
                </Label>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="contactEmail" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                      Email
                    </Label>
                    <Input
                      id="contactEmail"
                      value={homepageFormData.contactEmail}
                      onChange={(e) => setHomepageFormData({ ...homepageFormData, contactEmail: e.target.value })}
                      className="h-12 text-base"
                      placeholder="hello@iancourtright.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                      Phone
                    </Label>
                    <Input
                      id="contactPhone"
                      value={homepageFormData.contactPhone}
                      onChange={(e) => setHomepageFormData({ ...homepageFormData, contactPhone: e.target.value })}
                      className="h-12 text-base"
                      placeholder="843-847-0793"
                    />
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="contactInstagramUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                      Instagram URL
                    </Label>
                    <Input
                      id="contactInstagramUrl"
                      value={homepageFormData.contactInstagramUrl}
                      onChange={(e) => setHomepageFormData({ ...homepageFormData, contactInstagramUrl: e.target.value })}
                      className="h-12 text-base"
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactLinkedinUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                      LinkedIn URL
                    </Label>
                    <Input
                      id="contactLinkedinUrl"
                      value={homepageFormData.contactLinkedinUrl}
                      onChange={(e) => setHomepageFormData({ ...homepageFormData, contactLinkedinUrl: e.target.value })}
                      className="h-12 text-base"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <Label htmlFor="formHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Contact Form Heading
                </Label>
                <Input
                  id="formHeading"
                  value={homepageFormData.formHeading}
                  onChange={(e) => setHomepageFormData({ ...homepageFormData, formHeading: e.target.value })}
                  placeholder="GET IN TOUCH"
                  className="h-12 text-base"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Heading displayed above the contact form in the right column. Leave empty to use default "GET IN TOUCH".
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveHomepage} 
              size="lg" 
              className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Save Contact Section
            </Button>
          </div>
        </TabsContent>
        
        {/* About Section Tab */}
        <TabsContent value="about" className="space-y-8">
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                About Image
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">Upload a photo for the About section</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-6">
                {aboutFormData.imageStorageId && aboutImageUrl && (
                  <div className="relative aspect-[3/4] w-64 overflow-hidden rounded-lg border-2 border-foreground/20 bg-black shadow-xl">
                    <img
                      src={aboutImageUrl}
                      alt="About"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Label htmlFor="about-image-upload" className="cursor-pointer">
                    <div className="flex items-center gap-3 rounded-lg border-2 border-accent/30 bg-accent/10 px-8 py-4 hover:bg-accent/20 transition-all font-bold uppercase tracking-wider w-fit shadow-md hover:shadow-lg">
                      <Upload className="h-5 w-5" />
                      <span>Choose Image</span>
                    </div>
                  </Label>
                  <input
                    id="about-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAboutImageUpload(file);
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setAboutMediaLibraryOpen(true)}
                    className="flex items-center gap-2 rounded-lg border-2 border-foreground/20 hover:border-accent/50 px-8 py-4 font-bold uppercase tracking-wider shadow-md hover:shadow-lg"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span>Select from Library</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Section Heading
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">Main heading for the About section</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <Input
                value={aboutFormData.heading}
                onChange={(e) => setAboutFormData({ ...aboutFormData, heading: e.target.value })}
                placeholder="e.g., ABOUT ME or IAN COURTRIGHT"
                className="h-12 text-base w-full border-foreground/20 focus:border-accent/50"
              />
              <p className="mt-3 text-xs text-foreground/60 leading-relaxed">
                Leave empty to use the default SVG logo. If set, this text will replace the SVG.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Bio
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">Main bio text displayed in the About section</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <Textarea
                value={aboutFormData.bio}
                onChange={(e) => setAboutFormData({ ...aboutFormData, bio: e.target.value })}
                rows={8}
                placeholder="Enter your bio text here..."
                className="w-full text-base border-foreground/20 focus:border-accent/50 resize-none"
              />
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Awards
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">List of awards and achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-4">
                <Label htmlFor="awardsHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Awards Section Heading
                </Label>
                <Input
                  id="awardsHeading"
                  value={aboutFormData.awardsHeading}
                  onChange={(e) => setAboutFormData({ ...aboutFormData, awardsHeading: e.target.value })}
                  placeholder="AWARDS (default)"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newAward}
                  onChange={(e) => setNewAward(e.target.value)}
                  placeholder="Add award..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAward();
                    }
                  }}
                  className="h-12 text-base flex-1 border-foreground/20 focus:border-accent/50"
                />
                <Button 
                  onClick={addAward}
                  className="w-full sm:w-auto sm:px-8 font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Add
                </Button>
              </div>
              {aboutFormData.awards.length > 0 && (
                <div className="space-y-3 pt-2">
                  {aboutFormData.awards.map((award, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/5 p-4 hover:bg-foreground/10 hover:border-accent/30 transition-all">
                      <span className="font-bold">{award}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAward(index)}
                        className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Little Bits
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">Additional information about your background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-4">
                <Label htmlFor="littleBitsHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Little Bits Section Heading
                </Label>
                <Input
                  id="littleBitsHeading"
                  value={aboutFormData.littleBitsHeading}
                  onChange={(e) => setAboutFormData({ ...aboutFormData, littleBitsHeading: e.target.value })}
                  placeholder="LITTLE BITS (default)"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                />
              </div>
              <Textarea
                value={aboutFormData.littleBits}
                onChange={(e) => setAboutFormData({ ...aboutFormData, littleBits: e.target.value })}
                rows={6}
                placeholder="Enter additional information..."
                className="w-full text-base border-foreground/20 focus:border-accent/50 resize-none"
              />
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-6 border-b border-foreground/10">
              <CardTitle className="text-2xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Partial Client List
              </CardTitle>
              <CardDescription className="text-base text-foreground/70">List of clients to display</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-4">
                <Label htmlFor="clientListHeading" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Client List Section Heading
                </Label>
                <Input
                  id="clientListHeading"
                  value={aboutFormData.clientListHeading}
                  onChange={(e) => setAboutFormData({ ...aboutFormData, clientListHeading: e.target.value })}
                  placeholder="PARTIAL CLIENT LIST (default)"
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Add client name..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addClient();
                    }
                  }}
                  className="h-12 text-base flex-1 border-foreground/20 focus:border-accent/50"
                />
                <Button 
                  onClick={addClient}
                  className="w-full sm:w-auto sm:px-8 font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Add
                </Button>
              </div>
              {aboutFormData.clientList.length > 0 && (
                <div className="space-y-3 pt-2">
                  {aboutFormData.clientList.map((client, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-foreground/10 bg-foreground/5 p-4 hover:bg-foreground/10 hover:border-accent/30 transition-all">
                      <span className="font-bold">{client}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClient(index)}
                        className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end pb-4">
            <Button 
              onClick={handleSaveAbout} 
              size="lg" 
              className="w-full sm:w-auto sm:min-w-[240px] h-14 text-base font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-lg hover:shadow-xl"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Save About Section
            </Button>
          </div>
        </TabsContent>
        
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              ⚠️ PERMANENT DELETION
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you absolutely sure you want to delete <strong>"{itemToDelete?.title}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                ⚠️ WARNING: THIS ACTION IS PERMANENT
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                This will permanently delete the item and <strong>all of its associated assets</strong>. 
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              ⚠️ DELETE ALL PROJECTS
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you absolutely sure you want to delete <strong>ALL {allProjects.length} project{allProjects.length === 1 ? '' : 's'}</strong> from the database?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                ⚠️ WARNING: THIS ACTION IS PERMANENT AND IRREVERSIBLE
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                This will permanently delete:
              </p>
              <ul className="text-sm text-foreground/80 leading-relaxed list-disc list-inside space-y-1 mb-3">
                <li>All {allProjects.length} project{allProjects.length === 1 ? '' : 's'} in the database</li>
                <li>All associated assets and files</li>
                <li>All portfolio and projects entries from the website builder</li>
              </ul>
              <p className="text-sm text-foreground/80 leading-relaxed font-bold">
                This action cannot be undone!
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialogOpen(false)}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllConfirm}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All {allProjects.length} Project{allProjects.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hero Carousel Media Library Dialog */}
      <Dialog open={heroMediaLibraryOpen} onOpenChange={setHeroMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select from Media Library</DialogTitle>
            <DialogDescription>
              Choose images from your media library to add to the hero carousel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search media..."
                  value={heroMediaSearchQuery}
                  onChange={(e) => setHeroMediaSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={heroMediaTypeFilter} onValueChange={(v) => setHeroMediaTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={heroMediaFolderFilter} onValueChange={setHeroMediaFolderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {mediaFolders?.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto">
              {heroMedia && heroMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {heroMedia.filter((m) => m.type === "image").map((media) => {
                    const isSelected = selectedHeroMediaItems.some((m) => m._id === media._id.toString());
                    return (
                      <HeroMediaSelectorItem
                        key={media._id.toString()}
                        media={media}
                        onSelect={handleSelectHeroMediaFromLibrary}
                        isSelected={isSelected}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No media found
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload media to your media library first.
                  </p>
                </div>
              )}
            </div>
            {selectedHeroMediaItems.length > 0 && (
              <div className="border-t border-foreground/10 pt-4">
                <p className="text-sm text-foreground/60 mb-2">
                  {selectedHeroMediaItems.length} item{selectedHeroMediaItems.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHeroMediaLibraryOpen(false);
                setSelectedHeroMediaItems([]);
              }}
              className="border-foreground/20 hover:bg-foreground/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedHeroMedia}
              disabled={uploading || selectedHeroMediaItems.length === 0}
              className="bg-accent hover:bg-accent/90 text-background"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add {selectedHeroMediaItems.length} Image{selectedHeroMediaItems.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About Section Media Library Dialog */}
      <Dialog open={aboutMediaLibraryOpen} onOpenChange={setAboutMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select from Media Library</DialogTitle>
            <DialogDescription>
              Choose an image from your media library for the about section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search media..."
                  value={aboutMediaSearchQuery}
                  onChange={(e) => setAboutMediaSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={aboutMediaTypeFilter} onValueChange={(v) => setAboutMediaTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={aboutMediaFolderFilter} onValueChange={setAboutMediaFolderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {mediaFolders?.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto">
              {aboutMedia && aboutMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {aboutMedia.filter((m) => m.type === "image").map((media) => (
                    <AboutMediaSelectorItem
                      key={media._id.toString()}
                      media={media}
                      onSelect={handleSelectAboutImageFromLibrary}
                      isSelected={aboutFormData.imageStorageId === media.storageKey}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No media found
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload media to your media library first.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAboutMediaLibraryOpen(false)}
              className="border-foreground/20 hover:bg-foreground/10"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Media Selector Item Components
function HeroMediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: { _id: string | Id<"mediaLibrary">; storageKey: string; filename: string; type: "image" | "video" }; 
  onSelect: (media: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => void; 
  isSelected: boolean;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
  );

  const handleClick = () => {
    onSelect({
      _id: media._id.toString(),
      storageKey: media.storageKey,
      filename: media.filename,
      type: media.type,
    });
  };

  return (
    <div
      className={`relative aspect-square border rounded overflow-hidden cursor-pointer hover:border-accent transition ${
        isSelected ? "border-accent ring-2 ring-accent" : "border-foreground/20"
      }`}
      onClick={handleClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={media.filename || "Media"} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-foreground/30" />
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function AboutMediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: { _id: string | Id<"mediaLibrary">; storageKey: string; filename: string; type: "image" | "video" }; 
  onSelect: (media: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => void; 
  isSelected: boolean;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
  );

  const handleClick = () => {
    onSelect({
      _id: media._id.toString(),
      storageKey: media.storageKey,
      filename: media.filename,
      type: media.type,
    });
  };

  return (
    <div
      className={`relative aspect-square border rounded overflow-hidden cursor-pointer hover:border-accent transition ${
        isSelected ? "border-accent ring-2 ring-accent" : "border-foreground/20"
      }`}
      onClick={handleClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={media.filename || "Media"} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-foreground/30" />
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

