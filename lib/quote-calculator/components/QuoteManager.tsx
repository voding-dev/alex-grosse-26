"use client";

import { useState } from "react";
import { Quote } from "../types/pricing";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface QuoteManagerProps {
  quotes: Quote[];
  onLoad: (quote: Quote) => void;
  onDelete: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteManager({
  quotes,
  onLoad,
  onDelete,
  open,
  onOpenChange,
}: QuoteManagerProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleLoad = (quote: Quote) => {
    onLoad(quote);
    onOpenChange(false);
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider">
            Load Quote
          </DialogTitle>
          <DialogDescription className="text-base">
            Select a saved quote to load, or delete quotes you no longer need.
          </DialogDescription>
        </DialogHeader>

        {quotes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-foreground/60">No saved quotes found.</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-4">
            {quotes.map((quote) => (
              <Card
                key={quote.id}
                className="border border-foreground/20 hover:border-accent/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-black uppercase tracking-wider mb-2">
                        {quote.name || "Untitled Quote"}
                      </CardTitle>
                      <CardDescription className="text-base space-y-1">
                        <p>
                          <span className="font-bold">Client:</span> {quote.clientName || "N/A"}
                        </p>
                        <p>
                          <span className="font-bold">Project:</span> {quote.projectName || "N/A"}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-foreground/60">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Updated: {format(new Date(quote.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleLoad(quote)}
                        variant="outline"
                        className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent"
                      >
                        Load
                      </Button>
                      <Button
                        onClick={() => handleDelete(quote.id)}
                        variant="destructive"
                        size="icon"
                        className={confirmDelete === quote.id ? "bg-red-600" : ""}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}












