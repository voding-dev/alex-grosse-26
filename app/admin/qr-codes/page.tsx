"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, QrCode, BarChart3, Edit, Trash2, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import QRCodeLib from "qrcode";
import { useAdminAuth } from "@/hooks/useAdminAuth";

// Get public URL for QR code redirects (always publicly accessible)
function getConvexRedirectUrl(): string {
  // First, check if we have a production site URL set (best for local dev)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (siteUrl && !siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")) {
    // Use production site URL with Next.js API route
    const baseUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    return `${baseUrl}/api/qr-redirect`;
  }
  
  // In browser/client-side: Use window.location.origin for production (Vercel domain)
  // This ensures QR codes use the actual site domain instead of Convex domain
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    // Only use window.location if it's not localhost (production)
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return `${origin}/api/qr-redirect`;
    }
  }
  
  // Check Convex URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  
  // Check if this is a local development URL
  if (convexUrl.includes("localhost") || convexUrl.includes("127.0.0.1")) {
    // In local dev, we need a public URL. Provide helpful instructions.
    const errorMessage = 
      "QR codes need a publicly accessible URL to work when scanned.\n\n" +
      "For local development, you have two options:\n\n" +
      "Option 1 (Recommended): Set NEXT_PUBLIC_SITE_URL in .env.local to your public domain:\n" +
      "  NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app\n\n" +
      "Option 2: Use a tunneling service like ngrok:\n" +
      "  1. Install ngrok: npm install -g ngrok\n" +
      "  2. Run: ngrok http 3000\n" +
      "  3. Set NEXT_PUBLIC_SITE_URL to the ngrok URL (e.g., https://abc123.ngrok.io)\n\n" +
      "Then restart your Next.js dev server and regenerate the QR code.";
    
    throw new Error(errorMessage);
  }
  
  // Last resort: Use Convex HTTP actions (only if site URL not available)
  // Production: Extract deployment ID from Convex URL (e.g., https://xyz.convex.cloud -> xyz)
  // Convex HTTP actions are available at: https://[deployment-id].convex.site/[path]
  const url = new URL(convexUrl);
  const deploymentId = url.hostname.split(".")[0];
  return `https://${deploymentId}.convex.site/qr-redirect`;
}

export default function QRCodesPage() {
  const qrCodes = useQuery(api.qr_codes.list) || [];
  const [isGenerating, setIsGenerating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    content: "",
    destinationUrl: "",
  });
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const createQRCode = useMutation(api.qr_codes.create);
  const updateQRCode = useMutation(api.qr_codes.update);
  const deleteQRCodeMutation = useMutation(api.qr_codes.remove);

  const generateQRCode = async (type: "static" | "dynamic") => {
    const { label, content, destinationUrl } = formData;

    if (!label?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a label",
        variant: "destructive",
      });
      return;
    }

    if (type === "static" && !content?.trim()) {
      toast({
        title: "Error",
        description: "Please enter content for static QR code",
        variant: "destructive",
      });
      return;
    }

    if (type === "dynamic" && !destinationUrl?.trim()) {
      toast({
        title: "Error",
        description: "Please enter destination URL for dynamic QR code",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Create QR code record first to get the ID
      const qrCodeId = await createQRCode({
        label: label.trim(),
        type,
        content: type === "static" ? content.trim() : undefined,
        destination_url: type === "dynamic" ? destinationUrl.trim() : undefined,
        svg_data: "", // Will be generated with actual ID
        email: adminEmail || undefined,
      });

      // Generate QR content with actual ID
      let qrContent: string;
      if (type === "static") {
        qrContent = content.trim();
      } else {
        // For dynamic QR codes, use Convex HTTP action URL (always publicly accessible)
        const redirectBaseUrl = getConvexRedirectUrl();
        qrContent = `${redirectBaseUrl}?id=${qrCodeId}`;
      }

      // Generate SVG with actual content
      const svgString = await QRCodeLib.toString(qrContent, {
        type: "svg",
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      // Update the record with the generated SVG
      await updateQRCode({
        id: qrCodeId,
        svg_data: svgString,
        email: adminEmail || undefined,
      });

      toast({
        title: "Success",
        description: "QR code created successfully!",
      });
      setOpenDialog(false);
      
      // Reset form
      setFormData({
        label: "",
        content: "",
        destinationUrl: "",
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate QR code";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show longer for instructions
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateQRCode = async (qr: any) => {
    try {
      let qrContent: string;
      if (qr.type === "static") {
        qrContent = qr.content || "";
      } else {
        // Regenerate with correct Convex URL
        const redirectBaseUrl = getConvexRedirectUrl();
        qrContent = `${redirectBaseUrl}?id=${qr._id}`;
      }

      // Generate new SVG
      const svgString = await QRCodeLib.toString(qrContent, {
        type: "svg",
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      // Update the record with the new SVG
      await updateQRCode({
        id: qr._id,
        svg_data: svgString,
        email: adminEmail || undefined,
      });

      toast({
        title: "Success",
        description: "QR code regenerated successfully!",
      });
    } catch (error) {
      console.error("Error regenerating QR code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to regenerate QR code";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show longer for instructions
      });
    }
  };

  const deleteQRCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this QR code?")) return;
    
    try {
      await deleteQRCodeMutation({ 
        id: id as any,
        email: adminEmail || undefined,
      });
      toast({
        title: "Success",
        description: "QR code deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting QR code:", error);
      toast({
        title: "Error",
        description: "Failed to delete QR code",
        variant: "destructive",
      });
    }
  };

  const downloadSVG = (svgData: string, label: string) => {
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label.replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            QR Codes
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Generate and manage static and dynamic QR codes with analytics tracking.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
              <Plus className="mr-2 h-4 w-4" />
              New QR Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Create QR Code
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Generate a static QR code with permanent content or a dynamic QR code with editable destination URLs.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="static" className="w-full">
              <TabsList className="grid w-full grid-cols-2 border border-foreground/20 bg-foreground/5">
                <TabsTrigger value="static" className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background">
                  Static QR
                </TabsTrigger>
                <TabsTrigger value="dynamic" className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background">
                  Dynamic QR
                </TabsTrigger>
              </TabsList>
              <TabsContent value="static" className="space-y-6 mt-6">
                <div>
                  <Label htmlFor="label-static" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Label
                  </Label>
                  <Input
                    id="label-static"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="My Static QR Code"
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="content" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Content
                  </Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="https://example.com or any text content"
                    rows={4}
                    required
                    className="text-base"
                  />
                </div>
                <Button
                  onClick={() => generateQRCode("static")}
                  disabled={isGenerating}
                  className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  {isGenerating ? "Generating..." : "Generate Static QR Code"}
                </Button>
              </TabsContent>
              <TabsContent value="dynamic" className="space-y-6 mt-6">
                <div>
                  <Label htmlFor="label-dynamic" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Label
                  </Label>
                  <Input
                    id="label-dynamic"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="My Dynamic QR Code"
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="destinationUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                    Destination URL
                  </Label>
                  <Input
                    id="destinationUrl"
                    type="url"
                    value={formData.destinationUrl}
                    onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                    placeholder="https://example.com"
                    required
                    className="h-12 text-base"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    You can change this URL later without regenerating the QR code.
                  </p>
                </div>
                <Button
                  onClick={() => generateQRCode("dynamic")}
                  disabled={isGenerating}
                  className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                  style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
                >
                  {isGenerating ? "Generating..." : "Generate Dynamic QR Code"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {qrCodes.length === 0 ? (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <QrCode className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No QR codes yet.
            </p>
            <Button 
              onClick={() => setOpenDialog(true)}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Create Your First QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {qrCodes.map((qr) => (
            <Card key={qr._id} className="relative border border-foreground/20 hover:border-accent/50 transition-all hover:shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                  {qr.label}
                </CardTitle>
                <CardDescription className="text-base text-foreground/70">
                  {qr.type === "static" ? "Static" : "Dynamic"} • {qr.scan_count} scans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex justify-center">
                  <div className="max-w-[200px] w-full rounded-lg border border-foreground/10 bg-white p-4 overflow-hidden">
                    <div
                      dangerouslySetInnerHTML={{ __html: qr.svg_data }}
                      className="w-full h-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-full"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSVG(qr.svg_data, qr.label)}
                    className="font-bold uppercase tracking-wider text-xs hover:bg-accent hover:text-background hover:border-accent transition-colors"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => regenerateQRCode(qr)}
                    title="Regenerate QR code with correct URL"
                    className="font-bold uppercase tracking-wider text-xs hover:bg-accent hover:text-background hover:border-accent transition-colors"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Regenerate
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {qr.type === "dynamic" && (
                    <>
                      <Link href={`/admin/qr-codes/${qr._id}`} className="col-span-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full font-bold uppercase tracking-wider text-xs hover:bg-accent hover:text-background hover:border-accent transition-colors"
                        >
                          <BarChart3 className="mr-1 h-3 w-3" />
                          Analytics
                        </Button>
                      </Link>
                      <EditDynamicQRDialog qrCode={qr} />
                    </>
                  )}
                  {qr.type === "static" && (
                    <div className="col-span-2"></div>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteQRCode(qr._id)}
                    className="font-bold uppercase tracking-wider text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EditDynamicQRDialog({ qrCode }: { qrCode: any }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(qrCode.label);
  const [destinationUrl, setDestinationUrl] = useState(qrCode.destination_url || "");
  const { toast } = useToast();
  const { adminEmail } = useAdminAuth();
  const updateQRCode = useMutation(api.qr_codes.update);

  const handleUpdate = async () => {
    if (!label.trim() || !destinationUrl.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateQRCode({
        id: qrCode._id,
        label: label.trim(),
        destination_url: destinationUrl.trim(),
        email: adminEmail || undefined,
      });
      toast({
        title: "Success",
        description: "QR code updated successfully!",
      });
      setOpen(false);
    } catch (error) {
      console.error("Error updating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to update QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          className="font-bold uppercase tracking-wider text-xs hover:bg-accent hover:text-background hover:border-accent transition-colors"
        >
          <Edit className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            Edit Dynamic QR Code
          </DialogTitle>
          <DialogDescription className="text-base">
            Update the label and destination URL. The QR code image will remain the same.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="edit-label" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
              Label
            </Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div>
            <Label htmlFor="edit-url" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
              Destination URL
            </Label>
            <Input
              id="edit-url"
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Button 
            onClick={handleUpdate} 
            className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            Update QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

