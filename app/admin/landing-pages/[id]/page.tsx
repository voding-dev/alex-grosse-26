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
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { PortraitsGalleryImage } from "@/components/portraits-gallery-image";
import { X, ChevronUp, ChevronDown, Upload, Eye } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LandingPageEditorPage() {
  const params = useParams();
  const { adminEmail, sessionToken } = useAdminAuth();
  const landingPageId = params.id as string;
  
  // Landing page content
  const landingPage = useQuery(api.landingPages.get, { id: landingPageId as Id<"landingPages"> });
  
  // Hero Carousel
  const heroCarouselImages = useQuery(
    api.landingPageHeroCarousel.list,
    landingPage ? { landingPageId: landingPage._id } : "skip"
  ) || [];
  const addHeroImage = useMutation(api.landingPageHeroCarousel.add);
  const removeHeroImage = useMutation(api.landingPageHeroCarousel.remove);
  const reorderHeroImages = useMutation(api.landingPageHeroCarousel.reorder);
  
  // Gallery
  const galleryImages = useQuery(
    api.landingPageGallery.list,
    landingPage ? { landingPageId: landingPage._id } : "skip"
  ) || [];
  const addGalleryImage = useMutation(api.landingPageGallery.add);
  const removeGalleryImage = useMutation(api.landingPageGallery.remove);
  const reorderGalleryImages = useMutation(api.landingPageGallery.reorder);
  
  // Update landing page
  const updateLandingPage = useMutation(api.landingPages.update);
  
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  
  // Media library queries
  const galleryMedia = useQuery(api.mediaLibrary.list, {
    type: "image",
    includeAssets: false,
  });
  const heroMedia = useQuery(api.mediaLibrary.list, {
    type: "image",
    includeAssets: false,
  });
  
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  
  // Landing Page Form Data
  const [pageFormData, setPageFormData] = useState({
    heroText: "",
    calUrl: "",
    stripeUrl: "",
    howItWorksTitle: "",
    howItWorksSteps: [] as Array<{ title: string; description: string }>,
    services: [] as Array<{ title: string; description: string }>,
  });
  
  useEffect(() => {
    if (landingPage) {
      setPageFormData({
        heroText: landingPage.heroText || "",
        calUrl: landingPage.calUrl || "",
        stripeUrl: landingPage.stripeUrl || "",
        howItWorksTitle: landingPage.howItWorksTitle || "",
        howItWorksSteps: landingPage.howItWorksSteps || [],
        services: landingPage.services || [],
      });
    }
  }, [landingPage]);
  
  // Hero Carousel handlers
  const handleHeroImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      if (!landingPage) {
        throw new Error("Landing page not found");
      }
      
      // Upload image with compression and media library integration
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "hero_carousel",
          entityId: landingPage._id,
          entityName: landingPage.title || "Landing Page Hero Carousel",
          subType: "landing_page",
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
        landingPageId: landingPage._id,
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
  
  const handleRemoveHero = async (id: Id<"landingPageHeroCarousel">) => {
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
  const handleGalleryImageUpload = async (file: File) => {
    try {
      setUploadingGallery(true);
      
      if (!landingPage) {
        throw new Error("Landing page not found");
      }
      
      // Upload image with compression and media library integration
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "gallery",
          entityId: landingPage._id,
          entityName: landingPage.title || "Landing Page Gallery",
          subType: "landing_page",
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
        landingPageId: landingPage._id,
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
  
  const handleRemoveGallery = async (id: Id<"landingPageGallery">) => {
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

  // Save landing page content
  const handleSavePage = async () => {
    if (!landingPage) return;
    try {
      await updateLandingPage({
        id: landingPage._id,
        heroText: pageFormData.heroText || undefined,
        calUrl: pageFormData.calUrl || undefined,
        stripeUrl: pageFormData.stripeUrl || undefined,
        howItWorksTitle: pageFormData.howItWorksTitle || undefined,
        howItWorksSteps: pageFormData.howItWorksSteps.length > 0 ? pageFormData.howItWorksSteps : undefined,
        services: pageFormData.services.length > 0 ? pageFormData.services : undefined,
        email: adminEmail || undefined,
      });
      toast({
        title: "Saved",
        description: "Landing page content updated successfully.",
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
    setPageFormData({
      ...pageFormData,
      howItWorksSteps: [...pageFormData.howItWorksSteps, { title: "", description: "" }],
    });
  };

  const updateHowItWorksStep = (index: number, field: "title" | "description", value: string) => {
    const newSteps = [...pageFormData.howItWorksSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setPageFormData({ ...pageFormData, howItWorksSteps: newSteps });
  };

  const removeHowItWorksStep = (index: number) => {
    setPageFormData({
      ...pageFormData,
      howItWorksSteps: pageFormData.howItWorksSteps.filter((_, i) => i !== index),
    });
  };

  // Services handlers
  const addService = () => {
    setPageFormData({
      ...pageFormData,
      services: [...pageFormData.services, { title: "", description: "" }],
    });
  };

  const updateService = (index: number, field: "title" | "description", value: string) => {
    const newServices = [...pageFormData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setPageFormData({ ...pageFormData, services: newServices });
  };

  const removeService = (index: number) => {
    setPageFormData({
      ...pageFormData,
      services: pageFormData.services.filter((_, i) => i !== index),
    });
  };
  
  if (!landingPage) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center">
          <p className="text-lg text-foreground/70">Loading landing page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            {landingPage.title} Editor
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage the {landingPage.title.toLowerCase()} landing page content, hero carousel, and gallery.
          </p>
        </div>
        <Link href={`/${landingPage.slug}`} target="_blank" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2 font-bold uppercase tracking-wider border-foreground/20 hover:border-accent/50 hover:text-accent" style={{ fontWeight: '700' }}>
            <Eye className="h-4 w-4" />
            View Page
          </Button>
        </Link>
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
                Configure booking and payment links for this landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label htmlFor="calUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Cal.com Booking Link
                </Label>
                <Input
                  id="calUrl"
                  value={pageFormData.calUrl}
                  onChange={(e) => setPageFormData({ ...pageFormData, calUrl: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="https://cal.com/your-username"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  URL for Cal.com booking. This will appear as a "Book Session" button on the design page.
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              <div>
                <Label htmlFor="stripeUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Stripe Payment Link
                </Label>
                <Input
                  id="stripeUrl"
                  value={pageFormData.stripeUrl}
                  onChange={(e) => setPageFormData({ ...pageFormData, stripeUrl: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="https://buy.stripe.com/..."
                />
                <p className="mt-2 text-xs text-foreground/60">
                  URL for Stripe payment. This will appear as a "Pay Deposit" button on the design page.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePage} 
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
                  value={pageFormData.heroText}
                  onChange={(e) => setPageFormData({ ...pageFormData, heroText: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="Professional Graphic Design & Ongoing Creative Services. Let's create something together."
                />
                <p className="mt-2 text-xs text-foreground/60">
                  This text appears below the logo in the hero section.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePage} 
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
                  value={pageFormData.howItWorksTitle}
                  onChange={(e) => setPageFormData({ ...pageFormData, howItWorksTitle: e.target.value })}
                  className="h-12 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="How It Works"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  The title for the "How It Works" section on this landing page.
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Steps ({pageFormData.howItWorksSteps.length})
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
                {pageFormData.howItWorksSteps.map((step, idx) => (
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
                {pageFormData.howItWorksSteps.length === 0 && (
                  <p className="text-sm text-foreground/60 py-4 text-center">
                    No steps added yet. Click "Add Step" to get started.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePage} 
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
                Configure the services section with service cards displayed on this landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                    Service Cards ({pageFormData.services.length})
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
                {pageFormData.services.map((service, idx) => (
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
                {pageFormData.services.length === 0 && (
                  <p className="text-sm text-foreground/60 py-4 text-center">
                    No services added yet. Click "Add Service" to get started.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePage} 
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
    </div>
  );
}

