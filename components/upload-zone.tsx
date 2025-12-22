"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";

interface UploadZoneProps {
  onSelectFiles: () => void;
  onSelectFromLibrary: () => void;
  disabled?: boolean;
  multiple?: boolean;
  isDragging?: boolean;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  className?: string;
  title?: string;
  description?: string;
}

export function UploadZone({
  onSelectFiles,
  onSelectFromLibrary,
  disabled = false,
  isDragging = false,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  className = "",
  title = "Drag & drop files here",
  description = "Supports images, videos, and PDFs",
}: UploadZoneProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
          isDragging
            ? "border-accent bg-accent/10 scale-[1.02]"
            : "border-foreground/20 hover:border-accent/50 hover:bg-foreground/5"
        } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onClick={disabled ? undefined : onSelectFiles}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4 pointer-events-none">
          <div className={`p-4 rounded-full transition-colors ${
            isDragging ? "bg-accent/20" : "bg-foreground/5"
          }`}>
            <Upload className={`h-8 w-8 transition-colors ${
              isDragging ? "text-accent" : "text-foreground/60"
            }`} />
          </div>
          <div>
            <p className={`text-base font-bold transition-colors uppercase tracking-wider ${
              isDragging ? "text-accent" : "text-foreground"
            }`} style={{ fontWeight: '900' }}>
              {isDragging ? "Drop files here" : title}
            </p>
            <p className="text-sm text-foreground/60 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-foreground/50 mt-2">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Buttons for file selection and media library */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onSelectFiles}
          disabled={disabled}
          className="font-bold uppercase tracking-wider border-2"
        >
          <Upload className="mr-2 h-4 w-4" />
          Select Files
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSelectFromLibrary}
          disabled={disabled}
          className="font-bold uppercase tracking-wider border-2"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Select from Library
        </Button>
      </div>
    </div>
  );
}







