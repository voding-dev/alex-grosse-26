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
  lightMode?: boolean;
}

export function FolderSelector({ folder, onFolderChange, availableFolders, lightMode = false }: FolderSelectorProps) {
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

  const inputStyle = lightMode
    ? { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }
    : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' };

  const buttonStyle = lightMode
    ? { borderColor: 'rgba(0,0,0,0.15)', color: '#666' }
    : { borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' };

  const selectContentStyle = lightMode
    ? { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)' }
    : { backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.15)' };

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
            className="flex-1 border"
            style={inputStyle}
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            className="px-3 py-2 rounded-md transition-colors"
            style={{ backgroundColor: '#586034', color: '#fff' }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewFolderName("");
            }}
            className="px-3 py-2 border rounded-md transition-colors"
            style={buttonStyle}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={folder || "none"} onValueChange={(value) => onFolderChange(value === "none" ? "" : value)}>
            <SelectTrigger className="flex-1 border" style={inputStyle}>
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
            <SelectContent style={selectContentStyle}>
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
            className="px-3 py-2 border rounded-md transition-colors flex items-center gap-2"
            style={buttonStyle}
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      )}
    </div>
  );
}
