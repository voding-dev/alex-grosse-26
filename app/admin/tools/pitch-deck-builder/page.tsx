"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PitchDeckPreview } from "@/components/pitch-deck/PitchDeckPreview";
import { generatePitchDeckPDF } from "@/lib/pitch-deck/utils/pdfExport";
import { MediaThumbnail } from "@/components/media-thumbnail";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Image as ImageIcon, Check, Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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

const tabs = [
  { id: "cover", label: "Cover" },
  { id: "scope", label: "Scope" },
  { id: "production", label: "Production" },
  { id: "imagery", label: "Imagery" },
  { id: "estimate", label: "Estimate" },
];

type MediaItem = {
  _id: Id<"mediaLibrary"> | string;
  storageKey: string;
  type: "image" | "video";
  filename: string;
};

type PitchDeck = {
  _id: Id<"pitchDecks">;
  title: string;
  coverDescription?: string;
  preparedFor?: string;
  preparedDate?: string;
  scopeOfWork?: string;
  preProduction?: string;
  production?: string;
  postProduction?: string;
  estimate?: string;
  coverMediaUrls?: string[];
  imageryMediaUrls?: string[];
  createdAt?: number;
  updatedAt?: number;
};


export default function PitchDeckBuilderPage() {
  const { sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cover");
  const [currentDeckId, setCurrentDeckId] = useState<Id<"pitchDecks"> | null>(null);
  const [newDeckDialogOpen, setNewDeckDialogOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; deckId: Id<"pitchDecks"> | null }>({ open: false, deckId: null });

  const [title, setTitle] = useState("");
  const [coverDescription, setCoverDescription] = useState("");
  const [preparedFor, setPreparedFor] = useState("");
  const [preparedDate, setPreparedDate] = useState<string>("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  // Scope predefined subfields
  const [scopeGoals, setScopeGoals] = useState("");
  const [scopeDeliverables, setScopeDeliverables] = useState("");
  const [scopeCreative, setScopeCreative] = useState("");
  const [scopeTimeline, setScopeTimeline] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const [preProduction, setPreProduction] = useState("");
  const [production, setProduction] = useState("");
  const [postProduction, setPostProduction] = useState("");
  const [estimate, setEstimate] = useState("");
  // Estimate predefined subfields
  const [estFees, setEstFees] = useState("");
  const [estExpenses, setEstExpenses] = useState("");
  const [estTerms, setEstTerms] = useState("");
  const [estAssumptions, setEstAssumptions] = useState("");
  const [estNotes, setEstNotes] = useState("");
  const [coverMediaUrls, setCoverMediaUrls] = useState<string[]>(Array.from({ length: 12 }).map(() => ""));
  const [imageryMediaUrls, setImageryMediaUrls] = useState<string[]>(Array.from({ length: 6 }).map(() => ""));

  // Media library selector state
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [mediaSelectorType, setMediaSelectorType] = useState<"cover" | "imagery">("cover");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("image");
  const [mediaFolderFilter, setMediaFolderFilter] = useState<string>("all");
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");

  // Media library queries
  const allMedia = useQuery(api.mediaLibrary.list, {
    type: mediaTypeFilter === "all" ? undefined : mediaTypeFilter,
    folder: mediaFolderFilter === "all" ? undefined : mediaFolderFilter,
    search: mediaSearchQuery || undefined,
    includeAssets: true,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);

  // Convex queries and mutations
  const decks = useQuery(
    api.pitchDecks.list,
    sessionToken ? { sessionToken } : "skip"
  ) || [];
  const createDeck = useMutation(api.pitchDecks.create);
  const updateDeck = useMutation(api.pitchDecks.update);
  const removeDeck = useMutation(api.pitchDecks.remove);

  // Load first deck on mount if available
  useEffect(() => {
    if (decks.length > 0 && !currentDeckId) {
      const deck = decks[0];
      setCurrentDeckId(deck._id);
      setTitle(deck.title || "");
      setCoverDescription(deck.coverDescription || "");
      setPreparedFor(deck.preparedFor || "");
      setPreparedDate(deck.preparedDate || "");
      setScopeOfWork(deck.scopeOfWork || "");
      setPreProduction(deck.preProduction || "");
      setProduction(deck.production || "");
      setPostProduction(deck.postProduction || "");
      setEstimate(deck.estimate || "");
      
      const coverUrls = [...(deck.coverMediaUrls || [])];
      while (coverUrls.length < 12) coverUrls.push("");
      setCoverMediaUrls(coverUrls.slice(0, 12));
      
      const imageryUrls = [...(deck.imageryMediaUrls || [])];
      while (imageryUrls.length < 6) imageryUrls.push("");
      setImageryMediaUrls(imageryUrls.slice(0, 6));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks.length]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    // Compose Scope content from subfields if used
    const scopeSections: string[] = [];
    if (scopeGoals.trim()) scopeSections.push("GOALS\n" + scopeGoals.trim());
    if (scopeDeliverables.trim()) scopeSections.push("DELIVERABLES\n" + scopeDeliverables.trim());
    if (scopeCreative.trim()) scopeSections.push("CREATIVE APPROACH\n" + scopeCreative.trim());
    if (scopeTimeline.trim()) scopeSections.push("TIMELINE\n" + scopeTimeline.trim());
    if (scopeNotes.trim()) scopeSections.push("NOTES\n" + scopeNotes.trim());
    const composedScope = scopeSections.join("\n\n");
    if (composedScope && composedScope !== scopeOfWork) setScopeOfWork(composedScope);

    // Compose Estimate content from subfields if used
    const estimateSections: string[] = [];
    if (estFees.trim()) estimateSections.push("FEES\n" + estFees.trim());
    if (estExpenses.trim()) estimateSections.push("EXPENSES\n" + estExpenses.trim());
    if (estTerms.trim()) estimateSections.push("PAYMENT TERMS\n" + estTerms.trim());
    if (estAssumptions.trim()) estimateSections.push("ASSUMPTIONS\n" + estAssumptions.trim());
    if (estNotes.trim()) estimateSections.push("NOTES\n" + estNotes.trim());
    const composedEstimate = estimateSections.join("\n\n");
    if (composedEstimate && composedEstimate !== estimate) setEstimate(composedEstimate);

    if (!currentDeckId || !sessionToken) return;
    const timeoutId = setTimeout(async () => {
      try {
        await updateDeck({
          sessionToken,
          id: currentDeckId,
          title,
          coverDescription,
          preparedFor,
          preparedDate,
          scopeOfWork: composedScope || scopeOfWork,
          preProduction,
          production,
          postProduction,
          estimate: composedEstimate || estimate,
          coverMediaUrls: coverMediaUrls.filter(Boolean),
          imageryMediaUrls: imageryMediaUrls.filter(Boolean),
        });
      } catch (error) {
        console.error("Failed to auto-save deck:", error);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [title, coverDescription, preparedFor, preparedDate, scopeOfWork, preProduction, production, postProduction, estimate, coverMediaUrls, imageryMediaUrls, currentDeckId, sessionToken, updateDeck, scopeGoals, scopeDeliverables, scopeCreative, scopeTimeline, scopeNotes, estFees, estExpenses, estTerms, estAssumptions, estNotes]);

  const loadDeck = (id: Id<"pitchDecks">) => {
    const deck = decks.find((d) => d._id === id);
    if (!deck) return;
    
    setCurrentDeckId(deck._id);
    setTitle(deck.title || "");
    setCoverDescription(deck.coverDescription || "");
    setPreparedFor(deck.preparedFor || "");
    setPreparedDate(deck.preparedDate || "");
    setScopeOfWork(deck.scopeOfWork || "");
    setPreProduction(deck.preProduction || "");
    setProduction(deck.production || "");
    setPostProduction(deck.postProduction || "");
    setEstimate(deck.estimate || "");
    
    // Pad arrays to fixed lengths
    const coverUrls = [...(deck.coverMediaUrls || [])];
    while (coverUrls.length < 12) coverUrls.push("");
    setCoverMediaUrls(coverUrls.slice(0, 12));
    
    const imageryUrls = [...(deck.imageryMediaUrls || [])];
    while (imageryUrls.length < 6) imageryUrls.push("");
    setImageryMediaUrls(imageryUrls.slice(0, 6));
  };

  const saveCurrentDeck = async () => {
    if (!currentDeckId || !sessionToken) return;
    
    try {
      await updateDeck({
        sessionToken,
        id: currentDeckId,
        title,
        coverDescription,
        preparedFor,
        preparedDate,
        scopeOfWork,
        preProduction,
        production,
        postProduction,
        estimate,
        coverMediaUrls: coverMediaUrls.filter(Boolean),
        imageryMediaUrls: imageryMediaUrls.filter(Boolean),
      });
      toast({ title: "Success", description: "Deck saved successfully" });
    } catch (error) {
      console.error("Failed to save deck:", error);
      toast({ title: "Error", description: "Failed to save deck", variant: "destructive" });
    }
  };

  const createNewDeck = async () => {
    if (!newDeckTitle.trim()) {
      toast({ title: "Error", description: "Please enter a deck title", variant: "destructive" });
      return;
    }
    
    if (!sessionToken) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }
    
    try {
      const deckId = await createDeck({
        sessionToken,
        title: newDeckTitle.trim(),
      });
      setCurrentDeckId(deckId);
      setTitle(newDeckTitle.trim());
      setCoverDescription("");
      setPreparedFor("");
      setPreparedDate("");
      setScopeOfWork("");
      setPreProduction("");
      setProduction("");
      setPostProduction("");
      setEstimate("");
      setCoverMediaUrls(Array.from({ length: 12 }).map(() => ""));
      setImageryMediaUrls(Array.from({ length: 6 }).map(() => ""));
      setNewDeckTitle("");
      setNewDeckDialogOpen(false);
      toast({ title: "Success", description: "Deck created successfully" });
    } catch (error) {
      console.error("Failed to create deck:", error);
      toast({ title: "Error", description: "Failed to create deck", variant: "destructive" });
    }
  };

  const handleDeleteDeck = (id: Id<"pitchDecks">) => {
    setDeleteDialog({ open: true, deckId: id });
  };

  const confirmDeleteDeck = async () => {
    if (!deleteDialog.deckId || !sessionToken) {
      if (!sessionToken) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      }
      setDeleteDialog({ open: false, deckId: null });
      return;
    }
    
    try {
      await removeDeck({ sessionToken, id: deleteDialog.deckId });
      
      if (currentDeckId === deleteDialog.deckId) {
        const remainingDecks = decks.filter((d) => d._id !== deleteDialog.deckId);
        if (remainingDecks.length > 0) {
          loadDeck(remainingDecks[0]._id);
        } else {
          setCurrentDeckId(null);
          setTitle("");
          setCoverDescription("");
          setPreparedFor("");
          setPreparedDate("");
          setScopeOfWork("");
          setPreProduction("");
          setProduction("");
          setPostProduction("");
          setEstimate("");
          setCoverMediaUrls(Array.from({ length: 12 }).map(() => ""));
          setImageryMediaUrls(Array.from({ length: 6 }).map(() => ""));
        }
      }
      toast({ title: "Success", description: "Deck deleted successfully" });
      setDeleteDialog({ open: false, deckId: null });
    } catch (error) {
      console.error("Failed to delete deck:", error);
      toast({ title: "Error", description: "Failed to delete deck", variant: "destructive" });
    }
  };

  const handleOpenMediaSelector = (type: "cover" | "imagery") => {
    setMediaSelectorType(type);
    setMediaSelectorOpen(true);
  };

  const handleSelectMedia = (url: string) => {
    if (!url) return;

    if (mediaSelectorType === "cover") {
      const next = [...coverMediaUrls];
      const emptyIndex = next.findIndex((u) => !u);
      if (emptyIndex !== -1) {
        next[emptyIndex] = url;
        setCoverMediaUrls(next);
      }
    } else if (mediaSelectorType === "imagery") {
      const next = [...imageryMediaUrls];
      const emptyIndex = next.findIndex((u) => !u);
      if (emptyIndex !== -1) {
        next[emptyIndex] = url;
        setImageryMediaUrls(next);
      }
    }
    
    // Smooth UX: close dialog when all slots are filled
    if (mediaSelectorType === "cover" && !coverMediaUrls.some((item) => !item)) {
      setMediaSelectorOpen(false);
    }
    if (mediaSelectorType === "imagery" && !imageryMediaUrls.some((item) => !item)) {
      setMediaSelectorOpen(false);
    }
  };

  const handleRemoveMedia = (index: number, type: "cover" | "imagery") => {
    if (type === "cover") {
      const next = [...coverMediaUrls];
      next[index] = "";
      setCoverMediaUrls(next);
    } else if (type === "imagery") {
      const next = [...imageryMediaUrls];
      next[index] = "";
      setImageryMediaUrls(next);
    }
  };

  const handleExport = async () => {
    await generatePitchDeckPDF({
      title: title || "PROJECT TITLE",
      coverDescription,
      preparedFor,
      preparedDate,
      coverMediaUrls: coverMediaUrls.filter(Boolean),
      scopeOfWork,
      preProduction,
      production,
      postProduction,
      imageryMediaUrls: imageryMediaUrls.filter(Boolean),
      estimate,
    });
  };

  const toSharePayload = () => ({
    title: title || "PROJECT TITLE",
    coverDescription,
    preparedFor,
    preparedDate,
    coverMediaUrls: coverMediaUrls.filter(Boolean),
    scopeOfWork,
    preProduction,
    production,
    postProduction,
    imageryMediaUrls: imageryMediaUrls.filter(Boolean),
    estimate,
  });

  const handleCopyShareLink = async () => {
    const json = JSON.stringify(toSharePayload());
    const base64 = typeof window === "undefined" ? Buffer.from(json, "utf-8").toString("base64") : btoa(unescape(encodeURIComponent(json)));
    const url = `${window.location.origin}/pitch-decks/pitch-deck-builder?data=${encodeURIComponent(base64)}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Success", description: "Share link copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full">
        {/* Top Bar */}
        <div className="bg-accent text-white px-6 py-4 font-black uppercase tracking-wide flex items-center justify-between gap-4 sticky top-0 z-50" style={{ fontWeight: 900 }}>
          <span>Pitch Deck Builder</span>
          <div className="flex items-center gap-2">
            {currentDeckId && (
              <Button
                onClick={saveCurrentDeck}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-0 font-bold uppercase text-xs h-8 px-4"
              >
                <Save className="h-3 w-3 mr-2" />
                Save
              </Button>
            )}
            <Button
              onClick={handleCopyShareLink}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0 font-bold uppercase text-xs h-8 px-4"
            >
              Copy Share Link
            </Button>
            <Button
              onClick={handleExport}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0 font-bold uppercase text-xs h-8 px-4"
            >
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_500px_1fr] gap-0 w-full">
          {/* Left: Deck List */}
          <div className="bg-white/95 border-r border-black/10 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            <div className="p-4 border-b border-black/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase text-black/70">Decks</h3>
                <Dialog open={newDeckDialogOpen} onOpenChange={setNewDeckDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 border-black/20 hover:bg-black/5 hover:border-accent/60 transition"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Deck</DialogTitle>
                      <DialogDescription>Enter a title for your new pitch deck</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Deck title"
                        value={newDeckTitle}
                        onChange={(e) => setNewDeckTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createNewDeck()}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setNewDeckDialogOpen(false)}
                        className="border-black/20 hover:bg-black/5"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={createNewDeck}
                        className="bg-accent hover:bg-accent/90 text-white"
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {decks.map((deck) => (
                <div
                  key={deck._id}
                  className={`p-3 rounded cursor-pointer transition ${
                    currentDeckId === deck._id
                      ? "bg-accent text-white shadow-sm"
                      : "bg-black/5 hover:bg-black/10 text-black"
                  }`}
                  onClick={() => loadDeck(deck._id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{deck.title}</p>
                      <p className={`text-xs mt-1 ${currentDeckId === deck._id ? "text-white/70" : "text-black/50"}`}>
                        {deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDeck(deck._id);
                      }}
                      className={`p-1 rounded hover:bg-black/20 transition ${
                        currentDeckId === deck._id ? "text-white hover:bg-white/20" : "text-black/40"
                      }`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {decks.length === 0 && (
                <div className="p-4 text-center text-sm text-black/50">
                  No decks yet. Create one to get started.
                </div>
              )}
            </div>
          </div>

          {/* Middle: Builder Form */}
          <div className="bg-white border-r border-black/10 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            {/* Tabs */}
            <div className="flex gap-2 p-3 border-b border-black/10 bg-white sticky top-0 z-10">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 text-xs font-bold uppercase rounded-full border transition ${
                    activeTab === t.id
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-white text-black/70 border-black/15 hover:bg-black/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-8 text-black">
              {activeTab === 'cover' && (
                <div className="space-y-8">
                  <section className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Title</Label>
                    <Input className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
                  </section>
                  <section className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Cover Description</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={3} value={coverDescription} onChange={(e) => setCoverDescription(e.target.value)} placeholder="Brief description" />
                  </section>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <section className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Prepared For</Label>
                      <Input className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" value={preparedFor} onChange={(e) => setPreparedFor(e.target.value)} placeholder="Client name" />
                    </section>
                    <section className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Date</Label>
                      <Input className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" value={preparedDate} onChange={(e) => setPreparedDate(e.target.value)} placeholder="YYYY-MM-DD" />
                    </section>
                  </div>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Cover Media (up to 12)</Label>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-black/20 bg-white text-black hover:bg-black/5 hover:border-accent/60 transition font-medium"
                        onClick={() => handleOpenMediaSelector("cover")}
                      >
                        <ImageIcon className="h-3 w-3 mr-2" />
                        Select from Library
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      {coverMediaUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-black/5 border border-black/15 hover:border-accent/60 transition">
                          {url ? (
                            <>
                              <img src={url} alt={`Cover ${i + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleRemoveMedia(i, "cover")}
                                className="absolute top-1 right-1 bg-black/70 text-white rounded p-1 hover:bg-black/90"
                                aria-label="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black/30 text-xs select-none">
                              {i + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'scope' && (
                <section className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Goals</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={scopeGoals} onChange={(e) => setScopeGoals(e.target.value)} placeholder="What are we trying to achieve?" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Deliverables</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={scopeDeliverables} onChange={(e) => setScopeDeliverables(e.target.value)} placeholder="List of outputs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Creative Approach</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={scopeCreative} onChange={(e) => setScopeCreative(e.target.value)} placeholder="Look/feel, references, style" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Timeline</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={4} value={scopeTimeline} onChange={(e) => setScopeTimeline(e.target.value)} placeholder="Key dates and phases" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Notes</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={4} value={scopeNotes} onChange={(e) => setScopeNotes(e.target.value)} placeholder="Special constraints, context" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Composed Scope (preview)</Label>
                    <Textarea className="w-full bg-white text-black border-black/20" rows={10} value={scopeOfWork} onChange={(e) => setScopeOfWork(e.target.value)} />
                  </div>
                </section>
              )}

              {activeTab === 'production' && (
                <div className="space-y-6">
                  <section className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Pre-Production</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={preProduction} onChange={(e) => setPreProduction(e.target.value)} />
                  </section>
                  <section className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Production</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={production} onChange={(e) => setProduction(e.target.value)} />
                  </section>
                  <section className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Post-Production</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={postProduction} onChange={(e) => setPostProduction(e.target.value)} />
                  </section>
                </div>
              )}

              {activeTab === 'imagery' && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Imagery (up to 6)</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-black/20 bg-white text-black hover:bg-black/5 hover:border-accent/60 transition font-medium"
                      onClick={() => handleOpenMediaSelector("imagery")}
                    >
                      <ImageIcon className="h-3 w-3 mr-2" />
                      Select from Library
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {imageryMediaUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-black/5 border border-black/15 hover:border-accent/60 transition">
                        {url ? (
                          <>
                            <img src={url} alt={`Imagery ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemoveMedia(i, "imagery")}
                              className="absolute top-1 right-1 bg-black/70 text-white rounded p-1 hover:bg-black/90"
                              aria-label="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-black/30 text-xs select-none">
                            {i + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'estimate' && (
                <section className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Fees</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={estFees} onChange={(e) => setEstFees(e.target.value)} placeholder="Creative fee, production fee, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Expenses</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={6} value={estExpenses} onChange={(e) => setEstExpenses(e.target.value)} placeholder="Travel, props, rentals, etc." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Payment Terms</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={4} value={estTerms} onChange={(e) => setEstTerms(e.target.value)} placeholder="Deposit, milestones, net terms" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Assumptions</Label>
                      <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={4} value={estAssumptions} onChange={(e) => setEstAssumptions(e.target.value)} placeholder="Inclusions/exclusions assumptions" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Notes</Label>
                    <Textarea className="w-full bg-white text-black placeholder-black/40 border-black/20 focus:border-accent focus:ring-0" rows={3} value={estNotes} onChange={(e) => setEstNotes(e.target.value)} placeholder="Short additional notes" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wide text-black/60">Composed Estimate (preview)</Label>
                    <Textarea className="w-full bg-white text-black border-black/20" rows={10} value={estimate} onChange={(e) => setEstimate(e.target.value)} />
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 64px)' }}>
            <PitchDeckPreview
              title={title || "PROJECT TITLE"}
              coverDescription={coverDescription}
              preparedFor={preparedFor}
              preparedDate={preparedDate}
              coverMediaUrls={coverMediaUrls.filter(Boolean)}
              scopeOfWork={scopeOfWork}
              preProduction={preProduction}
              production={production}
              postProduction={postProduction}
              imageryMediaUrls={imageryMediaUrls.filter(Boolean)}
              estimate={estimate}
            />
          </div>
        </div>
      </div>

      {/* Media Library Selector Dialog */}
      <Dialog open={mediaSelectorOpen} onOpenChange={setMediaSelectorOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select {mediaSelectorType === "cover" ? "Cover" : "Imagery"} Images</DialogTitle>
            <DialogDescription>
              Choose images from your media library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Filters */}
            <div className="flex gap-2 items-center flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
                <Input
                  placeholder="Search media..."
                  value={mediaSearchQuery}
                  onChange={(e) => setMediaSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={mediaTypeFilter} onValueChange={(v) => setMediaTypeFilter(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={mediaFolderFilter} onValueChange={setMediaFolderFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {mediaFolders?.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Media Grid */}
            <div 
              className="flex-1 overflow-y-auto min-h-0"
              onWheel={(e) => {
                // Stop propagation to prevent body scrolling when scrolling within modal
                e.stopPropagation();
              }}
            >
              <div className="grid grid-cols-4 gap-4">
                {allMedia?.filter((m) => m.type === "image").map((media) => (
                  <MediaSelectorItem
                    key={media._id.toString()}
                    media={media}
                    onSelect={handleSelectMedia}
                    isSelected={false}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMediaSelectorOpen(false)}
              className="border-black/20 hover:bg-black/5"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deck Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, deckId: deleteDialog.deckId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pitch Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pitch deck? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDeck}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MediaSelectorItem({ media, onSelect, isSelected }: { media: MediaItem; onSelect: (url: string) => void; isSelected: boolean }) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    media.storageKey ? { storageId: media.storageKey } : "skip"
  );

  const handleClick = () => {
    if (imageUrl) {
      onSelect(imageUrl);
    }
  };

  return (
    <div
      className={`relative aspect-square border rounded overflow-hidden cursor-pointer hover:border-accent transition ${
        isSelected ? "border-accent ring-2 ring-accent" : "border-black/20"
      }`}
      onClick={handleClick}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={media.filename} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-black/5 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-black/30" />
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

