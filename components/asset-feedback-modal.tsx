"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertCircle, Send, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AssetFeedbackModalProps {
  assetId: string;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (assetId: string, decision: "approve" | "changes" | "reject", comment: string) => Promise<void>;
  onDownload: (assetId: string) => Promise<void>;
  existingFeedback?: Array<{
    _id: string;
    body: string;
    decision?: "approve" | "changes" | "reject";
    createdAt: number;
  }>;
}

export function AssetFeedbackModal({
  assetId,
  assetName,
  isOpen,
  onClose,
  onSubmitFeedback,
  onDownload,
  existingFeedback = [],
}: AssetFeedbackModalProps) {
  const [comment, setComment] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<"approve" | "changes" | "reject" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedDecision) {
      toast({
        title: "Error",
        description: "Please select an action (Approve, Needs Changes, or Reject).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitFeedback(assetId, selectedDecision, comment);
      setComment("");
      setSelectedDecision(null);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickApprove = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitFeedback(assetId, "approve", "Approved");
      setComment("");
      setSelectedDecision(null);
      toast({
        title: "File approved",
        description: "This file has been approved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve file.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      await onDownload(assetId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-foreground/20 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            {assetName}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/70">
            Review and provide feedback on this file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={selectedDecision === "approve" ? "default" : "outline"}
              onClick={() => setSelectedDecision("approve")}
              className={`font-black uppercase tracking-wider transition-colors ${
                selectedDecision === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                  : "hover:bg-green-50 hover:border-green-300"
              }`}
              style={{ fontWeight: '900' }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={handleQuickApprove}
              disabled={isSubmitting}
              className="font-black uppercase tracking-wider hover:bg-green-50 hover:border-green-300 text-green-600 transition-colors"
              style={{ fontWeight: '900' }}
              title="Quick approve without comment"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Quick Approve
            </Button>
            <Button
              variant={selectedDecision === "changes" ? "default" : "outline"}
              onClick={() => setSelectedDecision("changes")}
              className={`font-black uppercase tracking-wider transition-colors ${
                selectedDecision === "changes"
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
                  : "hover:bg-yellow-50 hover:border-yellow-300"
              }`}
              style={{ fontWeight: '900' }}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Needs Changes
            </Button>
            <Button
              variant={selectedDecision === "reject" ? "default" : "outline"}
              onClick={() => setSelectedDecision("reject")}
              className={`font-black uppercase tracking-wider transition-colors ${
                selectedDecision === "reject"
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                  : "hover:bg-red-50 hover:border-red-300"
              }`}
              style={{ fontWeight: '900' }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
              style={{ fontWeight: '900' }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Comment Textarea */}
          <div>
            <label className="text-sm font-bold uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
              Add Comment (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your feedback or comments here..."
              rows={4}
              className="text-base"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedDecision || isSubmitting}
            className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>

          {/* Existing Feedback */}
          {existingFeedback.length > 0 && (
            <div className="space-y-3 pt-5 border-t border-foreground/20">
              <h3 className="text-sm font-black uppercase tracking-wider mb-3" style={{ fontWeight: '900' }}>
                Previous Feedback
              </h3>
              {existingFeedback.map((fb) => (
                <div key={fb._id} className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      fb.decision === "approve" 
                        ? "bg-green-500/20 text-green-600 border border-green-500/30" 
                        : fb.decision === "reject"
                        ? "bg-red-500/20 text-red-600 border border-red-500/30"
                        : "bg-yellow-500/20 text-yellow-600 border border-yellow-500/30"
                    }`} style={{ fontWeight: '900' }}>
                      {fb.decision?.toUpperCase() || "COMMENT"}
                    </span>
                    <span className="text-xs text-foreground/60 font-medium">
                      {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{fb.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

