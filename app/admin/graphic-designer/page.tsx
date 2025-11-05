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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { PortraitsGalleryImage } from "@/components/portraits-gallery-image";
import { X, ChevronUp, ChevronDown, Upload, Eye, ArrowLeft, Type, Mail, Phone, Menu, GripVertical, Plus, Save, Trash2, Image as ImageIcon, Search, Folder, Check, ImagePlus } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  items: Array<{ name: string; description: string; price: string }>;
}

// Category Section Component with integrated gallery
interface CategorySectionProps {
  category: Category;
  categoryIndex: number;
  onUpdate: (category: Category) => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
  galleryImages: Array<{
    _id: Id<"graphicDesignerCategoryGallery">;
    imageStorageId: string;
    alt?: string;
    width?: number;
    height?: number;
    sortOrder: number;
  }>;
  onGalleryUpload: (file: File) => Promise<void>;
  onGallerySelectFromLibrary: (storageId: string, alt?: string, width?: number, height?: number) => Promise<void>;
  onGalleryRemove: (id: Id<"graphicDesignerCategoryGallery">) => Promise<void>;
  onGalleryMoveUp: (index: number) => void;
  onGalleryMoveDown: (index: number) => void;
  isUploading: boolean;
}

function CategorySection({
  category,
  categoryIndex,
  onUpdate,
  onUpdateName,
  onDelete,
  galleryImages,
  onGalleryUpload,
  onGallerySelectFromLibrary,
  onGalleryRemove,
  onGalleryMoveUp,
  onGalleryMoveDown,
  isUploading,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(category.name);

  const updateItem = (index: number, field: "name" | "description" | "price", value: string) => {
    const newItems = [...category.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ ...category, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = category.items.filter((_, idx) => idx !== index);
    onUpdate({ ...category, items: newItems });
  };

  const addItem = () => {
    onUpdate({
      ...category,
      items: [...category.items, { name: "", description: "", price: "" }],
    });
  };

  const handleNameSave = () => {
    onUpdateName(tempName);
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setTempName(category.name);
    setIsEditingName(false);
  };

  return (
    <Card className="border border-foreground/20 shadow-lg overflow-hidden">
      <CardHeader className="pb-4 border-b border-foreground/10 bg-foreground/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hover:bg-foreground/10 p-1 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-foreground/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-foreground/60" />
              )}
            </button>
            
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameSave();
                    if (e.key === "Escape") handleNameCancel();
                  }}
                  className="h-9 text-lg font-black uppercase tracking-wide flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleNameSave} variant="ghost" className="h-9 px-3">
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleNameCancel} variant="ghost" className="h-9 px-3">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <h3
                  className="text-lg font-black uppercase tracking-wide cursor-pointer hover:text-accent transition-colors flex-1"
                  onClick={() => setIsEditingName(true)}
                  style={{ fontWeight: '900' }}
                >
                  {category.name}
                </h3>
                <span className="text-sm text-foreground/60 font-medium">
                  {category.items.length} {category.items.length === 1 ? 'service' : 'services'}
                  {galleryImages.length > 0 && ` • ${galleryImages.length} gallery ${galleryImages.length === 1 ? 'image' : 'images'}`}
                </span>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-6 space-y-6">
          {/* Services Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                Services
              </Label>
            </div>
            
            {category.items.length === 0 ? (
              <div className="py-6 text-center text-foreground/60 border border-dashed border-foreground/20 rounded-lg">
                <p className="text-sm font-medium">No services yet. Add one below.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {category.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="group relative p-3 border border-foreground/10 rounded-md bg-foreground/2 hover:bg-foreground/5 hover:border-foreground/20 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-2">
                        <GripVertical className="h-4 w-4 text-foreground/30 cursor-move" />
                      </div>
                      
                      <div className="flex-1 grid gap-2 sm:grid-cols-12">
                        <div className="sm:col-span-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                              Name
                            </Label>
                            <span className="text-[10px] font-bold text-foreground/30">#{idx + 1}</span>
                          </div>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            placeholder="Service name"
                            className="h-8 text-sm border-foreground/15 focus:border-accent/50 bg-background"
                          />
                        </div>

                        <div className="sm:col-span-6">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                              Description
                            </Label>
                          </div>
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            placeholder="Brief description"
                            rows={1}
                            className="min-h-[32px] text-sm border-foreground/15 focus:border-accent/50 bg-background resize-none overflow-hidden"
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                              Price
                            </Label>
                          </div>
                          <Input
                            value={item.price}
                            onChange={(e) => updateItem(idx, "price", e.target.value)}
                            placeholder="$250"
                            className="h-8 text-sm border-foreground/15 focus:border-accent/50 bg-background"
                          />
                        </div>
                      </div>

                      <div className="flex-shrink-0 pt-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                          className="h-7 w-7 p-0 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={addItem}
              size="sm"
              variant="outline"
              className="w-full mt-3 text-xs font-bold uppercase tracking-wider h-9 border-dashed hover:border-solid hover:bg-accent/10 hover:border-accent transition-all"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add Service
            </Button>
          </div>

          <Separator className="bg-foreground/10" />

          {/* Gallery Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Gallery
              </Label>
            </div>

            {/* Upload & Media Library Buttons */}
            <div className="mb-4 flex gap-3">
              <Label htmlFor={`gallery-upload-${category.id}`} className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 hover:bg-accent/20 transition-colors font-bold uppercase tracking-wider text-sm">
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? "Uploading..." : "Upload"}</span>
                </div>
              </Label>
              <input
                id={`gallery-upload-${category.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onGalleryUpload(file);
                }}
                disabled={isUploading}
              />
              <Button
                type="button"
                onClick={() => onGallerySelectFromLibrary("", undefined)}
                variant="outline"
                size="sm"
                className="font-bold uppercase tracking-wider border-foreground/20 hover:bg-foreground/10"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Pick from Library
              </Button>
            </div>

            {/* Gallery Images */}
            {galleryImages.length === 0 ? (
              <div className="py-8 text-center text-foreground/60 border border-dashed border-foreground/20 rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12 text-foreground/40 mb-3" />
                <p className="text-sm font-medium">No gallery images yet. Upload images above.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {galleryImages.map((image, index) => {
                  const aspectRatio = image.width && image.height ? image.width / image.height : 1;
                  return (
                    <div
                      key={image._id}
                      className="group relative overflow-hidden rounded-lg border border-foreground/10 bg-background"
                    >
                      <div className="relative aspect-square overflow-hidden bg-black">
                        <PortraitsGalleryImage
                          storageId={image.imageStorageId}
                          alt={image.alt || "Gallery image"}
                          aspectRatio={aspectRatio}
                          onClick={() => {}}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGalleryMoveUp(index)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGalleryRemove(image._id)}
                          className="h-8 w-8 p-0 text-white hover:text-red-400 hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGalleryMoveDown(index)}
                          disabled={index === galleryImages.length - 1}
                          className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-2 bg-background/90">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground/80 text-center">
                          Position: {index + 1}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function GraphicDesignerEditorPage() {
  const { adminEmail } = useAdminAuth();
  const router = useRouter();
  
  // Hero Carousel
  const heroCarouselImages = useQuery(api.graphicDesignerHeroCarousel.list) || [];
  const addHeroImage = useMutation(api.graphicDesignerHeroCarousel.add);
  const removeHeroImage = useMutation(api.graphicDesignerHeroCarousel.remove);
  const reorderHeroImages = useMutation(api.graphicDesignerHeroCarousel.reorder);
  
  // Unified category gallery - get all galleries
  const allCategoryGalleries = useQuery(api.graphicDesignerCategoryGallery.list) || [];
  const addCategoryGalleryImage = useMutation(api.graphicDesignerCategoryGallery.add);
  const removeCategoryGalleryImage = useMutation(api.graphicDesignerCategoryGallery.remove);
  const reorderCategoryGalleryImages = useMutation(api.graphicDesignerCategoryGallery.reorder);
  
  // Get gallery images for a category
  const getCategoryGallery = (categoryId: string) => {
    return allCategoryGalleries.filter(img => img.categoryId === categoryId);
  };
  
  // Graphic Designer page content
  const graphicDesigner = useQuery(api.graphicDesigner.get);
  const updateGraphicDesigner = useMutation(api.graphicDesigner.update);
  
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [uploadingGalleries, setUploadingGalleries] = useState<Record<string, boolean>>({});
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Media Library state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibraryType, setMediaLibraryType] = useState<"hero" | "category">("hero");
  const [mediaLibraryCategoryId, setMediaLibraryCategoryId] = useState<string>("");
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("all");
  const [mediaFolderFilter, setMediaFolderFilter] = useState<string>("all");
  
  // Media Library queries
  const allMedia = useQuery(api.mediaLibrary.list, {
    type: mediaTypeFilter === "all" ? undefined : mediaTypeFilter,
    folder: mediaFolderFilter === "all" ? undefined : mediaFolderFilter,
    search: mediaSearchQuery || undefined,
    includeAssets: true,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);
  
  // Migrate legacy menuItems to categories on load
  useEffect(() => {
    if (graphicDesigner) {
      if (graphicDesigner.categories && graphicDesigner.categories.length > 0) {
        // Use new categories structure
        setCategories(graphicDesigner.categories);
      } else if (graphicDesigner.menuItems) {
        // Migrate from legacy structure
        const migratedCategories: Category[] = [];
        if (graphicDesigner.menuItems.window && graphicDesigner.menuItems.window.length > 0) {
          migratedCategories.push({
            id: `cat-${Date.now()}-1`,
            name: "Window / Street View",
            items: graphicDesigner.menuItems.window,
          });
        }
        if (graphicDesigner.menuItems.brand && graphicDesigner.menuItems.brand.length > 0) {
          migratedCategories.push({
            id: `cat-${Date.now()}-2`,
            name: "Brand / Identity",
            items: graphicDesigner.menuItems.brand,
          });
        }
        if (graphicDesigner.menuItems.graphic && graphicDesigner.menuItems.graphic.length > 0) {
          migratedCategories.push({
            id: `cat-${Date.now()}-3`,
            name: "Graphic Design",
            items: graphicDesigner.menuItems.graphic,
          });
        }
        setCategories(migratedCategories.length > 0 ? migratedCategories : []);
      } else {
        setCategories([]);
      }
    }
  }, [graphicDesigner]);
  

  // Media Library handlers
  const handleSelectFromMediaLibrary = async (media: any) => {
    try {
      // Get storage ID from media library item
      const storageId = media.storageKey || media.storageId;
      if (!storageId) {
        throw new Error("No storage ID found for selected media");
      }
      
      if (mediaLibraryType === "hero") {
        await addHeroImage({
          imageStorageId: storageId,
          alt: media.alt || media.filename || "Hero image",
          email: adminEmail || undefined,
        });
        toast({
          title: "Image added",
          description: "Hero carousel image added from media library.",
        });
      } else if (mediaLibraryType === "category" && mediaLibraryCategoryId) {
        await addCategoryGalleryImage({
          categoryId: mediaLibraryCategoryId,
          imageStorageId: storageId,
          alt: media.alt || media.filename || "Gallery image",
          width: media.width,
          height: media.height,
          email: adminEmail || undefined,
        });
        toast({
          title: "Image added",
          description: "Gallery image added from media library.",
        });
      }
      
      setMediaLibraryOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add image from media library.",
        variant: "destructive",
      });
    }
  };
  
  const openMediaLibrary = (type: "hero" | "category", categoryId?: string) => {
    setMediaLibraryType(type);
    setMediaLibraryCategoryId(categoryId || "");
    setMediaLibraryOpen(true);
  };
  
  // Gallery handlers
  const handleCategoryGalleryUpload = async (categoryId: string, file: File) => {
    try {
      setUploadingGalleries(prev => ({ ...prev, [categoryId]: true }));
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
      
      let width: number | undefined;
      let height: number | undefined;
      
      if (file.type.startsWith("image/")) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.naturalWidth;
            height = img.naturalHeight;
            URL.revokeObjectURL(objectUrl);
            resolve(null);
          };
          img.onerror = reject;
          img.src = objectUrl;
        });
      }
      
      await addCategoryGalleryImage({
        categoryId,
        imageStorageId: storageId,
        alt: file.name,
        width,
        height,
        email: adminEmail || undefined,
      });
      
      toast({
        title: "Image uploaded",
        description: "Gallery image added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingGalleries(prev => ({ ...prev, [categoryId]: false }));
    }
  };
  
  const handleCategoryGalleryRemove = async (id: Id<"graphicDesignerCategoryGallery">) => {
    try {
      await removeCategoryGalleryImage({
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
  
  const handleCategoryGalleryMoveUp = async (categoryId: string, index: number) => {
    if (index === 0) return;
    const categoryGallery = getCategoryGallery(categoryId);
    if (index >= categoryGallery.length) return;
    const newOrder = [...categoryGallery];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderCategoryGalleryImages({
      categoryId,
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };
  
  const handleCategoryGalleryMoveDown = async (categoryId: string, index: number) => {
    const categoryGallery = getCategoryGallery(categoryId);
    if (index >= categoryGallery.length - 1) return;
    const newOrder = [...categoryGallery];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderCategoryGalleryImages({
      categoryId,
      ids: newOrder.map((img) => img._id),
      email: adminEmail || undefined,
    });
  };
  
  const handleCategoryGallerySelectFromLibrary = async (categoryId: string, storageId: string, alt?: string, width?: number, height?: number) => {
    if (!storageId) {
      // Open media library dialog
      openMediaLibrary("category", categoryId);
      return;
    }
    
    try {
      await addCategoryGalleryImage({
        categoryId,
        imageStorageId: storageId,
        alt: alt || "Gallery image",
        width,
        height,
        email: adminEmail || undefined,
      });
      toast({
        title: "Image added",
        description: "Gallery image added from media library.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add image from media library.",
        variant: "destructive",
      });
    }
  };

  // Hero Carousel handlers
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
      
      await addHeroImage({
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
  
  const handleRemoveHero = async (id: Id<"graphicDesignerHeroCarousel">) => {
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

  // Category management
  const addCategory = () => {
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "New Category",
      items: [],
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (categoryId: string, updatedCategory: Category) => {
    setCategories(categories.map(cat => cat.id === categoryId ? updatedCategory : cat));
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(categories.map(cat => cat.id === categoryId ? { ...cat, name } : cat));
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };

  // Get form data from graphicDesigner with defaults from page
  const heroTitle = graphicDesigner?.heroTitle || "DESIGN THAT STOPS TRAFFIC";
  const heroSubtitle = graphicDesigner?.heroSubtitle || "GRAPHIC DESIGN SERVICES";
  const heroText = graphicDesigner?.heroText || "Attention is the new currency. I design what gets noticed.";
  const contactEmail = graphicDesigner?.contactEmail || "hello@iancourtright.com";
  const contactPhone = graphicDesigner?.contactPhone || "(843) 847-0793";
  const calUrl = graphicDesigner?.calUrl || "";
  const stripeUrl = graphicDesigner?.stripeUrl || "";
  const valuePropositionTitle = graphicDesigner?.valuePropositionTitle || "WHY ANY OF THIS MATTERS";
  const valuePropositionDescription = graphicDesigner?.valuePropositionDescription || "Your brand competes for attention every second. Generic design gets ignored. Work that stops traffic gets remembered—and gets results.";
  const valuePropositionFeatures = graphicDesigner?.valuePropositionFeatures || [
    {
      title: "FAST TURNAROUND",
      description: "Same-day delivery when possible. Get your designs when you need them, not when it's convenient for someone else."
    },
    {
      title: "PRINT-READY FILES",
      description: "Every file formatted and ready to go. No headaches, no delays. Just professional results you can use immediately."
    },
    {
      title: "TRANSPARENT PRICING",
      description: "Clear pricing that scales with complexity. No surprises, no hidden fees. Know what you're investing before you commit."
    }
  ];
  const ctaTitle = graphicDesigner?.ctaTitle || "READY TO STAND OUT?";

  // Value Proposition Features state
  const [valuePropositionFeaturesState, setValuePropositionFeaturesState] = useState<Array<{ title: string; description: string }>>(valuePropositionFeatures);

  // Update value proposition features when graphicDesigner changes
  useEffect(() => {
    if (graphicDesigner?.valuePropositionFeatures && graphicDesigner.valuePropositionFeatures.length > 0) {
      setValuePropositionFeaturesState(graphicDesigner.valuePropositionFeatures);
    } else {
      // Use default features if none exist
      setValuePropositionFeaturesState([
        {
          title: "FAST TURNAROUND",
          description: "Same-day delivery when possible. Get your designs when you need them, not when it's convenient for someone else."
        },
        {
          title: "PRINT-READY FILES",
          description: "Every file formatted and ready to go. No headaches, no delays. Just professional results you can use immediately."
        },
        {
          title: "TRANSPARENT PRICING",
          description: "Clear pricing that scales with complexity. No surprises, no hidden fees. Know what you're investing before you commit."
        }
      ]);
    }
  }, [graphicDesigner?.valuePropositionFeatures]);

  // Initialize defaults in database if record exists but fields are missing
  useEffect(() => {
    if (graphicDesigner && !graphicDesigner.valuePropositionTitle && !graphicDesigner.valuePropositionDescription && !graphicDesigner.valuePropositionFeatures) {
      // Only initialize if record exists but value proposition fields are empty
      const defaultFeatures = [
        {
          title: "FAST TURNAROUND",
          description: "Same-day delivery when possible. Get your designs when you need them, not when it's convenient for someone else."
        },
        {
          title: "PRINT-READY FILES",
          description: "Every file formatted and ready to go. No headaches, no delays. Just professional results you can use immediately."
        },
        {
          title: "TRANSPARENT PRICING",
          description: "Clear pricing that scales with complexity. No surprises, no hidden fees. Know what you're investing before you commit."
        }
      ];
      
      updateGraphicDesigner({
        valuePropositionTitle: "WHY ANY OF THIS MATTERS",
        valuePropositionDescription: "Your brand competes for attention every second. Generic design gets ignored. Work that stops traffic gets remembered—and gets results.",
        valuePropositionFeatures: defaultFeatures,
        ctaTitle: "READY TO STAND OUT?",
        email: adminEmail || undefined,
      });
    }
  }, [graphicDesigner, adminEmail, updateGraphicDesigner]);

  // Save graphic designer content
  const handleSaveGraphicDesigner = async () => {
    try {
      await updateGraphicDesigner({
        heroTitle: graphicDesigner?.heroTitle || undefined,
        heroSubtitle: graphicDesigner?.heroSubtitle || undefined,
        heroText: graphicDesigner?.heroText || undefined,
        contactEmail: graphicDesigner?.contactEmail || undefined,
        contactPhone: graphicDesigner?.contactPhone || undefined,
        calUrl: graphicDesigner?.calUrl || undefined,
        stripeUrl: graphicDesigner?.stripeUrl || undefined,
        valuePropositionTitle: valuePropositionTitle || undefined,
        valuePropositionDescription: valuePropositionDescription || undefined,
        valuePropositionFeatures: valuePropositionFeaturesState.length > 0 ? valuePropositionFeaturesState : undefined,
        ctaTitle: ctaTitle || undefined,
        categories: categories.length > 0 ? categories : undefined,
        email: adminEmail || undefined,
      });
      toast({
        title: "Graphic Designer page updated",
        description: "Changes saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update graphic designer page.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin"
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                GRAPHIC DESIGNER PAGE
              </h1>
            </div>
            <p className="text-sm text-foreground/70 ml-8">
              Manage the /graphic-designer page content
            </p>
          </div>
          <Link
            href="/graphic-designer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition-colors text-sm font-bold uppercase tracking-wider"
          >
            <Eye className="h-4 w-4" />
            View Page
          </Link>
        </div>
      </div>
      
      <Tabs defaultValue="content" className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 !h-auto items-center gap-1">
          <TabsTrigger 
            value="content" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Content
          </TabsTrigger>
          <TabsTrigger 
            value="hero" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Hero
          </TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Services
          </TabsTrigger>
        </TabsList>
        
        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          {/* Hero Section */}
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-4 border-b border-foreground/10">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-accent" />
                <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  Hero Section
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-foreground/70 mt-2">Main headline and subtitle displayed in hero section</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Hero Title */}
              <div>
                <Label htmlFor="graphicDesignerHeroTitle" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  Hero Title
                </Label>
                <Input
                  id="graphicDesignerHeroTitle"
                  value={heroTitle}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      heroTitle: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  className="h-11 text-base border-foreground/20 focus:border-accent/50 font-black uppercase"
                  placeholder="DESIGN THAT STOPS TRAFFIC"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Main headline displayed in large white text
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              {/* Hero Subtitle */}
              <div>
                <Label htmlFor="graphicDesignerHeroSubtitle" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  Hero Subtitle
                </Label>
                <Input
                  id="graphicDesignerHeroSubtitle"
                  value={heroSubtitle}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      heroSubtitle: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  className="h-11 text-base border-foreground/20 focus:border-accent/50 font-black uppercase"
                  placeholder="GRAPHIC DESIGN SERVICES"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Subtitle displayed in orange accent color
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              {/* Hero Text */}
              <div>
                <Label htmlFor="graphicDesignerHeroText" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  Hero Text
                </Label>
                <Textarea
                  id="graphicDesignerHeroText"
                  value={heroText}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      heroText: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  rows={4}
                  placeholder="Attention is the new currency. I design what gets noticed."
                  className="w-full text-base border-foreground/20 focus:border-accent/50 resize-none"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Descriptive text displayed below the title and subtitle
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section & Booking Links */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card className="border border-foreground/20 shadow-lg">
              <CardHeader className="pb-4 border-b border-foreground/10">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-accent" />
                  <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                    Contact Info
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-foreground/70 mt-2">Contact details displayed on page</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="graphicDesignerContactEmail" className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ fontWeight: '900' }}>
                    <Mail className="h-3.5 w-3.5 text-foreground/60" />
                    Email
                  </Label>
                  <Input
                    id="graphicDesignerContactEmail"
                    value={contactEmail}
                    onChange={(e) => {
                      updateGraphicDesigner({
                        contactEmail: e.target.value,
                        email: adminEmail || undefined,
                      });
                    }}
                    className="h-11 text-base border-foreground/20 focus:border-accent/50"
                    placeholder="hello@iancourtright.com"
                  />
                </div>
                <div>
                  <Label htmlFor="graphicDesignerContactPhone" className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ fontWeight: '900' }}>
                    <Phone className="h-3.5 w-3.5 text-foreground/60" />
                    Phone
                  </Label>
                  <Input
                    id="graphicDesignerContactPhone"
                    value={contactPhone}
                    onChange={(e) => {
                      updateGraphicDesigner({
                        contactPhone: e.target.value,
                        email: adminEmail || undefined,
                      });
                    }}
                    className="h-11 text-base border-foreground/20 focus:border-accent/50"
                    placeholder="(843) 847-0793"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Booking & Payment Links */}
            <Card className="border border-foreground/20 shadow-lg">
              <CardHeader className="pb-4 border-b border-foreground/10">
                <div className="flex items-center gap-3">
                  <Menu className="h-5 w-5 text-accent" />
                  <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                    Booking & Payment Links
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-foreground/70 mt-2">
                  Add booking and deposit links to display in the CTA section
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <Label htmlFor="graphicDesignerCalUrl" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                    Cal.com Booking Link
                  </Label>
                  <Input
                    id="graphicDesignerCalUrl"
                    value={calUrl}
                    onChange={(e) => {
                      updateGraphicDesigner({
                        calUrl: e.target.value,
                        email: adminEmail || undefined,
                      });
                    }}
                    className="h-11 text-base border-foreground/20 focus:border-accent/50"
                    placeholder="https://cal.com/your-username"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    URL for Cal.com booking. This will appear as a "Book Session" button on the page.
                  </p>
                </div>

                <Separator className="bg-foreground/10" />

                <div>
                  <Label htmlFor="graphicDesignerStripeUrl" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                    Stripe Payment Link
                  </Label>
                  <Input
                    id="graphicDesignerStripeUrl"
                    value={stripeUrl}
                    onChange={(e) => {
                      updateGraphicDesigner({
                        stripeUrl: e.target.value,
                        email: adminEmail || undefined,
                      });
                    }}
                    className="h-11 text-base border-foreground/20 focus:border-accent/50"
                    placeholder="https://buy.stripe.com/..."
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    URL for Stripe payment. This will appear as a "Pay Deposit" button on the page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Value Proposition Section */}
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-4 border-b border-foreground/10">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5 text-accent" />
                <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  Value Proposition Section
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-foreground/70 mt-2">
                Edit the "Why Any of This Matters" section content (sub-footer)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Value Proposition Title */}
              <div>
                <Label htmlFor="valuePropositionTitle" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  Section Title
                </Label>
                <Input
                  id="valuePropositionTitle"
                  value={valuePropositionTitle}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      valuePropositionTitle: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  className="h-11 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="WHY ANY OF THIS MATTERS"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Main heading for the value proposition section
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              {/* Value Proposition Description */}
              <div>
                <Label htmlFor="valuePropositionDescription" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  Description Paragraph
                </Label>
                <Textarea
                  id="valuePropositionDescription"
                  value={valuePropositionDescription}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      valuePropositionDescription: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  rows={3}
                  placeholder="Your brand competes for attention every second. Generic design gets ignored. Work that stops traffic gets remembered—and gets results."
                  className="w-full text-base border-foreground/20 focus:border-accent/50 resize-none"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Description text displayed below the title
                </p>
              </div>

              <Separator className="bg-foreground/10" />

              {/* Value Proposition Features */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground/70" style={{ fontWeight: '900' }}>
                    Feature Blocks
                  </Label>
                  <Button
                    type="button"
                    onClick={() => {
                      const newFeatures = [...valuePropositionFeaturesState, { title: "", description: "" }];
                      setValuePropositionFeaturesState(newFeatures);
                      updateGraphicDesigner({
                        valuePropositionFeatures: newFeatures,
                        email: adminEmail || undefined,
                      });
                    }}
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase tracking-wider border-accent/30 bg-accent/10 hover:bg-accent/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </div>
                
                {valuePropositionFeaturesState.length === 0 ? (
                  <div className="py-6 text-center text-foreground/60 border border-dashed border-foreground/20 rounded-lg">
                    <p className="text-sm font-medium">No features yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {valuePropositionFeaturesState.map((feature, idx) => (
                      <div
                        key={idx}
                        className="group relative p-3 border border-foreground/10 rounded-md bg-foreground/2 hover:bg-foreground/5 hover:border-foreground/20 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">
                              #{idx + 1}
                            </span>
                          </div>
                          
                          <div className="flex-1 grid gap-2 sm:grid-cols-12">
                            <div className="sm:col-span-4">
                              <div className="flex items-center gap-2 mb-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                                  Title
                                </Label>
                              </div>
                              <Input
                                value={feature.title}
                                onChange={(e) => {
                                  const newFeatures = [...valuePropositionFeaturesState];
                                  newFeatures[idx] = { ...feature, title: e.target.value };
                                  setValuePropositionFeaturesState(newFeatures);
                                  updateGraphicDesigner({
                                    valuePropositionFeatures: newFeatures,
                                    email: adminEmail || undefined,
                                  });
                                }}
                                placeholder="FAST TURNAROUND"
                                className="h-8 text-sm border-foreground/15 focus:border-accent/50 bg-background"
                              />
                            </div>

                            <div className="sm:col-span-8">
                              <div className="flex items-center gap-2 mb-1">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                                  Description
                                </Label>
                              </div>
                              <Textarea
                                value={feature.description}
                                onChange={(e) => {
                                  const newFeatures = [...valuePropositionFeaturesState];
                                  newFeatures[idx] = { ...feature, description: e.target.value };
                                  setValuePropositionFeaturesState(newFeatures);
                                  updateGraphicDesigner({
                                    valuePropositionFeatures: newFeatures,
                                    email: adminEmail || undefined,
                                  });
                                }}
                                rows={4}
                                placeholder="Same-day delivery when possible. Get your designs when you need them, not when it's convenient for someone else."
                                className="min-h-[100px] text-sm border-foreground/15 focus:border-accent/50 bg-background resize-y"
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = `${Math.max(target.scrollHeight, 100)}px`;
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex-shrink-0 pt-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFeatures = valuePropositionFeaturesState.filter((_, i) => i !== idx);
                                setValuePropositionFeaturesState(newFeatures);
                                updateGraphicDesigner({
                                  valuePropositionFeatures: newFeatures.length > 0 ? newFeatures : undefined,
                                  email: adminEmail || undefined,
                                });
                              }}
                              className="h-7 w-7 p-0 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-foreground/10" />

              {/* CTA Title */}
              <div>
                <Label htmlFor="ctaTitle" className="text-xs font-bold uppercase tracking-wider mb-2 block text-foreground/70" style={{ fontWeight: '900' }}>
                  CTA Title
                </Label>
                <Input
                  id="ctaTitle"
                  value={ctaTitle}
                  onChange={(e) => {
                    updateGraphicDesigner({
                      ctaTitle: e.target.value,
                      email: adminEmail || undefined,
                    });
                  }}
                  className="h-11 text-base border-foreground/20 focus:border-accent/50"
                  placeholder="READY TO STAND OUT?"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  Call-to-action title displayed above the booking/payment buttons
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4 pb-6">
            <Button 
              onClick={handleSaveGraphicDesigner} 
              size="lg" 
              className="w-full sm:w-auto sm:min-w-[280px] h-14 text-base font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Save className="h-5 w-5" />
              Save All Changes
            </Button>
          </div>
        </TabsContent>

        {/* Hero Tab */}
        <TabsContent value="hero" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
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
                    <span>{uploading ? "Uploading..." : "Upload"}</span>
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
                  type="button"
                  onClick={() => openMediaLibrary("hero")}
                  variant="outline"
                  size="sm"
                  className="font-bold uppercase tracking-wider border-foreground/20 hover:bg-foreground/10"
                >
                  <ImagePlus className="h-5 w-5 mr-2" />
                  Pick from Library
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

        {/* Categories & Services Tab */}
        <TabsContent value="categories" className="space-y-6 sm:space-y-8 mt-6 sm:mt-8">
          {/* Categories & Services */}
          <Card className="border border-foreground/20 shadow-lg">
            <CardHeader className="pb-4 border-b border-foreground/10 bg-foreground/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Menu className="h-5 w-5 text-accent" />
                  <CardTitle className="text-xl font-black uppercase tracking-tight" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                    Categories & Services
                  </CardTitle>
                </div>
                <Button
                  onClick={addCategory}
                  size="sm"
                  variant="outline"
                  className="font-bold uppercase tracking-wider border-accent/30 bg-accent/10 hover:bg-accent/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
              <CardDescription className="text-sm text-foreground/70 mt-2">
                Create categories and add services with galleries for each category
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {categories.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-foreground/20 rounded-lg">
                  <Menu className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                  <p className="text-sm font-medium text-foreground/70 mb-2">
                    No categories yet. Create your first category above.
                  </p>
                </div>
              ) : (
                categories.map((category, index) => {
                  const categoryGallery = getCategoryGallery(category.id);
                  
                  return (
                    <CategorySection
                      key={category.id}
                      category={category}
                      categoryIndex={index}
                      onUpdate={(updated) => updateCategory(category.id, updated)}
                      onUpdateName={(name) => updateCategoryName(category.id, name)}
                      onDelete={() => deleteCategory(category.id)}
                      galleryImages={categoryGallery}
                      onGalleryUpload={(file) => handleCategoryGalleryUpload(category.id, file)}
                      onGallerySelectFromLibrary={(storageId, alt, width, height) => handleCategoryGallerySelectFromLibrary(category.id, storageId, alt, width, height)}
                      onGalleryRemove={handleCategoryGalleryRemove}
                      onGalleryMoveUp={(idx) => handleCategoryGalleryMoveUp(category.id, idx)}
                      onGalleryMoveDown={(idx) => handleCategoryGalleryMoveDown(category.id, idx)}
                      isUploading={uploadingGalleries[category.id] || false}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4 pb-6">
            <Button 
              onClick={handleSaveGraphicDesigner} 
              size="lg" 
              className="w-full sm:w-auto sm:min-w-[280px] h-14 text-base font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Save className="h-5 w-5" />
              Save All Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Media Library Dialog */}
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Select {mediaLibraryType === "hero" ? "Hero" : "Gallery"} Image
            </DialogTitle>
            <DialogDescription>
              Choose an image from your media library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search media..."
                  value={mediaSearchQuery}
                  onChange={(e) => setMediaSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mediaFolderFilter} onValueChange={setMediaFolderFilter}>
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
              {allMedia && allMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {allMedia
                    .filter((m) => m.type === "image")
                    .map((media) => (
                      <MediaSelectorItem
                        key={media._id.toString()}
                        media={media}
                        onSelect={handleSelectFromMediaLibrary}
                        isSelected={false}
                      />
                    ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <ImageIcon className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                  <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    No images found
                  </p>
                  <p className="text-sm text-foreground/70">
                    Upload images to your media library first.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMediaLibraryOpen(false)}
              className="border-foreground/20 hover:bg-foreground/10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Media Selector Item Component
function MediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: any; 
  onSelect: (media: any) => void; 
  isSelected: boolean;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey || media.storageId ? { storageId: media.storageKey || media.storageId } : "skip"
  );

  const handleClick = () => {
    onSelect(media);
  };

  return (
    <div
      className={`relative aspect-square border rounded overflow-hidden cursor-pointer hover:border-accent transition ${
        isSelected ? "border-accent ring-2 ring-accent" : "border-foreground/20"
      }`}
      onClick={handleClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={media.filename || media.alt || "Media"} className="w-full h-full object-cover" />
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
