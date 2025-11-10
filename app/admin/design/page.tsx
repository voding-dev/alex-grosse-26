"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { PortraitsGalleryImage } from "@/components/portraits-gallery-image";
import { X, ChevronUp, ChevronDown, Upload, Eye, ArrowLeft, Trash2, Image as ImageIcon, Search, Check, Loader2 } from "lucide-react";
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
import { BookingSelectorModal } from "@/components/booking-selector-modal";

export default function DesignEditorPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const router = useRouter();
  
  // Hero Carousel
  const heroCarouselImages = useQuery(api.designHeroCarousel.list) || [];
  const addHeroImage = useMutation(api.designHeroCarousel.add);
  const removeHeroImage = useMutation(api.designHeroCarousel.remove);
  const reorderHeroImages = useMutation(api.designHeroCarousel.reorder);
  
  // Gallery
  const galleryImages = useQuery(api.designGallery.list) || [];
  const addGalleryImage = useMutation(api.designGallery.add);
  const removeGalleryImage = useMutation(api.designGallery.remove);
  const reorderGalleryImages = useMutation(api.designGallery.reorder);
  
  // Design page content
  const design = useQuery(api.design.get);
  const updateDesign = useMutation(api.design.update);
  const deleteDesign = useMutation(api.design.deleteAll);
  
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Media library state for hero carousel
  const [heroMediaLibraryOpen, setHeroMediaLibraryOpen] = useState(false);
  const [heroMediaTypeFilter, setHeroMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [heroMediaFolderFilter, setHeroMediaFolderFilter] = useState<string>("all");
  const [heroMediaSearchQuery, setHeroMediaSearchQuery] = useState("");
  const [selectedHeroMediaItems, setSelectedHeroMediaItems] = useState<Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video" }>>([]);
  
  // Media library state for gallery
  const [galleryMediaLibraryOpen, setGalleryMediaLibraryOpen] = useState(false);
  const [galleryMediaTypeFilter, setGalleryMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [galleryMediaFolderFilter, setGalleryMediaFolderFilter] = useState<string>("all");
  const [galleryMediaSearchQuery, setGalleryMediaSearchQuery] = useState("");
  const [selectedGalleryMediaItems, setSelectedGalleryMediaItems] = useState<Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video"; width?: number; height?: number }>>([]);
  
  // Media library queries
  const heroMedia = useQuery(api.mediaLibrary.list, {
    type: heroMediaTypeFilter === "all" ? undefined : heroMediaTypeFilter,
    folder: heroMediaFolderFilter === "all" ? undefined : heroMediaFolderFilter,
    search: heroMediaSearchQuery || undefined,
    includeAssets: false,
  });
  const galleryMedia = useQuery(api.mediaLibrary.list, {
    type: galleryMediaTypeFilter === "all" ? undefined : galleryMediaTypeFilter,
    folder: galleryMediaFolderFilter === "all" ? undefined : galleryMediaFolderFilter,
    search: galleryMediaSearchQuery || undefined,
    includeAssets: false,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);
  
  // Design Form Data
  const [designFormData, setDesignFormData] = useState({
    heroText: "",
    bookingToken: "",
    stripeUrl: "",
    howItWorksTitle: "",
    howItWorksSteps: [] as Array<{ title: string; description: string }>,
    services: [] as Array<{ title: string; description: string }>,
  });
  const [bookingSelectorOpen, setBookingSelectorOpen] = useState(false);
  
  useEffect(() => {
    // Default "How It Works" for design page
    const defaultHowItWorksTitle = "How It Works";
    const defaultHowItWorksSteps = [
      {
        title: "Discovery",
        description: "We'll discuss your goals, brand, and project requirements."
      },
      {
        title: "Concept",
        description: "I'll create initial concepts and designs based on our discussion."
      },
      {
        title: "Refinement",
        description: "We'll refine the designs based on your feedback and preferences."
      },
      {
        title: "Delivery",
        description: "Receive final files in all formats needed for your project."
      }
    ];

    // Default services for design page
    const defaultServices = [
      {
        title: "Brand Identity",
        description: "Stand out with a visual identity that tells your story at a glance. You'll feel confident knowing your brand looks as professional and polished as you are."
      },
      {
        title: "Marketing Materials",
        description: "Everything from your storefront signage and menus to your social posts and ads—looking cohesive and elevated so customers take notice and remember you."
      },
      {
        title: "Ongoing Support",
        description: "Stop worrying about design. Get the creative output you need, when you need it, so you can focus on what you do best—running your business."
      }
    ];

    if (design) {
      // If no howItWorksTitle exists, use default
      const howItWorksTitle = design.howItWorksTitle || defaultHowItWorksTitle;
      
      // If no howItWorksSteps exist, populate with defaults
      const howItWorksSteps = design.howItWorksSteps && design.howItWorksSteps.length > 0 
        ? design.howItWorksSteps 
        : defaultHowItWorksSteps;

      // If no services exist, populate with defaults
      const services = design.services && design.services.length > 0 
        ? design.services 
        : defaultServices;

      // If any defaults need to be saved, automatically save them
      const needsUpdate = (!design.howItWorksTitle || design.howItWorksTitle === "") ||
                          (!design.howItWorksSteps || design.howItWorksSteps.length === 0) ||
                          (!design.services || design.services.length === 0);

      if (needsUpdate) {
        updateDesign({
          heroText: design.heroText,
          bookingToken: design.bookingToken,
          stripeUrl: design.stripeUrl,
          howItWorksTitle: howItWorksTitle,
          howItWorksSteps: howItWorksSteps,
          services: services,
          email: adminEmail || undefined,
        });
      }

      setDesignFormData({
        heroText: design.heroText || "",
        bookingToken: design.bookingToken || "",
        stripeUrl: design.stripeUrl || "",
        howItWorksTitle: howItWorksTitle,
        howItWorksSteps: howItWorksSteps,
        services: services,
      });
    } else if (design === null) {
      // If design record doesn't exist yet, create it with default data
      updateDesign({
        heroText: "",
        stripeUrl: "",
        howItWorksTitle: defaultHowItWorksTitle,
        howItWorksSteps: defaultHowItWorksSteps,
        services: defaultServices,
        email: adminEmail || undefined,
      });
      
      setDesignFormData({
        heroText: "",
        bookingToken: "",
        stripeUrl: "",
        howItWorksTitle: defaultHowItWorksTitle,
        howItWorksSteps: defaultHowItWorksSteps,
        services: defaultServices,
      });
    }
  }, [design, updateDesign, adminEmail]);
  
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
          
          await addHeroImage({
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
      
      // Upload image with compression and media library integration
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "hero_carousel",
          entityId: "design",
          entityName: "Design Hero Carousel",
          subType: "design",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async (args) => {
          // Search media list for duplicate
          const media = heroMedia?.find((m) => m._id === args.id);
          return media ? { storageKey: media.storageKey, width: media.width, height: media.height, size: media.size } : null;
        },
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });
      
      // Handle duplicate case - get storage key from media list if needed
      let storageKey = uploadResult.storageKey;
      if (uploadResult.isDuplicate && !storageKey) {
        const duplicateMedia = heroMedia?.find((m) => m._id === uploadResult.duplicateId);
        if (duplicateMedia) {
          storageKey = duplicateMedia.storageKey;
        }
      }
      
      await addHeroImage({
        imageStorageId: storageKey,
        alt: file.name,
        email: adminEmail || undefined,
      });
      
      toast({
        title: "Image uploaded",
        description: uploadResult.isDuplicate
          ? "Hero carousel image added successfully (duplicate detected, using existing media library entry)."
          : "Hero carousel image added successfully.",
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
  
  const handleRemoveHero = async (id: Id<"designHeroCarousel">) => {
    try {
      await removeHeroImage({
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
  
  const handleMoveHeroUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...heroCarouselImages];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderHeroImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };
  
  const handleMoveHeroDown = async (index: number) => {
    if (index === heroCarouselImages.length - 1) return;
    const newOrder = [...heroCarouselImages];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderHeroImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };

  // Gallery handlers
  const handleSelectGalleryMediaFromLibrary = (media: { _id: string; storageKey: string; filename: string; type: "image" | "video"; width?: number; height?: number }) => {
    setSelectedGalleryMediaItems((prev) => {
      const isSelected = prev.some((m) => m._id === media._id);
      if (isSelected) {
        return prev.filter((m) => m._id !== media._id);
      } else {
        return [...prev, media];
      }
    });
  };

  const handleAddSelectedGalleryMedia = async () => {
    if (selectedGalleryMediaItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one image from the media library.",
        variant: "destructive",
      });
      return;
    }

    setUploadingGallery(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const media of selectedGalleryMediaItems) {
        try {
          if (media.type !== "image") {
            errorCount++;
            continue;
          }
          
          await addGalleryImage({
            imageStorageId: media.storageKey,
            alt: media.filename,
            width: media.width,
            height: media.height,
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
        setSelectedGalleryMediaItems([]);
        setGalleryMediaLibraryOpen(false);
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
      setUploadingGallery(false);
    }
  };

  const handleGalleryImageUpload = async (file: File) => {
    try {
      setUploadingGallery(true);
      
      // Upload image with compression and media library integration
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "gallery",
          entityId: "design",
          entityName: "Design Gallery",
          subType: "design",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async (args) => {
          // Search media list for duplicate
          const media = galleryMedia?.find((m) => m._id === args.id);
          return media ? { storageKey: media.storageKey, width: media.width, height: media.height, size: media.size } : null;
        },
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });
      
      // Handle duplicate case - get storage key from media list if needed
      let storageKey = uploadResult.storageKey;
      if (uploadResult.isDuplicate && !storageKey) {
        const duplicateMedia = galleryMedia?.find((m) => m._id === uploadResult.duplicateId);
        if (duplicateMedia) {
          storageKey = duplicateMedia.storageKey;
        }
      }
      
      await addGalleryImage({
        imageStorageId: storageKey,
        alt: file.name,
        width: uploadResult.width,
        height: uploadResult.height,
        email: adminEmail || undefined,
      });
      
      toast({
        title: "Image uploaded",
        description: uploadResult.isDuplicate
          ? "Gallery image added successfully (duplicate detected, using existing media library entry)."
          : "Gallery image added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingGallery(false);
    }
  };
  
  const handleRemoveGallery = async (id: Id<"designGallery">) => {
    try {
      await removeGalleryImage({
        id,
        email: adminEmail || undefined,
      });
      toast({
        title: "Image removed",
        description: "Gallery image removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove image.",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveGalleryUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...galleryImages];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderGalleryImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };
  
  const handleMoveGalleryDown = async (index: number) => {
    if (index === galleryImages.length - 1) return;
    const newOrder = [...galleryImages];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderGalleryImages({
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };

  // Save design content
  const handleSaveDesign = async () => {
    try {
      await updateDesign({
        heroText: designFormData.heroText,
        bookingToken: designFormData.bookingToken || undefined,
        stripeUrl: designFormData.stripeUrl || undefined,
        howItWorksTitle: designFormData.howItWorksTitle || undefined,
        howItWorksSteps: designFormData.howItWorksSteps.length > 0 ? designFormData.howItWorksSteps : undefined,
        services: designFormData.services.length > 0 ? designFormData.services : undefined,
        email: adminEmail || undefined,
      });
      toast({
        title: "Saved",
        description: "Design page content updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  // How It Works handlers
  const addHowItWorksStep = () => {
    setDesignFormData({
      ...designFormData,
      howItWorksSteps: [...designFormData.howItWorksSteps, { title: "", description: "" }],
    });
  };

  const updateHowItWorksStep = (index: number, field: "title" | "description", value: string) => {
    const newSteps = [...designFormData.howItWorksSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setDesignFormData({ ...designFormData, howItWorksSteps: newSteps });
  };

  const removeHowItWorksStep = (index: number) => {
    setDesignFormData({
      ...designFormData,
      howItWorksSteps: designFormData.howItWorksSteps.filter((_, i) => i !== index),
    });
  };

  // Services handlers
  const addService = () => {
    setDesignFormData({
      ...designFormData,
      services: [...designFormData.services, { title: "", description: "" }],
    });
  };

  const updateService = (index: number, field: "title" | "description", value: string) => {
    const newServices = [...designFormData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setDesignFormData({ ...designFormData, services: newServices });
  };

  const removeService = (index: number) => {
    setDesignFormData({
      ...designFormData,
      services: designFormData.services.filter((_, i) => i !== index),
    });
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    try {
      await deleteDesign({ email: adminEmail || undefined });
      toast({
        title: "Design page deleted",
        description: "The design page and all its associated assets have been permanently deleted.",
      });
      setDeleteDialogOpen(false);
      router.push("/admin/page-builder");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete design page.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/page-builder" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Page Builder
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Design Page Editor
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg">
              Manage the design landing page content, hero carousel, and gallery.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link href="/design" target="_blank" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2 font-bold uppercase tracking-wider border-foreground/20 hover:border-accent/50 hover:text-accent" style={{ fontWeight: '700' }}>
                <Eye className="h-4 w-4" />
                View Page
              </Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full sm:w-auto flex items-center gap-2 font-bold uppercase tracking-wider"
            >
              <Trash2 className="h-4 w-4" />
              Delete Page
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="booking" className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="booking" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Booking
          </TabsTrigger>
          <TabsTrigger 
            value="hero" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Hero
          </TabsTrigger>
          <TabsTrigger 
            value="howItWorks" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            How It Works
          </TabsTrigger>
          <TabsTrigger 
            value="services" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Services
          </TabsTrigger>
          <TabsTrigger 
            value="gallery" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Gallery
          </TabsTrigger>
        </TabsList>

        {/* Booking Tab */}
        <TabsContent value="booking" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Booking Links
              </CardTitle>
              <CardDescription className="text-base">
                Configure booking and payment links for the design page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label htmlFor="bookingToken" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Booking Token
                </Label>
                <div className="space-y-3">
                  {designFormData.bookingToken && (
                    <div className="p-3 rounded-md border border-foreground/20 bg-foreground/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/60 mb-1">Current Token:</p>
                          <p className="text-sm font-mono break-all">{designFormData.bookingToken}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setDesignFormData({ ...designFormData, bookingToken: "" });
                            try {
                              await updateDesign({
                                heroText: designFormData.heroText,
                                bookingToken: "",
                                stripeUrl: designFormData.stripeUrl,
                                howItWorksTitle: designFormData.howItWorksTitle,
                                howItWorksSteps: designFormData.howItWorksSteps.length > 0 ? designFormData.howItWorksSteps : undefined,
                                services: designFormData.services.length > 0 ? designFormData.services : undefined,
                                email: adminEmail || undefined,
                              });
                              toast({
                                title: "Token removed",
                                description: "Booking token has been removed from the design page.",
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to remove token.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={() => setBookingSelectorOpen(true)}
                    className="font-black uppercase tracking-wider w-full sm:w-auto"
                    style={{ fontWeight: '900' }}
                  >
                    {designFormData.bookingToken ? "Change Booking Request" : "Select or Create Booking Request"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-foreground/60">
                  Token from a public booking invite. This will open a booking modal on the design page. Click the button to choose from existing requests or create a new one.
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              <div>
                <Label htmlFor="stripeUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Stripe Payment Link
                </Label>
                <Input
                  id="stripeUrl"
                  value={designFormData.stripeUrl}
                  onChange={(e) => setDesignFormData({ ...designFormData, stripeUrl: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="https://buy.stripe.com/..."
                />
                <p className="mt-2 text-xs text-foreground/60">
                  URL for Stripe payment. This will appear as a "Pay Deposit" button on the design page.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveDesign} 
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Tab */}
        <TabsContent value="hero" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Hero Text
              </CardTitle>
              <CardDescription className="text-base">
                Edit the text displayed below the logo in the hero section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label htmlFor="heroText" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Hero Text
                </Label>
                <Input
                  id="heroText"
                  value={designFormData.heroText}
                  onChange={(e) => setDesignFormData({ ...designFormData, heroText: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="Professional Graphic Design & Ongoing Creative Services. Let's create something together."
                />
                <p className="mt-2 text-xs text-foreground/60">
                  This text appears below the logo in the hero section.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveDesign} 
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Add Hero Image
              </CardTitle>
              <CardDescription className="text-base">
                Upload a new image for the hero carousel. Images will auto-rotate every 5 seconds.
              </CardDescription>
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
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleHeroImageUpload(file);
                  }}
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
          
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Hero Carousel Images ({heroCarouselImages.length})
              </CardTitle>
              <CardDescription className="text-base">
                {heroCarouselImages.length === 0
                  ? "No images uploaded yet. Upload images above to get started."
                  : "Reorder images using the arrows. Images will display in this order."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heroCarouselImages.length === 0 ? (
                <div className="py-16 text-center">
                  <Eye className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No hero images yet.
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload an image to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {heroCarouselImages.map((image, index) => (
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
                          onClick={() => handleMoveHeroUp(index)}
                          disabled={index === 0}
                          className="text-foreground/60 hover:text-foreground hover:bg-foreground/10"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveHeroDown(index)}
                          disabled={index === heroCarouselImages.length - 1}
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

        {/* How It Works Tab */}
        <TabsContent value="howItWorks" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                How It Works Section
              </CardTitle>
              <CardDescription className="text-base">
                Configure the "How It Works" section with steps and descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label htmlFor="howItWorksTitle" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Section Title
                </Label>
                <Input
                  id="howItWorksTitle"
                  value={designFormData.howItWorksTitle}
                  onChange={(e) => setDesignFormData({ ...designFormData, howItWorksTitle: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="How It Works"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  The title for the "How It Works" section on the design page.
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Steps ({designFormData.howItWorksSteps.length})
                  </Label>
                  <Button
                    type="button"
                    onClick={addHowItWorksStep}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    + Add Step
                  </Button>
                </div>
                {designFormData.howItWorksSteps.map((step, idx) => (
                  <div key={idx} className="mb-4 p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold uppercase tracking-wider">Step {idx + 1}</span>
                      <Button
                        type="button"
                        onClick={() => removeHowItWorksStep(idx)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Input
                        value={step.title}
                        onChange={(e) => updateHowItWorksStep(idx, "title", e.target.value)}
                        placeholder="Step title"
                        className="h-10 text-sm"
                      />
                      <Textarea
                        value={step.description}
                        onChange={(e) => updateHowItWorksStep(idx, "description", e.target.value)}
                        placeholder="Step description"
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
                {designFormData.howItWorksSteps.length === 0 && (
                  <p className="text-sm text-foreground/60 py-4 text-center">
                    No steps added yet. Click "Add Step" to get started.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveDesign} 
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Services Section
              </CardTitle>
              <CardDescription className="text-base">
                Configure the services section with service cards displayed on the design page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Service Cards ({designFormData.services.length})
                  </Label>
                  <Button
                    type="button"
                    onClick={addService}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wider"
                  >
                    + Add Service
                  </Button>
                </div>
                {designFormData.services.map((service, idx) => (
                  <div key={idx} className="mb-4 p-4 border border-foreground/10 rounded-lg bg-foreground/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold uppercase tracking-wider">Service {idx + 1}</span>
                      <Button
                        type="button"
                        onClick={() => removeService(idx)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Input
                        value={service.title}
                        onChange={(e) => updateService(idx, "title", e.target.value)}
                        placeholder="Service title"
                        className="h-10 text-sm"
                      />
                      <Textarea
                        value={service.description}
                        onChange={(e) => updateService(idx, "description", e.target.value)}
                        placeholder="Service description"
                        rows={4}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
                {designFormData.services.length === 0 && (
                  <p className="text-sm text-foreground/60 py-4 text-center">
                    No services added yet. Click "Add Service" to get started.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveDesign} 
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[200px] font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Add Gallery Image
              </CardTitle>
              <CardDescription className="text-base">
                Upload a new image for the gallery section below the booking form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="gallery-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-6 py-3 hover:bg-accent/20 transition-colors font-bold uppercase tracking-wider">
                    <Upload className="h-5 w-5" />
                    <span>{uploadingGallery ? "Uploading..." : "Choose Image"}</span>
                  </div>
                </Label>
                <input
                  id="gallery-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleGalleryImageUpload(file);
                  }}
                  disabled={uploadingGallery}
                />
                <Button
                  variant="outline"
                  onClick={() => setGalleryMediaLibraryOpen(true)}
                  disabled={uploadingGallery}
                  className="flex items-center gap-2 rounded-lg border border-foreground/20 hover:border-accent/50 px-6 py-3 font-bold uppercase tracking-wider"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span>Select from Library</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Gallery Images ({galleryImages.length})
              </CardTitle>
              <CardDescription className="text-base">
                {galleryImages.length === 0
                  ? "No images uploaded yet. Upload images above to get started."
                  : "Reorder images using the arrows. Images will display in this order."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {galleryImages.length === 0 ? (
                <div className="py-16 text-center">
                  <Eye className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No gallery images yet.
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload an image to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {galleryImages.map((image, index) => {
                    const aspectRatio = image.width && image.height ? image.width / image.height : 3 / 4;
                    return (
                      <div key={image._id} className="group relative overflow-hidden rounded-lg border border-foreground/10 bg-background">
                        <div style={{ aspectRatio }} className="bg-black">
                          <PortraitsGalleryImage
                            storageId={image.imageStorageId}
                            alt={image.alt}
                            aspectRatio={aspectRatio}
                            onClick={() => {}}
                          />
                        </div>
                        <div className="absolute right-2 top-2 flex gap-2">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 bg-background/90 hover:bg-destructive"
                            onClick={() => handleRemoveGallery(image._id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute left-2 top-2 flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-background/90 hover:bg-foreground/10"
                            onClick={() => handleMoveGalleryUp(index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-background/90 hover:bg-foreground/10"
                            onClick={() => handleMoveGalleryDown(index)}
                            disabled={index === galleryImages.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-3 bg-background">
                          <p className="text-sm font-medium">Position {index + 1}</p>
                          {image.alt && (
                            <p className="text-xs text-foreground/60">{image.alt}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              ⚠️ PERMANENT DELETION
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you absolutely sure you want to delete the <strong>Design</strong> page?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                ⚠️ WARNING: THIS ACTION IS PERMANENT
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                This will permanently delete the design page and <strong>all of its associated assets</strong> (hero carousel images, gallery images, page content). 
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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

      {/* Hero Carousel Media Library Dialog */}
      <Dialog open={heroMediaLibraryOpen} onOpenChange={setHeroMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select from Media Library</DialogTitle>
            <DialogDescription>
              Choose images from your media library to add to the hero carousel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Filters */}
            <div className="flex gap-2 items-center flex-shrink-0">
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
            <div 
              className="flex-1 overflow-y-auto min-h-0"
              onWheel={(e) => {
                // Stop propagation to prevent body scrolling when scrolling within modal
                e.stopPropagation();
              }}
            >
              {heroMedia && heroMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {heroMedia.filter((m) => m.type === "image").map((media) => {
                    const isSelected = selectedHeroMediaItems.some((m) => m._id === media._id.toString());
                    return (
                      <DesignHeroMediaSelectorItem
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
              <div className="border-t border-foreground/10 pt-4 flex-shrink-0">
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

      {/* Gallery Media Library Dialog */}
      <Dialog open={galleryMediaLibraryOpen} onOpenChange={setGalleryMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select from Media Library</DialogTitle>
            <DialogDescription>
              Choose images from your media library to add to the gallery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Filters */}
            <div className="flex gap-2 items-center flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search media..."
                  value={galleryMediaSearchQuery}
                  onChange={(e) => setGalleryMediaSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={galleryMediaTypeFilter} onValueChange={(v) => setGalleryMediaTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={galleryMediaFolderFilter} onValueChange={setGalleryMediaFolderFilter}>
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
            <div 
              className="flex-1 overflow-y-auto min-h-0"
              onWheel={(e) => {
                // Stop propagation to prevent body scrolling when scrolling within modal
                e.stopPropagation();
              }}
            >
              {galleryMedia && galleryMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {galleryMedia.filter((m) => m.type === "image").map((media) => {
                    const isSelected = selectedGalleryMediaItems.some((m) => m._id === media._id.toString());
                    return (
                      <DesignGalleryMediaSelectorItem
                        key={media._id.toString()}
                        media={media}
                        onSelect={handleSelectGalleryMediaFromLibrary}
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
            {selectedGalleryMediaItems.length > 0 && (
              <div className="border-t border-foreground/10 pt-4 flex-shrink-0">
                <p className="text-sm text-foreground/60 mb-2">
                  {selectedGalleryMediaItems.length} item{selectedGalleryMediaItems.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGalleryMediaLibraryOpen(false);
                setSelectedGalleryMediaItems([]);
              }}
              className="border-foreground/20 hover:bg-foreground/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedGalleryMedia}
              disabled={uploadingGallery || selectedGalleryMediaItems.length === 0}
              className="bg-accent hover:bg-accent/90 text-background"
            >
              {uploadingGallery ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add {selectedGalleryMediaItems.length} Image{selectedGalleryMediaItems.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Selector Modal */}
      <BookingSelectorModal
        open={bookingSelectorOpen}
        onOpenChange={setBookingSelectorOpen}
        onSelect={(token) => {
          setDesignFormData({ ...designFormData, bookingToken: token });
        }}
      />
    </div>
  );
}

// Media Selector Item Components
function DesignHeroMediaSelectorItem({ 
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

function DesignGalleryMediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: { _id: string | Id<"mediaLibrary">; storageKey: string; filename: string; type: "image" | "video"; width?: number; height?: number }; 
  onSelect: (media: { _id: string; storageKey: string; filename: string; type: "image" | "video"; width?: number; height?: number }) => void; 
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
      width: media.width,
      height: media.height,
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

