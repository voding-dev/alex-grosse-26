"use client";

import { useState, useRef, useEffect } from "react";
import { Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: string[];
  lightMode?: boolean;
}

export function TagInput({ tags, onTagsChange, availableTags, lightMode = false }: TagInputProps) {
  const [tagInput, setTagInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter available tags based on input
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tags.includes(tag)
  );

  // Handle adding tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      setTagInput("");
      setShowDropdown(false);
    }
  };

  // Handle removing tag
  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (trimmedTag) {
        addTag(trimmedTag);
      }
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      // Remove last tag on backspace
      removeTag(tags[tags.length - 1]);
    }
  };

  const containerStyle = lightMode
    ? { borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' }
    : { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' };

  const tagStyle = lightMode
    ? { backgroundColor: 'rgba(0,0,0,0.05)', color: '#666' }
    : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' };

  const inputStyle = lightMode
    ? { backgroundColor: 'transparent', color: '#1a1a1a' }
    : { backgroundColor: 'transparent', color: '#fff' };

  const dropdownStyle = lightMode
    ? { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)' }
    : { backgroundColor: '#1a1a1a', borderColor: 'rgba(255,255,255,0.15)' };

  const dropdownItemStyle = lightMode
    ? { color: '#1a1a1a' }
    : { color: 'rgba(255,255,255,0.8)' };

  const helpTextStyle = lightMode
    ? { color: '#999' }
    : { color: 'rgba(255,255,255,0.5)' };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]" style={containerStyle}>
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider rounded"
            style={tagStyle}
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1"
              style={{ color: lightMode ? '#999' : 'rgba(255,255,255,0.6)' }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <Input
            ref={inputRef}
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="border-0 focus-visible:ring-0 h-auto p-0 font-medium"
            style={inputStyle}
            placeholder={tags.length === 0 ? "Type and press comma or enter to add tags..." : ""}
          />
          {showDropdown && filteredTags.length > 0 && (
            <div className="absolute z-10 w-full mt-1 border rounded-md shadow-lg max-h-48 overflow-y-auto" style={dropdownStyle}>
              {filteredTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${lightMode ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                  style={dropdownItemStyle}
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs mt-2" style={helpTextStyle}>
        Type and press comma or enter to add tags. Click existing tags to remove them.
      </p>
    </div>
  );
}
