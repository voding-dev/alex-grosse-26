"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { 
  Type, 
  Image as ImageIcon, 
  Images, 
  Calendar,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Upload
} from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { BookingSelectorModal } from "@/components/booking-selector-modal";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { ImageUploadButton, MediaLibrarySelector } from "@/components/media-library";
import { UploadZone } from "@/components/upload-zone";

interface SectionEditorProps {
  section: {
    _id: Id<"blogPostSections">;
    type: "text" | "image" | "gallery" | "cta_booking" | "cta_stripe";
    textContent?: string;
    imageStorageId?: string;
    imageAlt?: string;
    imageCaption?: string;
    imageWidth?: number;
    imageHeight?: number;
    galleryImages?: Array<{
      storageId: string;
      alt?: string;
      caption?: string;
    }>;
    ctaHeading?: string;
    ctaDescription?: string;
    bookingToken?: string;
    stripeUrl?: string;
  };
  onUpdate: () => void;
  onDelete: () => void;
  provided?: any; // For drag and drop
}

export function SectionEditor({ section, onUpdate, onDelete, provided }: SectionEditorProps) {
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [bookingSelectorOpen, setBookingSelectorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageLibraryOpen, setImageLibraryOpen] = useState(false);
  const [galleryLibraryOpen, setGalleryLibraryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const updateSection = useMutation(api.blogPostSections.update);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);

  // Get image URL for preview
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    section.type === "image" && section.imageStorageId
      ? { storageId: section.imageStorageId }
      : "skip"
  );

  const sectionIcons = {
    text: Type,
    image: ImageIcon,
    gallery: Images,
    cta_booking: Calendar,
    cta_stripe: ExternalLink,
  };

  const sectionLabels = {
    text: "Text Content",
    image: "Image",
    gallery: "Gallery",
    cta_booking: "Booking CTA",
    cta_stripe: "Stripe CTA",
  };

  const Icon = sectionIcons[section.type];

  const handleUpdate = async (updates: any) => {
    try {
      await updateSection({
        id: section._id,
        ...updates,
        email: adminEmail || undefined,
      });
      // Don't call onUpdate() immediately to prevent re-render during editing
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update section",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);

      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "blog_section",
          entityId: section._id,
          entityName: "Blog Section Image",
          subType: "blog",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async () => null,
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });

      await handleUpdate({
        imageStorageId: uploadResult.storageKey,
        imageWidth: uploadResult.width,
        imageHeight: uploadResult.height,
      });

      toast({
        title: "Image uploaded",
        description: "Image has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Gallery handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    if (files.length > 0) {
      handleGalleryImagesUploadMultiple(files);
    }
  };

  const handleGalleryImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleGalleryImagesUploadMultiple(Array.from(files));
    }
  };

  const handleGalleryImagesUploadMultiple = async (files: File[]) => {
    try {
      setUploading(true);
      const existingImages = section.galleryImages || [];
      const newImages: any[] = [];

      for (const file of files) {
        const uploadResult = await uploadImageToMediaLibrary({
          file,
          sessionToken: sessionToken || undefined,
          displayLocation: {
            type: "blog_gallery",
            entityId: section._id,
            entityName: "Blog Gallery Image",
            subType: "blog",
          },
          generateUploadUrl,
          checkDuplicateMutation,
          getMedia: async () => null,
          addDisplayLocation: async (args) => {
            await addDisplayLocation(args);
          },
          createMedia: async (args) => {
            return await createMedia(args);
          },
        });

        newImages.push({
          storageId: uploadResult.storageKey,
          alt: "",
          width: uploadResult.width,
          height: uploadResult.height,
        });
      }

      await handleUpdate({
        galleryImages: [...existingImages, ...newImages],
      });

      toast({
        title: "Gallery updated",
        description: `${newImages.length} image${newImages.length !== 1 ? 's' : ''} added to gallery.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    const existingImages = section.galleryImages || [];
    const newImages = existingImages.filter((_, i) => i !== index);
    await handleUpdate({ galleryImages: newImages });
    toast({
      title: "Image removed",
      description: "Image has been removed from the gallery.",
    });
  };

  const handleUpdateGalleryImageAlt = async (index: number, alt: string) => {
    const existingImages = section.galleryImages || [];
    const newImages = [...existingImages];
    newImages[index] = { ...newImages[index], alt };
    await handleUpdate({ galleryImages: newImages });
  };

  return (
    <>
    <Card
      className="border border-foreground/20 hover:border-accent/50 transition-colors"
      {...(provided?.draggableProps || {})}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div {...(provided?.dragHandleProps || {})} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-foreground/40" />
            </div>
            <Icon className="h-5 w-5 text-accent" />
            <CardTitle className="text-base font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              {sectionLabels[section.type]}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-foreground/40 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-foreground/60 hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {section.type === "text" && (
            <div>
              <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Content
              </Label>
              <RichTextEditor
                content={section.textContent || ""}
                onChange={(html) => handleUpdate({ textContent: html })}
                placeholder="Start writing..."
              />
            </div>
          )}

          {section.type === "image" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Image
                </Label>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt={section.imageAlt || ""} className="w-full rounded-lg shadow-md" />
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImageLibraryOpen(true)}
                        className="font-bold uppercase tracking-wider"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Change Image
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleUpdate({ imageStorageId: undefined })}
                        className="font-bold uppercase tracking-wider"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      className="hidden"
                      id={`image-upload-${section._id}`}
                    />
                    <label htmlFor={`image-upload-${section._id}`}>
                      <Button
                        variant="outline"
                        disabled={uploading}
                        asChild
                        className="font-bold uppercase tracking-wider border-2 h-12"
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? "Uploading..." : "Upload Image"}
                        </span>
                      </Button>
                    </label>
                    <Button
                      variant="outline"
                      onClick={() => setImageLibraryOpen(true)}
                      className="font-bold uppercase tracking-wider w-full border-2 h-12"
                      disabled={uploading}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Select from Library
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor={`alt-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Alt Text
                </Label>
                <Input
                  id={`alt-${section._id}`}
                  value={section.imageAlt || ""}
                  onChange={(e) => handleUpdate({ imageAlt: e.target.value })}
                  placeholder="Describe the image"
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor={`caption-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Caption (Optional)
                </Label>
                <Input
                  id={`caption-${section._id}`}
                  value={section.imageCaption || ""}
                  onChange={(e) => handleUpdate({ imageCaption: e.target.value })}
                  placeholder="Image caption"
                  className="h-12"
                />
              </div>
            </div>
          )}

          {section.type === "gallery" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                  Gallery Images
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryImagesUpload}
                  className="hidden"
                />
                <UploadZone
                  onSelectFiles={() => fileInputRef.current?.click()}
                  onSelectFromLibrary={() => setGalleryLibraryOpen(true)}
                  disabled={uploading}
                  isDragging={isDragging}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleGalleryDrop}
                  title="Drag & drop images here"
                  description="Upload multiple images for your gallery"
                />
              </div>

              {/* Gallery Image Grid */}
              {section.galleryImages && section.galleryImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground/70 uppercase tracking-wider">
                    {section.galleryImages.length} Image{section.galleryImages.length !== 1 ? 's' : ''} in Gallery
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {section.galleryImages.map((img, index) => (
                      <GalleryImageItem
                        key={index}
                        image={img}
                        onRemove={() => handleRemoveGalleryImage(index)}
                        onUpdateAlt={(alt) => handleUpdateGalleryImageAlt(index, alt)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {section.type === "cta_booking" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`cta-heading-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Heading
                </Label>
                <Input
                  id={`cta-heading-${section._id}`}
                  value={section.ctaHeading || ""}
                  onChange={(e) => handleUpdate({ ctaHeading: e.target.value })}
                  placeholder="Book a Session"
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor={`cta-description-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Description
                </Label>
                <ResizableTextarea
                  id={`cta-description-${section._id}`}
                  value={section.ctaDescription || ""}
                  onChange={(e) => handleUpdate({ ctaDescription: e.target.value })}
                  placeholder="Schedule a time that works for you..."
                  minRows={3}
                  maxRows={8}
                />
              </div>

              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Booking Token
                </Label>
                {section.bookingToken ? (
                  <div className="flex gap-2">
                    <Input
                      value={section.bookingToken}
                      readOnly
                      className="h-12"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setBookingSelectorOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setBookingSelectorOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Select Booking
                  </Button>
                )}
              </div>

              <BookingSelectorModal
                open={bookingSelectorOpen}
                onOpenChange={setBookingSelectorOpen}
                onSelect={(token) => handleUpdate({ bookingToken: token })}
              />
            </div>
          )}

          {section.type === "cta_stripe" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`stripe-heading-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Heading
                </Label>
                <Input
                  id={`stripe-heading-${section._id}`}
                  value={section.ctaHeading || ""}
                  onChange={(e) => handleUpdate({ ctaHeading: e.target.value })}
                  placeholder="Get Started"
                  className="h-12"
                />
              </div>

              <div>
                <Label htmlFor={`stripe-description-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Description
                </Label>
                <ResizableTextarea
                  id={`stripe-description-${section._id}`}
                  value={section.ctaDescription || ""}
                  onChange={(e) => handleUpdate({ ctaDescription: e.target.value })}
                  placeholder="Purchase now and get instant access..."
                  minRows={3}
                  maxRows={8}
                />
              </div>

              <div>
                <Label htmlFor={`stripe-url-${section._id}`} className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Stripe Payment Link
                </Label>
                <Input
                  id={`stripe-url-${section._id}`}
                  value={section.stripeUrl || ""}
                  onChange={(e) => handleUpdate({ stripeUrl: e.target.value })}
                  placeholder="https://buy.stripe.com/..."
                  className="h-12"
                />
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>

    {/* Image Media Library Selector */}
    {section.type === "image" && (
      <MediaLibrarySelector
        open={imageLibraryOpen}
        onOpenChange={setImageLibraryOpen}
        onSelect={(items) => {
          if (items.length > 0) {
            handleUpdate({
              imageStorageId: items[0].storageKey,
            });
          }
        }}
        title="Select Section Image"
        description="Choose an image from your media library for this blog section"
        multiple={false}
        mediaType="image"
        confirmButtonText="Set as Section Image"
      />
    )}

    {/* Gallery Media Library Selector */}
    {section.type === "gallery" && (
      <MediaLibrarySelector
        open={galleryLibraryOpen}
        onOpenChange={setGalleryLibraryOpen}
        onSelect={(items) => {
          const existingImages = section.galleryImages || [];
          const newImages = items.map(item => ({
            storageId: item.storageKey,
            alt: "",
          }));
          handleUpdate({
            galleryImages: [...existingImages, ...newImages],
          });
        }}
        title="Select Gallery Images"
        description="Choose multiple images from your media library for this gallery"
        multiple={true}
        mediaType="image"
        confirmButtonText="Add to Gallery"
      />
    )}
  </>
  );
}

// Gallery Image Item Component
function GalleryImageItem({ image, onRemove, onUpdateAlt }: {
  image: { storageId: string; alt?: string; width?: number; height?: number; caption?: string };
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    image.storageId ? { storageId: image.storageId } : "skip"
  );
  const [editingAlt, setEditingAlt] = useState(false);
  const [altText, setAltText] = useState(image.alt || "");

  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden border-2 border-foreground/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={image.alt || "Gallery image"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="destructive"
            onClick={onRemove}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editingAlt ? (
        <Input
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={() => {
            onUpdateAlt(altText);
            setEditingAlt(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdateAlt(altText);
              setEditingAlt(false);
            }
          }}
          placeholder="Alt text..."
          className="text-xs mt-1"
          autoFocus
        />
      ) : (
        <p
          onClick={() => setEditingAlt(true)}
          className="text-xs text-foreground/60 mt-1 truncate cursor-pointer hover:text-foreground"
        >
          {image.alt || "Click to add alt text"}
        </p>
      )}
    </div>
  );
}

