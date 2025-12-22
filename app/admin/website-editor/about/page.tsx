"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { X, Upload, Image as ImageIcon, Search, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AboutEditorPage() {
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  
  // About section data
  const about = useQuery(api.about.get);
  const updateAbout = useMutation(api.about.update);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);
  
  // Form state
  const [formData, setFormData] = useState({
    heading: "",
    bio: "",
    littleBits: "",
    awards: [] as string[],
    clientList: [] as string[],
    imageStorageId: "",
    awardsHeading: "",
    littleBitsHeading: "",
    clientListHeading: "",
    contactHeading: "",
  });
  
  const [newAward, setNewAward] = useState("");
  const [newClient, setNewClient] = useState("");
  
  // Media library state
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [mediaFolderFilter, setMediaFolderFilter] = useState<string>("all");
  
  const media = useQuery(api.mediaLibrary.list, {
    type: "image",
    folder: mediaFolderFilter === "all" ? undefined : mediaFolderFilter,
    search: mediaSearchQuery || undefined,
    includeAssets: false,
  });
  const mediaFolders = useQuery(api.mediaLibrary.getFolders);
  
  const aboutImageUrl = useQuery(
    api.storageQueries.getUrl,
    formData.imageStorageId ? { storageId: formData.imageStorageId } : "skip"
  );
  
  // Sync form data with about data
  useEffect(() => {
    if (about) {
      setFormData({
        heading: about.heading || "",
        bio: about.bio || "",
        littleBits: about.littleBits || "",
        awards: about.awards || [],
        clientList: about.clientList || [],
        imageStorageId: about.imageStorageId || "",
        awardsHeading: about.awardsHeading || "",
        littleBitsHeading: about.littleBitsHeading || "",
        clientListHeading: about.clientListHeading || "",
        contactHeading: about.contactHeading || "",
      });
    }
  }, [about]);

  const handleSave = async () => {
    try {
      await updateAbout({ ...formData, email: adminEmail || undefined });
      toast({ title: "About section updated", description: "Changes saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update.", variant: "destructive" });
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: { type: "about", entityId: "about", entityName: "About Section" },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async (args) => {
          const mediaItem = media?.find((m) => m._id === args.id);
          return mediaItem ? { storageKey: mediaItem.storageKey, width: mediaItem.width, height: mediaItem.height, size: mediaItem.size } : null;
        },
        addDisplayLocation: async (args) => { await addDisplayLocation(args); },
        createMedia: async (args) => { return await createMedia(args); },
      });
      
      let storageKey = uploadResult.storageKey;
      if (uploadResult.isDuplicate && !storageKey) {
        const duplicateMedia = media?.find((m) => m._id === uploadResult.duplicateId);
        if (duplicateMedia) storageKey = duplicateMedia.storageKey;
      }
      
      setFormData({ ...formData, imageStorageId: storageKey });
      await updateAbout({ imageStorageId: storageKey, email: adminEmail || undefined });
      toast({ title: "Image uploaded", description: "About image updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload.", variant: "destructive" });
    }
  };

  const handleSelectFromLibrary = async (mediaItem: { storageKey: string }) => {
    setFormData({ ...formData, imageStorageId: mediaItem.storageKey });
    await updateAbout({ imageStorageId: mediaItem.storageKey, email: adminEmail || undefined });
    toast({ title: "Image updated", description: "About image updated successfully." });
    setMediaLibraryOpen(false);
  };

  const addAward = () => {
    if (newAward.trim()) {
      setFormData({ ...formData, awards: [...formData.awards, newAward.trim()] });
      setNewAward("");
    }
  };

  const removeAward = (index: number) => {
    setFormData({ ...formData, awards: formData.awards.filter((_, i) => i !== index) });
  };

  const addClient = () => {
    if (newClient.trim()) {
      setFormData({ ...formData, clientList: [...formData.clientList, newClient.trim()] });
      setNewClient("");
    }
  };

  const removeClient = (index: number) => {
    setFormData({ ...formData, clientList: formData.clientList.filter((_, i) => i !== index) });
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
          About Section
        </h1>
        <p className="text-base sm:text-lg" style={{ color: '#666' }}>
          Manage the About section content on your homepage.
        </p>
      </div>
      
      <div className="space-y-8">
        {/* About Image */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>About Image</CardTitle>
            <CardDescription style={{ color: '#666' }}>Photo displayed in the About section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.imageStorageId && aboutImageUrl && (
              <div className="relative aspect-[3/4] w-64 overflow-hidden rounded-lg border-2 bg-black" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <img src={aboutImageUrl} alt="About" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-4">
              <Label htmlFor="about-image-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border px-6 py-3 transition-colors font-bold uppercase tracking-wider" style={{ borderColor: 'rgba(88, 96, 52, 0.3)', backgroundColor: 'rgba(88, 96, 52, 0.1)', color: '#586034' }}>
                  <Upload className="h-5 w-5" />
                  <span>Choose Image</span>
                </div>
              </Label>
              <input id="about-image-upload" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} className="hidden" />
              <Button variant="outline" onClick={() => setMediaLibraryOpen(true)} className="flex items-center gap-2 border-2 font-bold uppercase tracking-wider" style={{ color: '#333', backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.15)' }}>
                <ImageIcon className="h-5 w-5" /> Select from Library
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section Heading */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>Section Heading</CardTitle>
            <CardDescription style={{ color: '#666' }}>Main heading for the About section</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={formData.heading} onChange={(e) => setFormData({ ...formData, heading: e.target.value })} placeholder="e.g., ABOUT ME" className="h-12 text-base border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
          </CardContent>
        </Card>

        {/* Bio */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>Bio</CardTitle>
            <CardDescription style={{ color: '#666' }}>Main bio text</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={8} placeholder="Enter your bio..." className="text-base border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
          </CardContent>
        </Card>

        {/* Awards */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>Awards</CardTitle>
            <CardDescription style={{ color: '#666' }}>List of awards and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={formData.awardsHeading} onChange={(e) => setFormData({ ...formData, awardsHeading: e.target.value })} placeholder="Awards Section Heading (default: AWARDS)" className="h-12 border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
            <div className="flex gap-3">
              <Input value={newAward} onChange={(e) => setNewAward(e.target.value)} placeholder="Add award..." onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); addAward(); } }} className="flex-1 border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
              <Button onClick={addAward} style={{ backgroundColor: '#586034', color: '#fff' }}>Add</Button>
            </div>
            {formData.awards.length > 0 && (
              <div className="space-y-2">
                {formData.awards.map((award, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border p-3" style={{ backgroundColor: '#FAFAF9', borderColor: 'rgba(0,0,0,0.08)', color: '#1a1a1a' }}>
                    <span>{award}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeAward(index)} className="hover:bg-red-50"><X className="h-4 w-4" style={{ color: '#666' }} /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Little Bits */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>Little Bits</CardTitle>
            <CardDescription style={{ color: '#666' }}>Additional information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={formData.littleBitsHeading} onChange={(e) => setFormData({ ...formData, littleBitsHeading: e.target.value })} placeholder="Section Heading (default: LITTLE BITS)" className="h-12 border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
            <Textarea value={formData.littleBits} onChange={(e) => setFormData({ ...formData, littleBits: e.target.value })} rows={6} placeholder="Additional info..." className="text-base border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
          </CardContent>
        </Card>

        {/* Client List */}
        <Card className="border transition-all hover:shadow-lg" style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ color: '#1a1a1a' }}>Client List</CardTitle>
            <CardDescription style={{ color: '#666' }}>List of clients to display</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={formData.clientListHeading} onChange={(e) => setFormData({ ...formData, clientListHeading: e.target.value })} placeholder="Section Heading (default: PARTIAL CLIENT LIST)" className="h-12 border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
            <div className="flex gap-3">
              <Input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Add client..." onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); addClient(); } }} className="flex-1 border-gray-200 focus:border-[#586034]" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }} />
              <Button onClick={addClient} style={{ backgroundColor: '#586034', color: '#fff' }}>Add</Button>
            </div>
            {formData.clientList.length > 0 && (
              <div className="space-y-2">
                {formData.clientList.map((client, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border p-3" style={{ backgroundColor: '#FAFAF9', borderColor: 'rgba(0,0,0,0.08)', color: '#1a1a1a' }}>
                    <span>{client}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeClient(index)} className="hover:bg-red-50"><X className="h-4 w-4" style={{ color: '#666' }} /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="min-w-[200px] font-black uppercase tracking-wider transition-all hover:opacity-90" style={{ backgroundColor: '#586034', color: '#fff' }}>
            Save About Section
          </Button>
        </div>
      </div>

      {/* Media Library Dialog */}
      <Dialog open={mediaLibraryOpen} onOpenChange={setMediaLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col !bg-[#FAFAF9] !border-gray-200 [&>button]:text-gray-500 [&>button:hover]:text-gray-800">
          <DialogHeader>
            <DialogTitle className="!text-[#1a1a1a] text-2xl font-black uppercase tracking-wider">Select from Media Library</DialogTitle>
            <DialogDescription className="!text-[#666]">Choose an image for the about section</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search media..." value={mediaSearchQuery} onChange={(e) => setMediaSearchQuery(e.target.value)} className="pl-9 !bg-white !border-gray-200 !text-gray-900 placeholder:!text-gray-400" />
              </div>
              <Select value={mediaFolderFilter} onValueChange={setMediaFolderFilter}>
                <SelectTrigger className="w-[160px] !bg-white !border-gray-200 !text-gray-900"><SelectValue placeholder="All Folders" /></SelectTrigger>
                <SelectContent className="!bg-white !border-gray-200">
                  <SelectItem value="all">All Folders</SelectItem>
                  {mediaFolders?.map((folder) => (<SelectItem key={folder} value={folder}>{folder}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {media && media.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {media.map((mediaItem) => (
                    <MediaItem key={mediaItem._id.toString()} media={mediaItem} onSelect={handleSelectFromLibrary} isSelected={formData.imageStorageId === mediaItem.storageKey} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center"><ImageIcon className="mx-auto h-16 w-16 text-gray-300 mb-6" /><p className="text-gray-500">No media found.</p></div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMediaLibraryOpen(false)} className="!bg-white !border-gray-200 !text-gray-700 hover:!bg-gray-50">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaItem({ media, onSelect, isSelected }: { media: any; onSelect: (m: any) => void; isSelected: boolean }) {
  const imageUrl = useQuery(api.storageQueries.getUrl, media.storageKey ? { storageId: media.storageKey } : "skip");
  return (
    <div className={`relative aspect-square border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-[#586034] ring-2 ring-[#586034]" : "border-gray-200 hover:border-gray-300"}`} onClick={() => onSelect(media)}>
      {imageUrl ? <img src={imageUrl} alt={media.filename} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-300" /></div>}
      {isSelected && <div className="absolute top-2 right-2 bg-[#586034] text-white rounded-full p-1"><Check className="h-4 w-4" /></div>}
    </div>
  );
}

