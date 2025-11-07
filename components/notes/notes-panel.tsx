"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { X, Plus, Search, Filter, Pin, Tag as TagIcon, Folder, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TagInput } from "./tag-input";
import { FolderSelector } from "./folder-selector";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Note = {
  _id: Id<"notes">;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

export function NotesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folder, setFolder] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; noteId: Id<"notes"> | null }>({ open: false, noteId: null });

  // Queries
  const notes = useQuery(
    api.notes.list,
    sessionToken ? { sessionToken, folder: folderFilter !== "all" ? folderFilter : undefined, tags: selectedTags.length > 0 ? selectedTags : undefined, search: searchQuery || undefined } : "skip"
  );
  const allTags = useQuery(api.notes.getAllTags, sessionToken ? { sessionToken } : "skip");
  const allFolders = useQuery(api.notes.getAllFolders, sessionToken ? { sessionToken } : "skip");

  // Mutations
  const createNote = useMutation(api.notes.create);
  const updateNote = useMutation(api.notes.update);
  const deleteNote = useMutation(api.notes.deleteNote);
  const togglePin = useMutation(api.notes.togglePin);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setFolder("");
    setIsPinned(false);
    setEditingNote(null);
    setIsCreating(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your note",
        variant: "destructive",
      });
      return;
    }

    if (!sessionToken) {
      toast({
        title: "Authentication required",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingNote) {
        await updateNote({
          id: editingNote._id,
          title: title.trim(),
          content: content.trim(),
          tags,
          folder: folder.trim() || undefined,
          isPinned,
          sessionToken,
        });
        toast({
          title: "Note updated",
          description: "Your note has been saved",
        });
      } else {
        await createNote({
          title: title.trim(),
          content: content.trim(),
          tags,
          folder: folder.trim() || undefined,
          isPinned,
          sessionToken,
        });
        toast({
          title: "Note created",
          description: "Your note has been saved",
        });
      }
      resetForm();
    } catch (error: any) {
      console.error("Error saving note:", error);
      const errorMessage = error?.message || error?.data?.message || "Failed to save note";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags);
    setFolder(note.folder || "");
    setIsPinned(note.isPinned || false);
    setIsCreating(false);
  };

  // Handle delete
  const handleDelete = (id: Id<"notes">) => {
    setDeleteDialog({ open: true, noteId: id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.noteId || !sessionToken) {
      if (!sessionToken) {
        toast({
          title: "Authentication required",
          description: "Please refresh the page and try again",
          variant: "destructive",
        });
      }
      setDeleteDialog({ open: false, noteId: null });
      return;
    }

    try {
      await deleteNote({ id: deleteDialog.noteId, sessionToken });
      toast({
        title: "Note deleted",
        description: "Your note has been deleted",
      });
      if (editingNote?._id === deleteDialog.noteId) {
        resetForm();
      }
      setDeleteDialog({ open: false, noteId: null });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      const errorMessage = error?.message || error?.data?.message || "Failed to delete note";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle pin toggle
  const handleTogglePin = async (id: Id<"notes">) => {
    if (!sessionToken) {
      toast({
        title: "Authentication required",
        description: "Please refresh the page and try again",
        variant: "destructive",
      });
      return;
    }

    try {
      await togglePin({ id, sessionToken });
    } catch (error: any) {
      console.error("Error toggling pin:", error);
      const errorMessage = error?.message || error?.data?.message || "Failed to toggle pin";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resetForm();
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const folders = allFolders || [];
  const availableTags = allTags || [];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => {
            resetForm();
            onClose();
          }}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50",
          "w-full sm:w-[500px] lg:w-[600px]",
          "bg-background border-r border-foreground/10",
          "shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          "max-h-screen overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-foreground/10 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-accent/10">
                <TagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900' }}>
                Notes
              </h2>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors touch-manipulation"
              aria-label="Close notes"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            {!isCreating && !editingNote && (
              <div className="p-3 sm:p-4 border-b border-foreground/10 space-y-2 sm:space-y-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={folderFilter} onValueChange={setFolderFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All folders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All folders</SelectItem>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="text-xs cursor-pointer hover:bg-foreground/10"
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                    <span className="text-xs text-foreground/50">Filtered by:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="default"
                          className="text-xs cursor-pointer hover:bg-foreground/80"
                          onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Editor or List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isCreating || editingNote ? (
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Note title..."
                      className="font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your note here..."
                      className="min-h-[200px] sm:min-h-[300px] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                      Tags
                    </label>
                    <TagInput
                      tags={tags}
                      onTagsChange={setTags}
                      availableTags={availableTags}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-2 block">
                      Folder
                    </label>
                    <FolderSelector
                      folder={folder}
                      onFolderChange={setFolder}
                      availableFolders={folders}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPinned(!isPinned)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isPinned
                          ? "bg-accent/10 text-accent"
                          : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                      )}
                    >
                      <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
                      {isPinned ? "Pinned" : "Pin"}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-accent text-background hover:bg-accent/90 touch-manipulation"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1 touch-manipulation"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full mb-3 sm:mb-4 p-3 sm:p-4 border-2 border-dashed border-foreground/20 rounded-lg hover:border-accent/40 hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-foreground/70 hover:text-accent touch-manipulation"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">New Note</span>
                  </button>

                  {notes && notes.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {notes.map((note) => (
                        <Card
                          key={note._id}
                          className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-200 cursor-pointer touch-manipulation"
                          onClick={() => handleEdit(note)}
                        >
                          <CardHeader className="pb-2 p-3 sm:p-6">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm sm:text-base font-bold uppercase tracking-tight line-clamp-2 flex-1">
                                {note.isPinned && (
                                  <Pin className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2 text-accent fill-current flex-shrink-0" />
                                )}
                                {note.title}
                              </CardTitle>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(note._id);
                                  }}
                                  className="p-1.5 rounded hover:bg-foreground/5 text-foreground/50 hover:text-accent touch-manipulation"
                                  aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                                >
                                  <Pin className={cn("h-3 w-3 sm:h-4 sm:w-4", note.isPinned && "fill-current text-accent")} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(note._id);
                                  }}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-foreground/50 hover:text-red-400 touch-manipulation"
                                  aria-label="Delete note"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6 pt-0">
                            <p className="text-xs sm:text-sm text-foreground/70 line-clamp-3 mb-2 sm:mb-3">
                              {note.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              {note.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {note.folder && (
                                <Badge variant="secondary" className="text-xs">
                                  <Folder className="h-3 w-3 mr-1" />
                                  {note.folder}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-foreground/40">
                              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-foreground/50 px-4">
                      <TagIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="mt-2 font-medium text-sm sm:text-base">No notes yet</p>
                      <p className="text-xs sm:text-sm">Create your first note to get started</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Note Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, noteId: deleteDialog.noteId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

