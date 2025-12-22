"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { X, Plus, Search, Filter, Pin, Tag as TagIcon, Folder, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { TagInput } from "./tag-input";
import { FolderSelector } from "./folder-selector";
import { formatDistanceToNow } from "date-fns";
import { RichTextEditor } from "@/components/blog/rich-text-editor";
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

  // Strip HTML for preview
  const stripHtml = (html: string) => {
    const tmp = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (tmp) {
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    }
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={() => {
            resetForm();
            onClose();
          }}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 z-[120]",
          "w-full sm:w-[500px] lg:w-[600px]",
          "border-r",
          "shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          "max-h-screen overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: '#FAFAF9', borderColor: 'rgba(0,0,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: 'rgba(88, 96, 52, 0.15)' }}>
                <TagIcon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#586034' }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                Notes
              </h2>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-2 sm:p-2 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center md:min-h-0 md:min-w-0 hover:bg-black/5"
              style={{ color: '#666' }}
              aria-label="Close notes"
            >
              <X className="h-6 w-6 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            {!isCreating && !editingNote && (
              <div className="p-3 sm:p-4 border-b space-y-2 sm:space-y-3 flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#999' }} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="pl-10 border"
                    style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={folderFilter} onValueChange={setFolderFilter}>
                    <SelectTrigger className="flex-1 border" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}>
                      <SelectValue placeholder="All folders" />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)' }}>
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
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors"
                        style={{ 
                          backgroundColor: selectedTags.includes(tag) ? '#586034' : '#fff',
                          borderColor: selectedTags.includes(tag) ? '#586034' : 'rgba(0,0,0,0.15)',
                          color: selectedTags.includes(tag) ? '#fff' : '#333'
                        }}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter((t) => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    <span className="text-xs" style={{ color: '#666' }}>Filtered by:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer"
                          style={{ backgroundColor: '#586034', borderColor: '#586034', color: '#fff' }}
                          onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </span>
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
                      className="font-semibold text-lg border"
                      style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}
                    />
                  </div>
                  <div className="notes-editor">
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Write your note here..."
                      className="min-h-[200px] sm:min-h-[250px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#666' }}>
                      Tags
                    </label>
                    <TagInput
                      tags={tags}
                      onTagsChange={setTags}
                      availableTags={availableTags}
                      lightMode
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: '#666' }}>
                      Folder
                    </label>
                    <FolderSelector
                      folder={folder}
                      onFolderChange={setFolder}
                      availableFolders={folders}
                      lightMode
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPinned(!isPinned)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                      style={{ 
                        backgroundColor: isPinned ? 'rgba(88, 96, 52, 0.15)' : '#fff',
                        borderColor: isPinned ? '#586034' : 'rgba(0,0,0,0.15)',
                        color: isPinned ? '#586034' : '#666'
                      }}
                    >
                      <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
                      {isPinned ? "Pinned" : "Pin"}
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      className="flex-1 touch-manipulation"
                      style={{ backgroundColor: '#586034', color: '#fff' }}
                    >
                      Save
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1 touch-manipulation border"
                      style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#333' }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full mb-3 sm:mb-4 p-3 sm:p-4 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation hover:border-[#586034]/50 hover:bg-[#586034]/5"
                    style={{ borderColor: 'rgba(0,0,0,0.2)', color: '#666' }}
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">New Note</span>
                  </button>

                  {notes && notes.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {notes.map((note) => (
                        <Card
                          key={note._id}
                          className="group relative overflow-hidden border transition-all duration-200 cursor-pointer touch-manipulation hover:border-[#586034]/30 hover:shadow-md"
                          style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}
                          onClick={() => handleEdit(note)}
                        >
                          <CardHeader className="pb-2 p-3 sm:p-6">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base sm:text-lg font-bold uppercase tracking-tight line-clamp-2 flex-1" style={{ color: '#1a1a1a' }}>
                                {note.isPinned && (
                                  <Pin className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2 fill-current flex-shrink-0" style={{ color: '#586034' }} />
                                )}
                                {note.title}
                              </CardTitle>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(note._id);
                                  }}
                                  className="p-1.5 rounded touch-manipulation hover:bg-black/5"
                                  style={{ color: note.isPinned ? '#586034' : '#999' }}
                                  aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                                >
                                  <Pin className={cn("h-3 w-3 sm:h-4 sm:w-4", note.isPinned && "fill-current")} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(note._id);
                                  }}
                                  className="p-1.5 rounded hover:bg-red-500/10 touch-manipulation"
                                  style={{ color: '#999' }}
                                  aria-label="Delete note"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6 pt-0">
                            <p className="text-xs sm:text-sm line-clamp-3 mb-2 sm:mb-3" style={{ color: '#666' }}>
                              {stripHtml(note.content)}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              {note.tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ borderColor: 'rgba(0,0,0,0.15)', color: '#666', backgroundColor: '#fff' }}>
                                  {tag}
                                </span>
                              ))}
                              {note.folder && (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)', color: '#666' }}>
                                  <Folder className="h-3 w-3 mr-1" />
                                  {note.folder}
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: '#999' }}>
                              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 px-4" style={{ color: '#999' }}>
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
        <AlertDialogContent style={{ backgroundColor: '#fff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#1a1a1a' }}>Delete Note</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#666' }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)', color: '#333' }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom styles for the notes editor */}
      <style jsx global>{`
        .notes-editor .ProseMirror {
          min-height: 200px !important;
          background-color: #fff !important;
          color: #1a1a1a !important;
        }
        .notes-editor .border {
          border-color: rgba(0,0,0,0.15) !important;
          background-color: #fff !important;
        }
        .notes-editor .border-foreground\\/20 {
          border-color: rgba(0,0,0,0.15) !important;
        }
        .notes-editor .border-foreground\\/10 {
          border-color: rgba(0,0,0,0.1) !important;
        }
        .notes-editor .bg-background {
          background-color: #fff !important;
        }
        .notes-editor .text-foreground {
          color: #1a1a1a !important;
        }
        .notes-editor .text-foreground\\/70 {
          color: #666 !important;
        }
        .notes-editor .hover\\:bg-foreground\\/10:hover {
          background-color: rgba(0,0,0,0.05) !important;
        }
        .notes-editor .prose-headings\\:text-foreground h1,
        .notes-editor .prose-headings\\:text-foreground h2,
        .notes-editor .prose-headings\\:text-foreground h3 {
          color: #1a1a1a !important;
        }
        .notes-editor .prose p,
        .notes-editor .prose li {
          color: #333 !important;
        }
      `}</style>
    </>
  );
}
