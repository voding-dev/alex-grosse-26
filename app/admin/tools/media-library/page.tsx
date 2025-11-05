"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { MediaThumbnail } from "@/components/media-thumbnail";

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
    type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder";
    entityId: string;
    entityName?: string;
  }>;
};

export default function MediaLibraryPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit dialog
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTags, setEditTags] = useState<string>("");
  const [editFolder, setEditFolder] = useState<string>("");
  const [editAlt, setEditAlt] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [newTag, setNewTag] = useState<string>("");

  // Queries
  const [includeAssets, setIncludeAssets] = useState(true); // Show all site media by default
  const media = useQuery(api.mediaLibrary.list, {
    type: typeFilter === "all" ? undefined : typeFilter,
    folder: folderFilter === "all" ? undefined : folderFilter,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    search: searchQuery || undefined,
    includeAssets: includeAssets,
  });
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
  const createMedia = useMutation(api.mediaLibrary.create);
  const updateMedia = useMutation(api.mediaLibrary.update);
  const deleteMedia = useMutation(api.mediaLibrary.remove);
  const importFromAsset = useMutation(api.mediaLibrary.importFromAsset);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  const removeDisplayLocation = useMutation(api.mediaLibrary.removeDisplayLocation);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      setSelectedFiles((prev) => [...prev, ...filesArray]);
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

    try {
      for (const file of selectedFiles) {
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

          // Get image dimensions if image
          let width: number | undefined;
          let height: number | undefined;
          if (file.type.startsWith("image/")) {
            const img = new Image();
            const url = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
              img.onload = () => {
                width = img.width;
                height = img.height;
                URL.revokeObjectURL(url);
                resolve(null);
              };
              img.onerror = reject;
              img.src = url;
            });
          }

          // Create media record
          await createMedia({
            sessionToken: sessionToken || undefined,
            filename: file.name,
            storageKey: storageId,
            type: file.type.startsWith("image/") ? "image" : "video",
            width,
            height,
            size: file.size,
            tags: [],
            folder: folderFilter !== "all" ? folderFilter : undefined,
          });

          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Upload complete",
          description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        });
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files",
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
    setEditAlt(item.alt || "");
    setEditDescription(item.description || "");
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

  const handleDelete = async (id: Id<"mediaLibrary">) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;

    try {
      await deleteMedia({ sessionToken: sessionToken || undefined, id });
      toast({
        title: "Deleted",
        description: "Media item deleted successfully",
      });
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

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addTagToFilter = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        {media && media.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                : "space-y-4"
            }
          >
            {media.map((item) => (
                <Card key={item._id} className="group relative overflow-hidden">
                  <CardContent className="p-0">
                    <MediaThumbnail media={item} />
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-medium truncate">{item.filename}</p>
                      <div className="flex items-center justify-between text-xs text-foreground/60">
                        <span>{formatFileSize(item.size)}</span>
                        {item.width && item.height && (
                          <span>
                            {item.width}×{item.height}
                          </span>
                        )}
                      </div>
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
            ))}
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
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div>
                <Label>Folder</Label>
                <Input
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  placeholder="Folder name"
                />
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

