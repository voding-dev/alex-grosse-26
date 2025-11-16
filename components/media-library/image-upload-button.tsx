"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Loader2 } from "lucide-react";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface ImageUploadButtonProps {
  onUploadComplete: (result: {
    storageKey: string;
    width: number;
    height: number;
    size: number;
    isDuplicate: boolean;
    duplicateId?: string;
  }) => void;
  displayLocation?: {
    type: string;
    entityId: string;
    entityName: string;
    subType?: string;
  };
  buttonText?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;
  accept?: string;
  multiple?: boolean;
}

export function ImageUploadButton({
  onUploadComplete,
  displayLocation,
  buttonText = "Upload Image",
  variant = "outline",
  size = "default",
  disabled = false,
  className = "",
  accept = "image/*",
  multiple = false,
}: ImageUploadButtonProps) {
  const { sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        const uploadResult = await uploadImageToMediaLibrary({
          file,
          sessionToken: sessionToken || undefined,
          displayLocation,
          generateUploadUrl,
          checkDuplicateMutation,
          getMedia: async () => null,
          addDisplayLocation: async (args) => {
            await addDisplayLocation(args);
          },
          createMedia: async (args) => {
            return await createMedia(args);
          },
        });

        onUploadComplete(uploadResult);

        toast({
          title: uploadResult.isDuplicate ? "Duplicate detected" : "Upload successful",
          description: uploadResult.isDuplicate
            ? "Using existing media library entry."
            : "Image has been uploaded to media library.",
        });
      }

      // Reset the input
      e.target.value = "";
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        id="image-upload-input"
        disabled={disabled || uploading}
      />
      <label htmlFor="image-upload-input">
        <Button
          variant={variant}
          size={size}
          disabled={disabled || uploading}
          asChild
          className={className}
        >
          <span>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {buttonText}
              </>
            )}
          </span>
        </Button>
      </label>
    </div>
  );
}

