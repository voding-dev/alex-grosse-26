"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResizableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  className?: string;
}

export const ResizableTextarea = React.forwardRef<HTMLTextAreaElement, ResizableTextareaProps>(
  ({ className, minRows = 4, maxRows = 20, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = React.useState(false);
    const [height, setHeight] = React.useState<number | undefined>(undefined);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    // Auto-resize on content change
    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      
      // Calculate line height
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
      const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
      
      // Set height based on content
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      setHeight(newHeight);
    }, [props.value, minRows, maxRows]);

    // Handle mouse down on resize handle
    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
    };

    // Handle mouse move for resizing
    React.useEffect(() => {
      if (!isResizing) return;

      const handleMouseMove = (e: MouseEvent) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
        const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
        const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
        
        // Get mouse Y position relative to textarea
        const rect = textarea.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        
        // Clamp height
        const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
        textarea.style.height = `${clampedHeight}px`;
        setHeight(clampedHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isResizing, minRows, maxRows]);

    return (
      <div ref={containerRef} className="relative group">
        <textarea
          ref={textareaRef}
          className={cn(
            "w-full border border-foreground/20 focus:border-accent/40 bg-background rounded-lg px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all",
            "resize-none overflow-y-auto",
            className
          )}
          style={{ height: height ? `${height}px` : undefined }}
          {...props}
        />
        {/* Resize handle */}
        <div
          className={cn(
            "absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center cursor-nwse-resize z-10",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "hover:opacity-100"
          )}
          onMouseDown={handleMouseDown}
          style={{ 
            cursor: "nwse-resize",
            opacity: isResizing ? 1 : undefined
          }}
        >
          <div className="flex items-center gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full bg-foreground/30" />
            <div className="w-0.5 h-0.5 rounded-full bg-foreground/30" />
            <div className="w-0.5 h-0.5 rounded-full bg-foreground/30" />
            <div className="w-0.5 h-0.5 rounded-full bg-foreground/30" />
          </div>
        </div>
      </div>
    );
  }
);

ResizableTextarea.displayName = "ResizableTextarea";

