"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Search,
  Folder,
  Tag,
  X,
  Edit,
  Trash2,
  Plus,
  Image as ImageIcon,
  Video,
  Loader2,
  Filter,
  Grid,
  List,
  Minimize2,
  Download,
  CheckCircle,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MediaThumbnail } from "@/components/media-thumbnail";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { compressImage } from "@/lib/image-compression";
import { Checkbox } from "@/components/ui/checkbox";

type MediaItem = {
  _id: Id<"mediaLibrary">;
  filename: string;
  storageKey: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  size: number;
  tags: string[];
  folder?: string;
  alt?: string;
  description?: string;
  canonicalUrl?: string;
  sourceAssetId?: Id<"assets">;
  sourceType?: "asset" | "upload";
  displayLocations?: Array<{
    type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder" | "gallery" | "hero_carousel" | "about" | "cover";
    entityId: string;
    entityName?: string;
  }>;
  // Compression metadata
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  fileHash?: string;
};

export default function MediaLibraryPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [compressingItemId, setCompressingItemId] = useState<Id<"mediaLibrary"> | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; mediaId: Id<"mediaLibrary"> | null }>({ open: false, mediaId: null });
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit dialog
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTags, setEditTags] = useState<string>("");
  const [editFolder, setEditFolder] = useState<string>("");
  const [editFilename, setEditFilename] = useState<string>("");
  const [editAlt, setEditAlt] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [newTag, setNewTag] = useState<string>("");
  
  // Autocomplete states
  const [tagInputValue, setTagInputValue] = useState<string>("");
  const [folderInputValue, setFolderInputValue] = useState<string>("");
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const [folderSuggestionsOpen, setFolderSuggestionsOpen] = useState(false);

  // Queries
  const [includeAssets, setIncludeAssets] = useState(true); // Show all site media by default
  const media = useQuery(api.mediaLibrary.list, {
    type: typeFilter === "all" ? undefined : typeFilter,
    folder: folderFilter === "all" ? undefined : folderFilter === "not_in_folder" ? "__not_in_folder__" : folderFilter,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    search: searchQuery || undefined,
    includeAssets: includeAssets,
  });

  // Debug: Log query state
  useEffect(() => {
    if (media === undefined) {
      console.log("[Media Library] Query is loading...");
    } else if (Array.isArray(media)) {
      console.log(`[Media Library] Query completed with ${media.length} items`);
    } else {
      console.log("[Media Library] Query returned unexpected value:", media);
    }
  }, [media]);
  const folders = useQuery(api.mediaLibrary.getFolders);
  const tags = useQuery(api.mediaLibrary.getTags);
  
  // Get all portfolios, projects, and deliveries for display location linking
  const portfolios = useQuery(api.portfolio.list);
  const projects = useQuery(api.projects.list);
  const deliveries = useQuery(
    api.deliveries.list,
    adminEmail ? { email: adminEmail } : "skip"
  );
  const pitchDecks = useQuery(
    api.pitchDecks.list,
    sessionToken ? { sessionToken } : "skip"
  );
  
  // Mutations
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const updateMedia = useMutation(api.mediaLibrary.update);
  const deleteMedia = useMutation(api.mediaLibrary.remove);
  const importFromAsset = useMutation(api.mediaLibrary.importFromAsset);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  const removeDisplayLocation = useMutation(api.mediaLibrary.removeDisplayLocation);
  const getSignedDownloadUrl = useAction(api.storage.getSignedDownloadUrl);
  
  // Get media query for duplicate checking
  const allMedia = useQuery(api.mediaLibrary.list, {
    includeAssets: false,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      // Reset input value to allow re-selection of the same file
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    try {
      for (const file of selectedFiles) {
        try {
          const isImage = file.type.startsWith("image/");
          
          // For images, use centralized upload utility with compression and media library integration
          if (isImage) {
            try {
              const uploadResult = await uploadImageToMediaLibrary({
                file,
                sessionToken: sessionToken || undefined,
                tags: [],
                folder: folderFilter !== "all" ? folderFilter : undefined,
                generateUploadUrl,
                checkDuplicateMutation,
                getMedia: async (args) => {
                  const media = allMedia?.find((m) => m._id === args.id);
                  return media ? { storageKey: media.storageKey, width: media.width, height: media.height, size: media.size } : null;
                },
                addDisplayLocation: async (args) => {
                  await addDisplayLocation(args);
                },
                createMedia: async (args) => {
                  return await createMedia(args);
                },
              });

              if (uploadResult.isDuplicate) {
                duplicateCount++;
                toast({
                  title: "Duplicate detected",
                  description: `${file.name} already exists in the media library`,
                  variant: "default",
                });
              } else {
                successCount++;
              }
            } catch (error: any) {
              console.error(`Error uploading ${file.name}:`, error);
              toast({
                title: "Upload failed",
                description: error.message || `Failed to upload ${file.name}`,
                variant: "destructive",
              });
              errorCount++;
            }
          } else {
            // For videos, use direct upload (no compression)
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
                throw new Error(`Failed to upload ${file.name}`);
              }

              const { storageId } = await result.json();

              // Get video dimensions
              let width: number | undefined;
              let height: number | undefined;
              try {
                const video = document.createElement("video");
                const url = URL.createObjectURL(file);
                await new Promise((resolve, reject) => {
                  video.onloadedmetadata = () => {
                    width = video.videoWidth;
                    height = video.videoHeight;
                    URL.revokeObjectURL(url);
                    resolve(null);
                  };
                  video.onerror = reject;
                  video.src = url;
                });
              } catch (error) {
                console.warn(`Failed to get video dimensions for ${file.name}:`, error);
              }

              // Create media record
              await createMedia({
                sessionToken: sessionToken || undefined,
                filename: file.name,
                storageKey: storageId,
                type: "video",
                width,
                height,
                size: file.size,
                tags: [],
                folder: folderFilter !== "all" ? folderFilter : undefined,
              });

              successCount++;
            } catch (error: any) {
              console.error(`Error uploading ${file.name}:`, error);
              toast({
                title: "Upload failed",
                description: error.message || `Failed to upload ${file.name}`,
                variant: "destructive",
              });
              errorCount++;
            }
          }
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }

      const message = `${successCount} file(s) uploaded successfully`;
      const extraMessages = [];
      if (duplicateCount > 0) extraMessages.push(`${duplicateCount} duplicate(s) skipped`);
      if (errorCount > 0) extraMessages.push(`${errorCount} failed`);

      if (successCount > 0 || duplicateCount > 0) {
        toast({
          title: "Upload complete",
          description: [message, ...extraMessages].join(", "),
        });
        setSelectedFiles([]);
        // Reset file input to allow re-selection
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (errorCount > 0) {
        toast({
          title: "Upload failed",
          description: `${errorCount} file(s) failed to upload`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditTags(item.tags.join(", "));
    setEditFolder(item.folder || "");
    setEditFilename(item.filename || "");
    setEditAlt(item.alt || "");
    setEditDescription(item.description || "");
    setTagInputValue("");
    setFolderInputValue("");
    setTagSuggestionsOpen(false);
    setFolderSuggestionsOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const tagsArray = editTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await updateMedia({
        sessionToken: sessionToken || undefined,
        id: editingItem._id,
        filename: editFilename !== editingItem.filename ? editFilename : undefined,
        tags: tagsArray,
        folder: editFolder || undefined,
        alt: editAlt || undefined,
        description: editDescription || undefined,
      });

      toast({
        title: "Updated",
        description: "Media item updated successfully",
      });
      setEditingItem(null);
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update media item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: Id<"mediaLibrary">) => {
    setDeleteDialog({ open: true, mediaId: id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.mediaId) return;

    try {
      await deleteMedia({ sessionToken: sessionToken || undefined, id: deleteDialog.mediaId });
      toast({
        title: "Deleted",
        description: "Media item deleted successfully",
      });
      setDeleteDialog({ open: false, mediaId: null });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete media item",
        variant: "destructive",
      });
    }
  };

  const handleImportAsset = async (assetId: Id<"assets">) => {
    try {
      await importFromAsset({ sessionToken: sessionToken || undefined, assetId });
      toast({
        title: "Imported",
        description: "Asset imported to Media Library successfully",
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: "Failed to import asset",
        variant: "destructive",
      });
    }
  };

  const handleCompressImage = async (item: MediaItem) => {
    // Only compress images that are actually in the media library (not assets)
    if (item.type !== "image" || item._id.toString().startsWith("asset_")) {
      return; // Only compress images that are in the media library
    }

    // Validate session token
    if (!sessionToken) {
      toast({
        title: "Authentication required",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    // Validate that this is a real media library ID (not an asset ID)
    if (typeof item._id !== "string" || item._id.toString().startsWith("asset_")) {
      toast({
        title: "Invalid media item",
        description: "This item cannot be compressed",
        variant: "destructive",
      });
      return;
    }

    // Check if already compressed
    if (item.compressedSize && item.originalSize && item.compressionRatio) {
      toast({
        title: "Already compressed",
        description: "This image has already been compressed",
        variant: "default",
      });
      return;
    }

    setCompressingItemId(item._id);
    
    try {
      // Validate storage key before calling the action
      const storageKey = item.storageKey;
      
      if (!storageKey || typeof storageKey !== "string") {
        throw new Error("Invalid storage key: media item has no storage key");
      }
      
      // Check for Windows file paths (common issue)
      if (storageKey.includes("\\") || /[a-zA-Z]:/.test(storageKey)) {
        throw new Error(`Invalid storage key: media item appears to have a file path instead of a Convex storage ID. This media item may need to be re-uploaded.`);
      }
      
      // Check for seed/mock data
      if (storageKey.startsWith("seed-") || storageKey.startsWith("mock-") || storageKey.includes("seed-storage")) {
        throw new Error("Invalid storage key: this media item appears to be test/seed data and cannot be compressed");
      }
      
      // Check minimum length
      if (storageKey.length < 10) {
        throw new Error(`Invalid storage key: storage key is too short (${storageKey.length} characters). This media item may need to be re-uploaded.`);
      }

      // Get the image URL using action
      const imageUrl = await getSignedDownloadUrl({ storageKey: storageKey });

      if (!imageUrl) {
        throw new Error("Could not get image URL. The storage key may be invalid or the file may have been deleted.");
      }

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Failed to download image");
      }
      
      const blob = await response.blob();
      const file = new File([blob], item.filename, { type: blob.type || "image/jpeg" });

      // Compress the image
      const compressionResult = await compressImage(file, {
        quality: 0.7, // 70% quality
        maxWidth: 1920,
        maxHeight: 1920,
        outputFormat: "jpeg",
        enableResize: true,
      });

      // Upload compressed image
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: compressionResult.blob,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload compressed image");
      }

      const { storageId } = await uploadResult.json();

      // Validate compression results - ensure all values are valid numbers
      if (!compressionResult.width || !compressionResult.height || 
          isNaN(compressionResult.compressedSize) || isNaN(compressionResult.compressionRatio) ||
          !isFinite(compressionResult.compressedSize) || !isFinite(compressionResult.compressionRatio) ||
          compressionResult.compressedSize <= 0 || compressionResult.width <= 0 || compressionResult.height <= 0) {
        throw new Error("Invalid compression results - compression failed");
      }

      // Validate storage ID
      if (!storageId || typeof storageId !== "string" || storageId.trim().length === 0) {
        throw new Error("Invalid storage ID returned from upload");
      }

      // Ensure we have a valid session token
      if (!sessionToken) {
        throw new Error("Authentication required - please refresh the page");
      }

      // Prepare update data with proper typing and validation
      const originalSizeValue = item.originalSize || item.size;
      
      // Ensure all numeric values are valid and finite
      const compressedSize = Math.round(compressionResult.compressedSize);
      const compressionRatio = Math.round(compressionResult.compressionRatio * 100) / 100; // Round to 2 decimal places
      const width = Math.round(compressionResult.width);
      const height = Math.round(compressionResult.height);
      
      if (compressedSize <= 0 || width <= 0 || height <= 0 || !isFinite(compressionRatio)) {
        throw new Error("Invalid compression results - compression failed");
      }

      // Build update data object with all fields
      const updateData: {
        sessionToken: string;
        id: Id<"mediaLibrary">;
        storageKey: string;
        size: number;
        compressedSize: number;
        compressionRatio: number;
        width: number;
        height: number;
        originalSize?: number;
      } = {
        sessionToken: sessionToken,
        id: item._id as Id<"mediaLibrary">,
        storageKey: storageId,
        size: compressedSize,
        compressedSize: compressedSize,
        compressionRatio: compressionRatio,
        width: width,
        height: height,
        // Only include originalSize if we have a valid value
        ...(originalSizeValue && originalSizeValue > 0 && isFinite(originalSizeValue) 
          ? { originalSize: Math.round(originalSizeValue) } 
          : {}),
      };

      // Update media library record with compressed version
      await updateMedia(updateData);

      toast({
        title: "Compressed successfully",
        description: `Image compressed from ${formatFileSize(compressionResult.originalSize)} to ${formatFileSize(compressionResult.compressedSize)} (${Math.round(compressionResult.compressionRatio)}% reduction)`,
      });
    } catch (error: any) {
      console.error("Compression error:", error);
      toast({
        title: "Compression failed",
        description: error.message || "Failed to compress image",
        variant: "destructive",
      });
    } finally {
      setCompressingItemId(null);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addTagToFilter = () => {
    const trimmedTag = newTag.trim();
    // Prevent adding the special "__not_tagged__" value as a regular tag
    if (trimmedTag && trimmedTag !== "__not_tagged__" && !selectedTags.includes(trimmedTag)) {
      setSelectedTags((prev) => [...prev, trimmedTag]);
      setNewTag("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Selection handlers
  const toggleMedia = (mediaId: string) => {
    const newSet = new Set(selectedMedia);
    if (newSet.has(mediaId)) {
      newSet.delete(mediaId);
    } else {
      newSet.add(mediaId);
    }
    setSelectedMedia(newSet);
  };

  const handleSelectAll = () => {
    if (!media) return;
    if (selectedMedia.size === media.length) {
      // Deselect all
      setSelectedMedia(new Set());
    } else {
      // Select all
      const allIds = new Set(media.map((item) => item._id.toString()));
      setSelectedMedia(allIds);
    }
  };

  const isAllSelected = media && media.length > 0 && selectedMedia.size === media.length;
  const isSomeSelected = selectedMedia.size > 0 && media && selectedMedia.size < media.length;

  // Download handlers
  const handleDownload = async (mediaId: string) => {
    try {
      const item = media?.find((m) => m._id.toString() === mediaId);
      if (!item) return;

      const url = await getSignedDownloadUrl({ storageKey: item.storageKey });
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = item.filename || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "Error",
          description: "Failed to get download URL.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedMedia.size === 0) return;
    
    toast({
      title: "Download started",
      description: `Downloading ${selectedMedia.size} file(s)...`,
    });

    // Download each selected file
    for (const mediaId of selectedMedia) {
      await handleDownload(mediaId);
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: "Download complete",
      description: `Downloaded ${selectedMedia.size} file(s).`,
    });
  };

  const handleDownloadAll = async () => {
    if (!media || media.length === 0) return;
    
    toast({
      title: "Download started",
      description: `Downloading all ${media.length} files...`,
    });

    // Download each file
    for (const item of media) {
      await handleDownload(item._id.toString());
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: "Download complete",
      description: `Downloaded all ${media.length} files.`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Media Library</h1>
            <p className="text-foreground/60 mt-1">
              Global warehouse for all reusable media assets
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={includeAssets ? "default" : "outline"}
              onClick={() => setIncludeAssets(!includeAssets)}
            >
              {includeAssets ? "Show All Site Media" : "Show Media Library Only"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Primary Actions Bar - Select All and Download */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
            isAllSelected 
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/20" 
              : "border-foreground/20 bg-foreground/5 backdrop-blur-sm hover:border-foreground/40"
          }`}>
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className="h-5 w-5 border-2 border-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent shadow-lg"
            />
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${isAllSelected ? "text-accent" : "text-foreground/40"}`} />
              <span className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                Select All Files
              </span>
            </div>
            {selectedMedia.size > 0 && (
              <span className="text-xs font-medium text-accent bg-accent/20 px-2 py-1 rounded-full">
                {selectedMedia.size} selected
              </span>
            )}
          </div>
          
          {selectedMedia.size > 0 && (
            <Button 
              onClick={handleDownloadSelected} 
              className="font-black uppercase tracking-wider bg-background text-foreground border-2 border-foreground/30 hover:bg-foreground hover:text-background shadow-lg transition-all hover:scale-105"
              style={{ fontWeight: '900' }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Selected ({selectedMedia.size})
            </Button>
          )}

          {media && media.length > 0 && (
            <Button 
              onClick={handleDownloadAll} 
              className="font-black uppercase tracking-wider bg-background text-foreground border-2 border-foreground/30 hover:bg-foreground hover:text-background shadow-lg transition-all hover:scale-105"
              style={{ fontWeight: '900' }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <Input
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>

              {/* Folder Filter */}
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  <SelectItem value="not_in_folder">Not in a folder</SelectItem>
                  {folders?.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tags Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTagToFilter()}
                      />
                      <Button onClick={addTagToFilter} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedTags.includes("__not_tagged__") ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle("__not_tagged__")}
                      >
                        Not tagged
                      </Badge>
                      {tags?.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTags([])}
                        className="w-full"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    {selectedFiles.length} file(s) ready to upload
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Drop Zone */}
        {selectedFiles.length === 0 && (
          <Card
            className={`border-2 border-dashed transition-colors ${
              isDragging
                ? "border-accent bg-accent/10"
                : "border-foreground/20 hover:border-accent/50"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-foreground/60" />
              <p className="text-lg font-semibold mb-2">
                Drag & drop files here or click to browse
              </p>
              <p className="text-sm text-foreground/60">
                Supports images and videos
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Media Grid */}
        {media === undefined ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-foreground/60" />
              <p className="text-foreground/60">Loading media...</p>
            </CardContent>
          </Card>
        ) : media && media.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                : "space-y-4"
            }
          >
            {media.map((item) => {
              const isSelected = selectedMedia.has(item._id.toString());
              return (
                <Card key={item._id} className={`group relative overflow-hidden ${
                  isSelected ? "ring-2 ring-accent border-accent shadow-accent/20" : ""
                }`}>
                  <CardContent className="p-0">
                    <div className="relative">
                      <MediaThumbnail media={item} />
                      {/* Selection checkbox */}
                      <div
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMedia(item._id.toString())}
                          className="bg-background/95 border-2 border-foreground/40 hover:border-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent shadow-lg"
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-medium truncate">{item.filename}</p>
                      <div className="flex items-center justify-between text-xs text-foreground/60">
                        <span>
                          {item.compressedSize && item.originalSize ? (
                            <span className="flex flex-col">
                              <span className="text-green-500 font-medium">{formatFileSize(item.compressedSize)}</span>
                              <span className="text-xs line-through opacity-60">{formatFileSize(item.originalSize)}</span>
                            </span>
                          ) : (
                            formatFileSize(item.size)
                          )}
                        </span>
                        {item.width && item.height && (
                          <span>
                            {item.width}×{item.height}
                          </span>
                        )}
                      </div>
                      {item.compressionRatio && item.compressionRatio > 0 && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          -{Math.round(item.compressionRatio)}% compressed
                        </Badge>
                      )}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                      {item.folder && (
                        <div className="flex items-center gap-1 text-xs text-foreground/60">
                          <Folder className="h-3 w-3" />
                          <span className="truncate">{item.folder}</span>
                        </div>
                      )}
                      {/* Source indicator */}
                      {item.sourceType === "asset" && (
                        <Badge variant="outline" className="text-xs">
                          From Assets
                        </Badge>
                      )}
                      {/* Display locations */}
                      {item.displayLocations && item.displayLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.displayLocations.map((loc, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {loc.type}: {loc.entityName || loc.entityId}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(item)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {/* Compress button for uncompressed images */}
                      {item.type === "image" && 
                       !item._id.toString().startsWith("asset_") && 
                       typeof item._id === "string" &&
                       !(item.compressedSize && item.originalSize && item.compressionRatio) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompressImage(item)}
                          disabled={compressingItemId === item._id || !sessionToken}
                          className="h-7 w-7 p-0"
                          title="Compress image"
                        >
                          {compressingItemId === item._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Minimize2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {item.sourceType === "asset" && typeof item._id === "string" && item._id.startsWith("asset_") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const assetId = item._id.toString().replace("asset_", "") as Id<"assets">;
                            handleImportAsset(assetId);
                          }}
                          className="h-7 w-7 p-0"
                          title="Import to Media Library"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                      {!item._id.toString().startsWith("asset_") && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item._id as Id<"mediaLibrary">)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-foreground/60">No media found</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Media</DialogTitle>
              <DialogDescription>
                Update metadata for this media item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Filename (for SEO)</Label>
                <Input
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  placeholder="filename.jpg"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Change the filename for better SEO
                </p>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="relative">
                  <Input
                    value={editTags}
                    onChange={(e) => {
                      const value = e.target.value;
                      const lastCommaIndex = value.lastIndexOf(",");
                      const currentTag = lastCommaIndex >= 0 
                        ? value.substring(lastCommaIndex + 1).trim()
                        : value.trim();
                      
                      // Check if a comma was just typed (detect when user types a comma)
                      const lastChar = value[value.length - 1];
                      const prevLastChar = editTags[editTags.length - 1];
                      if (lastChar === "," && prevLastChar !== "," && lastCommaIndex >= 0) {
                        // User just typed a comma - extract and add the tag before it
                        const beforeComma = value.substring(0, lastCommaIndex).trim();
                        const tagToAdd = beforeComma.split(",").pop()?.trim() || "";
                        
                        if (tagToAdd.length > 0) {
                          // Add the tag before the comma
                          const existingTags = editTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
                          if (!existingTags.includes(tagToAdd)) {
                            // Add the tag and format properly
                            const newTags = existingTags.length > 0 
                              ? [...existingTags, tagToAdd].join(", ") + ", "
                              : tagToAdd + ", ";
                            setEditTags(newTags);
                            setTagInputValue("");
                            setTagSuggestionsOpen(false);
                            return;
                          } else {
                            // Tag already exists, just format properly
                            const newTags = existingTags.join(", ") + ", ";
                            setEditTags(newTags);
                            setTagInputValue("");
                            setTagSuggestionsOpen(false);
                            return;
                          }
                        } else {
                          // Just a comma with no tag before it, keep the comma for formatting
                          setEditTags(value);
                          setTagInputValue("");
                          setTagSuggestionsOpen(false);
                          return;
                        }
                      }
                      
                      setEditTags(value);
                      setTagInputValue(currentTag);
                      // Show suggestions if there's text or if there are tags available
                      if (currentTag.length > 0 || (tags && tags.length > 0)) {
                        setTagSuggestionsOpen(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const lastCommaIndex = editTags.lastIndexOf(",");
                        const currentTag = lastCommaIndex >= 0 
                          ? editTags.substring(lastCommaIndex + 1).trim()
                          : editTags.trim();
                        
                        if (currentTag.length > 0) {
                          const existingTags = editTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
                          if (!existingTags.includes(currentTag)) {
                            // Add the tag
                            const newTags = existingTags.length > 0 
                              ? [...existingTags, currentTag].join(", ") + ", "
                              : currentTag + ", ";
                            setEditTags(newTags);
                            setTagInputValue("");
                            setTagSuggestionsOpen(false);
                          } else {
                            // Tag already exists, just format properly and clear current tag
                            const newTags = existingTags.join(", ") + ", ";
                            setEditTags(newTags);
                            setTagInputValue("");
                            setTagSuggestionsOpen(false);
                          }
                        }
                      }
                    }}
                    onFocus={() => {
                      const lastCommaIndex = editTags.lastIndexOf(",");
                      const currentTag = lastCommaIndex >= 0 
                        ? editTags.substring(lastCommaIndex + 1).trim()
                        : editTags.trim();
                      setTagInputValue(currentTag);
                      // Show suggestions if there's any text or if there are existing tags to choose from
                      if (tags && tags.length > 0) {
                        setTagSuggestionsOpen(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow clicking on suggestions
                      setTimeout(() => setTagSuggestionsOpen(false), 200);
                    }}
                    placeholder="tag1, tag2, tag3"
                  />
                  {tagSuggestionsOpen && tags && tags.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-foreground/10 rounded-md shadow-lg max-h-60 overflow-auto">
                      {(() => {
                        const existingTags = editTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
                        const filteredTags = tags
                          .filter((tag) => 
                            tagInputValue.length === 0 || 
                            tag.toLowerCase().includes(tagInputValue.toLowerCase())
                          )
                          .filter((tag) => !existingTags.includes(tag))
                          .slice(0, 10);
                        
                        if (filteredTags.length === 0 && tagInputValue.length === 0) {
                          return (
                            <div className="px-3 py-2 text-sm text-foreground/60">
                              No available tags
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            {filteredTags.map((tag) => (
                              <div
                                key={tag}
                                className="px-3 py-2 cursor-pointer hover:bg-foreground/10 text-sm"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const lastCommaIndex = editTags.lastIndexOf(",");
                                  if (lastCommaIndex >= 0) {
                                    // Replace the text after the last comma
                                    const before = editTags.substring(0, lastCommaIndex + 1);
                                    setEditTags((before + " " + tag).trim() + ", ");
                                  } else if (editTags.trim().length > 0) {
                                    // Add to existing tags
                                    setEditTags(editTags.trim() + ", " + tag + ", ");
                                  } else {
                                    // First tag
                                    setEditTags(tag + ", ");
                                  }
                                  setTagInputValue("");
                                  setTagSuggestionsOpen(false);
                                }}
                              >
                                <Tag className="h-3 w-3 inline mr-2" />
                                {tag}
                              </div>
                            ))}
                            {tagInputValue.length > 0 && 
                             !tags.some(t => t.toLowerCase() === tagInputValue.toLowerCase()) && (
                              <div
                                className="px-3 py-2 cursor-pointer hover:bg-foreground/10 text-sm border-t border-foreground/10"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const lastCommaIndex = editTags.lastIndexOf(",");
                                  if (lastCommaIndex >= 0) {
                                    const before = editTags.substring(0, lastCommaIndex + 1);
                                    setEditTags((before + " " + tagInputValue).trim() + ", ");
                                  } else if (editTags.trim().length > 0) {
                                    setEditTags(editTags.trim() + ", " + tagInputValue + ", ");
                                  } else {
                                    setEditTags(tagInputValue + ", ");
                                  }
                                  setTagInputValue("");
                                  setTagSuggestionsOpen(false);
                                }}
                              >
                                <Plus className="h-3 w-3 inline mr-2" />
                                Create "{tagInputValue}"
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground/60 mt-1">
                  Type to search existing tags or create new ones
                </p>
              </div>
              <div>
                <Label>Folder</Label>
                <div className="relative">
                  <Input
                    value={editFolder}
                    onChange={(e) => {
                      setEditFolder(e.target.value);
                      setFolderInputValue(e.target.value);
                      // Show suggestions if there's text or if there are folders available
                      if (e.target.value.length > 0 || (folders && folders.length > 0)) {
                        setFolderSuggestionsOpen(true);
                      }
                    }}
                    onFocus={() => {
                      setFolderInputValue(editFolder);
                      // Show suggestions if there are existing folders to choose from
                      if (folders && folders.length > 0) {
                        setFolderSuggestionsOpen(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow clicking on suggestions
                      setTimeout(() => setFolderSuggestionsOpen(false), 200);
                    }}
                    placeholder="Folder name"
                  />
                  {folderSuggestionsOpen && folders && folders.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-foreground/10 rounded-md shadow-lg max-h-60 overflow-auto">
                      {(() => {
                        const filteredFolders = folders
                          .filter((folder) => 
                            folderInputValue.length === 0 || 
                            folder.toLowerCase().includes(folderInputValue.toLowerCase())
                          )
                          .slice(0, 10);
                        
                        if (filteredFolders.length === 0 && folderInputValue.length === 0) {
                          return (
                            <div className="px-3 py-2 text-sm text-foreground/60">
                              No available folders
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            {filteredFolders.map((folder) => (
                              <div
                                key={folder}
                                className="px-3 py-2 cursor-pointer hover:bg-foreground/10 text-sm"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditFolder(folder);
                                  setFolderInputValue("");
                                  setFolderSuggestionsOpen(false);
                                }}
                              >
                                <Folder className="h-3 w-3 inline mr-2" />
                                {folder}
                              </div>
                            ))}
                            {folderInputValue.length > 0 && 
                             !folders.some(f => f.toLowerCase() === folderInputValue.toLowerCase()) && (
                              <div
                                className="px-3 py-2 cursor-pointer hover:bg-foreground/10 text-sm border-t border-foreground/10"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditFolder(folderInputValue);
                                  setFolderInputValue("");
                                  setFolderSuggestionsOpen(false);
                                }}
                              >
                                <Plus className="h-3 w-3 inline mr-2" />
                                Create "{folderInputValue}"
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground/60 mt-1">
                  Type to search existing folders or create a new one
                </p>
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="Alt text for accessibility"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>
              {/* Display Locations */}
              <div>
                <Label>Display Locations</Label>
                <div className="space-y-2 mt-2">
                  {editingItem?.displayLocations?.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">
                        <Badge variant="outline" className="mr-2">{loc.type}</Badge>
                        {loc.entityName || loc.entityId}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await removeDisplayLocation({
                            sessionToken: sessionToken || undefined,
                            id: editingItem._id,
                            locationType: loc.type,
                            entityId: loc.entityId,
                          });
                          toast({ title: "Location removed", description: "Display location removed successfully" });
                          setEditingItem(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <AddDisplayLocationDialog
                    mediaId={editingItem?._id}
                    onAdd={async (locationType, entityId, entityName) => {
                      await addDisplayLocation({
                        sessionToken: sessionToken || undefined,
                        id: editingItem!._id,
                        locationType,
                        entityId,
                        entityName,
                      });
                      toast({ title: "Location added", description: "Display location added successfully" });
                      setEditingItem(null);
                    }}
                    portfolios={portfolios || []}
                    projects={projects || []}
                    deliveries={deliveries || []}
                    pitchDecks={pitchDecks || []}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Media Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, mediaId: deleteDialog.mediaId })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Media Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this media item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Add Display Location Dialog Component
function AddDisplayLocationDialog({
  mediaId,
  onAdd,
  portfolios,
  projects,
  deliveries,
  pitchDecks,
}: {
  mediaId?: Id<"mediaLibrary">;
  onAdd: (type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder", entityId: string, entityName?: string) => Promise<void>;
  portfolios: any[];
  projects: any[];
  deliveries: any[];
  pitchDecks: any[];
}) {
  const [open, setOpen] = useState(false);
  const [locationType, setLocationType] = useState<"portfolio" | "project" | "delivery" | "pitch_deck">("portfolio");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");

  const handleAdd = async () => {
    if (!selectedEntityId) return;
    
    let entityName: string | undefined;
    if (locationType === "portfolio") {
      entityName = portfolios.find((p) => p._id === selectedEntityId)?.title;
    } else if (locationType === "project") {
      entityName = projects.find((p) => p._id === selectedEntityId)?.title;
    } else if (locationType === "delivery") {
      entityName = deliveries.find((d) => d._id === selectedEntityId)?.title;
    } else if (locationType === "pitch_deck") {
      entityName = pitchDecks.find((d) => d._id === selectedEntityId)?.title;
    }

    await onAdd(locationType, selectedEntityId, entityName);
    setOpen(false);
    setSelectedEntityId("");
  };

  const entities = 
    locationType === "portfolio" ? portfolios :
    locationType === "project" ? projects :
    locationType === "delivery" ? deliveries :
    locationType === "pitch_deck" ? pitchDecks : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-3 w-3 mr-2" />
          Add Display Location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Display Location</DialogTitle>
          <DialogDescription>
            Link this media to a location on the site
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Location Type</Label>
            <Select value={locationType} onValueChange={(v) => {
              setLocationType(v as any);
              setSelectedEntityId("");
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="pitch_deck">Pitch Deck</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Select {locationType}</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${locationType}...`} />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity._id} value={entity._id}>
                    {entity.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedEntityId}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

