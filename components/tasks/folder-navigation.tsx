"use client";

import { useState } from "react";
import { Folder, ChevronRight, ChevronDown, Home } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FolderNavigationProps {
  folders: Array<{
    _id: Id<"folders">;
    name: string;
    parentFolderId?: Id<"folders">;
    color?: string;
    children?: any[];
  }>;
  selectedFolderId?: Id<"folders">;
  onFolderSelect: (folderId: Id<"folders"> | undefined) => void;
  expandedFolders: Set<Id<"folders">>;
  onToggleExpand: (folderId: Id<"folders">) => void;
  showAllTasks?: boolean;
}

export function FolderNavigation({
  folders,
  selectedFolderId,
  onFolderSelect,
  expandedFolders,
  onToggleExpand,
  showAllTasks = true,
}: FolderNavigationProps) {
  const renderFolder = (folder: typeof folders[0], level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder._id);
    const isSelected = selectedFolderId === folder._id;

    return (
      <div key={folder._id}>
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(folder._id);
              }}
              className="flex-shrink-0 p-1 hover:bg-foreground/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-foreground/60" />
              ) : (
                <ChevronRight className="h-4 w-4 text-foreground/60" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <button
            onClick={() => {
              onFolderSelect(isSelected ? undefined : folder._id);
            }}
            className={cn(
              "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group",
              isSelected
                ? "bg-accent/20 text-accent border border-accent/30"
                : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground border border-transparent"
            )}
            style={{ paddingLeft: hasChildren ? "0.5rem" : `${0.75 + level * 1.5}rem` }}
          >
            <Folder className={cn("h-4 w-4 flex-shrink-0", isSelected && "text-accent")} />
            <span className={cn("font-medium truncate text-left", isSelected && "font-bold")}>
              {folder.name}
            </span>
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {folder.children!.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {showAllTasks && (
        <button
          onClick={() => onFolderSelect(undefined)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all group",
            !selectedFolderId
              ? "bg-accent/20 text-accent border border-accent/30"
              : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
          )}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          <span className={cn("font-medium", !selectedFolderId && "font-bold")}>
            All Tasks
          </span>
        </button>
      )}
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}

