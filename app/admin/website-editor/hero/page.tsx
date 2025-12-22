"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { X, ChevronUp, ChevronDown, Upload, Eye, Image as ImageIcon, Search, Check, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HeroEditorPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  
  // Hero Carousel
  const carouselImages = useQuery(api.heroCarousel.list) || [];
  const addImage = useMutation(api.heroCarousel.add);
  const removeImage = useMutation(api.heroCarousel.remove);
  const reorderImages = useMutation(api.heroCarousel.reorder);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  
  // Homepage hero text
  const homepage = useQuery(api.homepage.get);
  const updateHomepage = useMutation(api.homepage.update);
  
  const [heroText, setHeroText] = useState(homepage?.heroText || "");
  const [uploading, setUploading] = useState(false);
  
  // Media library state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [mediaFolderFilter, setMediaFolderFilter] = useState<string>("all");
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [selectedMediaItems, setSelectedMediaItems] = useState<Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video" }>>([]);
  
  // Media library queries
  const media = useQuery(api.mediaLibrary.list, {
    type: mediaTypeFilter === "all" ? undefined : mediaTypeFilter,
    folder: mediaFolderFilter === "all" ? undefined : mediaFolderFilter,
    search: mediaSearchQuery || undefined,
    includeAssets: false,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);

  // Sync hero text with homepage data
  useState(() => {
    if (homepage?.heroText && !heroText) {
      setHeroText(homepage.heroText);
    }
  });

  const handleSelectMediaFromLibrary = (mediaItem: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => {
    setSelectedMediaItems((prev) => {
      const isSelected = prev.some((m) => m._id === mediaItem._id);
      if (isSelected) {
        return prev.filter((m) => m._id !== mediaItem._id);
      } else {
        return [...prev, mediaItem];
      }
    });
  };

  const handleAddSelectedMedia = async () => {
    if (selectedMediaItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one image from the media library.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const mediaItem of selectedMediaItems) {
        if (mediaItem.type !== "image") continue;
        
        await addImage({
          imageStorageId: mediaItem.storageKey,
          alt: mediaItem.filename,
          email: adminEmail || undefined,
        });
        successCount++;
      }

      if (successCount > 0) {
        toast({
          title: "Images added",
          description: `${successCount} image${successCount !== 1 ? 's' : ''} added to hero carousel.`,
        });
        setSelectedMediaItems([]);
        setMediaLibraryOpen(false);
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

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "hero_carousel",
          entityId: "website",
          entityName: "Website Hero Carousel",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async (args) => {
          const mediaItem = media?.find((m) => m._id === args.id);
          return mediaItem ? { storageKey: mediaItem.storageKey, width: mediaItem.width, height: mediaItem.height, size: mediaItem.size } : null;
        },
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });
      
      let storageKey = uploadResult.storageKey;
      if (uploadResult.isDuplicate && !storageKey) {
        const duplicateMedia = media?.find((m) => m._id === uploadResult.duplicateId);
        if (duplicateMedia) {
          storageKey = duplicateMedia.storageKey;
        }
      }
      
      await addImage({
        imageStorageId: storageKey,
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
      await removeImage({ id, email: adminEmail || undefined });
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
    if (index === 0 || !adminEmail) return;
    const newOrder = [...carouselImages];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderImages({ ids: newOrder.map((img) => img._id), email: adminEmail });
  };
  
  const handleMoveDown = async (index: number) => {
    if (index === carouselImages.length - 1 || !adminEmail) return;
    const newOrder = [...carouselImages];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderImages({ ids: newOrder.map((img) => img._id), email: adminEmail });
  };

  const handleSaveHeroText = async () => {
    try {
      await updateHomepage({ heroText, email: adminEmail || undefined });
      toast({
        title: "Hero text updated",
        description: "Changes saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update hero text.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
          Hero Section
        </h1>
        <p className="text-base sm:text-lg" style={{ color: '#666' }}>
          Manage the hero carousel images and text that appear at the top of your homepage.
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Upload Card */}
        <Card className="border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
              Add Hero Image
            </CardTitle>
            <CardDescription className="text-base" style={{ color: '#666' }}>Upload a new image for the hero carousel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="hero-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border px-6 py-3 transition-colors font-bold uppercase tracking-wider" style={{ borderColor: 'rgba(88, 96, 52, 0.3)', backgroundColor: 'rgba(88, 96, 52, 0.1)', color: '#586034' }}>
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
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="outline"
                onClick={() => setMediaLibraryOpen(true)}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg px-6 py-3 font-bold uppercase tracking-wider border-2"
                style={{ color: '#333', backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)' }}
              >
                <ImageIcon className="h-5 w-5" />
                <span>Select from Library</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hero Text */}
        <Card className="border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
              Hero Text
            </CardTitle>
            <CardDescription className="text-base" style={{ color: '#666' }}>Text displayed under your name in the hero section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="heroText" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900', color: '#333' }}>
                Hero Text
              </Label>
              <Input
                id="heroText"
                value={heroText}
                onChange={(e) => setHeroText(e.target.value)}
                placeholder="e.g., Photographer & Director"
                className="h-12 text-base border-gray-200 focus:border-[#586034] focus:ring-[#586034]/20"
                style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
              />
            </div>
            <Button
              onClick={handleSaveHeroText}
              className="w-full font-bold uppercase tracking-wider py-6 transition-all hover:opacity-90"
              style={{ backgroundColor: '#586034', color: '#fff' }}
            >
              Save Hero Text
            </Button>
          </CardContent>
        </Card>
        
        {/* Carousel Images List */}
        <Card className="border transition-all duration-300 hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
              Carousel Images ({carouselImages.length})
            </CardTitle>
            <CardDescription className="text-base" style={{ color: '#666' }}>
              {carouselImages.length === 0
                ? "No images uploaded yet. Upload images above to get started."
                : "Reorder images using the arrows. Images will display in this order."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carouselImages.length === 0 ? (
              <div className="py-16 text-center">
                <Eye className="mx-auto h-16 w-16 mb-6" style={{ color: '#ccc' }} />
                <p className="mb-4 text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                  No carousel images yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {carouselImages.map((image, index) => (
                  <div
                    key={image._id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:shadow-md"
                    style={{ backgroundColor: '#FAFAF9', borderColor: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="relative h-24 w-32 overflow-hidden rounded-md bg-black">
                      <HeroCarouselImage
                        storageId={image.imageStorageId}
                        alt={image.alt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: '#1a1a1a' }}>{image.alt || "Untitled"}</p>
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#888' }}>Position: {index + 1}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleMoveUp(index)} disabled={index === 0} className="hover:bg-gray-100">
                        <ChevronUp className="h-4 w-4" style={{ color: '#555' }} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleMoveDown(index)} disabled={index === carouselImages.length - 1} className="hover:bg-gray-100">
                        <ChevronDown className="h-4 w-4" style={{ color: '#555' }} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveHero(image._id)} className="hover:bg-red-50">
                        <X className="h-4 w-4" style={{ color: '#555' }} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Media Library Dialog */}
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col !bg-[#FAFAF9] !border-gray-200 [&>button]:text-gray-500 [&>button:hover]:text-gray-800">
          <DialogHeader>
            <DialogTitle className="!text-[#1a1a1a] text-2xl font-black uppercase tracking-wider">Select from Media Library</DialogTitle>
            <DialogDescription className="!text-[#666]">Choose images to add to the hero carousel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex gap-2 items-center flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search media..."
                  value={mediaSearchQuery}
                  onChange={(e) => setMediaSearchQuery(e.target.value)}
                  className="pl-9 !bg-white !border-gray-200 !text-gray-900 placeholder:!text-gray-400"
                />
              </div>
              <Select value={mediaFolderFilter} onValueChange={setMediaFolderFilter}>
                <SelectTrigger className="w-[160px] !bg-white !border-gray-200 !text-gray-900">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent className="!bg-white !border-gray-200">
                  <SelectItem value="all">All Folders</SelectItem>
                  {mediaFolders?.map((folder) => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {media && media.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {media.filter((m) => m.type === "image").map((mediaItem) => {
                    const isSelected = selectedMediaItems.some((m) => m._id === mediaItem._id.toString());
                    return (
                      <MediaSelectorItem
                        key={mediaItem._id.toString()}
                        media={mediaItem}
                        onSelect={handleSelectMediaFromLibrary}
                        isSelected={isSelected}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto h-16 w-16 text-gray-300 mb-6" />
                  <p className="text-gray-500">No media found. Upload media to your media library first.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMediaLibraryOpen(false); setSelectedMediaItems([]); }} className="!bg-white !border-gray-200 !text-gray-700 hover:!bg-gray-50">
              Cancel
            </Button>
            <Button onClick={handleAddSelectedMedia} disabled={uploading || selectedMediaItems.length === 0} className="!bg-[#586034] hover:!bg-[#4a5229] !text-white">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              Add {selectedMediaItems.length} Image{selectedMediaItems.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: { _id: string | any; storageKey: string; filename: string; type: "image" | "video" }; 
  onSelect: (media: { _id: string; storageKey: string; filename: string; type: "image" | "video" }) => void; 
  isSelected: boolean;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
  );

  return (
    <div
      className={`relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-[#586034] ring-2 ring-[#586034]" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={() => onSelect({ _id: media._id.toString(), storageKey: media.storageKey, filename: media.filename, type: media.type })}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={media.filename || "Media"} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-300" />
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-[#586034] text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

