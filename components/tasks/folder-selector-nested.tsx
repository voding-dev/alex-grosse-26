"use client";

import { useState, useRef } from "react";
import { Folder, Plus, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";

interface FolderSelectorNestedProps {
  folderId: Id<"folders"> | undefined;
  onFolderChange: (folderId: Id<"folders"> | undefined) => void;
  availableFolders: Array<{
    _id: Id<"folders">;
    name: string;
    parentFolderId?: Id<"folders">;
    color?: string;
    children?: any[];
  }>;
  sessionToken?: string;
}

export function FolderSelectorNested({
  folderId,
  onFolderChange,
  availableFolders,
  sessionToken,
}: FolderSelectorNestedProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<Id<"folders"> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const createFolder = useMutation(api.folders.create);

  // Flatten folder hierarchy for display
  const flattenFolders = (
    folders: typeof availableFolders,
    parentId?: Id<"folders">,
    level: number = 0
  ): Array<{ id: Id<"folders">; name: string; level: number }> => {
    const result: Array<{ id: Id<"folders">; name: string; level: number }> = [];
    
    folders.forEach((folder) => {
      if (folder.parentFolderId === parentId) {
        result.push({ id: folder._id, name: folder.name, level });
        const children = flattenFolders(folders, folder._id, level + 1);
        result.push(...children);
      }
    });
    
    return result;
  };

  const flatFolders = flattenFolders(availableFolders);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    try {
      const newFolderId = await createFolder({
        sessionToken,
        name: trimmed,
        parentFolderId: newFolderParentId,
      });
      onFolderChange(newFolderId);
      setNewFolderName("");
      setNewFolderParentId(undefined);
      setIsCreating(false);
      toast({
        title: "Folder created",
        description: "New folder has been created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewFolderName("");
      setNewFolderParentId(undefined);
    }
  };

  const selectedFolder = folderId ? availableFolders.find((f) => f._id === folderId) : null;

  return (
    <div className="space-y-2">
      {isCreating ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Folder name..."
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleCreateFolder} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setIsCreating(false);
                setNewFolderName("");
                setNewFolderParentId(undefined);
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
          <Select
            value={newFolderParentId || "none"}
            onValueChange={(value) =>
              setNewFolderParentId(value === "none" ? undefined : (value as Id<"folders">))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Parent folder (optional)">
                {newFolderParentId
                  ? availableFolders.find((f) => f._id === newFolderParentId)?.name
                  : "No parent"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No parent (root level)</SelectItem>
              {flatFolders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: f.level }).map((_, i) => (
                      <ChevronRight key={i} className="h-3 w-3 text-foreground/40" />
                    ))}
                    <Folder className="h-4 w-4" />
                    {f.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select
            value={folderId || "none"}
            onValueChange={(value) =>
              onFolderChange(value === "none" ? undefined : (value as Id<"folders">))
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select folder">
                {selectedFolder ? (
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {selectedFolder.name}
                  </div>
                ) : (
                  "No folder"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No folder</SelectItem>
              {flatFolders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: f.level }).map((_, i) => (
                      <ChevronRight key={i} className="h-3 w-3 text-foreground/40" />
                    ))}
                    <Folder className="h-4 w-4" />
                    {f.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setIsCreating(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
      )}
    </div>
  );
}

