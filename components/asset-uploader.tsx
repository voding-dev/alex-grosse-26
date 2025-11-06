"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2, Link2, Search, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { isValidVideoUrl } from "@/lib/video-utils";

interface AssetUploaderProps {
  projectId?: Id<"projects">;
  portfolioId?: Id<"portfolio">; // For portfolio items
  deliveryId?: Id<"deliveries">; // For delivery items
  uploadType?: "portfolio" | "project" | "delivery"; // Separates portfolio uploads, project uploads, and delivery uploads
  onUploadComplete?: () => void;
}

type MediaItem = {
  _id: Id<"mediaLibrary"> | string;
  storageKey: string;
  type: "image" | "video";
  filename: string;
  size?: number;
};

export function AssetUploader({ projectId, portfolioId, deliveryId, uploadType, onUploadComplete }: AssetUploaderProps) {
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrls, setVideoUrls] = useState<Array<{ url: string; filename: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Media library state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("all");
  const [mediaFolderFilter, setMediaFolderFilter] = useState<string>("all");
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [selectedMediaItems, setSelectedMediaItems] = useState<MediaItem[]>([]);
  
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const createAsset = useMutation(api.assets.create);
  
  // Media library queries
  const allMedia = useQuery(api.mediaLibrary.list, {
    type: mediaTypeFilter === "all" ? undefined : mediaTypeFilter,
    folder: mediaFolderFilter === "all" ? undefined : mediaFolderFilter,
    search: mediaSearchQuery || undefined,
    includeAssets: true,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      addFiles(filesArray);
    }
  };

  const addFiles = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVideoUrl = () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Empty URL",
        description: "Please enter a video URL.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidVideoUrl(videoUrl.trim())) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube or Vimeo URL.",
        variant: "destructive",
      });
      return;
    }

    // Extract a reasonable filename from the URL
    let filename = "video.mp4";
    try {
      // Ensure URL has protocol
      const urlToParse = videoUrl.trim().startsWith("http") 
        ? videoUrl.trim() 
        : `https://${videoUrl.trim()}`;
      const urlObj = new URL(urlToParse);
      const hostname = urlObj.hostname.replace("www.", "");
      const pathname = urlObj.pathname.split("/").pop() || "video";
      filename = `${hostname}-${pathname}.mp4`;
    } catch {
      // Fallback to simple filename if URL parsing fails
      filename = `video-${Date.now()}.mp4`;
    }

    setVideoUrls((prev) => [...prev, { url: videoUrl.trim(), filename }]);
    setVideoUrl("");
    
    toast({
      title: "Video URL added",
      description: "Click 'Add Videos' to create assets.",
    });
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVideoUrls = async () => {
    if (videoUrls.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const video of videoUrls) {
        try {
          await createAsset({
            projectId: projectId,
            portfolioId: portfolioId,
            deliveryId: deliveryId,
            uploadType: uploadType,
            filename: video.filename,
            storageKey: "", // Empty string for external videos
            type: "video",
            videoUrl: video.url,
            size: 0, // 0 for external videos
            email: adminEmail || undefined,
          });

          successCount++;
        } catch (error) {
          console.error(`Error adding video ${video.url}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Videos added successfully",
          description: `${successCount} video${successCount > 1 ? 's' : ''} added successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
        setVideoUrls([]);
        if (onUploadComplete) onUploadComplete();
      } else {
        toast({
          title: "Failed to add videos",
          description: "All videos failed to add. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add videos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drop zone entirely
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isPdf = file.type === "application/pdf";
      return isImage || isVideo || isPdf;
    });

    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    } else if (e.dataTransfer.files.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload images, videos, or PDF files only.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of selectedFiles) {
        try {
          // 1. Get upload URL from Convex
          const uploadUrl = await generateUploadUrl();

          // 2. Upload file to Convex storage
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { storageId } = await result.json();

          // 3. Create asset record in database
          const fileType = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type === "application/pdf"
                ? "pdf"
                : "other";

          await createAsset({
            projectId: projectId,
            portfolioId: portfolioId, // Pass portfolioId for portfolio items
            deliveryId: deliveryId, // Pass deliveryId for delivery items
            uploadType: uploadType, // Pass uploadType to separate portfolio, project, and delivery uploads
            filename: file.name,
            storageKey: storageId,
            type: fileType,
            size: file.size,
            email: adminEmail || undefined,
          });

          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
        setSelectedFiles([]);
        if (onUploadComplete) onUploadComplete();
      } else {
        toast({
          title: "Upload failed",
          description: "All uploads failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload files.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith("video/")) return <Video className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  // Media library handlers
  const handleSelectMediaFromLibrary = (media: MediaItem) => {
    setSelectedMediaItems((prev) => {
      const isSelected = prev.some((m) => m._id === media._id);
      if (isSelected) {
        return prev.filter((m) => m._id !== media._id);
      } else {
        return [...prev, media];
      }
    });
  };

  const handleAddSelectedMedia = async () => {
    if (selectedMediaItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item from the media library.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const media of selectedMediaItems) {
        try {
          await createAsset({
            projectId: projectId,
            portfolioId: portfolioId,
            deliveryId: deliveryId,
            uploadType: uploadType,
            filename: media.filename,
            storageKey: media.storageKey,
            type: media.type,
            size: media.size || 0,
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
          title: "Media added successfully",
          description: `${successCount} item${successCount > 1 ? 's' : ''} added successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        });
        setSelectedMediaItems([]);
        setMediaLibraryOpen(false);
        if (onUploadComplete) onUploadComplete();
      } else {
        toast({
          title: "Failed to add media",
          description: "All items failed to add. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add media.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
              isDragging
                ? "border-accent bg-accent/10 scale-[1.02]"
                : "border-foreground/20 hover:border-accent/50 hover:bg-foreground/5"
            } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className={`p-4 rounded-full transition-colors ${
                isDragging ? "bg-accent/20" : "bg-foreground/5"
              }`}>
                <Upload className={`h-8 w-8 transition-colors ${
                  isDragging ? "text-accent" : "text-foreground/60"
                }`} />
              </div>
              <div>
                <p className={`text-base font-bold transition-colors ${
                  isDragging ? "text-accent" : "text-foreground"
                }`}>
                  {isDragging ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-sm text-foreground/60 mt-1">
                  or click to browse
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  Supports images, videos, and PDFs
                </p>
              </div>
            </div>
          </div>

          {/* Alternative: Buttons for file selection and media library */}
          <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
              className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
              Select Files
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMediaLibraryOpen(true)}
              disabled={isUploading}
              className="flex-1"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Select from Library
          </Button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-foreground/60">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border border-foreground/10 bg-foreground/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-foreground/60">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Video URL Input Section */}
          <div className="space-y-4 border-t border-foreground/10 pt-4">
            <div>
              <Label htmlFor="video-url" className="text-base font-semibold mb-2 block">
                Add YouTube or Vimeo Video
              </Label>
              <p className="text-sm text-foreground/60 mb-3">
                Paste a YouTube or Vimeo URL to embed it in your portfolio or project
              </p>
              <div className="flex gap-2">
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVideoUrl();
                    }
                  }}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddVideoUrl}
                  disabled={isUploading || !videoUrl.trim()}
                  variant="outline"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {videoUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-foreground/60">
                  {videoUrls.length} video{videoUrls.length > 1 ? 's' : ''} ready to add
                </p>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {videoUrls.map((video, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-foreground/10 bg-foreground/5 p-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Video className="h-5 w-5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{video.filename}</p>
                          <p className="text-xs text-foreground/60 truncate">{video.url}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVideoUrl(index)}
                        disabled={isUploading}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleAddVideoUrls}
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Videos...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Add {videoUrls.length} Video{videoUrls.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Media Library Dialog */}
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select from Media Library</DialogTitle>
            <DialogDescription>
              Choose images or videos from your media library to add to this {uploadType || 'item'}
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
                  {allMedia.map((media) => (
                    <MediaSelectorItem
                      key={media._id.toString()}
                      media={media}
                      onSelect={handleSelectMediaFromLibrary}
                      isSelected={selectedMediaItems.some((m) => m._id === media._id)}
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
            {selectedMediaItems.length > 0 && (
              <div className="border-t border-foreground/10 pt-4">
                <p className="text-sm text-foreground/60 mb-2">
                  {selectedMediaItems.length} item{selectedMediaItems.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMediaLibraryOpen(false);
                setSelectedMediaItems([]);
              }}
              className="border-foreground/20 hover:bg-foreground/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedMedia}
              disabled={isUploading || selectedMediaItems.length === 0}
              className="bg-accent hover:bg-accent/90 text-background"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add {selectedMediaItems.length} Item{selectedMediaItems.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Media Selector Item Component
function MediaSelectorItem({ 
  media, 
  onSelect, 
  isSelected 
}: { 
  media: MediaItem; 
  onSelect: (media: MediaItem) => void; 
  isSelected: boolean;
}) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
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

