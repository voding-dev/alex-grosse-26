"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Image as ImageIcon, Check } from "lucide-react";

interface MediaItem {
  _id: string | Id<"mediaLibrary">;
  storageKey: string;
  filename: string;
  type: "image" | "video";
}

interface MediaLibrarySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video" }>) => void;
  title?: string;
  description?: string;
  multiple?: boolean;
  mediaType?: "all" | "image" | "video";
  confirmButtonText?: string;
}

export function MediaLibrarySelector({
  open,
  onOpenChange,
  onSelect,
  title = "Select from Media Library",
  description = "Choose images from your media library",
  multiple = false,
  mediaType = "image",
  confirmButtonText,
}: MediaLibrarySelectorProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(mediaType);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Array<{ _id: string; storageKey: string; filename: string; type: "image" | "video" }>>([]);

  // Media library queries
  const media = useQuery(api.mediaLibrary.list, {
    type: typeFilter === "all" ? undefined : typeFilter,
    folder: folderFilter === "all" ? undefined : folderFilter,
    search: searchQuery || undefined,
    includeAssets: false,
  });

  const mediaFolders = useQuery(api.mediaLibrary.getFolders);

  const handleSelectItem = (item: MediaItem) => {
    const selectedItem = {
      _id: item._id.toString(),
      storageKey: item.storageKey,
      filename: item.filename,
      type: item.type,
    };

    if (multiple) {
      // Toggle selection in multiple mode
      setSelectedItems((prev) => {
        const isAlreadySelected = prev.some((m) => m._id === selectedItem._id);
        if (isAlreadySelected) {
          return prev.filter((m) => m._id !== selectedItem._id);
        } else {
          return [...prev, selectedItem];
        }
      });
    } else {
      // Single selection mode
      setSelectedItems([selectedItem]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedItems);
    setSelectedItems([]);
    setSearchQuery("");
    setFolderFilter("all");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedItems([]);
    setSearchQuery("");
    setFolderFilter("all");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col !bg-[#FAFAF9] !border-gray-200 [&>button]:text-gray-500 [&>button:hover]:text-gray-800"
      >
        <DialogHeader>
          <DialogTitle 
            className="text-2xl font-black uppercase tracking-wider !text-[#1a1a1a]" 
            style={{ fontWeight: '900' }}
          >
            {title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2 !text-[#666]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Filters */}
          <div className="flex gap-2 items-center flex-shrink-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 !bg-white !border-gray-200 !text-gray-900 placeholder:!text-gray-400"
              />
            </div>
            {mediaType === "all" && (
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px] !bg-white !border-gray-200 !text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="!bg-white !border-gray-200">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-[160px] !bg-white !border-gray-200 !text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!bg-white !border-gray-200">
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
            {media && media.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {media.map((item) => {
                  const isSelected = selectedItems.some((m) => m._id === item._id.toString());
                  return (
                    <MediaSelectorItem
                      key={item._id.toString()}
                      media={item}
                      onSelect={handleSelectItem}
                      isSelected={isSelected}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <ImageIcon className="mx-auto h-16 w-16 mb-6 text-gray-300" />
                <p className="mb-4 text-xl font-black uppercase tracking-wider text-gray-900" style={{ fontWeight: '900' }}>
                  No media found
                </p>
                <p className="text-sm text-gray-500">
                  {searchQuery || folderFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Upload media to your media library first."}
                </p>
              </div>
            )}
          </div>

          {/* Selected count */}
          {selectedItems.length > 0 && (
            <div className="border-t border-gray-200 pt-4 flex-shrink-0">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="font-bold uppercase tracking-wider !bg-white !border-gray-200 !text-gray-700 hover:!bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="font-black uppercase tracking-wider !bg-[#586034] hover:!bg-[#4a5229] !text-white"
            style={{ fontWeight: '900' }}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {confirmButtonText || `Add ${selectedItems.length} Image${selectedItems.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MediaSelectorItemProps {
  media: MediaItem;
  onSelect: (media: MediaItem) => void;
  isSelected: boolean;
}

function MediaSelectorItem({ media, onSelect, isSelected }: MediaSelectorItemProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
  );

  const handleClick = () => {
    onSelect(media);
  };

  return (
    <div
      className={`relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-[#586034] ring-2 ring-[#586034]' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={media.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <ImageIcon className="h-8 w-8 text-gray-300" />
        </div>
      )}
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#586034]/30">
          <div className="rounded-full p-2 bg-[#586034]">
            <Check className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-white text-xs font-medium truncate">{media.filename}</p>
      </div>
    </div>
  );
}
