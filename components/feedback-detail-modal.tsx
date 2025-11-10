"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StorageImage } from "@/components/storage-image";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image as ImageIcon, FileText, Video, Calendar, MessageSquare, CheckCircle2, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface FeedbackDetailModalProps {
  feedback: {
    _id: Id<"feedback">;
    deliveryId: Id<"deliveries">;
    assetId?: Id<"assets">;
    body: string;
    decision?: "approve" | "reject" | "changes" | null;
    completedAt?: number;
    archived?: boolean;
    createdAt: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isArchived?: boolean;
}

export function FeedbackDetailModal({ feedback, isOpen, onClose, onMarkComplete, onArchive, onDelete, isArchived }: FeedbackDetailModalProps) {
  const asset = useQuery(
    api.assets.get,
    feedback.assetId ? { id: feedback.assetId } : ("skip" as const)
  );

  const getDecisionBadge = (decision: string | null | undefined) => {
    if (!decision) return null;
    
    switch (decision) {
      case "approve":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            APPROVED
          </Badge>
        );
      case "reject":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30 font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            REJECTED
          </Badge>
        );
      case "changes":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            NEEDS CHANGES
          </Badge>
        );
      default:
        return null;
    }
  };

  const storageId = asset?.previewKey || asset?.storageKey;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-foreground/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            Feedback Details
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/80">
            {feedback.assetId ? "Per-asset feedback" : "Project-level feedback"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Media Display */}
          {feedback.assetId && asset && (
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground/90" style={{ fontWeight: '900' }}>
                Media
              </h3>
              <div className="rounded-xl border border-foreground/20 bg-foreground/5 overflow-hidden">
                {asset.type === "image" && storageId ? (
                  <div className="aspect-video relative bg-foreground/5">
                    <StorageImage
                      storageId={storageId}
                      alt={asset.filename}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : asset.type === "video" ? (
                  <div className="aspect-video bg-foreground/5 flex items-center justify-center">
                    <Video className="h-16 w-16 text-foreground/40" />
                  </div>
                ) : (
                  <div className="aspect-video bg-foreground/5 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-foreground/40" />
                  </div>
                )}
                {asset.filename && (
                  <div className="p-4 border-t border-foreground/10">
                    <p className="text-sm font-medium text-foreground/80">{asset.filename}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {getDecisionBadge(feedback.decision)}
              {feedback.completedAt && (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30 font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  COMPLETE
                </Badge>
              )}
              {feedback.archived && (
                <Badge className="bg-foreground/20 text-foreground/60 border-foreground/30 font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  ARCHIVED
                </Badge>
              )}
              <Badge variant="outline" className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                {feedback.assetId ? "PER-ASSET" : "PROJECT"}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(feedback.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
            
            <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-5">
              <div className="flex items-start gap-3 mb-3">
                <MessageSquare className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground/90" style={{ fontWeight: '900' }}>
                  Feedback
                </h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {feedback.body}
              </p>
            </div>

            {/* Action Buttons */}
            {(onMarkComplete || onArchive || onDelete) && (
              <div className="flex items-center gap-3 pt-4 border-t border-foreground/10">
                {onMarkComplete && !feedback.completedAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onMarkComplete}
                    className="font-black uppercase tracking-wider hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-600"
                    style={{ fontWeight: '900' }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Complete
                  </Button>
                )}
                {onArchive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onArchive}
                    className="font-black uppercase tracking-wider hover:bg-accent/10 hover:border-accent/30 hover:text-accent"
                    style={{ fontWeight: '900' }}
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </>
                    )}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    className="font-black uppercase tracking-wider hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 text-red-500"
                    style={{ fontWeight: '900' }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

