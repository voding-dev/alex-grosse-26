"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2, Link2 } from "lucide-react";
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
  
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const createAsset = useMutation(api.assets.create);

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

          {/* Alternative: Button for file selection (still works for mobile) */}
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Or Select Files
          </Button>

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
    </Card>
  );
}

