"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Id } from "@/convex/_generated/dataModel";
import { SectionEditor } from "./section-editor";
import { Button } from "@/components/ui/button";
import { 
  Type, 
  Image as ImageIcon, 
  Images, 
  Calendar,
  ExternalLink,
  Plus
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";

interface BlogSectionListProps {
  blogPostId: Id<"blogPosts">;
  sections: Array<{
    _id: Id<"blogPostSections">;
    type: "text" | "image" | "gallery" | "cta_booking" | "cta_stripe";
    sortOrder: number;
    textContent?: string;
    imageStorageId?: string;
    imageAlt?: string;
    imageCaption?: string;
    imageWidth?: number;
    imageHeight?: number;
    galleryImages?: Array<{
      storageId: string;
      alt?: string;
      caption?: string;
    }>;
    ctaHeading?: string;
    ctaDescription?: string;
    bookingToken?: string;
    stripeUrl?: string;
  }>;
  onUpdate: () => void;
}

function SortableSection({ section, onUpdate, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SectionEditor
        section={section}
        onUpdate={onUpdate}
        onDelete={onDelete}
        provided={{ dragHandleProps: listeners }}
      />
    </div>
  );
}

export function BlogSectionList({ blogPostId, sections, onUpdate }: BlogSectionListProps) {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const [orderedSections, setOrderedSections] = useState(sections);

  const createSection = useMutation(api.blogPostSections.create);
  const removeSection = useMutation(api.blogPostSections.remove);
  const reorderSections = useMutation(api.blogPostSections.reorder);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedSections.findIndex((s) => s._id === active.id);
    const newIndex = orderedSections.findIndex((s) => s._id === over.id);

    const newOrder = arrayMove(orderedSections, oldIndex, newIndex);
    setOrderedSections(newOrder);

    try {
      await reorderSections({
        blogPostId,
        sectionIds: newOrder.map((s) => s._id),
        email: adminEmail || undefined,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder sections",
        variant: "destructive",
      });
    }
  };

  const handleAddSection = async (
    type: "text" | "image" | "gallery" | "cta_booking" | "cta_stripe"
  ) => {
    try {
      const sortOrder = sections.length;
      await createSection({
        blogPostId,
        type,
        sortOrder,
        textContent: type === "text" ? "<p>Start writing...</p>" : undefined,
        email: adminEmail || undefined,
      });
      onUpdate();
      toast({
        title: "Section added",
        description: "New section has been added to your post.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add section",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSection = async (sectionId: Id<"blogPostSections">) => {
    try {
      await removeSection({
        id: sectionId,
        email: adminEmail || undefined,
      });
      onUpdate();
      toast({
        title: "Section deleted",
        description: "Section has been removed from your post.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  // Update ordered sections when sections prop changes
  useEffect(() => {
    setOrderedSections(sections);
  }, [sections]);

  return (
    <div className="space-y-6">
      {/* Add Section Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddSection("text")}
          className="font-bold uppercase tracking-wider"
        >
          <Type className="h-4 w-4 mr-2" />
          Add Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddSection("image")}
          className="font-bold uppercase tracking-wider"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Add Image
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddSection("gallery")}
          className="font-bold uppercase tracking-wider"
        >
          <Images className="h-4 w-4 mr-2" />
          Add Gallery
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddSection("cta_booking")}
          className="font-bold uppercase tracking-wider"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Add Booking CTA
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddSection("cta_stripe")}
          className="font-bold uppercase tracking-wider"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Add Stripe CTA
        </Button>
      </div>

      {/* Sections List */}
      {orderedSections.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedSections.map((s) => s._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedSections.map((section) => (
                <SortableSection
                  key={section._id}
                  section={section}
                  onUpdate={onUpdate}
                  onDelete={() => handleDeleteSection(section._id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="border-2 border-dashed border-foreground/20 rounded-lg p-12 text-center">
          <p className="text-foreground/60 mb-4">No sections yet. Add your first section above.</p>
        </div>
      )}
    </div>
  );
}

