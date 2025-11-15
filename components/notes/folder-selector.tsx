"use client";

import { useState, useRef } from "react";
import { Folder, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FolderSelectorProps {
  folder: string;
  onFolderChange: (folder: string) => void;
  availableFolders: string[];
}

export function FolderSelector({ folder, onFolderChange, availableFolders }: FolderSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (trimmed) {
      onFolderChange(trimmed);
      setNewFolderName("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewFolderName("");
    }
  };

  return (
    <div className="space-y-2">
      {isCreating ? (
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
          <button
            onClick={handleCreateFolder}
            className="px-3 py-2 bg-accent text-background rounded-md hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewFolderName("");
            }}
            className="px-3 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={folder || "none"} onValueChange={(value) => onFolderChange(value === "none" ? "" : value)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select folder">
                {folder ? (
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {folder}
                  </div>
                ) : (
                  "No folder"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No folder</SelectItem>
              {availableFolders.map((f) => (
                <SelectItem key={f} value={f}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {f}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => {
              setIsCreating(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="px-3 py-2 border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      )}
    </div>
  );
}









